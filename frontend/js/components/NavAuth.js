(function () {
  const supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

  const desktopSlot = document.querySelector('[data-nav-user]');
  const mobileSlot = document.querySelector('[data-nav-user-mobile]');
  if (!desktopSlot && !mobileSlot) return;

  const cartBadges = document.querySelectorAll('[data-cart-count]');

  let user = null;
  let profile = null;
  let initializing = true;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function initials(nameOrEmail) {
    const value = String(nameOrEmail || '?').trim();
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return value.slice(0, 2).toUpperCase();
  }

  function avatarHtml() {
    const name = (profile && profile.full_name) || (user && user.email) || '?';
    const url = profile && profile.avatar_url;
    if (url) {
      return '<img class="user-avatar" src="' + escapeAttr(url) + '" alt="' + escapeAttr(name) + '">';
    }
    return '<span class="user-avatar user-avatar--initials" aria-hidden="true">' + escapeHtml(initials(name)) + '</span>';
  }

  function menuHtml() {
    let links;
    if (user) {
      links = [
        '<a href="' + MagicOS.url('/cuenta/perfil') + '">Mi perfil</a>',
        '<a href="' + MagicOS.url('/carrito') + '">Mi carrito</a>',
        '<a href="' + MagicOS.url('/cuenta/servicios') + '">Mis servicios</a>',
        '<span class="user-menu-divider"></span>',
        '<button type="button" class="user-menu-logout">Cerrar sesión</button>'
      ];
    } else {
      links = [
        '<a href="' + MagicOS.url('/cuenta/login') + '">Iniciar sesión</a>',
        '<a href="' + MagicOS.url('/cuenta/login') + '?mode=register">Crear cuenta</a>'
      ];
    }
    return '<div class="user-menu" role="menu" hidden>' + links.join('') + '</div>';
  }

  function renderSlot(slot) {
    const label = user ? ((profile && profile.full_name) || user.email || 'Cuenta') : 'Cuenta';
    slot.innerHTML =
      '<button type="button" class="user-menu-btn" aria-haspopup="menu" aria-expanded="false" aria-label="' +
      escapeAttr(label) + '">' + avatarHtml() + '</button>' + menuHtml();

    const btn = slot.querySelector('.user-menu-btn');
    const menu = slot.querySelector('.user-menu');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = menu.hidden;
      closeAllMenus();
      menu.hidden = !willOpen;
      btn.setAttribute('aria-expanded', String(willOpen));
    });

    const logoutBtn = slot.querySelector('.user-menu-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    menu.addEventListener('click', (e) => e.stopPropagation());
  }

  function render() {
    [desktopSlot, mobileSlot].forEach((slot) => {
      if (slot) renderSlot(slot);
    });
  }

  function closeAllMenus() {
    document.querySelectorAll('.user-menu').forEach((m) => { m.hidden = true; });
    document.querySelectorAll('.user-menu-btn').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }

  function updateCartCount() {
    cartBadges.forEach((b) => { b.hidden = true; });
    if (!user) return;
    supabase.from('cart_items').select('id').eq('user_id', user.id).then((res) => {
      const n = (res.data && res.data.length) || 0;
      cartBadges.forEach((b) => {
        b.hidden = n === 0;
        b.textContent = n > 99 ? '99+' : String(n);
      });
    });
  }

  function logout() {
    supabase.auth.signOut().then(() => {
      user = null;
      profile = null;
      render();
      updateCartCount();
    });
  }

  function refresh() {
    supabase.auth.getSession().then((res) => {
      user = (res.data && res.data.session && res.data.session.user) || null;
      if (!user) {
        profile = null;
        render();
        updateCartCount();
        initializing = false;
        return;
      }
      supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then((res2) => {
        profile = res2.data || null;
        const meta = (user.user_metadata) || {};
        if (profile && !profile.avatar_url && meta.avatar_url) {
          supabase.from('profiles').update({ avatar_url: meta.avatar_url }).eq('id', user.id).then(() => {
            profile.avatar_url = meta.avatar_url;
            render();
          });
        }
        render();
        updateCartCount();
        initializing = false;
      });
    });
  }

  function handleAuthState(event) {
    if (initializing && event === 'INITIAL_SESSION') return;
    refresh();
  }

  document.addEventListener('click', closeAllMenus);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAllMenus(); });

  window.MagicOS.refreshNav = refresh;

  supabase.auth.onAuthStateChange(handleAuthState);
  refresh();
})();
