// Botón flotante del asistente (Magic Assistant).
// Base visual: Adwaita (.circular + .suggested-action): círculo 32px
// (ícono 16px + padding 8px), márgenes externos 24px, acento #3584e4,
// ícono blanco, plano. Hover "Aura": degradado de tonos vivos + glow e
// ícono con contraste. El panel del chat se agrega en la parte de
// frontend (pendiente); acá queda el toggle como stub.
(function () {
  function buildChatIcon() {
    return (
      '<svg class="chat-fab-icon" viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">' +
        '<rect x="0.5" y="1.5" width="15" height="9.75" rx="1.75" fill="currentColor"/>' +
        '<path d="M5.25 11.25 L10.75 11.25 L8 14.5 Z" fill="currentColor"/>' +
      '</svg>'
    );
  }

  function initChatFab() {
    if (document.querySelector('.chat-fab')) return;

    const fab = document.createElement('button');
    fab.type = 'button';
    fab.className = 'chat-fab';
    fab.title = 'Asistente Magic';
    fab.setAttribute('aria-label', 'Abrir asistente Magic');
    fab.setAttribute('aria-haspopup', 'dialog');
    fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = buildChatIcon();

    fab.addEventListener('click', function () {
      const open = fab.classList.toggle('chat-fab--active');
      fab.setAttribute('aria-expanded', String(open));
      fab.setAttribute('aria-label', open ? 'Cerrar asistente Magic' : 'Abrir asistente Magic');
      // TODO(chat): abrir/cerrar el panel aquí cuando exista.
    });

    document.body.appendChild(fab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initChatFab);
  } else {
    initChatFab();
  }
})();