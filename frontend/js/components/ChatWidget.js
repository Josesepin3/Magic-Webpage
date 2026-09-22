// Botón flotante del asistente (Magic Assistant).
// Base visual: Adwaita (.circular + .suggested-action) en escala de FAB:
// círculo 56px táctil (glyph 24px + padding interno 16px) y margen externo
// 24px. Un FAB usa una escala propia, mayor que un botón común (~34px en
// Adwaita): 56px es el estándar flotante con ícono de 24px. Acento
// #3584e4, ícono blanco, plano. Hover "Aura": degradado con los colores
// del glow del hero de MagicOS (cian -> ámbar -> verde -> magenta) + glow
// e ícono con contraste. El panel del chat se agrega en la parte de
// frontend (pendiente); acá queda el toggle como stub.
(function () {
  function buildChatIcon() {
    return (
      '<svg class="chat-fab-icon" viewBox="0 0 16 16" width="24" height="24" aria-hidden="true" focusable="false">' +
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