(function () {
  const body = document.querySelector('[data-services-body]');
  if (!body) return;

  const supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

  function redirectLogin() {
    window.location.href = MagicOS.url('/cuenta/login') + '?next=' + encodeURIComponent(MagicOS.currentPath());
  }

  function planSummary(sub) {
    const opts = Array.isArray(sub.plan) ? sub.plan : [];
    if (!opts.length) return 'Configuración estándar';
    return opts.map((o) => (o.group || '') + ': ' + (o.label || '')).join(' · ');
  }

  function render(subs) {
    if (!subs.length) {
      body.innerHTML =
        '<div class="cart-empty">' +
          '<p>Aún no tienes servicios.</p>' +
          '<a class="btn-primary" href="' + MagicOS.url('/productos') + '">Ver productos</a>' +
        '</div>';
      return;
    }

    body.innerHTML =
      '<div class="services-grid">' +
        subs.map((sub) => {
          const active = sub.status === 'active';
          const pill = active
            ? '<span class="service-status service-status--active">Activo</span>'
            : '<span class="service-status service-status--soon">Próximamente</span>';
          const note = active
            ? '<p class="service-note">Tu licencia está activa. Todo listo para usar ' + sub.product_name + '.</p>'
            : '<p class="service-note">Tu compra queda registrada. Podrás acceder cuando el producto esté disponible.</p>';
          return (
            '<article class="service-card">' +
              '<div class="service-card-head">' +
                '<h3 class="service-name">' + sub.product_name + '</h3>' +
                pill +
              '</div>' +
              '<p class="service-plan">' + planSummary(sub) + '</p>' +
              note +
            '</article>'
          );
        }).join('') +
      '</div>';
  }

  supabase.auth.getSession().then((res) => {
    const user = (res.data && res.data.session && res.data.session.user) || null;
    if (!user) {
      redirectLogin();
      return;
    }

    supabase.from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then((res2) => {
        render(res2.data || []);
      });
  });
})();
