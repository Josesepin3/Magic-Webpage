// Estados de carga, error y vacío, compartidos por las páginas que traen datos
// del backend en el navegador: carrito, servicios, perfil y panel de
// administración (el chat tiene los suyos propios dentro del panel).
//
// Tener un único sitio para el marcado hace que los tres estados se vean y se
// lean igual en todas partes, y evita repetir el mismo HTML cuatro veces.
// Accesibilidad: el contenedor es una región viva (aria-live) y se marca
// aria-busy mientras carga, así el lector de pantalla espera a tener el
// contenido final; el esqueleto visual queda oculto para AT (aria-hidden),
// porque lo que hay que anunciar es la espera, no las barras grises.
//
//   MagicOS.ui.loading(el, 'rows', 3);                  → esqueleto mientras carga
//   MagicOS.ui.error(el, 'No se pudo cargar…', reintentar, detalle);
//   MagicOS.ui.empty(el, { text: 'No hay nada', action: { label, href } });
//   MagicOS.ui.ready(el);                               → fin de la espera
(function () {
  'use strict';

  var MagicOS = (window.MagicOS = window.MagicOS || {});

  // Formas del esqueleto: imitan el contenido real para que el salto al llegar
  // los datos sea mínimo. [cantidad por defecto, HTML de una unidad].
  var SHAPES = {
    rows: [3, '<div class="skeleton-box skeleton-box--row">' +
      '<span class="skeleton-line skeleton-line--title"></span>' +
      '<span class="skeleton-line skeleton-line--meta"></span>' +
      '</div>'],
    cards: [2, '<div class="skeleton-box skeleton-box--card">' +
      '<span class="skeleton-line skeleton-line--title"></span>' +
      '<span class="skeleton-line skeleton-line--meta"></span>' +
      '</div>'],
    profile: [1, '<div class="skeleton-box skeleton-box--profile">' +
      '<span class="skeleton-avatar"></span>' +
      '<span class="skeleton-lines">' +
      '<span class="skeleton-line skeleton-line--title"></span>' +
      '<span class="skeleton-line skeleton-line--meta"></span>' +
      '</span>' +
      '</div>'],
    avatar: [1, '<span class="skeleton-avatar"></span>']
  };

  var ICON_ALERT =
    '<svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<circle cx="12" cy="12" r="9"></circle><path d="M12 7.6v5.2M12 16.3v.2"></path></svg>';

  var ICON_EMPTY =
    '<svg class="state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
    '<path d="M20.5 16.4V7.6a1.5 1.5 0 0 0-.8-1.3l-7-3.6a1.5 1.5 0 0 0-1.4 0l-7 3.6a1.5 1.5 0 0 0-.8 1.3v8.8a1.5 1.5 0 0 0 .8 1.3l7 3.6a1.5 1.5 0 0 0 1.4 0l7-3.6a1.5 1.5 0 0 0 .8-1.3z"></path>' +
    '<path d="M3.7 6.9 12 11.6l8.3-4.7M12 11.6V21"></path></svg>';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // El contenedor pasa a ser región viva la primera vez que se usa.
  function region(el, busy) {
    if (!el.hasAttribute('aria-live')) el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-busy', busy ? 'true' : 'false');
  }

  function loading(el, shape, count) {
    if (!el) return;
    var unit = SHAPES[shape] || SHAPES.rows;
    var n = count || unit[0];
    var html = '';
    for (var i = 0; i < n; i += 1) html += unit[1];

    region(el, true);
    el.innerHTML =
      '<div class="skeleton-stack skeleton-stack--' + (SHAPES[shape] ? shape : 'rows') + '">' +
        '<span class="visually-hidden">Cargando…</span>' +
        html +
      '</div>';
  }

  // La página ya pintó contenido real: se le dice al lector de pantalla.
  function ready(el) {
    if (el) el.setAttribute('aria-busy', 'false');
  }

  function error(el, message, retry, detail) {
    if (!el) return;
    region(el, false);
    el.innerHTML =
      '<div class="state-block state-block--error">' +
        ICON_ALERT +
        '<p class="state-text"></p>' +
        (detail ? '<p class="state-detail"></p>' : '') +
        (typeof retry === 'function'
          ? '<button type="button" class="btn-ghost btn-small state-action">Reintentar</button>'
          : '') +
      '</div>';

    el.querySelector('.state-text').textContent = message || 'No se pudo cargar la información.';
    if (detail) el.querySelector('.state-detail').textContent = detail;

    var btn = el.querySelector('.state-action');
    if (btn) {
      btn.addEventListener('click', function () {
        btn.disabled = true;
        btn.textContent = 'Reintentando…';
        retry();
      });
    }
  }

  // opts.text          texto principal
  // opts.action.label  rótulo del botón o enlace (opcional)
  // opts.action.href   enlace; si falta, se dibuja un botón con onClick
  // opts.action.variant 'ghost' para el botón secundario
  function empty(el, opts) {
    if (!el) return;
    opts = opts || {};
    var action = opts.action;
    var actionHtml = '';

    if (action) {
      var cls = action.variant === 'ghost' ? 'btn-ghost btn-small' : 'btn-primary';
      actionHtml = action.href
        ? '<a class="' + cls + ' state-action" href="' + esc(action.href) + '">' + esc(action.label) + '</a>'
        : '<button type="button" class="' + cls + ' state-action">' + esc(action.label) + '</button>';
    }

    region(el, false);
    el.innerHTML =
      '<div class="state-block">' +
        ICON_EMPTY +
        '<p class="state-text">' + esc(opts.text || 'No hay nada por aquí todavía.') + '</p>' +
        actionHtml +
      '</div>';

    if (action && !action.href && typeof action.onClick === 'function') {
      el.querySelector('.state-action').addEventListener('click', action.onClick);
    }
  }

  MagicOS.ui = { loading: loading, ready: ready, error: error, empty: empty };
})();
