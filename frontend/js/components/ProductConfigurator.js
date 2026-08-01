(function () {
  var page = document.querySelector('.configure-page');
  if (!page) return;

  var basePrice = parseFloat(page.dataset.basePrice) || 0;

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

  buyButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.disabled) return;
      var magic = window.MagicOS;
      var supabase = magic && magic.supabase;
      if (!magic || !supabase) return;

      supabase.auth.getSession().then(function (res) {
        var user = (res.data && res.data.session && res.data.session.user) || null;
        if (!user) {
          window.location.href = magic.url('/cuenta/login') + '?next=' + encodeURIComponent(magic.currentPath());
          return;
        }

        btn.disabled = true;
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
            return;
          }
          var original = btn.textContent;
          btn.textContent = 'Añadido ✓';
          setTimeout(function () {
            btn.textContent = original;
            btn.disabled = false;
          }, 1600);
          if (magic.refreshNav) magic.refreshNav();
        });
      });
    });
  });
})();