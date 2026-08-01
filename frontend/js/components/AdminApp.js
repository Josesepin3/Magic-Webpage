(function () {
  var page = document.querySelector('.admin-dashboard');
  if (!page) return;

  var TOKEN_KEY = 'magic-admin-token';
  var USER_KEY = 'magic-admin-user';
  var token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    window.location.href = '/admin/login';
    return;
  }

  var userNameEl = document.getElementById('admin-user');
  var logoutBtn = document.getElementById('admin-logout');
  var messagesList = document.getElementById('messages-list');
  var messagesCount = document.getElementById('messages-count');
  var productsList = document.getElementById('products-list');
  var newProductBtn = document.getElementById('product-new');
  var dialog = document.getElementById('product-dialog');
  var dialogTitle = document.getElementById('product-dialog-title');
  var form = document.getElementById('product-form');
  var optionsList = document.getElementById('options-list');
  var addOptionBtn = document.getElementById('option-add');
  var dialogStatus = form.querySelector('.form-status');
  var submitBtn = form.querySelector('button[type="submit"]');

  var editingId = null;
  var optionRows = [];

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function api(path, options) {
    options = options || {};
    options.headers = options.headers || {};
    options.headers['Authorization'] = 'Bearer ' + token;
    if (options.body && !options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json';
    }
    return fetch(path, options).then(function (res) {
      if (res.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = '/admin/login';
        throw new Error('No autorizado');
      }
      return res.json().then(function (data) {
        if (!res.ok) throw new Error((data && data.error) || ('Error ' + res.status));
        return data;
      }, function () {
        throw new Error('Error ' + res.status);
      });
    });
  }

  function renderListError(list) {
    return function (err) {
      list.innerHTML = '<p class="empty-note is-error">' + esc(err.message) + '</p>';
    };
  }

  function showInlineError(err) {
    console.error(err);
  }

  if (userNameEl) {
    userNameEl.textContent = localStorage.getItem(USER_KEY) || '';
  }

  logoutBtn.addEventListener('click', function () {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/admin/login';
  });

  function setCount(total, unread) {
    if (!messagesCount) return;
    messagesCount.hidden = total === 0;
    messagesCount.textContent = unread ? total + ' (' + unread + ' sin leer)' : String(total);
  }

  function renderMessage(m) {
    return '<article class="message-card' + (m.read ? ' is-read' : '') + '">' +
      '<div class="message-meta">' +
        '<strong>' + esc(m.name) + '</strong>' +
        ' · <a href="mailto:' + esc(m.email) + '">' + esc(m.email) + '</a>' +
        (m.subject ? ' · <span class="message-subject">' + esc(m.subject) + '</span>' : '') +
        ' · <time class="message-date">' + esc(String(m.created_at || '').slice(0, 16)) + '</time>' +
      '</div>' +
      '<p class="message-text">' + esc(m.message) + '</p>' +
      '<div class="message-actions">' +
        '<button type="button" class="btn-ghost btn-small" data-toggle-read="' + m.id + '">' + (m.read ? 'Marcar no leído' : 'Marcar leído') + '</button>' +
        '<button type="button" class="btn-danger btn-small" data-delete-message="' + m.id + '">Eliminar</button>' +
      '</div>' +
    '</article>';
  }

  function loadMessages() {
    messagesList.innerHTML = '<p class="empty-note">Cargando mensajes…</p>';
    api('/api/admin/messages').then(function (messages) {
      if (!messages.length) {
        messagesList.innerHTML = '<p class="empty-note">No hay mensajes todavía.</p>';
        setCount(0, 0);
        return;
      }
      var unread = messages.filter(function (m) { return !m.read; }).length;
      setCount(messages.length, unread);
      messagesList.innerHTML = messages.map(renderMessage).join('');
    }).catch(renderListError(messagesList));
  }

  messagesList.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-toggle-read]');
    if (toggle) {
      api('/api/admin/messages/' + toggle.getAttribute('data-toggle-read'), {
        method: 'PATCH',
        body: JSON.stringify({})
      }).then(loadMessages).catch(showInlineError);
      return;
    }
    var del = e.target.closest('[data-delete-message]');
    if (del) {
      if (!window.confirm('¿Eliminar este mensaje?')) return;
      api('/api/admin/messages/' + del.getAttribute('data-delete-message'), { method: 'DELETE' })
        .then(loadMessages).catch(showInlineError);
    }
  });

  function renderProduct(p) {
    var price = p.base_price ? '$' + Number(p.base_price).toLocaleString('es') : 'Gratis';
    return '<article class="product-admin-row">' +
      '<div class="product-admin-info">' +
        '<strong>' + esc(p.name) + '</strong>' +
        '<span class="product-admin-slug">' + esc(p.slug) + '</span>' +
        '<span class="status-chip ' + (p.status === 'available' ? 'is-available' : 'is-soon') + '">' + (p.status === 'available' ? 'Disponible' : 'Próximamente') + '</span>' +
        '<span class="product-admin-price">' + price + '</span>' +
      '</div>' +
      '<div class="product-admin-actions">' +
        '<button type="button" class="btn-ghost btn-small" data-edit-product="' + p.id + '">Editar</button>' +
        '<button type="button" class="btn-danger btn-small" data-delete-product="' + p.id + '">Eliminar</button>' +
      '</div>' +
    '</article>';
  }

  function loadProducts() {
    productsList.innerHTML = '<p class="empty-note">Cargando productos…</p>';
    api('/api/admin/products').then(function (products) {
      if (!products.length) {
        productsList.innerHTML = '<p class="empty-note">No hay productos. Crea el primero.</p>';
        return;
      }
      productsList.innerHTML = products.map(renderProduct).join('');
    }).catch(renderListError(productsList));
  }

  productsList.addEventListener('click', function (e) {
    var edit = e.target.closest('[data-edit-product]');
    if (edit) {
      openDialog(Number(edit.getAttribute('data-edit-product')));
      return;
    }
    var del = e.target.closest('[data-delete-product]');
    if (del) {
      if (!window.confirm('¿Eliminar este producto? También se borrarán sus opciones.')) return;
      api('/api/admin/products/' + del.getAttribute('data-delete-product'), { method: 'DELETE' })
        .then(loadProducts).catch(showInlineError);
    }
  });

  function renderOptionRows() {
    if (!optionsList) return;
    if (!optionRows.length) {
      optionsList.innerHTML = '<p class="empty-note">Sin opciones.</p>';
      return;
    }
    optionsList.innerHTML = optionRows.map(function (row, i) {
      return '<div class="option-row" data-index="' + i + '">' +
        '<input type="text" data-row="group_name" value="' + esc(row.group_name) + '" placeholder="Grupo (p. ej. RAM)" aria-label="Grupo">' +
        '<input type="text" data-row="label" value="' + esc(row.label) + '" placeholder="Etiqueta (p. ej. 16GB)" aria-label="Etiqueta">' +
        '<input type="text" data-row="description" value="' + esc(row.description) + '" placeholder="Descripción" aria-label="Descripción">' +
        '<input type="number" data-row="price_modifier" value="' + esc(row.price_modifier) + '" placeholder="+USD" aria-label="Precio adicional">' +
        '<label class="option-default"><input type="checkbox" data-row="is_default"' + (row.is_default ? ' checked' : '') + '> Base</label>' +
        '<button type="button" class="btn-danger btn-small" data-remove-option aria-label="Quitar opción">✕</button>' +
      '</div>';
    }).join('');
  }

  function clearOptionRows() {
    optionRows = [];
    renderOptionRows();
  }

  function fillProductForm(p) {
    form.elements.name.value = p.name || '';
    form.elements.slug.value = p.slug || '';
    form.elements.tagline.value = p.tagline || '';
    form.elements.description.value = p.description || '';
    form.elements.base_price.value = p.base_price == null ? '' : p.base_price;
    form.elements.category.value = p.category || 'os';
    form.elements.status.value = p.status || 'available';
    form.elements.image_url.value = p.image_url || '';
    form.elements.features_json.value = p.features_json ? JSON.stringify(p.features) : '';
  }

  function openDialog(id) {
    editingId = id || null;
    form.reset();
    clearDialogStatus();
    clearOptionRows();

    if (editingId) {
      dialogTitle.textContent = 'Editar producto';
      api('/api/admin/products/' + editingId).then(function (p) {
        fillProductForm(p);
        return api('/api/admin/products/' + editingId + '/options');
      }).then(function (options) {
        optionRows = options.map(function (o) {
          return {
            group_name: o.group_name,
            label: o.label,
            description: o.description,
            price_modifier: o.price_modifier,
            is_default: Boolean(o.is_default)
          };
        });
        renderOptionRows();
        dialog.showModal();
      }).catch(function (err) {
        console.error(err);
      });
    } else {
      dialogTitle.textContent = 'Nuevo producto';
      dialog.showModal();
    }
  }

  optionsList.addEventListener('input', function (e) {
    var row = e.target.closest('[data-index]');
    if (!row) return;
    var index = Number(row.getAttribute('data-index'));
    var field = e.target.getAttribute('data-row');
    if (!field) return;
    if (field === 'is_default') {
      optionRows[index].is_default = e.target.checked;
    } else {
      optionRows[index][field] = e.target.value;
    }
  });

  optionsList.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-remove-option]');
    if (!btn) return;
    var row = btn.closest('[data-index]');
    optionRows.splice(Number(row.getAttribute('data-index')), 1);
    renderOptionRows();
  });

  addOptionBtn.addEventListener('click', function () {
    optionRows.push({ group_name: '', label: '', description: '', price_modifier: '', is_default: false });
    renderOptionRows();
  });

  function validateProductForm() {
    var firstInvalid = null;
    var fields = ['name', 'base_price'];
    fields.forEach(function (name) {
      var input = form.elements[name];
      var error = '';
      if (name === 'name' && !input.value.trim()) error = 'El nombre es obligatorio.';
      if (name === 'base_price' && (input.value === '' || Number.isNaN(Number(input.value)) || Number(input.value) < 0)) {
        error = 'Precio inválido.';
      }
      var errorEl = form.querySelector('[data-error-for="' + name + '"]');
      input.classList.toggle('is-invalid', Boolean(error));
      if (errorEl) errorEl.textContent = error;
      if (error && !firstInvalid) firstInvalid = input;
    });

    var feats = form.elements.features_json;
    if (feats.value.trim()) {
      try {
        JSON.parse(feats.value.trim());
      } catch (e) {
        feats.classList.add('is-invalid');
        var featErr = form.querySelector('[data-error-for="features_json"]');
        if (featErr) featErr.textContent = 'El JSON no es válido.';
        if (!firstInvalid) firstInvalid = feats;
      }
    }
    return firstInvalid;
  }

  form.addEventListener('input', function (e) {
    e.target.classList.remove('is-invalid');
    var errorEl = form.querySelector('[data-error-for="' + (e.target.name || '') + '"]');
    if (errorEl) errorEl.textContent = '';
  });

  function setDialogStatus(type, message) {
    if (!dialogStatus) return;
    dialogStatus.textContent = message;
    dialogStatus.classList.toggle('is-success', type === 'success');
    dialogStatus.classList.toggle('is-error', type === 'error');
    dialogStatus.hidden = false;
  }

  function clearDialogStatus() {
    if (!dialogStatus) return;
    dialogStatus.hidden = true;
    dialogStatus.textContent = '';
    dialogStatus.classList.remove('is-success', 'is-error');
  }

  function setDialogLoading(loading) {
    form.classList.toggle('is-loading', loading);
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Guardando…' : 'Guardar';
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn && submitBtn.disabled) return;

    var firstInvalid = validateProductForm();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    var payload = {
      name: form.elements.name.value.trim(),
      slug: form.elements.slug.value.trim(),
      tagline: form.elements.tagline.value.trim(),
      description: form.elements.description.value.trim(),
      base_price: Number(form.elements.base_price.value) || 0,
      category: form.elements.category.value,
      status: form.elements.status.value,
      image_url: form.elements.image_url.value.trim(),
      features_json: form.elements.features_json.value.trim()
    };

    setDialogLoading(true);
    clearDialogStatus();

    var save = editingId
      ? api('/api/admin/products/' + editingId, { method: 'PUT', body: JSON.stringify(payload) })
      : api('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) });

    save.then(function (saved) {
      var optionsPayload = JSON.stringify({
        options: optionRows.map(function (r) {
          return {
            group_name: r.group_name,
            label: r.label,
            description: r.description,
            price_modifier: Number(r.price_modifier) || 0,
            is_default: r.is_default
          };
        })
      });
      return api('/api/admin/products/' + saved.id + '/options', { method: 'PUT', body: optionsPayload }).then(function () {
        return saved;
      });
    }).then(function () {
      setDialogLoading(false);
      dialog.close();
      loadProducts();
    }).catch(function (err) {
      setDialogLoading(false);
      setDialogStatus('error', err.message);
    });
  });

  dialog.querySelectorAll('[data-close]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      dialog.close();
    });
  });

  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) dialog.close();
  });

  newProductBtn.addEventListener('click', function () {
    openDialog(null);
  });

  loadMessages();
  loadProducts();
})();
