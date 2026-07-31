(function () {
  var page = document.querySelector('.configure-page');
  if (!page) return;

  var basePrice = parseFloat(page.dataset.basePrice) || 0;

  var radios = page.querySelectorAll('input[type="radio"]');
  var totalEl = document.getElementById('total-price');
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
    if (totalEl) totalEl.textContent = '$' + total.toLocaleString();
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
})();