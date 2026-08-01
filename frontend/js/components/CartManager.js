(function () {
  const body = document.querySelector('[data-cart-body]');
  if (!body) return;

  const supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

  let user = null;
  let items = [];
  let productsStatus = {};

  function redirectLogin() {
    window.location.href = MagicOS.url('/cuenta/login') + '?next=' + encodeURIComponent(MagicOS.currentPath());
  }

  function fmt(n) {
    return '$' + Number(n || 0).toLocaleString();
  }

  function optionsSummary(item) {
    const opts = Array.isArray(item.options) ? item.options : [];
    if (!opts.length) return 'Configuración estándar';
    return opts.map((o) => (o.group || '') + ': ' + (o.label || '')).join(' · ');
  }

  function render() {
    if (!items.length) {
      body.innerHTML =
        '<div class="cart-empty">' +
          '<p>Tu carrito está vacío.</p>' +
          '<a class="btn-primary" href="' + MagicOS.url('/productos') + '">Ver productos</a>' +
        '</div>';
      return;
    }

    const total = items.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0);

    body.innerHTML =
      '<div class="cart-list">' +
        items.map((item) =>
          '<div class="cart-item" data-item-id="' + item.id + '">' +
            '<div class="cart-item-info">' +
              '<p class="cart-item-name">' + item.product_name + '</p>' +
              '<p class="cart-item-options">' + optionsSummary(item) + '</p>' +
            '</div>' +
            '<div class="cart-item-qty">' +
              '<button type="button" class="qty-btn" data-qty="-1" aria-label="Restar">−</button>' +
              '<span class="qty-value">' + item.quantity + '</span>' +
              '<button type="button" class="qty-btn" data-qty="1" aria-label="Sumar">+</button>' +
            '</div>' +
            '<p class="cart-item-price">' + fmt(item.unit_price * item.quantity) + '</p>' +
            '<button type="button" class="cart-item-remove" aria-label="Eliminar">Eliminar</button>' +
          '</div>'
        ).join('') +
      '</div>' +
      '<div class="cart-total-row">' +
        '<p class="cart-total-label">Total</p>' +
        '<p class="cart-total-price">' + fmt(total) + '</p>' +
      '</div>' +
      '<div class="cart-checkout">' +
        '<button type="button" class="btn-primary" id="checkout-btn">Pagar ahora (simulado)</button>' +
        '<p class="checkout-note">El pago es una simulación: al confirmar se genera tu pedido y tus servicios quedan registrados.</p>' +
      '</div>' +
      '<p class="form-status checkout-status" role="status" aria-live="polite" hidden></p>';

    body.querySelectorAll('[data-qty]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.cart-item');
        const id = row.getAttribute('data-item-id');
        const item = items.find((i) => i.id === id);
        const qty = Math.max(1, item.quantity + Number(btn.getAttribute('data-qty')));
        if (qty === item.quantity) return;
        item.quantity = qty;
        supabase.from('cart_items').update({ quantity: qty }).eq('id', id).then(() => render());
      });
    });

    body.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.cart-item');
        const id = row.getAttribute('data-item-id');
        supabase.from('cart_items').delete().eq('id', id).then(() => {
          items = items.filter((i) => i.id !== id);
          render();
          if (window.MagicOS.refreshNav) window.MagicOS.refreshNav();
        });
      });
    });

    document.getElementById('checkout-btn').addEventListener('click', checkout);
  }

  function setStatus(message, isError) {
    const el = body.querySelector('.checkout-status');
    el.textContent = message;
    el.hidden = false;
    el.className = 'form-status checkout-status' + (isError ? ' is-error' : ' is-ok');
  }

  function checkout() {
    const btn = document.getElementById('checkout-btn');
    btn.disabled = true;

    const orderRows = items.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      product_slug: i.product_slug,
      options: i.options,
      quantity: i.quantity,
      unit_price: i.unit_price,
      line_total: Number(i.unit_price) * Number(i.quantity)
    }));
    const total = orderRows.reduce((s, r) => s + r.line_total, 0);

    supabase.from('orders').insert({
      user_id: user.id,
      items: orderRows,
      total,
      status: 'confirmed'
    }).then((res) => {
      if (res.error) {
        btn.disabled = false;
        setStatus('No se pudo confirmar el pedido.', true);
        return;
      }

      const subs = orderRows.map((r) => ({
        user_id: user.id,
        product_id: r.product_id,
        product_name: r.product_name,
        plan: r.options,
        status: productsStatus[r.product_slug] === 'available' ? 'active' : 'proximamente'
      }));

      supabase.from('subscriptions').insert(subs).then((res2) => {
        if (res2.error) {
          btn.disabled = false;
          setStatus('Pedido confirmado, pero hubo un problema al registrar tus servicios.', true);
          return;
        }
        supabase.from('cart_items').delete().eq('user_id', user.id).then(() => {
          items = [];
          render();
          if (window.MagicOS.refreshNav) window.MagicOS.refreshNav();
          setStatus('¡Pedido confirmado! Revisa tus servicios en <a href="' + MagicOS.url('/cuenta/servicios') + '">Mis servicios</a>.', false);
        });
      });
    });
  }

  supabase.auth.getSession().then((res) => {
    user = (res.data && res.data.session && res.data.session.user) || null;
    if (!user) {
      body.innerHTML =
        '<div class="cart-empty">' +
          '<p>Necesitas iniciar sesión para ver tu carrito.</p>' +
          '<a class="btn-primary" href="' + MagicOS.url('/cuenta/login') + '?next=' + encodeURIComponent(MagicOS.currentPath()) + '">Iniciar sesión</a>' +
        '</div>';
      return;
    }

    supabase.from('products').select('slug,status').then((prodRes) => {
      (prodRes.data || []).forEach((p) => { productsStatus[p.slug] = p.status; });
    });

    supabase.from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then((res2) => {
        items = res2.data || [];
        render();
      });
  });
})();
