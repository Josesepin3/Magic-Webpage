// Lógica pura de la Edge Function "magic-chat" (testeable sin servidor).
// index.ts se encarga solo del HTTP; todo lo que pueda probarse vive acá.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

// Los .md no se pueden importar (el empaquetador de Supabase rechaza el import
// attribute `type: "text"`). Viajan como static_files -- ver supabase/config.toml
// -- y se leen acá en tiempo de ejecución.
export const SITE_MAP_FILE = "site-map.md";
export const SYSTEM_PROMPT_FILE = "system-prompt.md";

export type ChatAssets = { siteMap: string; systemPrompt: string };

let assetsCache: ChatAssets | null = null;

// Dos rutas: junto a este archivo (deno run local y e2e) y en el cwd (en
// Supabase el directorio de trabajo es la raíz de la función).
async function readAsset(name: string): Promise<string> {
  const rutas = [new URL(name, import.meta.url).pathname, `./${name}`];
  for (const ruta of rutas) {
    try {
      return await Deno.readTextFile(ruta);
    } catch {
      // se prueba la siguiente
    }
  }
  throw new Error(`No se pudo leer el asset ${name}`);
}

/** Mapa del sitio y system prompt, leídos una sola vez por instancia. */
export async function loadAssets(): Promise<ChatAssets> {
  if (!assetsCache) {
    assetsCache = {
      siteMap: await readAsset(SITE_MAP_FILE),
      systemPrompt: await readAsset(SYSTEM_PROMPT_FILE),
    };
  }
  return assetsCache;
}

export const MAX_HISTORY = 20; // mensajes del historial que entran al contexto
export const MAX_MESSAGE_CHARS = 4000; // recorte por mensaje
// Plan actual: solo sirve modelos abiertos (ministral / codestral / voxtral).
// `mistral-small-latest` y `mistral-medium-latest` responden 429 rate_limited.
// Se cambia sin tocar el código con la variable MISTRAL_MODEL.
export const DEFAULT_MODEL = "ministral-14b-latest";
export const MISTRAL_DEFAULT_URL = "https://api.mistral.ai/v1/chat/completions";
/** Intentos totales ante límite de ritmo (429) o caída pasajera (503). */
export const MAX_ATTEMPTS = 3;
const RETRY_WAIT_MS = [1000, 2500];

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProductRow {
  id: number;
  name: string;
  slug: string;
  category: string | null;
  base_price: number | null;
  status: string | null;
  tagline: string | null;
  description: string | null;
}

interface OptionRow {
  product_id: number;
  group_name: string | null;
  label: string | null;
  price_modifier: number | null;
}

/**
 * Saneamiento del historial recibido del cliente.
 * Reglas:
 * - solo roles "user" y "assistant" sobreviven: cualquier "system" o rol raro
 *   del cliente se degrada a "user" (el cliente no puede inyectar un sistema).
 * - contenido recortado a MAX_MESSAGE_CHARS y se descartan los vacíos.
 * - se conservan los últimos MAX_HISTORY mensajes.
 */
export function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m !== "object") continue;
    const rec = m as Record<string, unknown>;
    if (typeof rec.content !== "string") continue;
    const content = rec.content.trim().slice(0, MAX_MESSAGE_CHARS);
    if (!content) continue;
    out.push({ role: rec.role === "assistant" ? "assistant" : "user", content });
    if (out.length >= MAX_HISTORY) break;
  }
  return out;
}

const fmtPrice = (v: number | null): string =>
  Number(v ?? 0).toLocaleString("es-AR", { maximumFractionDigits: 0 });

/**
 * Arma el bloque CATÁLOGO con una query de allow-list (columnas públicas).
 * Solo `products` + `product_options` (dato de catálogo, RLS lectura pública);
 * jamás toca tablas con datos sensibles y el input del usuario nunca llega al SQL.
 */
