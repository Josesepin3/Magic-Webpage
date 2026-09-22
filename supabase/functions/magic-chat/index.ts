// Edge Function "magic-chat" — Fase 5.
// Validación: deno check index.ts (Deno 2).
// Deploy (desde la máquina del dev): supabase functions deploy magic-chat
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildCatalog,
  buildSystem,
  callMistral,
  sanitizeMessages,
  siteMap,
  systemPrompt,
} from "./lib.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
  });
}

// PORT se usa para pruebas locales (deno run); en Supabase el runtime lo ignora.
const port = Number(Deno.env.get("PORT") ?? 8000);

Deno.serve({ port }, async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    console.error("magic-chat: falta SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "Configuración incompleta del servidor" }, 500);
  }

  const requireAuth = (Deno.env.get("CHAT_REQUIRE_AUTH") ?? "true") !== "false";

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  if (requireAuth) {
    const raw = req.headers.get("Authorization") ?? "";
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "No autorizado" }, 401);
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user) return json({ error: "No autorizado" }, 401);
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }
  if (!payload || typeof payload !== "object") {
    return json({ error: "Se esperaba un objeto JSON" }, 400);
  }
  const messages = (payload as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "Falta el campo messages[]" }, 400);
  }

  const history = sanitizeMessages(messages);
  if (!history.length) {
    return json({ error: "No hay mensajes para procesar" }, 400);
  }

  const mistralKey = Deno.env.get("MISTRAL_API_KEY") ?? "";
  if (!mistralKey) {
    console.error("magic-chat: falta MISTRAL_API_KEY");
    return json({ error: "Configuración incompleta del servidor" }, 500);
  }

  let catalog: string;
  try {
    catalog = await buildCatalog(admin);
  } catch (err) {
    console.error("magic-chat: error leyendo catálogo", err instanceof Error ? err.message : err);
    return json({ error: "Catálogo temporalmente no disponible" }, 502);
  }

  const system = buildSystem(siteMap, systemPrompt, catalog);

  let reply: string;
  try {
    reply = await callMistral({
      apiKey: mistralKey,
      url: Deno.env.get("MISTRAL_API_URL") ?? undefined,
      model: Deno.env.get("MISTRAL_MODEL") ?? undefined,
      system,
      history,
    });
  } catch (err) {
    console.error("magic-chat: error llamando a Mistral", err instanceof Error ? err.message : err);
    return json({ error: "No se pudo completar la respuesta. Intentá de nuevo." }, 502);
  }

  return json({ reply });
});