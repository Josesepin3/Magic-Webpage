(function () {
  var page = document.querySelector('.configure-page');
  if (!page) return;

  var basePrice = parseFloat(page.dataset.basePrice) || 0;
  var user = null;

  var radios = page.querySelectorAll('input[type="radio"]');
  var totalEl = document.getElementById('total-price');
  var mobileTotalEl = document.getElementById('total-price-mobile');
  var summaryEl = document.getElementById('summary-selections');

  function getSelectedOptions() {
    var selected = {};
    radios.forEach(function (radio) {
      if (radio.checked) {
        var group = radio.closest('[data-group]');
        if (group) {
          selected[group.dataset.group] = {
            label: radio.closest('.option-card').querySelector('.option-label').textContent,
            price: parseFloat(radio.dataset.price) || 0
          };
        }
      }
    });
    return selected;
  }

  function updateSummary(selected) {
    if (!summaryEl) return;
    var lis = summaryEl.querySelectorAll('li');
    var groupNames = Object.keys(selected);
    lis.forEach(function (li, i) {
      if (i < groupNames.length) {
        var strong = li.querySelector('strong');
        if (strong) {
          li.innerHTML = '<strong>' + strong.textContent + '</strong> ' + selected[groupNames[i]].label;
        }
      }
    });
  }

  function updateTotal(selected) {
    var extra = 0;
    for (var key in selected) {
      extra += selected[key].price;
    }
    var total = basePrice + extra;
    var formatted = '$' + total.toLocaleString();
    if (totalEl) totalEl.textContent = formatted;
    if (mobileTotalEl) mobileTotalEl.textContent = formatted;
  }

  function updateCards() {
    radios.forEach(function (radio) {
      var card = radio.closest('.option-card');
      if (!card) return;
      card.classList.toggle('selected', radio.checked);
    });
  }

  function handleChange() {
    var selected = getSelectedOptions();
    updateCards();
    updateSummary(selected);
    updateTotal(selected);
  }

  radios.forEach(function (radio) {
    radio.addEventListener('change', handleChange);
  });

  handleChange();

  var buyButtons = page.querySelectorAll('[data-add-to-cart]');

  // Aviso de "añadiendo…" / error junto al botón que se pulsó: la página tiene
  // dos botones (resumen y barra móvil) y cada uno tiene su propio hueco.
  function setAddStatus(btn, message, isError) {
    var box = btn.closest('.summary-sticky') || btn.closest('.mobile-total-bar');
    var status = box ? box.querySelector('.add-status') : null;
    if (!status) return;
    status.hidden = !message;
    status.textContent = message || '';
    status.className = 'add-status form-status' + (isError ? ' is-error' : ' is-ok');
  }

  function selectedOptionsArray() {
    var selected = getSelectedOptions();
    return Object.keys(selected).map(function (group) {
      return {
        group: group,
        label: selected[group].label,
        price: selected[group].price
      };
    });
  }

  function totalPrice() {
    var extra = 0;
    var selected = getSelectedOptions();
    for (var key in selected) extra += selected[key].price;
    return basePrice + extra;
  }

  // Añadir al carrito. El botón queda bloqueado mientras se guarda (evita
  // duplicados por doble clic) y cualquier fallo se avisa junto al botón.
  function addToCart(btn) {
    var label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Añadiendo…';
    setAddStatus(btn, '');

    supabase.from('cart_items').insert({
      user_id: user.id,
      product_id: page.dataset.productId,
      product_name: page.dataset.productName,
      product_slug: page.dataset.productSlug,
      options: selectedOptionsArray(),
      unit_price: totalPrice(),
      quantity: 1
    }).then(function (insertRes) {
      if (insertRes.error) {
        btn.disabled = false;
        btn.textContent = label;
        setAddStatus(btn, 'No se pudo añadir al carrito. Inténtalo de nuevo.', true);
        return;
      }
      btn.textContent = 'Añadido ✓';
      setAddStatus(btn, 'Añadido al carrito.', false);
      setTimeout(function () { setAddStatus(btn, ''); }, 4000);
      setTimeout(function () {
        btn.textContent = label;
        btn.disabled = false;
      }, 1600);
      if (MagicOS.refreshNav) MagicOS.refreshNav();
    }).catch(function () {
      btn.disabled = false;
      btn.textContent = label;
      setAddStatus(btn, 'No se pudo añadir al carrito. Revisa tu conexión e inténtalo de nuevo.', true);
    });
  }

  buyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      var magic = window.MagicOS;
      var supabase = magic && magic.supabase;
      if (!magic || !supabase) return;

      supabase.auth.getSession().then(function (res) {
        var sessionUser = (res.data && res.data.session && res.data.session.user) || null;
        if (!sessionUser) {
          window.location.href = magic.url('/cuenta/login') + '?next=' + encodeURIComponent(magic.currentPath());
          return;
        }
        user = sessionUser;
        addToCart(btn);
      }).catch(function () {
        setAddStatus(btn, 'No se pudo comprobar tu sesión. Inténtalo de nuevo.', true);
      });
    });
  });
})();