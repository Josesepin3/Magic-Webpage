# magic-chat — Edge Function de Supabase (Fase 5)

Backend del chat de la tienda. Solo backend: el widget del frontend se agrega
en una fase posterior.

## Qué hace

Recibe `POST { messages: [...] }` con la sesión del usuario (`Authorization:
Bearer <JWT>`) y responde `{ reply }`.

En cada request:
1. Valida el JWT del usuario (la función exige `Authorization`; ver
   `CHAT_REQUIRE_AUTH` abajo).
2. Arma el `role=system` con **dos** bloques (nunca visibles para el usuario):
   - `MAPA DEL SITIO` → `site-map.md` (narrativa curada a mano, sin precios).
   - `CATÁLOGO` → query con **allow-list de columnas públicas** de
     `products` + `product_options`, generada en vivo (lo que ve el admin es lo
     que responde el chat; sin redeploy al cambiar un precio).
3. Llama a Mistral (`mistral-small-latest`) y devuelve `{ reply }`.

## Requisitos

- CLI de Supabase en tu máquina: https://supabase.com/docs/guides/cli
- Proyecto: `ukfbueqhnxehifisidan`

## Deploy

```bash
supabase login
supabase link --project-ref ukfbueqhnxehifisidan
supabase secrets set \
  MISTRAL_API_KEY=TU_KEY \
  MISTRAL_MODEL=ministral-14b-latest \
  MISTRAL_API_URL=https://api.mistral.ai/v1/chat/completions
npm run deploy:chat
```

`npm run deploy:chat` = `supabase functions deploy magic-chat`.

Secrets ya configurados por cloud (no hace falta setearlos): `SUPABASE_URL` y
`SUPABASE_SERVICE_ROLE_KEY` los inyecta la plataforma.

## Configuración

| Variable | Default | Descripción |
|---|---|---|
| `MISTRAL_API_KEY` | — | **requerida**; key de la API de Mistral |
| `MISTRAL_API_URL` | `https://api.mistral.ai/v1/chat/completions` | endpoint de chat |
| `MISTRAL_MODEL` | `ministral-14b-latest` | modelo a usar (el plan actual solo sirve modelos abiertos: ministral / codestral / voxtral) |
| `CHAT_REQUIRE_AUTH` | `true` | `false` permite chat sin login (revisar anti-abuso) |

El plan contratado hoy es el gratuito: `mistral-small-*`, `mistral-medium-*` y
`magistral-*` responden `429 rate_limited`. Por eso el modelo por defecto es
`ministral-14b-latest`; si se cambia de plan alcanza con setear `MISTRAL_MODEL`
(no hace falta tocar el código). `callMistral` reintenta hasta 3 intentos ante
`429`/`503` (respeta `Retry-After`), porque el plan limita a pocas requests por
segundo.

`supabase/config.toml` define `verify_jwt = true`: la plataforma ya exige un JWT
válido del proyecto antes de invocar, y la función además verifica que el
usuario exista (doble capa).

## Probar localmente

```bash
deno check supabase/functions/magic-chat/index.ts        # tipos
# e2e: levanta el handler real en :8765 y prueba auth, validaciones, catálogo
# vivo, reintento ante 429 (con un servidor falso) y round-trip real a Mistral.
# Necesita MISTRAL_API_KEY en el .env (raíz del repo):
deno run --allow-net --allow-env --allow-read --env-file=.env \
  supabase/functions/magic-chat/e2e.ts
```

Nota: los `.md` se importan como texto (`with { type: "text" }`). Si el CLI de
Supabase diera un problema al empaquetarlos, la variante con la extensión del
CLI es `with { type: "text", "supabase": false }`.