(function () {
  const body = document.querySelector('[data-cart-body]');
  if (!body) return;

  const supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

  // Bloques compartidos de carga / error / vacío (js/components/AsyncState.js).
  const ui = window.MagicOS.ui;

  let user = null;
  let items = [];

  function loginUrl() {
    return MagicOS.url('/cuenta/login') + '?next=' + encodeURIComponent(MagicOS.currentPath());
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
      ui.empty(body, {
        text: 'Tu carrito está vacío.',
        action: { label: 'Ver productos', href: MagicOS.url('/productos') }
      });
      return;
    }

    ui.ready(body);
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
        const antes = item.quantity;
        const qty = Math.max(1, antes + Number(btn.getAttribute('data-qty')));
        if (qty === antes) return;
        // Optimista: se pinta ya y, si el guardado falla, se deshace y se avisa.
        item.quantity = qty;
        render();
        supabase.from('cart_items').update({ quantity: qty }).eq('id', id).then((res) => {
          if (res.error) {
            item.quantity = antes;
            render();
            setStatus('No se pudo guardar la cantidad. Revisa tu conexión e inténtalo de nuevo.', true);
          }
        });
      });
    });

    body.querySelectorAll('.cart-item-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const row = btn.closest('.cart-item');
        const id = row.getAttribute('data-item-id');
        const quitado = items.find((i) => i.id === id);
        const posicion = items.indexOf(quitado);
        items = items.filter((i) => i.id !== id);
        render();
        supabase.from('cart_items').delete().eq('id', id).then((res) => {
          if (res.error) {
            items.splice(posicion, 0, quitado);
            render();
            setStatus('No se pudo eliminar el producto. Revisa tu conexión e inténtalo de nuevo.', true);
            return;
          }
          if (window.MagicOS.refreshNav) window.MagicOS.refreshNav();
        });
      });
    });

    document.getElementById('checkout-btn').addEventListener('click', checkout);
  }

  function setStatus(message, isError) {
    const el = body.querySelector('.checkout-status');
    // El carrito puede haberse quedado vacío: su marcado no tiene este hueco.
    if (!el) return;
    el.textContent = message;
    el.hidden = false;
    el.className = 'form-status checkout-status' + (isError ? ' is-error' : ' is-ok');
  }

  function checkout() {
    const btn = document.getElementById('checkout-btn');
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = 'Procesando…';
    setStatus('Confirmando pedido y registrando servicios…', false);

    // RPC transaccional (supabase/schema.sql): pedido + servicios + carrito
    // vacío ocurren en una sola transacción de PostgreSQL. Si algo falla, no
    // queda un pedido sin servicios ni un carrito a medio limpiar.
    supabase.rpc('checkout').then((res) => {
      if (res.error) {
        btn.disabled = false;
        btn.textContent = 'Pagar ahora (simulado)';
        const vacio = /carrito.*vac/i.test(res.error.message || '');
        setStatus(vacio
          ? 'Tu carrito está vacío.'
          : 'No se pudo confirmar el pedido. Revisa tu conexión e inténtalo de nuevo.', true);
        if (/checkout/i.test(res.error.message || '')) {
          console.error('Falta aplicar la función public.checkout() en Supabase:', res.error.message);
        }
        return;
      }

      const data = res.data || {};
      const total = Number(data.total) || 0;
      items = [];
      ui.empty(body, {
        text: '¡Pedido confirmado! Tus servicios ya están registrados.' +
          (total ? ' Total: ' + fmt(total) + '.' : ''),
        action: { label: 'Ver mis servicios', href: MagicOS.url('/cuenta/servicios') }
      });
      if (window.MagicOS.refreshNav) window.MagicOS.refreshNav();
    }).catch(() => {
      btn.disabled = false;
      btn.textContent = 'Pagar ahora (simulado)';
      setStatus('No se pudo confirmar el pedido. Revisa tu conexión e inténtalo de nuevo.', true);
    });
  }

  // Carga del carrito, reutilizable por el botón "Reintentar" del error.
  function loadCart() {
    ui.loading(body, 'rows', items.length || 2);
    supabase.from('cart_items')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then((res) => {
        if (res.error) {
          ui.error(body, 'No se pudo cargar tu carrito.', loadCart, res.error.message);
          return;
        }
        items = res.data || [];
        render();
      });
  }

  function start() {
    ui.loading(body, 'rows', 2);
    supabase.auth.getSession().then((res) => {
      user = (res.data && res.data.session && res.data.session.user) || null;
      if (!user) {
        ui.empty(body, {
          text: 'Necesitas iniciar sesión para ver tu carrito.',
          action: { label: 'Iniciar sesión', href: loginUrl() }
        });
        return;
      }

      loadCart();
    }).catch(() => {
      ui.error(body, 'No se pudo comprobar tu sesión.', start);
    });
  }

  start();
})();
