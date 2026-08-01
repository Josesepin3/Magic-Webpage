(function () {
  window.MagicOS = window.MagicOS || {};

  const body = document.body;
  MagicOS.basePath = (body && body.getAttribute('data-base-path')) || '';

  MagicOS.url = function (path) {
    if (!path) return MagicOS.basePath || '/';
    return MagicOS.basePath + path;
  };

  MagicOS.currentPath = function () {
    let p = window.location.pathname;
    if (MagicOS.basePath && p.indexOf(MagicOS.basePath) === 0) {
      p = p.slice(MagicOS.basePath.length);
    }
    return (p || '/') + window.location.search;
  };

  if (!window.supabase || !window.MagicOSConfig) {
    MagicOS.supabase = null;
    return;
  }

  MagicOS.supabase = window.supabase.createClient(
    MagicOSConfig.SUPABASE_URL,
    MagicOSConfig.SUPABASE_ANON_KEY
  );
})();
