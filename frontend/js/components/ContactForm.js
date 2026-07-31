(function () {
  var form = document.querySelector('.contact-form');
  if (!form) return;

  var statusEl = form.querySelector('.form-status');
  var submitBtn = form.querySelector('button[type="submit"]');

  var validators = {
    name: function (value) {
      value = value.trim();
      if (!value) return 'Por favor, escribe tu nombre.';
      if (value.length < 2) return 'El nombre debe tener al menos 2 caracteres.';
      return '';
    },
    email: function (value) {
      value = value.trim();
      if (!value) return 'Por favor, escribe tu correo electrónico.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Introduce un correo electrónico válido.';
      return '';
    },
    subject: function () {
      return '';
    },
    message: function (value) {
      value = value.trim();
      if (!value) return 'Por favor, escribe tu mensaje.';
      if (value.length < 10) return 'El mensaje debe tener al menos 10 caracteres.';
      return '';
    }
  };

  function getField(name) {
    return form.querySelector('[name="' + name + '"]');
  }

  function getErrorEl(name) {
    return form.querySelector('[data-error-for="' + name + '"]');
  }

  function setFieldError(name, message) {
    var input = getField(name);
    var errorEl = getErrorEl(name);
    if (input) input.classList.toggle('is-invalid', Boolean(message));
    if (errorEl) errorEl.textContent = message || '';
  }

  function validateField(name) {
    var input = getField(name);
    var error = validators[name](input ? input.value : '');
    setFieldError(name, error);
    return error;
  }

  function validateAll() {
    var firstInvalid = null;
    Object.keys(validators).forEach(function (name) {
      if (validateField(name) && !firstInvalid) {
        firstInvalid = getField(name);
      }
    });
    return firstInvalid;
  }

  Object.keys(validators).forEach(function (name) {
    var input = getField(name);
    if (!input) return;
    input.addEventListener('blur', function () {
      if (input.value.trim()) validateField(name);
    });
    input.addEventListener('input', function () {
      setFieldError(name, '');
      if (input.classList.contains('is-invalid')) validateField(name);
    });
  });

  function setStatus(type, message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('is-success', type === 'success');
    statusEl.classList.toggle('is-error', type === 'error');
    statusEl.hidden = false;
  }

  function clearStatus() {
    if (!statusEl) return;
    statusEl.hidden = true;
    statusEl.textContent = '';
    statusEl.classList.remove('is-success', 'is-error');
  }

  function setLoading(loading) {
    form.classList.toggle('is-loading', loading);
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Enviando…' : 'Enviar mensaje';
    }
  }

  function showSuccess() {
    setLoading(false);
    form.classList.add('is-success');
    setStatus('success', '¡Mensaje enviado! Te responderemos muy pronto.');
  }

  function showError() {
    setLoading(false);
    setStatus('error', 'No pudimos enviar tu mensaje. Inténtalo de nuevo en unos segundos.');
  }

  function submit() {
    setLoading(true);
    clearStatus();

    var payload = new URLSearchParams(new FormData(form));

    fetch(form.action, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json'
      },
      body: payload.toString()
    }).then(function (res) {
      return res.json().then(function (data) {
        if (res.ok && data && data.success === 'true') showSuccess();
        else showError();
      }, function () {
        if (res.ok) showSuccess();
        else showError();
      });
    }).catch(showError);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.classList.contains('is-loading') || form.classList.contains('is-success')) return;

    var firstInvalid = validateAll();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }
    submit();
  });
})();
