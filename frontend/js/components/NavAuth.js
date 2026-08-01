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

  var ICONS = {
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>',
    cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>',
    box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>',
    login: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>',
    userplus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>'
  };

  function menuHtml() {
    let links;
    if (user) {
      links = [
        '<a href="' + MagicOS.url('/cuenta/perfil') + '">' + ICONS.user + '<span>Mi perfil</span></a>',
        '<a href="' + MagicOS.url('/carrito') + '">' + ICONS.cart + '<span>Mi carrito</span></a>',
        '<a href="' + MagicOS.url('/cuenta/servicios') + '">' + ICONS.box + '<span>Mis servicios</span></a>',
        '<span class="user-menu-divider"></span>',
        '<button type="button" class="user-menu-logout">' + ICONS.logout + '<span>Cerrar sesión</span></button>'
      ];
    } else {
      links = [
        '<a href="' + MagicOS.url('/cuenta/login') + '">' + ICONS.login + '<span>Iniciar sesión</span></a>',
        '<a href="' + MagicOS.url('/cuenta/login') + '?mode=register">' + ICONS.userplus + '<span>Crear cuenta</span></a>'
      ];
    }
    return '<div class="user-menu" role="menu">' + links.join('') + '</div>';
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
      const willOpen = !menu.classList.contains('open');
      closeAllMenus();
      if (willOpen) menu.classList.add('open');
      btn.setAttribute('aria-expanded', String(willOpen));
    });

    const logoutBtn = slot.querySelector('.user-menu-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', logout);
    }

    menu.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) {
        e.stopPropagation();
      } else {
        closeAllMenus();
      }
    });
  }

  function render() {
    [desktopSlot, mobileSlot].forEach((slot) => {
      if (slot) renderSlot(slot);
    });
  }

  function closeAllMenus() {
    document.querySelectorAll('.user-menu').forEach((m) => m.classList.remove('open'));
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
