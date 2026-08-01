(function () {
  var page = document.querySelector('.admin-dashboard');
  if (!page) return;

  var supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

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

  function parseFeatures(p) {
    if (!p.features_json) return [];
    try { return JSON.parse(p.features_json); } catch (e) { return []; }
  }

  function renderListError(list) {
    return function (err) {
      list.innerHTML = '<p class="empty-note is-error">' + esc(err.message) + '</p>';
    };
  }

  function showInlineError(err) {
    console.error(err);
  }

  logoutBtn.addEventListener('click', function () {
    supabase.auth.signOut().then(function () {
      window.location.href = MagicOS.url('/admin/login');
    });
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
    supabase.from('messages').select('*').order('created_at', { ascending: false }).then(function (res) {
      if (res.error) {
        messagesList.innerHTML = '<p class="empty-note is-error">' + esc(res.error.message) + '</p>';
        return;
      }
      var messages = res.data || [];
      if (!messages.length) {
        messagesList.innerHTML = '<p class="empty-note">No hay mensajes todavía.</p>';
        setCount(0, 0);
        return;
      }
      var unread = messages.filter(function (m) { return !m.read; }).length;
      setCount(messages.length, unread);
      messagesList.innerHTML = messages.map(renderMessage).join('');
    });
  }

  messagesList.addEventListener('click', function (e) {
    var toggle = e.target.closest('[data-toggle-read]');
    if (toggle) {
      var id = toggle.getAttribute('data-toggle-read');
      supabase.from('messages').select('read').eq('id', id).maybeSingle().then(function (res) {
        var newRead = !(res.data && res.data.read);
        return supabase.from('messages').update({ read: newRead }).eq('id', id);
      }).then(function (res) {
        if (!res.error) loadMessages();
      });
      return;
    }
    var del = e.target.closest('[data-delete-message]');
    if (del) {
      if (!window.confirm('¿Eliminar este mensaje?')) return;
      supabase.from('messages').delete().eq('id', del.getAttribute('data-delete-message')).then(function (res) {
        if (!res.error) loadMessages();
      });
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
    supabase.from('products').select('*').order('category', { ascending: true }).order('name', { ascending: true }).then(function (res) {
      if (res.error) {
        productsList.innerHTML = '<p class="empty-note is-error">' + esc(res.error.message) + '</p>';
        return;
      }
      var products = res.data || [];
      if (!products.length) {
        productsList.innerHTML = '<p class="empty-note">No hay productos. Crea el primero.</p>';
        return;
      }
      productsList.innerHTML = products.map(renderProduct).join('');
    });
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
      supabase.from('products').delete().eq('id', del.getAttribute('data-delete-product')).then(function (res) {
        if (!res.error) loadProducts();
      });
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
    form.elements.features_json.value = p.features_json ? JSON.stringify(parseFeatures(p)) : '';
  }

  function openDialog(id) {
    editingId = id || null;
    form.reset();
    clearDialogStatus();
    clearOptionRows();

    if (editingId) {
      dialogTitle.textContent = 'Editar producto';
      supabase.from('products').select('*').eq('id', editingId).maybeSingle().then(function (res) {
        if (res.error || !res.data) throw new Error(res.error ? res.error.message : 'Producto no encontrado');
        fillProductForm(res.data);
        return supabase.from('product_options').select('*').eq('product_id', editingId).order('group_order', { ascending: true }).order('sort_order', { ascending: true });
      }).then(function (res2) {
        optionRows = (res2.data || []).map(function (o) {
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

    var optionsPayload = optionRows.map(function (r) {
      return {
        group_name: r.group_name,
        label: r.label,
        description: r.description,
        price_modifier: Number(r.price_modifier) || 0,
        is_default: r.is_default
      };
    }).map(function (o, i) {
      o.sort_order = i;
      return o;
    });

    setDialogLoading(true);
    clearDialogStatus();

    var save = editingId
      ? supabase.from('products').update(payload).eq('id', editingId).select('id').single()
      : supabase.from('products').insert(payload).select('id').single();

    save.then(function (res) {
      if (res.error) throw new Error(res.error.message);
      var productId = res.data.id;
      return supabase.from('product_options').delete().eq('product_id', productId).then(function () {
        if (!optionsPayload.length) return { error: null };
        return supabase.from('product_options').insert(optionsPayload.map(function (o) {
          return { product_id: productId, group_name: o.group_name, label: o.label, description: o.description, price_modifier: o.price_modifier, is_default: o.is_default, group_order: 1, sort_order: o.sort_order };
        }));
      });
    }).then(function (res2) {
      if (res2.error) throw new Error(res2.error.message);
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

  function init() {
    supabase.auth.getUser().then(function (res) {
      var user = (res.data && res.data.user) || null;
      if (userNameEl && user) userNameEl.textContent = user.email || '';
    });
    loadMessages();
    loadProducts();
  }

  supabase.auth.getSession().then(function (res) {
    var sessionUser = (res.data && res.data.session && res.data.session.user) || null;
    if (!sessionUser) {
      window.location.href = MagicOS.url('/admin/login');
      return;
    }
    supabase.from('profiles').select('role').eq('id', sessionUser.id).maybeSingle().then(function (r) {
      if (!(r.data && r.data.role === 'admin')) {
        supabase.auth.signOut();
        window.location.href = MagicOS.url('/admin/login');
        return;
      }
      init();
    });
  });
})();
