// Lógica pura de la Edge Function "magic-chat" (testeable sin servidor).
// index.ts se encarga solo del HTTP; todo lo que pueda probarse vive acá.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import siteMap from "./site-map.md" with { type: "text" };
import systemPrompt from "./system-prompt.md" with { type: "text" };

export const MAX_HISTORY = 20; // mensajes del historial que entran al contexto
export const MAX_MESSAGE_CHARS = 4000; // recorte por mensaje
export const DEFAULT_MODEL = "mistral-small-latest";
export const MISTRAL_DEFAULT_URL = "https://api.mistral.ai/v1/chat/completions";

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

/** Llama a la API de chat de Mistral y devuelve la respuesta del modelo. */
export async function callMistral(opts: MistralOptions): Promise<string> {
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
    throw new Error(`Mistral ${res.status}: ${detail ?? JSON.stringify(data ?? {}).slice(0, 200)}`);
  }

  const reply = (data as { choices?: Array<{ message?: { content?: unknown } }> } | null)
    ?.choices?.[0]?.message?.content;
  if (typeof reply !== "string" || !reply.trim()) throw new Error("Mistral respondió vacío");
  return reply.trim();
}

/** Export para que index.ts inyecte los assets .md sin duplicar imports. */
export { siteMap, systemPrompt };