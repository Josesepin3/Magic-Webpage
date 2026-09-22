// Asistente Magic — botón flotante + panel de chat en dos modos.
//
// Flujo: FAB -> card flotante (por defecto, radio 12, esquina inf. derecha)
// -> toggle en la cabecera -> sidebar derecha (≥1024px). Al pasar a sidebar
// la página se vuelve una "ventana" flotante (radio 12, gutter 24px) a
// través de body.chat-shell (CSS: @media min-width 1024px, separado de
// mobile).
//
// Persistencia (solo sesión): sessionStorage guarda { open, mode,
// messages, draft, conversation_id } para que la conversación y el modo
// sobrevivan a la navegación entre páginas (re-montaje sin re-animar).
// El envío real lo hace services/ai.js contra la Edge Function magic-chat.
(function () {
  'use strict';

  var STORAGE_KEY = 'magic-chat-session';
  var DESKTOP_MIN = 1024; // igual que @media (min-width: 1024px)

  var SVG = {
    fab: '<svg class="chat-fab-icon" viewBox="0 0 16 16" width="24" height="24" aria-hidden="true" focusable="false">' +
      '<rect x="0.5" y="1.5" width="15" height="9.75" rx="1.75" fill="currentColor"/>' +
      '<path d="M5.25 11.25 L10.75 11.25 L8 14.5 Z" fill="currentColor"/>' +
      '</svg>',
    close: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' +
      '</svg>',
    expand: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<rect x="1" y="3" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M10 3v10" stroke="currentColor" stroke-width="1.4"/>' +
      '</svg>',
    collapse: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<rect x="1" y="3" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<path d="M6 3v10" stroke="currentColor" stroke-width="1.4"/>' +
      '</svg>',
    send: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path d="M8 2v10M8 12L4.5 8.5M8 12l3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>',
  };

  var CHIPS = [
    '¿Cuánto cuesta Sirius?',
    '¿Qué es MagicOS?',
    '¿Cómo funciona Blackbox Cloud?',
  ];

  var WELCOME_TEXT = '¡Hola! Soy el asistente de Magic. Puedo informarte sobre productos, precios y disponibilidad. ¿En qué te ayudo?';

  var state = {
    open: false,
    mode: 'card', // 'card' | 'sidebar'
    messages: [],
    draft: '',
    conversation_id: null,
  };

  var fab = null;
  var panel = null;
  var bodyEl = null;
  var formEl = null;
  var inputEl = null;
  var sendBtn = null;
  var expandBtn = null;
  var closeBtn = null;
  var typingEl = null;
  var lastSidebar = false;
  var savedDocScroll = 0;

  /* ── Persistencia (solo sesión) ─────────────────── */

  function loadState() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || typeof data !== 'object') return;
      if (Array.isArray(data.messages)) state.messages = data.messages;
      if (data.mode === 'sidebar' || data.mode === 'card') state.mode = data.mode;
      if (typeof data.draft === 'string') state.draft = data.draft;
      if (typeof data.conversation_id === 'string') state.conversation_id = data.conversation_id;
      state.open = !!data.open;
    } catch (err) {
      // sessionStorage no disponible: se sigue sin persistencia.
    }
  }

  function saveState() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      // sin persistencia si storage está bloqueado.
    }
  }

  /* ── Construcción del DOM ───────────────────────── */

  function ensureFab() {
    if (document.querySelector('.chat-fab')) {
      fab = document.querySelector('.chat-fab');
      return;
    }
    fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'chat-fab';
    fab.title = 'Asistente Magic';
    fab.setAttribute('aria-label', 'Abrir asistente Magic');
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = SVG.fab;
    fab.addEventListener('click', function () {
      if (state.open) {
        closePanel();
      } else {
        openPanel({ animate: true });
      }
    });
    document.body.appendChild(fab);
  }

  function ensurePanel() {
    if (panel) return;
    panel = document.createElement('div');
    panel.className = 'chat-panel';
    panel.id = 'magic-chat';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'false');
    panel.setAttribute('aria-label', 'Asistente Magic');
    panel.innerHTML =
      '<div class="chat-topbar">' +
        '<div class="chat-topbar-id">' +
          '<span class="chat-status-dot" aria-hidden="true"></span>' +
          '<div class="chat-topbar-titles">' +
            '<span class="chat-title">Asistente Magic</span>' +
            '<span class="chat-status">En línea</span>' +
          '</div>' +
        '</div>' +
        '<div class="chat-topbar-actions">' +
          '<button type="button" class="chat-btn chat-expand-btn" title="Convertir en panel lateral" aria-label="Convertir en panel lateral"></button>' +
          '<button type="button" class="chat-btn chat-close-btn" title="Cerrar" aria-label="Cerrar"></button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-body" role="log" aria-live="polite" aria-relevant="additions"></div>' +
      '<form class="chat-input" novalidate>' +
        '<input type="text" class="chat-entry" placeholder="Escribe tu consulta…" autocomplete="off" maxlength="1000" aria-label="Escribe tu consulta">' +
        '<button type="submit" class="chat-send-btn" aria-label="Enviar mensaje" disabled></button>' +
      '</form>';

    document.body.appendChild(panel);

    bodyEl = panel.querySelector('.chat-body');
    formEl = panel.querySelector('.chat-input');
    inputEl = panel.querySelector('.chat-entry');
    sendBtn = panel.querySelector('.chat-send-btn');
    expandBtn = panel.querySelector('.chat-expand-btn');
    closeBtn = panel.querySelector('.chat-close-btn');

    closeBtn.innerHTML = SVG.close;
    sendBtn.innerHTML = SVG.send;

    closeBtn.addEventListener('click', closePanel);
    expandBtn.addEventListener('click', toggleMode);
    formEl.addEventListener('submit', function (ev) {
      ev.preventDefault();
      send();
    });
    inputEl.addEventListener('input', function () {
      sendBtn.disabled = !inputEl.value.trim();
      state.draft = inputEl.value;
      saveState();
    });
  }

  /* ── Render de la conversación ──────────────────── */

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderEmpty() {
    var html =
      '<div class="chat-empty">' +
        '<div class="chat-welcome">' + escapeHtml(WELCOME_TEXT) + '</div>' +
        '<div class="chat-chips">';
    CHIPS.forEach(function (chip) {
      html += '<button type="button" class="chat-chip">' + escapeHtml(chip) + '</button>';
    });
    html += '</div></div>';
    bodyEl.innerHTML = html;

    var chips = bodyEl.querySelectorAll('.chat-chip');
    Array.prototype.forEach.call(chips, function (chip) {
      chip.addEventListener('click', function () {
        inputEl.value = chip.textContent;
        sendBtn.disabled = false;
        send();
      });
    });
  }

  function buildMsg(role, content) {
    var div = document.createElement('div');
    div.className = 'chat-msg chat-msg--' + (role === 'user' ? 'user' : 'assistant');
    div.textContent = content || '';
    return div;
  }

  function render() {
    if (!state.messages.length) {
      renderEmpty();
    } else {
      bodyEl.innerHTML = '';
      var frag = document.createDocumentFragment();
      state.messages.forEach(function (msg) {
        frag.appendChild(buildMsg(msg.role, msg.content));
      });
      bodyEl.appendChild(frag);
      if (typingEl) bodyEl.appendChild(typingEl);
    }
    inputEl.value = state.draft || '';
    sendBtn.disabled = !(inputEl.value.trim() ? true : false);
    scrollToBottom();
  }

  function scrollToBottom() {
    if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function showTyping() {
    if (typingEl) return;
    typingEl = document.createElement('div');
    typingEl.className = 'chat-msg chat-msg--typing';
    typingEl.innerHTML = '<i></i><i></i><i></i>';
    typingEl.setAttribute('aria-label', 'El asistente está escribiendo');
    bodyEl.appendChild(typingEl);
    scrollToBottom();
  }

  function removeTyping() {
    if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
    typingEl = null;
  }

  function showError(message) {
    removeTyping();
    var existing = bodyEl.querySelector('.chat-error');
    if (existing) existing.parentNode.removeChild(existing);

    var el = document.createElement('div');
    el.className = 'chat-error';
    el.innerHTML =
      '<span class="chat-error-text"></span>' +
      '<button type="button" class="chat-retry">Reintentar</button>';
    el.querySelector('.chat-error-text').textContent = message;
    el.querySelector('.chat-retry').addEventListener('click', function () {
      el.parentNode.removeChild(el);
      showTyping();
      callAi();
    });
    bodyEl.appendChild(el);
    scrollToBottom();
  }

  /* ── Modo card <-> sidebar ──────────────────────── */

  function getWidth() {
    return window.innerWidth || document.documentElement.clientWidth || 0;
  }

  var innerEl = null;

  function getInner() {
    if (!innerEl) innerEl = document.querySelector('.site-shell-inner');
    return innerEl;
  }

  function applyMode(mirrorFrom) {
    // Capturar la posición del doc ANTES de togglear chat-shell: al fijar la
    // ventana el documento deja de rodar y el navegador clampa scrollY a 0.
    var preScroll = typeof mirrorFrom === 'number' ? mirrorFrom : (window.scrollY || 0);
    var sidebar = state.mode === 'sidebar' && getWidth() >= DESKTOP_MIN;
    var wasSidebar = lastSidebar;
    var nowLeaving = wasSidebar && !sidebar;
    lastSidebar = sidebar;
    document.body.classList.toggle('chat-shell', sidebar);
    panel.classList.toggle('chat-panel--sidebar', sidebar);
    if (sidebar) {
      expandBtn.setAttribute('aria-label', 'Volver al modo tarjeta');
      expandBtn.title = 'Volver al modo tarjeta';
      expandBtn.innerHTML = SVG.collapse;
      // Espejo: la ventana arranca donde estaba el scroll del documento.
      if (!wasSidebar) {
        savedDocScroll = preScroll;
        var inner = getInner();
        if (inner) inner.scrollTop = preScroll;
      }
    } else {
      expandBtn.setAttribute('aria-label', 'Convertir en panel lateral');
      expandBtn.title = 'Convertir en panel lateral';
      expandBtn.innerHTML = SVG.expand;
    }
    if (nowLeaving) restoreDocScroll();
    syncScrollLock(sidebar);
  }

  function restoreDocScroll() {
    var s = savedDocScroll;
    requestAnimationFrame(function () {
      try { window.scrollTo(0, s); } catch (err) { /* sin salto */ }
    });
  }

  // Con la sidebar, la ventana interna del shell es el scroller: el doc ya
  // no roda, así que Lenis (home/magicos) se detiene POR COMPLETO
  // (destroy desacopla el wheel y permite scroll nativo dentro de la
  // ventana — stop() no sirve: esta versión hace preventDefault del wheel
  // aun estando stopped). Al salir se recrea Lenis con sus opciones y se
  // refrescan los triggers de GSAP.
  //
  // En ventana tampoco hay reveals de scroll: ScrollTrigger no volverá a
  // dispararse (el scroll del doc está congelado), así que todo lo que
  // quedaría oculto/invisible se fuerza a su estado final.
  function syncScrollLock(locked) {
    if (locked) {
      haltLenis();
      completeReveals();
    } else {
      resumeLenis();
      if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
        try { window.ScrollTrigger.refresh(); } catch (err) { /* opcional */ }
      }
    }
  }

  function haltLenis() {
    var name = window.__homeLenis ? '__homeLenis' : (window.__pageLenis ? '__pageLenis' : null);
    var lenis = name ? window[name] : null;
    if (!lenis) return;
    if (lenis.__chatTicker && window.gsap) {
      try { window.gsap.ticker.remove(lenis.__chatTicker); } catch (err) { /* opcional */ }
    }
    window.__chatScrollBackup = {
      name: name,
      options: lenis.options || { duration: 1.1, smoothWheel: true }
    };
    try { lenis.destroy(); } catch (err) { /* opcional */ }
    window[name] = null;
  }

  function resumeLenis() {
    var backup = window.__chatScrollBackup;
    if (!backup || !window.Lenis || window[backup.name]) return;
    try {
      var lenis = new Lenis(backup.options);
      window[backup.name] = lenis;
      if (window.gsap && window.ScrollTrigger) {
        lenis.on('scroll', window.ScrollTrigger.update);
        var tickFn = (function (l) {
          return function (time) { l.raf(time * 1000); };
        })(lenis);
        window.gsap.ticker.add(tickFn);
        window.gsap.ticker.lagSmoothing(0);
        lenis.__chatTicker = tickFn;
      }
    } catch (err) { /* Lenis opcional */ }
  }

  // Estado final de los reveals atados al scroll (ScrollTrigger). Solo a los
  // elementos de scroll; el timeline temporal del hero se deja intacto.
  function completeReveals() {
    try {
      if (!window.gsap) return;
      var g = window.gsap;
      g.set('.hm-reveal', { opacity: 1, y: 0 });
      g.set('.steps-grid li', { opacity: 1, y: 0 });
      g.set('.hm-manifiesto-text .hm-word-inner', { opacity: 1 });
      g.set('.mop-head .hm-word-inner', { yPercent: 0 });
    } catch (err) { /* sin GSAP: se queda tal cual */ }
    // El toggle "logo del hero en pantalla → ocultar el del navbar" es del
    // ScrollTrigger del doc, congelado en modo ventana: se muestra el logo.
    try {
      document.querySelectorAll('.site-title.site-title--home-hidden').forEach(function (el) {
        el.classList.remove('site-title--home-hidden');
      });
    } catch (err) { /* opcional */ }
  }

  function toggleMode() {
    if (state.mode === 'sidebar') {
      state.mode = 'card';
    } else if (getWidth() >= DESKTOP_MIN) {
      state.mode = 'sidebar';
    }
    applyMode();
    saveState();
    setTimeout(scrollToBottom, 180);
  }

  /* ── Abrir / cerrar ──────────────────────────────── */

  function openPanel(opts) {
    opts = opts || {};
    ensurePanel();
    state.open = true;
    if (state.mode === 'sidebar' && getWidth() < DESKTOP_MIN) state.mode = 'card';
    render();
    applyMode();
    if (opts.animate === false) {
      panel.classList.add('chat-panel--no-anim');
      panel.classList.add('chat-panel--open');
      panel.classList.remove('chat-panel--no-anim');
    } else {
      panel.classList.add('chat-panel--open');
    }
    fab.classList.add('chat-fab--hidden');
    fab.setAttribute('aria-expanded', 'true');
    saveState();
    setTimeout(function () {
      scrollToBottom();
      if (opts.focus !== false && inputEl) {
        try { inputEl.focus(); } catch (err) { /* sin foco */ }
      }
    }, opts.animate === false ? 0 : 240);
  }

  function closePanel() {
    if (!state.open) return;
    if (inputEl) state.draft = inputEl.value;
    state.open = false;
    panel.classList.remove('chat-panel--open');
    var wasSidebar = lastSidebar;
    document.body.classList.remove('chat-shell');
    lastSidebar = false;
    syncScrollLock(false);
    if (wasSidebar) restoreDocScroll();
    fab.classList.remove('chat-fab--hidden');
    fab.setAttribute('aria-expanded', 'false');
    saveState();
    try { fab.focus(); } catch (err) { /* sin foco */ }
  }

  /* ── Envío del mensaje ───────────────────────────── */

  function send() {
    var text = (inputEl.value || '').trim();
    if (!text) return;
    if (typingEl) return;

    state.messages.push({ role: 'user', content: text });
    inputEl.value = '';
    state.draft = '';
    sendBtn.disabled = true;
    render();
    showTyping();
    saveState();
    callAi();
  }

  function callAi() {
    if (!window.MagicOS || typeof MagicOS.sendChatMessage !== 'function') {
      showError('El asistente no está disponible en este momento.');
      return;
    }
    MagicOS.sendChatMessage(state.messages)
      .then(function (reply) {
        removeTyping();
        if (typeof reply === 'string' && reply.trim()) {
          state.messages.push({ role: 'assistant', content: reply });
        } else {
          showError('No entendí la respuesta. Reintenta, por favor.');
        }
        render();
        saveState();
      })
      .catch(function (err) {
        removeTyping();
        showError(err && err.message ? err.message : 'No se pudo enviar el mensaje. Reintenta en unos segundos.');
      });
  }

  /* ── Ciclo de vida ───────────────────────────────── */

  function init() {
    ensureFab();
    loadState();
    if (state.open) {
      openPanel({ animate: false, focus: false });
    }

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && state.open) closePanel();
    });

    document.addEventListener('click', function (ev) {
      if (!state.open) return;
      if (state.mode === 'card') {
        var t = ev.target;
        if (panel.contains(t) || fab.contains(t)) return;
        closePanel();
      }
    });

    window.addEventListener('resize', function () {
      if (!state.open) return;
      if (state.mode === 'sidebar' && getWidth() < DESKTOP_MIN) {
        state.mode = 'card';
        applyMode();
        saveState();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();