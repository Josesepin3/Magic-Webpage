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

  // ── CARROUSEL SCROLLYTELLING DE FUNCIONES ───────────────
  const carousel = document.querySelector('[data-mop-carousel]');
  if (carousel) {
    const slides = gsap.utils.toArray('[data-mop-slide]', carousel);
    const n = slides.length;
    if (n > 1) {
      const cards = slides.map((s) => s.querySelector('.mop-card'));
      const pills = slides.map((s) => s.querySelector('.mop-pill'));
      const numEl = carousel.querySelector('.mop-counter-num');
      const barEl = carousel.querySelector('.mop-progress-bar');
      const isMobile = () => window.matchMedia('(max-width: 640px)').matches;

      carousel.classList.add('is-mop-active');

      let lastVw = window.innerWidth;
      let spacing = 400;
      let pillY = 0;
      function measure() {
        lastVw = window.innerWidth;
        const w = slides[0].offsetWidth;
        const h = slides[0].offsetHeight;
        if (isMobile()) {
          spacing = 52;
          pillY = h / 2 + 52;
        } else {
          spacing = w / 2 + 40;
          pillY = 0;
        }
      }
      measure();

      function render(progress) {
        if (!Number.isFinite(progress)) progress = 0;
        progress = Math.max(0, Math.min(n - 1, progress));
        if (window.innerWidth !== lastVw) measure();
        slides.forEach((slide, i) => {
          const off = i - progress;
          const a = Math.abs(off);
          const cVis = Math.max(0, 1 - a / 0.6);
          const pVis = Math.max(0, Math.min(1, (a - 0.4) / 0.4));
          gsap.set(cards[i], {
            x: off * spacing,
            y: pillY * (1 - cVis),
            scale: 1 - 0.06 * (1 - cVis),
            opacity: cVis,
            zIndex: cVis > 0 ? 5 : 1
          });
          gsap.set(pills[i], {
            x: off * spacing,
            y: pillY * pVis,
            scale: 0.85 + 0.15 * pVis,
            opacity: pVis
          });
        });
        if (numEl) numEl.textContent = Math.min(n, Math.max(1, Math.round(progress) + 1));
        if (barEl) barEl.style.width = Math.min(100, (progress / (n - 1)) * 100) + '%';
      }

      const st = ScrollTrigger.create({
        trigger: carousel,
        start: 'top top',
        end: () => '+=' + (n - 1) * Math.round(window.innerHeight * 0.9),
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => render(self.progress * (n - 1)),
        onRefresh: function () { render(this.progress * (n - 1)); }
      });

      pills.forEach((pill, i) => {
        pill.addEventListener('click', () => {
          const target = st.start + (st.end - st.start) * (i / (n - 1));
          if (window.__pageLenis) window.__pageLenis.scrollTo(target);
          else window.scrollTo({ top: target, behavior: 'smooth' });
        });
      });

      render(0);
    }
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
