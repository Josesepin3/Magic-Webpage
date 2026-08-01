(function () {
  var form = document.getElementById('login-form');
  if (!form) return;

  var supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

  var statusEl = form.querySelector('.form-status');
  var submitBtn = form.querySelector('button[type="submit"]');

  var validators = {
    email: function (value) {
      if (!value.trim()) return 'Por favor, escribe tu correo.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Introduce un correo válido.';
      return '';
    },
    password: function (value) {
      if (!value) return 'Por favor, escribe tu contraseña.';
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

  function validateAll() {
    var firstInvalid = null;
    Object.keys(validators).forEach(function (name) {
      var input = getField(name);
      var error = validators[name](input ? input.value : '');
      setFieldError(name, error);
      if (error && !firstInvalid) firstInvalid = input;
    });
    return firstInvalid;
  }

  Object.keys(validators).forEach(function (name) {
    var input = getField(name);
    if (!input) return;
    input.addEventListener('blur', function () {
      if (input.value.trim()) {
        setFieldError(name, validators[name](input.value));
      }
    });
    input.addEventListener('input', function () {
      setFieldError(name, '');
    });
  });

  function setStatus(type, message) {
    if (!statusEl) return;
    statusEl.textContent = message;
    statusEl.classList.toggle('is-success', type === 'success');
    statusEl.classList.toggle('is-error', type === 'error');
    statusEl.hidden = false;
  }

  function setLoading(loading) {
    form.classList.toggle('is-loading', loading);
    if (submitBtn) {
      submitBtn.disabled = loading;
      submitBtn.textContent = loading ? 'Entrando…' : 'Entrar';
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (submitBtn && submitBtn.disabled) return;

    var firstInvalid = validateAll();
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    setLoading(true);
    if (statusEl) statusEl.hidden = true;

    supabase.auth.signInWithPassword({
      email: getField('email').value.trim(),
      password: getField('password').value
    }).then(function (res) {
      if (res.error) {
        setLoading(false);
        setStatus('error', 'Correo o contraseña incorrectos.');
        return;
      }
      supabase.from('profiles').select('role').eq('id', res.data.user.id).maybeSingle().then(function (roleRes) {
        if (roleRes.data && roleRes.data.role === 'admin') {
          window.location.href = MagicOS.url('/admin/dashboard');
        } else {
          supabase.auth.signOut();
          setLoading(false);
          setStatus('error', 'No tienes permisos de administrador.');
        }
      });
    }).catch(function () {
      setLoading(false);
      setStatus('error', 'No pudimos iniciar sesión.');
    });
  });
})();
