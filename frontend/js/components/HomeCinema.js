(function () {
  const hero = document.querySelector('.home-hero');
  if (!hero) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined';
  const hasST = hasGsap && typeof window.ScrollTrigger !== 'undefined';

  if (!hasGsap || reduce) return;

  if (hasST) gsap.registerPlugin(ScrollTrigger);

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function splitWords(el) {
    const text = el.textContent.replace(/\s+/g, ' ').trim();
    if (!text) return [];
    el.textContent = '';
    const words = text.split(' ');
    words.forEach((word, i) => {
      const wrapper = document.createElement('span');
      wrapper.className = 'hm-word';
      const inner = document.createElement('span');
      inner.className = 'hm-word-inner';
      inner.innerHTML = escapeHtml(word);
      wrapper.appendChild(inner);
      el.appendChild(wrapper);
      if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
    });
    return el.querySelectorAll('.hm-word-inner');
  }

  const hoverOK = window.matchMedia('(hover: hover)').matches;

  // Scroll suave inercial (Lenis), solo en la homepage.
  if (window.Lenis) {
    try {
      const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      window.__homeLenis = lenis;
      if (hasST) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }
    } catch (e) { /* Lenis opcional */ }
  }

  // Anclas suaves (hero -> #ecosistema)
  document.querySelectorAll('.hm-scroll').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (window.__homeLenis) window.__homeLenis.scrollTo(target, { offset: 0 });
      else target.scrollIntoView({ behavior: 'smooth' });
    });
  });

  // ── HERO: entrada cinematográfica ─────────────────────────
  const logo = document.querySelector('.home-hero-logo');
  const headline = document.querySelector('.hm-headline');
  const sub = document.querySelector('.hm-sub');
  const cta = document.querySelector('.hm-cta');
  const hint = document.querySelector('.hm-scroll-hint');

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  if (logo) tl.from(logo, { opacity: 0, y: -24, duration: 1.4, ease: 'power2.out' }, 0);

  if (headline) {
    const inners = splitWords(headline);
    if (inners.length) {
      gsap.set(inners, { yPercent: 110 });
      tl.to(inners, { yPercent: 0, duration: 1.1, stagger: 0.06 }, 0.25);
    }
  }

  if (sub) tl.from(sub, { opacity: 0, y: 24, duration: 1 }, 0.95);
  if (cta) tl.from(cta, { opacity: 0, y: 20, duration: 0.9 }, 1.1);
  if (hint) tl.from(hint, { opacity: 0, duration: 1 }, 1.5);

  // Glow que sigue al cursor + galaxia con parallax
  const glowEl = document.querySelector('.home-hero-glow');
  const tintEl = document.querySelector('.home-hero-glow--tint');
  const galaxyEl = document.querySelector('.home-hero-galaxy');

  if (hoverOK && glowEl) {
    const glowX = gsap.quickTo(glowEl, 'x', { duration: 0.8, ease: 'power3.out' });
    const glowY = gsap.quickTo(glowEl, 'y', { duration: 0.8, ease: 'power3.out' });
    const tintX = tintEl ? gsap.quickTo(tintEl, 'x', { duration: 1.5, ease: 'power3.out' }) : null;
    const tintY = tintEl ? gsap.quickTo(tintEl, 'y', { duration: 1.5, ease: 'power3.out' }) : null;
    const galaxyX = galaxyEl ? gsap.quickTo(galaxyEl, 'x', { duration: 1.6, ease: 'power2.out' }) : null;
    const galaxyY = galaxyEl ? gsap.quickTo(galaxyEl, 'y', { duration: 1.6, ease: 'power2.out' }) : null;

    function moveGlow(e) {
      const r = hero.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      glowX(x * 0.5);
      glowY(y * 0.5);
      if (tintX) tintX(x * 0.25);
      if (tintY) tintY(y * 0.25);
      if (galaxyX) galaxyX(-x * 0.12);
      if (galaxyY) galaxyY(-y * 0.12);
    }

    function resetGlow() {
      glowX(0);
      glowY(0);
      if (tintX) tintX(0);
      if (tintY) tintY(0);
      if (galaxyX) galaxyX(0);
      if (galaxyY) galaxyY(0);
    }

    hero.addEventListener('pointermove', moveGlow);
    hero.addEventListener('pointerleave', resetGlow);
  }

  if (!hasST) return;

  // Navbar (solo homepage): ocultar su logo mientras el logo del hero esté en pantalla.
  // start: el logo llega al fondo del viewport · end: el logo sale por arriba.
  const navTitle = document.querySelector('.site-title');
  if (navTitle && logo) {
    ScrollTrigger.create({
      trigger: logo,
      start: 'bottom bottom',
      end: 'top top',
      toggleClass: { targets: navTitle, className: 'site-title--home-hidden' }
    });
  }

  // Parallax del contenido del hero al hacer scroll
  const heroInner = document.querySelector('.home-hero-inner');
  if (heroInner) {
    gsap.to(heroInner, {
      yPercent: 18,
      opacity: 0.35,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // Galaxia: parallax solo por translación (translate no re-rasteriza,
  // aislada del contenido del hero para evitar vibración).
  if (galaxyEl) {
    gsap.to(galaxyEl, {
      yPercent: 22,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // Parallax genérico [data-parallax="px"]
  document.querySelectorAll('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.getAttribute('data-parallax')) || 20;
    gsap.to(el, {
      y: speed,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  // Reveals al entrar en viewport (batch: rápido y fiable)
  const revealEls = gsap.utils.toArray('.hm-reveal');
  if (revealEls.length) {
    gsap.set(revealEls, { opacity: 0, y: 40 });
    ScrollTrigger.batch(revealEls, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.08,
          ease: 'power3.out',
          overwrite: true
        })
    });
  }

  // Manifiesto: palabras se encienden una vez al entrar
  const manifiesto = document.querySelector('.hm-manifiesto-text');
  if (manifiesto) {
    const inners = splitWords(manifiesto);
    if (inners.length) {
      gsap.set(inners, { opacity: 0.15 });
      gsap.to(inners, {
        opacity: 1,
        duration: 0.5,
        stagger: 0.06,
        ease: 'power2.out',
        scrollTrigger: { trigger: manifiesto, start: 'top 85%', once: true }
      });
    }
  }

  // Valores: leve tilt 3D al cursor
  if (hoverOK) {
    document.querySelectorAll('.hm-value-card').forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const rx = (e.clientX - r.left) / r.width - 0.5;
        const ry = (e.clientY - r.top) / r.height - 0.5;
        gsap.to(card, {
          rotateY: rx * 8,
          rotateX: -ry * 8,
          transformPerspective: 600,
          duration: 0.4,
          ease: 'power2.out'
        });
      });
      card.addEventListener('pointerleave', () => {
        gsap.to(card, { rotateY: 0, rotateX: 0, duration: 0.5, ease: 'power2.out' });
      });
    });
  }

  window.addEventListener('load', () => {
    ScrollTrigger.refresh();
    // Red de seguridad: si algún reveal cerca del viewport quedó oculto, se muestra.
    setTimeout(() => {
      const vh = window.innerHeight;
      document.querySelectorAll('.hm-reveal').forEach((el) => {
        if (gsap.getProperty(el, 'opacity') < 1) {
          const r = el.getBoundingClientRect();
          if (r.top < vh * 1.2) {
            gsap.to(el, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', overwrite: true });
          }
        }
      });
    }, 500);
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
