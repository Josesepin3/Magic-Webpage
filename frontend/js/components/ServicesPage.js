(function () {
  const body = document.querySelector('[data-services-body]');
  if (!body) return;

  const supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

  // Bloques compartidos de carga / error / vacío (js/components/AsyncState.js).
  const ui = window.MagicOS.ui;

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
      ui.empty(body, {
        text: 'Aún no tienes servicios.',
        action: { label: 'Ver productos', href: MagicOS.url('/productos') }
      });
      return;
    }

    ui.ready(body);
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

  // Carga de los servicios, reutilizable por el botón "Reintentar".
  function load() {
    ui.loading(body, 'cards', 2);
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
          if (res2.error) {
            ui.error(body, 'No se pudieron cargar tus servicios.', load, res2.error.message);
            return;
          }
          render(res2.data || []);
        });
    }).catch(() => {
      ui.error(body, 'No se pudieron cargar tus servicios.', load);
    });
  }

  load();
})();
