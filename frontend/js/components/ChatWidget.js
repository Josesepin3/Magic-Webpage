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
    sidebar: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<rect x="1" y="3" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<rect x="10.2" y="4.9" width="1.5" height="6.2" rx="0.75" fill="currentColor"/>' +
      '</svg>',
    pip: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<rect x="1" y="3" width="14" height="10" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
      '<rect x="8.6" y="6.6" width="5" height="4" rx="1" fill="currentColor"/>' +
      '</svg>',
    send: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path d="M8 2v10M8 12L4.5 8.5M8 12l3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>',
    // Maximizar / restaurar la hoja mobile. Ojo: tienen que verse CLARAMENTE
    // distintos. maximize apoya los codos en las esquinas del lienzo (marco
    // completo, "expandir"); restore los mete hacia dentro, con los brazos
    // llegando a los bordes ("plegar"). (Dibujar el mismo recorrido en orden
    // inverso da el mismo icono: por eso se verifican renderizados.)
    maximize: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>',
    restore: '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
      '<path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
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
  var scrim = null;
  var bodyEl = null;
  var formEl = null;
  var inputEl = null;
  var sendBtn = null;
  var expandBtn = null;
  var closeBtn = null;
  var typingEl = null;
  var lastSidebar = false;
  var savedDocScroll = 0;
  var drag = null; // gesto de arrastre de la hoja (mobile) en curso
  var sheetMetrics = { def: 0, full: 0 }; // alturas reales (px) de los dos estados
  var mqMobile = null;

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
    // El panel es hermano de .site-shell (hijo de <body>), fuera del scroller
    // de la página: marcarlo evita que Lenis intercepte el wheel del chat
    // (así .chat-body rueda de forma nativa y la página no se mueve).
    panel.setAttribute('data-lenis-prevent', '');
    panel.innerHTML =
      '<div class="chat-handle" aria-hidden="true"></div>' +
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

    // Scrim: oscurece la página y bloquea su scroll mientras la hoja está
    // abierta. Solo mobile ≤640px (la regla base lo deja en display: none).
    scrim = document.createElement('div');
    scrim.className = 'chat-scrim';
    scrim.setAttribute('aria-hidden', 'true');
    document.body.appendChild(scrim);
    // Con rueda (ventana angosta en escritorio) el scrim también frena la página.
    scrim.addEventListener('wheel', function (ev) { ev.preventDefault(); }, { passive: false });

    var handleEl = panel.querySelector('.chat-handle');
    var topbarEl = panel.querySelector('.chat-topbar');

    bodyEl = panel.querySelector('.chat-body');
    formEl = panel.querySelector('.chat-input');
    inputEl = panel.querySelector('.chat-entry');
    sendBtn = panel.querySelector('.chat-send-btn');
    expandBtn = panel.querySelector('.chat-expand-btn');
    closeBtn = panel.querySelector('.chat-close-btn');

    closeBtn.innerHTML = SVG.close;
    sendBtn.innerHTML = SVG.send;

    closeBtn.addEventListener('click', closePanel);
    // El botón de la cabecera cambia de significado: maximizar la hoja
    // (mobile) o alternar sidebar / ventana flotante (desktop).
    expandBtn.addEventListener('click', function () {
      if (isMobileSheet()) toggleSheetFull();
      else toggleMode();
    });

    // Arrastre de la hoja: asa o barra superior. Los botones se excluyen
    // dentro de onDragStart para no robarles el click.
    handleEl.addEventListener('pointerdown', onDragStart);
    topbarEl.addEventListener('pointerdown', onDragStart);
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

  // Markdown mínimo del asistente: **negrita**, *cursiva*, `código` y listas
  // con guion o numeradas. El texto se escapa ANTES de insertar las etiquetas,
  // así que nada de lo que devuelve el modelo se interpreta: ni etiquetas ni
  // atributos (un intento de inyección se ve como texto).
  function inlineMd(str) {
    return str
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|\s)\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
  }

  function mdToHtml(text) {
    var out = [];
    var lista = null; // 'ul' | 'ol' mientras haya una lista abierta

    function cerrarLista() {
      if (lista) {
        out.push('</' + lista + '>');
        lista = null;
      }
    }

    escapeHtml(text || '').split('\n').forEach(function (linea) {
      var vineta = linea.match(/^\s*[-*•]\s+(.*)$/);
      var numerada = vineta ? null : linea.match(/^\s*\d+[.)]\s+(.*)$/);

      if (vineta || numerada) {
        var tipo = vineta ? 'ul' : 'ol';
        if (lista !== tipo) {
          cerrarLista();
          out.push('<' + tipo + '>');
          lista = tipo;
        }
        out.push('<li>' + inlineMd(vineta ? vineta[1] : numerada[1]) + '</li>');
        return;
      }

      cerrarLista();
      var limpia = linea.replace(/^\s+/, '');
      if (!limpia) {
        out.push('\n');
        return;
      }
      // Los encabezados no se usan en el chat: si aparecen, van en negrita.
      var sinTitulo = limpia.replace(/^#{1,6}\s+/, '');
      var cuerpo = inlineMd(sinTitulo);
      out.push((sinTitulo === limpia ? cuerpo : '<strong>' + cuerpo + '</strong>') + '\n');
    });

    cerrarLista();
    // Sin saltos de sobra al principio ni al final (el globo usa pre-wrap).
    return out.join('').replace(/^\n+/, '').replace(/\n+$/, '');
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
    var esUsuario = role === 'user';
    div.className = 'chat-msg chat-msg--' + (esUsuario ? 'user' : 'assistant');
    // Lo que escribe el usuario se muestra tal cual; solo las respuestas del
    // asistente pasan por el markdown mínimo.
    if (esUsuario) div.textContent = content || '';
    else div.innerHTML = mdToHtml(content);
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

  /* ── Hoja inferior (mobile ≤640px) ──────────────── */

  // Mismo corte que el CSS (≤640px).
  function isMobileSheet() {
    if (!mqMobile && window.matchMedia) mqMobile = window.matchMedia('(max-width: 640px)');
    return mqMobile ? mqMobile.matches : getWidth() <= 640;
  }

  // Alturas reales (px) de los dos estados de la hoja. Se miden con una sonda
  // que usa los mismos valores que el CSS (60svh / 100dvh) para no depender de
  // suposiciones entre svh/dvh/innerHeight. svh y dvh se recalculan en resize.
  function measureSheetMetrics() {
    var probe = document.createElement('div');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:absolute;left:0;top:0;width:0;height:60svh;visibility:hidden;pointer-events:none';
    document.body.appendChild(probe);
    var def = probe.getBoundingClientRect().height;
    probe.style.height = '100dvh';
    var full = probe.getBoundingClientRect().height;
    document.body.removeChild(probe);
    // Motor sin svh/dvh: se cae a 60vh / 100vh.
    if (!full) full = window.innerHeight || 0;
    if (!def) def = full * 0.6;
    sheetMetrics.def = def;
    sheetMetrics.full = full;
  }

  // El botón de la cabecera significa cosas distintas según el contexto:
  //   mobile  → maximizar / restaurar la hoja
  //   desktop → sidebar / ventana flotante
  function syncExpandBtn() {
    if (!expandBtn) return;
    if (isMobileSheet()) {
      var full = panel.classList.contains('chat-panel--full');
      expandBtn.innerHTML = full ? SVG.restore : SVG.maximize;
      expandBtn.title = full ? 'Restaurar' : 'Maximizar';
      expandBtn.setAttribute('aria-label', full ? 'Restaurar' : 'Maximizar');
      return;
    }
    var sidebar = state.mode === 'sidebar' && getWidth() >= DESKTOP_MIN;
    expandBtn.innerHTML = sidebar ? SVG.pip : SVG.sidebar;
    expandBtn.title = sidebar ? 'Convertir en ventana flotante' : 'Convertir en panel lateral';
    expandBtn.setAttribute('aria-label', expandBtn.title);
  }

  function setSheetFull(on) {
    if (!panel) return;
    panel.classList.toggle('chat-panel--full', !!on);
    syncExpandBtn();
  }

  function toggleSheetFull() {
    setSheetFull(!panel.classList.contains('chat-panel--full'));
  }

  // Desplazamiento Y real del panel (0 en su posición; > 0 mientras se desliza
  // o entra desde abajo). Deja que un arrastre continúe desde donde está la
  // hoja aunque la animación de apertura siga en curso, sin saltos.
  function currentSheetTy() {
    var inline = panel.style.transform || '';
    var m = /translateY\(([-\d.]+)px\)/.exec(inline);
    if (m) return parseFloat(m[1]) || 0;
    var cs = window.getComputedStyle(panel).transform;
    if (!cs || cs === 'none') return 0;
    var p = /matrix\(([^)]+)\)/.exec(cs);
    if (!p) return 0;
    var parts = p[1].split(',');
    return parseFloat(parts[5]) || 0; // ty de la matriz
  }

  // Arrastre de la hoja. Se resuelve con una única coordenada, y = altura
  // visible: 0 cerrada, D (60svh) por defecto, V (100dvh) pantalla completa.
  // Con y >= D crece la altura (el borde superior sube); con y <= D la hoja se
  // desliza entera hacia abajo con translateY, sin aplastar el contenido.
  function onDragStart(ev) {
    if (!state.open || !isMobileSheet()) return;
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    // Los botones de la cabecera conservan su click.
    if (ev.target && ev.target.closest && ev.target.closest('.chat-btn')) return;
    if (!sheetMetrics.full) measureSheetMetrics();

    drag = {
      id: ev.pointerId,
      startY: ev.clientY,
      // Altura visible actual (la hoja puede estar a mitad de la animación).
      startY0: Math.max(0, panel.getBoundingClientRect().height - currentSheetTy()),
      startFull: panel.classList.contains('chat-panel--full'),
      lastY: ev.clientY,
      lastT: ev.timeStamp,
      vy: 0, // velocidad en px/ms (+ hacia abajo)
      moved: false,
    };
    panel.classList.add('chat-panel--dragging');
    document.addEventListener('pointermove', onDragMove);
    document.addEventListener('pointerup', onDragEnd);
    document.addEventListener('pointercancel', onDragCancel);
    try { ev.currentTarget.setPointerCapture(ev.pointerId); } catch (err) { /* opcional */ }
  }

  function onDragMove(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var dt = ev.timeStamp - drag.lastT;
    if (dt > 0) {
      drag.vy = (ev.clientY - drag.lastY) / dt;
      drag.lastY = ev.clientY;
      drag.lastT = ev.timeStamp;
    }
    var dy = ev.clientY - drag.startY;
    if (Math.abs(dy) > 6) drag.moved = true;

    var D = sheetMetrics.def;
    var V = sheetMetrics.full;
    // Desde pantalla completa no se baja más allá del estado por defecto:
    // cerrar es un segundo gesto (o la X).
    var minY = drag.startFull ? D : 0;
    var y = Math.min(V, Math.max(minY, drag.startY0 - dy));
    var h;
    var ty;
    if (y >= D) {
      h = y;
      ty = 0;
    } else {
      h = D;
      ty = D - y;
    }
    panel.style.height = h + 'px';
    panel.style.transform = 'translateY(' + ty + 'px)';
  }

  function endDrag() {
    drag = null;
    panel.classList.remove('chat-panel--dragging');
    document.removeEventListener('pointermove', onDragMove);
    document.removeEventListener('pointerup', onDragEnd);
    document.removeEventListener('pointercancel', onDragCancel);
  }

  // Limpia la geometría en línea y deja mandar al estado destino: la
  // transición del CSS anima desde donde quedó el dedo.
  function releaseDrag() {
    panel.style.height = '';
    panel.style.transform = '';
  }

  function onDragEnd(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var d = drag;
    var dy = ev.clientY - d.startY;
    var D = sheetMetrics.def;
    var V = sheetMetrics.full;
    var flickDown = d.vy > 0.5;
    var flickUp = d.vy < -0.5;
    var target;

    if (!d.moved) {
      target = d.startFull ? 'full' : 'default';
    } else if (d.startFull) {
      // Desde pantalla completa un arrastre hacia abajo baja al estado por
      // defecto (no cierra): cerrar es un segundo gesto, o la X.
      target = (dy > (V - D) * 0.4 || flickDown) ? 'default' : 'full';
    } else if (dy < 0) {
      target = (-dy > (V - D) * 0.4 || flickUp) ? 'full' : 'default';
    } else {
      target = (dy > D * 0.3 || flickDown) ? 'closed' : 'default';
    }

    endDrag();
    releaseDrag();
    if (target === 'closed') closePanel();
    else setSheetFull(target === 'full');
  }

  function onDragCancel(ev) {
    if (!drag || ev.pointerId !== drag.id) return;
    var wasFull = drag.startFull;
    endDrag();
    releaseDrag();
    setSheetFull(wasFull);
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

  // Marca/desmarca el scroller de la ventana (.site-shell-inner) para que
  // Lenis ignore su wheel/touch mientras la sidebar está abierta.
  function setInnerLenisGate(on) {
    var shellInner = getInner();
    if (!shellInner) return;
    if (on) shellInner.setAttribute('data-lenis-prevent', '');
    else shellInner.removeAttribute('data-lenis-prevent');
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
    // En modo ventana el scroll vive en .site-shell-inner: marcarlo para que
    // Lenis ignore el wheel/touch que nace dentro (rueda nativo). Fuera de la
    // ventana el shell-inner es neutro (display: contents), así que se quita.
    setInnerLenisGate(sidebar);
    if (sidebar) {
      // Espejo: la ventana arranca donde estaba el scroll del documento.
      if (!wasSidebar) {
        savedDocScroll = preScroll;
        var inner = getInner();
        if (inner) inner.scrollTop = preScroll;
      }
    }
    syncExpandBtn();
    if (nowLeaving) restoreDocScroll();
    syncScrollLock(sidebar);
  }

  function restoreDocScroll() {
    var s = savedDocScroll;
    var lenis = getLenis();
    requestAnimationFrame(function () {
      // Preferimos Lenis (deja su estado interno coherente con el scroll real);
      // si no está, scroll nativo.
      if (lenis && typeof lenis.scrollTo === 'function') {
        try { lenis.scrollTo(s, { immediate: true }); return; } catch (err) { /* cae al nativo */ }
      }
      try { window.scrollTo(0, s); } catch (err) { /* sin salto */ }
    });
  }

  // Con la sidebar, la ventana interna del shell (.site-shell-inner) es el
  // scroller y el documento deja de rodar. Lenis (home/magicos) NO se
  // destruye: en modo ventana marcamos el shell-inner con data-lenis-prevent
  // y Lenis ignora el wheel/touch que nace dentro de él (ver onVirtualScroll
  // del vendor: si algún elemento de la ruta tiene el atributo, retorna sin
  // preventDefault), dejando que el contenedor ruede de forma nativa. Así la
  // instancia de Lenis sigue viva e intacta para la página: al cerrar no hay
  // nada que recrear ni scroll que se rompa.
  //
  // En ventana tampoco hay reveals de scroll: ScrollTrigger no volverá a
  // dispararse (el scroll del doc está congelado), así que todo lo que
  // quedaría oculto/invisible se fuerza a su estado final.
  function getLenis() {
    return window.__homeLenis || window.__pageLenis || null;
  }

  function syncScrollLock(locked) {
    if (locked) {
      completeReveals();
      return;
    }
    // Al salir, el documento vuelve a ser scroller: re-medimos Lenis (el doc
    // cambió de alto mientras estaba congelado) y refrescamos los triggers.
    var lenis = getLenis();
    if (lenis && typeof lenis.resize === 'function') {
      try { lenis.resize(); } catch (err) { /* opcional */ }
    }
    if (window.ScrollTrigger && typeof window.ScrollTrigger.refresh === 'function') {
      try { window.ScrollTrigger.refresh(); } catch (err) { /* opcional */ }
    }
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
    // En mobile la hoja arranca siempre en su altura por defecto, con scrim
    // (la regla base lo mantiene invisible en desktop).
    if (isMobileSheet()) {
      setSheetFull(false);
      measureSheetMetrics();
    }
    scrim.classList.add('chat-scrim--open');
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
      // En mobile la hoja abre al 60%: no robamos el foco para no abrir el
      // teclado y taparla. Ahí el teclado aparece al tocar el campo.
      var autofocus = opts.focus === true || (opts.focus !== false && !isMobileSheet());
      if (autofocus && inputEl) {
        try { inputEl.focus(); } catch (err) { /* sin foco */ }
      }
    }, opts.animate === false ? 0 : 240);
  }

  function closePanel() {
    if (!state.open) return;
    if (inputEl) state.draft = inputEl.value;
    state.open = false;
    if (drag) endDrag();
    panel.classList.remove('chat-panel--open');
    panel.classList.remove('chat-panel--full');
    panel.classList.remove('chat-panel--dragging');
    panel.style.height = '';
    panel.style.transform = '';
    scrim.classList.remove('chat-scrim--open');
    var wasSidebar = lastSidebar;
    document.body.classList.remove('chat-shell');
    setInnerLenisGate(false);
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
      if (state.mode !== 'card') return;
      // Ignorar el segundo click de un doble click: durante un toggle rápido
      // sidebar->float el panel se anima y ese click puede caer fuera del
      // rectángulo nuevo.
      if (ev.detail > 1) return;
      // Usar composedPath() (no ev.target): al hacer toggle sidebar->card,
      // applyMode() reemplaza el innerHTML del botón y el target del click
      // queda desacoplado del DOM, rompiendo panel.contains(target).
      if (ev.composedPath) {
        var path = ev.composedPath();
        if (path.indexOf(panel) !== -1 || path.indexOf(fab) !== -1) return;
      } else if (panel.contains(ev.target) || fab.contains(ev.target)) {
        return;
      }
      closePanel();
    });

    window.addEventListener('resize', function () {
      if (!state.open) return;
      // Al salir del tramo mobile, la hoja deja de aplicar: se restaura.
      if (!isMobileSheet() && panel.classList.contains('chat-panel--full')) {
        setSheetFull(false);
      }
      if (isMobileSheet()) measureSheetMetrics();
      if (state.mode === 'sidebar' && getWidth() < DESKTOP_MIN) {
        state.mode = 'card';
        applyMode();
        saveState();
      }
      syncExpandBtn();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();