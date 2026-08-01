(function () {
  const form = document.getElementById('auth-form');
  if (!form) return;

  const supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

  const emailInput = form.elements.email;
  const passwordInput = form.elements.password;
  const nameField = document.querySelector('.auth-field--register');
  const nameInput = form.elements.full_name;
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const submitBtn = document.getElementById('auth-submit');
  const switchText = document.getElementById('auth-switch-text');
  const toggleBtn = document.getElementById('auth-toggle');
  const googleBtn = document.getElementById('auth-google');
  const statusEl = form.querySelector('.form-status');

  const params = new URLSearchParams(window.location.search);
  let mode = params.get('mode') === 'register' ? 'register' : 'login';
  const next = params.get('next') || '/cuenta/perfil';
  let submitting = false;

  if (window.MagicOSConfig && MagicOSConfig.GOOGLE) {
    googleBtn.hidden = false;
  }

  function setMode(newMode) {
    mode = newMode;
    title.textContent = mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
    subtitle.textContent = mode === 'login'
      ? 'Accede con tu cuenta Magic.'
      : 'Crea tu cuenta Magic en unos segundos.';
    submitBtn.textContent = mode === 'login' ? 'Entrar' : 'Crear cuenta';
    switchText.textContent = mode === 'login' ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?';
    toggleBtn.textContent = mode === 'login' ? 'Crear cuenta' : 'Iniciar sesión';
    nameField.hidden = mode !== 'register';
    nameInput.required = mode === 'register';
    passwordInput.autocomplete = mode === 'login' ? 'current-password' : 'new-password';
    clearStatus();
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.className = 'form-status' + (isError ? ' is-error' : ' is-ok');
  }

  function clearStatus() {
    statusEl.textContent = '';
    statusEl.hidden = true;
    statusEl.className = 'form-status';
  }

  function setLoading(loading) {
    submitBtn.disabled = loading;
    submitBtn.textContent = loading
      ? (mode === 'login' ? 'Entrando…' : 'Creando cuenta…')
      : (mode === 'login' ? 'Entrar' : 'Crear cuenta');
  }

  function showFieldError(input, message) {
    const err = form.querySelector('[data-error-for="' + input.name + '"]');
    if (err) err.textContent = message;
    input.classList.toggle('is-invalid', !!message);
  }

  function validate() {
    let ok = true;
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError(emailInput, 'Introduce un correo válido.');
      ok = false;
    } else {
      showFieldError(emailInput, '');
    }
    if (mode === 'register' && password.length < 6) {
      showFieldError(passwordInput, 'La contraseña debe tener al menos 6 caracteres.');
      ok = false;
    } else {
      showFieldError(passwordInput, '');
    }
    if (mode === 'register' && !nameInput.value.trim()) {
      showFieldError(nameInput, 'Introduce tu nombre.');
      ok = false;
    } else {
      showFieldError(nameInput, '');
    }
    return ok;
  }

  function redirect() {
    window.location.href = MagicOS.url(next);
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function showVerificationNotice(email) {
    form.classList.add('is-success');
    form.innerHTML =
      '<div class="account-verify">' +
        '<h2>Revisa tu correo</h2>' +
        '<p>Te enviamos un enlace de confirmación a <strong>' + escapeHtml(email) + '</strong>.</p>' +
        '<p class="account-verify-sub">Abre el correo para activar tu cuenta y poder iniciar sesión.</p>' +
      '</div>';
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    submitting = true;
    setLoading(true);
    clearStatus();

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    const finish = (res) => {
      const error = res.error;
      if (error) {
        submitting = false;
        setLoading(false);
        let msg = error.message;
        if (error.message === 'Invalid login credentials') {
          msg = 'Correo o contraseña incorrectos.';
        }
        setStatus(msg, true);
        return;
      }
      if (res.data.session) {
        redirect();
      } else {
        if (mode === 'register') {
          showVerificationNotice(email);
        } else {
          submitting = false;
          setLoading(false);
          setStatus('Revisa tu correo para confirmar la cuenta.', false);
        }
      }
    };

    if (mode === 'login') {
      supabase.auth.signInWithPassword({ email, password }).then(finish);
    } else {
      supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: nameInput.value.trim() } }
      }).then(finish);
    }
  }

  googleBtn.addEventListener('click', () => {
    clearStatus();
    googleBtn.disabled = true;
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + MagicOS.url('/cuenta/login') + '?next=' + encodeURIComponent(next) }
    }).then((res) => {
      if (res.error) {
        googleBtn.disabled = false;
        setStatus('No se pudo iniciar con Google. Revisa que esté configurado.', true);
      }
    });
  });

  toggleBtn.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
  form.addEventListener('submit', handleSubmit);
  emailInput.addEventListener('input', () => showFieldError(emailInput, ''));
  passwordInput.addEventListener('input', () => showFieldError(passwordInput, ''));
  if (nameInput) nameInput.addEventListener('input', () => showFieldError(nameInput, ''));

  setMode(mode);
})();
