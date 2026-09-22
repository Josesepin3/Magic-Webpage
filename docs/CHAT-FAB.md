# Botón flotante del chat ("FAB") — diseño documentado

**Estado:** diseño definido (22 sep 2026). La implementación se hace junto con
el widget del chat (parte de frontend, aún no decidida).

## Propósito

Botón circular flotante, fijo en la esquina inferior derecha, independiente de
la página y del scroll (presente en **todas** las páginas). Abre el asistente
**Magic Assistant**; el panel del chat se define en la parte de frontend.

## Especificación

### Geometría y posición (medidas reales de Tuba)

- Círculo de **32 px** de diámetro: icono 16 px + `padding` interno 8 px
  (igual que `.compose-button` de Tuba).
- Márgenes externos: **24 px** del borde inferior y **24 px** del borde derecho
  (LTR) — en Tuba `margin_bottom = 24` y `margin_end = 24`.
- `position: fixed` + `z-index: 200` (por encima del header del sitio, z-index 100).
- Móvil: `right: max(24px, env(safe-area-inset-right))` y
  `bottom: max(24px, env(safe-area-inset-bottom))`.
- **Siempre visible** (no se oculta con el scroll, a diferencia de Tuba).

### Estado base = Adwaita estándar

- Fondo: `#3584e4` (`--accent-bg-color` de Adwaita; igual en claro y oscuro).
- Icono: burbuja de chat simple, color `#ffffff` (`--accent-fg-color`).
- Plano: sin sombra ni elevación (Adwaita no eleva los botones).
- Focus: ya cubierto por el `*:focus-visible` global del sitio
  (`outline: 2px solid rgba(53, 132, 228, 0.7)`).

### Estado hover = transformación "Aura" (concepto definido)

- La burbuja pasa de `#3584e4` a un **degradado de tonos vivos con glow**.
- Propuesta inicial de degradado, con colores de la paleta Adwaita:
  `linear-gradient(135deg, #49a1ff → #3584e4 → #9141ac → #d56199)`
  (azul → púrpura → rosa). **Los tonos y el glow exactos se afinan al
  implementar, con pasada visual en el navegador.**
- El icono cambia de color para contrastar sobre los tonos vivos
  (propuesta inicial: blanco → `#241f31`, a confirmar).
- Transición suave (~0.3 s) respetando `prefers-reduced-motion`.

## Archivos involucrados (cuando se implemente)

1. `frontend/js/components/ChatWidget.js` — **nuevo**. IIFE con init en
   `DOMContentLoaded` (patrón de `SiteHeader.js`); inyecta en `<body>` un
   `<button class="chat-fab">` con SVG inline; `aria-label` +
   `aria-haspopup="dialog"`; toggle de `chat-fab--active`; el panel queda como
   stub (se decide en la parte de frontend).
2. `frontend/style.css` — nueva sección "CHAT FAB" con los estados
   base / hover / active y el estilo Aura.
3. `backend/views/partials/footer.ejs` — agregar
   `<script src="/js/components/ChatWidget.js"></script>` (así aparece en todas
   las páginas; la CSP `script-src 'self'` ya lo permite).
4. Verificación: build estático + Puppeteer (CSP sin violaciones) + vista local.
5. Push solo a `dev` (regla vigente: sin merge a `main` hasta finalizar el chat).

## Referencias usadas para las medidas reales

- **Tuba** `src/Views/Home.vala`:
  `css_classes = { "circular", "compose-button", "suggested-action" }`,
  `margin_bottom = 24`, `margin_end = 24`, icono `document-edit-symbolic`,
  `Gtk.Revealer` con `SLIDE_UP`.
- **Tuba** `data/style.css`: `.compose-button { padding: 8px }`, y el botón de
  "volver arriba" se corre 56 px cuando está visible el de componer
  (= botón 32 px + margen 24 px).
- **Libadwaita** docs de style classes: `.suggested-action` + `.circular` son
  combinables; paleta `--accent-bg-color #3584e4`, `--accent-fg-color #ffffff`
  (iguales en claro y oscuro); estados hover/active reales del suggested-action
  (capas `color-mix(currentColor 10%)` → ≈ `#4990e7`, y `RGB(0 0 6 / 20%)` →
  ≈ `#2a6ab8`).