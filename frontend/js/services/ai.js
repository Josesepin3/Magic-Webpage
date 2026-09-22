// Puente con la Edge Function "magic-chat" (Fase 5).
// Toda la lógica de negocio (precios vivos, catálogo allow-list, prompt,
// anti-spam) vive del lado del servidor; acá solo se autentica con la
// sesión de Supabase y se envía el historial de la conversación.
(function () {
  window.MagicOS = window.MagicOS || {};

  function ChatError(message) {
    this.name = 'ChatError';
    this.message = message;
  }

  MagicOS.sendChatMessage = async function (messages) {
    var cfg = window.MagicOSConfig;
    if (!cfg || !cfg.SUPABASE_URL) {
      throw new ChatError('El asistente no está disponible en este momento.');
    }

    var token = null;
    if (window.MagicOS && MagicOS.supabase) {
      try {
        var res = await MagicOS.supabase.auth.getSession();
        if (res && res.data && res.data.session) {
          token = res.data.session.access_token;
        }
      } catch (err) {
        token = null;
      }
    }

    var url = cfg.SUPABASE_URL + '/functions/v1/magic-chat';
    var init = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages }),
    };
    if (token) init.headers.Authorization = 'Bearer ' + token;

    var res;
    try {
      res = await fetch(url, init);
    } catch (err) {
      throw new ChatError('No se pudo contactar al asistente. Reintenta en unos segundos.');
    }

    if (!res.ok) {
      var detail = null;
      try { detail = await res.json(); } catch (err) { /* sin cuerpo */ }
      if (res.status === 401) {
        throw new ChatError('Para usar el asistente, inicia sesión.');
      }
      var msg = (detail && detail.error) ? detail.error : 'No se pudo enviar el mensaje. Reintenta en unos segundos.';
      throw new ChatError(msg);
    }

    var data = await res.json();
    return data && typeof data.reply === 'string' ? data.reply : '';
  };
})();