(function () {
  const form = document.getElementById('profile-form');
  if (!form) return;

  const supabase = window.MagicOS && window.MagicOS.supabase;
  if (!supabase) return;

  const avatarBox = document.getElementById('profile-avatar');
  const avatarInput = document.getElementById('profile-avatar-input');
  const avatarHint = document.getElementById('profile-avatar-hint');
  const nameInput = form.elements.full_name;
  const emailInput = form.elements.email;
  const saveBtn = document.getElementById('profile-save');
  const logoutBtn = document.getElementById('profile-logout');
  const statusEl = form.querySelector('.form-status');

  let user = null;
  let profile = null;

  function redirectLogin() {
    window.location.href = MagicOS.url('/cuenta/login') + '?next=' + encodeURIComponent(MagicOS.currentPath());
  }

  function initials(nameOrEmail) {
    const value = String(nameOrEmail || '?').trim();
    const parts = value.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return value.slice(0, 2).toUpperCase();
  }

  function renderAvatar() {
    const name = (profile && profile.full_name) || user.email;
    if (profile && profile.avatar_url) {
      avatarBox.innerHTML = '<img class="user-avatar user-avatar--lg" src="' + profile.avatar_url + '" alt="Foto de perfil">';
    } else {
      avatarBox.innerHTML = '<span class="user-avatar user-avatar--initials user-avatar--lg" aria-hidden="true">' + initials(name) + '</span>';
    }
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.hidden = false;
    statusEl.className = 'form-status' + (isError ? ' is-error' : ' is-ok');
  }

  function setHint(message) {
    avatarHint.textContent = message;
    avatarHint.hidden = !message;
  }

  function uploadAvatar(file) {
    if (!file.type.startsWith('image/')) {
      setHint('Elige un archivo de imagen.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setHint('La imagen no puede superar los 2 MB.');
      return;
    }

    setHint('Subiendo…');
    const path = user.id + '/avatar-' + Date.now();

    supabase.storage.from('avatars').upload(path, file, { upsert: false }).then((res) => {
      if (res.error) {
        setHint('No se pudo subir la imagen.');
        return;
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id).then((res2) => {
        if (res2.error) {
          setHint('No se pudo guardar la foto.');
          return;
        }
        profile.avatar_url = data.publicUrl;
        renderAvatar();
        setHint('');
        if (window.MagicOS.refreshNav) window.MagicOS.refreshNav();
      });
    });
  }

  function handleSubmit(e) {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) {
      statusEl.hidden = true;
      nameInput.classList.add('is-invalid');
      return;
    }
    nameInput.classList.remove('is-invalid');
    saveBtn.disabled = true;
    supabase.from('profiles').update({ full_name: name }).eq('id', user.id).then((res) => {
      saveBtn.disabled = false;
      if (res.error) {
        setStatus('No se pudo guardar el nombre.', true);
        return;
      }
      profile.full_name = name;
      setStatus('Cambios guardados.', false);
      if (window.MagicOS.refreshNav) window.MagicOS.refreshNav();
    });
  }

  supabase.auth.getSession().then((res) => {
    user = (res.data && res.data.session && res.data.session.user) || null;
    if (!user) {
      redirectLogin();
      return;
    }
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle().then((res2) => {
      profile = res2.data || {};
      nameInput.value = profile.full_name || '';
      emailInput.value = user.email;
      renderAvatar();
    });
  });

  avatarInput.addEventListener('change', () => {
    if (avatarInput.files && avatarInput.files[0]) {
      uploadAvatar(avatarInput.files[0]);
    }
  });

  logoutBtn.addEventListener('click', () => {
    supabase.auth.signOut().then(() => redirectLogin());
  });

  nameInput.addEventListener('input', () => nameInput.classList.remove('is-invalid'));
  form.addEventListener('submit', handleSubmit);
})();
