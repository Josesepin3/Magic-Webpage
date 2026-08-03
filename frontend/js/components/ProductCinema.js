(function () {
  const root = document.querySelector('main.magicos-cinema');
  if (!root) return;

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

  // Scroll suave inercial (Lenis), como en la homepage.
  if (window.Lenis) {
    try {
      const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      window.__pageLenis = lenis;
      if (hasST) {
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }
    } catch (e) { /* Lenis opcional */ }
  }

  // ── HERO: entrada cinematográfica ─────────────────────────
  const logo = document.querySelector('.magicos-hero-logo');
  const tagline = document.querySelector('.magicos-hero-tagline');

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  if (logo) tl.from(logo, { opacity: 0, y: -28, duration: 1.3, ease: 'power2.out' }, 0);
  if (tagline) tl.from(tagline, { opacity: 0, y: 22, duration: 0.9 }, 0.65);

  // Títulos de sección: las palabras suben una por una al entrar
  root.querySelectorAll('.mop-head h2').forEach((h2) => {
    const inners = splitWords(h2);
    if (!inners.length) return;
    gsap.set(inners, { yPercent: 110 });
    gsap.to(inners, {
      yPercent: 0,
      duration: 0.9,
      stagger: 0.045,
      ease: 'power4.out',
      scrollTrigger: { trigger: h2, start: 'top 88%', once: true }
    });
  });

  // Pasos de "Involúcrate": fade-up escalonado
  const steps = gsap.utils.toArray('.steps-grid li');
  if (steps.length) {
    gsap.set(steps, { opacity: 0, y: 26 });
    ScrollTrigger.batch(steps, {
      start: 'top 92%',
      once: true,
      onEnter: (batch) =>
        gsap.to(batch, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          stagger: 0.07,
          ease: 'power3.out',
          overwrite: true
        })
    });
  }

  if (!hasST) return;

  // Parallax del hero al hacer scroll
  const hero = document.querySelector('.magicos-hero');
  const heroInner = document.querySelector('.magicos-hero-inner');
  if (hero && heroInner) {
    gsap.to(heroInner, {
      yPercent: 16,
      opacity: 0.35,
      ease: 'none',
      scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true }
    });
  }

  // Parallax genérico [data-parallax="px"]
  root.querySelectorAll('[data-parallax]').forEach((el) => {
    const speed = parseFloat(el.getAttribute('data-parallax')) || 20;
    gsap.to(el, {
      y: speed,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true }
    });
  });

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