export async function buildCatalog(sb: SupabaseClient): Promise<string> {
  const { data: products, error: pErr } = await sb
    .from("products")
    .select("id, name, slug, category, base_price, status, tagline, description")
    .order("id");
  if (pErr) throw new Error(`catálogo: ${pErr.message}`);

  const { data: options, error: oErr } = await sb
    .from("product_options")
    .select("product_id, group_name, label, price_modifier")
    .order("id");
  if (oErr) throw new Error(`opciones: ${oErr.message}`);

  const optsByProduct = new Map<number, string[]>();
  for (const o of (options ?? []) as OptionRow[]) {
    const line = `${o.group_name ?? "grupo"} : ${o.label ?? "opción"} (+$${fmtPrice(
      o.price_modifier,
    )})`;
    const list = optsByProduct.get(Number(o.product_id)) ?? [];
    list.push(line);
    optsByProduct.set(Number(o.product_id), list);
  }

  const lines = ((products ?? []) as ProductRow[]).map((p) => {
    const status = p.status === "available" ? "disponible" : "próximamente";
    const parts = [
      `- ${p.name} (${p.slug}) | ${p.category ?? "general"} | ${status} | $${fmtPrice(
        p.base_price,
      )}`,
    ];
    if (p.tagline) parts.push(`  "${p.tagline}"`);
    if (p.description) parts.push(`  ${p.description.slice(0, 280)}`);
    const optLines = optsByProduct.get(Number(p.id));
    if (optLines && optLines.length) {
      parts.push("  opciones:");
      for (const l of optLines) parts.push(`    ${l}`);
    }
    return parts.join("\n");
  });

  return lines.length ? lines.join("\n") : "(catálogo vacío)";
}

/**
 * Ensambla el system prompt final: instrucciones fijas + mapa del sitio
 * (narrativa curada) + catálogo (dinámico). Todo viaja en rol=system y no
 * se muestra al usuario en el chat.
 */
export function buildSystem(mapText: string, promptText: string, catalog: string): string {
  return [
    promptText.trim(),
    "## MAPA DEL SITIO",
    mapText.trim(),
    "## CATÁLOGO",
    catalog,
  ].join("\n\n");
}

export interface MistralOptions {
  apiKey: string;
  url?: string;
  model?: string;
  system: string;
  history: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
}

/** Espera antes de reintentar: respeta `Retry-After` si el proveedor lo manda. */
function retryWaitMs(headers: Headers, attempt: number): number {
  const retryAfter = Number(headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 5000);
  return RETRY_WAIT_MS[attempt - 1] ?? RETRY_WAIT_MS[RETRY_WAIT_MS.length - 1];
}

/**
 * Llama a la API de chat de Mistral y devuelve la respuesta del modelo.
 * Reintenta solo cuando el error es de ritmo (429) o de servicio (503): el plan
 * limita a pocas requests por segundo y una conversación puede encadenarlas.
 */
export async function callMistral(opts: MistralOptions): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const res = await fetch(opts.url ?? MISTRAL_DEFAULT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: opts.model ?? DEFAULT_MODEL,
        messages: [{ role: "system", content: opts.system }, ...opts.history],
        temperature: opts.temperature ?? 0.7,
        max_tokens: opts.maxTokens ?? 600,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    const data: unknown = await res.json().catch(() => null);

    if (!res.ok) {
      const detail = (data as { error?: { message?: string } } | null)?.error?.message;
      lastError = new Error(
        `Mistral ${res.status}: ${detail ?? JSON.stringify(data ?? {}).slice(0, 200)}`,
      );
      const transitorio = res.status === 429 || res.status === 503;
      if (!transitorio || attempt === MAX_ATTEMPTS) throw lastError;
      const wait = retryWaitMs(res.headers, attempt);
      console.warn(`magic-chat: Mistral ${res.status}, reintento ${attempt} en ${wait} ms`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }

    const reply = (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)
      ?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) throw new Error("Mistral respondió vacío");
    return reply.trim();
  }

  throw lastError ?? new Error("Mistral no respondió");
}
