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
      const texts = cards.map((c) => c && c.querySelector('.mop-card-text'));
      const visuals = cards.map((c) => c && c.querySelector('.mop-card-visual'));
      const numEl = carousel.querySelector('.mop-counter-num');
      const barEl = carousel.querySelector('.mop-progress-bar');
      const isMobile = () => window.matchMedia('(max-width: 640px)').matches;
      const lerp = (a, b, t) => a + (b - a) * t;
      const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
      const SMOOTH = (t) => t * t * (3 - 2 * t);
      const mod = (i, m) => ((i % m) + m) % m;
      const signed = (i, k) => { const d = mod(i - k, n); return d > n / 2 ? d - n : d; };

      carousel.classList.add('is-mop-active');

      // Geometría del "row flexbox": el conjunto (píldora + tarjeta +
      // píldora) va de padding a padding con separación constante entre
      // elementos en cada instante de la transición.
      let ps = 64, cw = 720, W = 0, gap = 0, pitch = 0;
      let leftPill = 0, rightPill = 0, offL = 0, offR = 0;
      let centerY = 0, lastVw = 0, lastVh = 0;

      // Desktop: row horizontal (píldora izquierda + tarjeta + píldora
      // derecha). Móvil: columna vertical (píldora arriba + tarjeta +
      // píldora abajo); el eje de desplazamiento pasa de X a Y.
      function setPos(slide, off) {
        gsap.set(slide, isMobile() ? { x: 0, y: off } : { x: off, y: 0 });
      }

      function measure() {
        lastVw = window.innerWidth;
        const PAD = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-padding')) || 24;
        W = carousel.getBoundingClientRect().width - PAD * 2;
        let ch;
        if (isMobile()) {
          // Columna vertical: la píldora superior queda por debajo de la
          // navbar fija (--header-height) y el conjunto (píldora arriba +
          // tarjeta + píldora abajo) se mantiene simétrico desplazando su
          // centro hacia abajo.
          ps = 40;
          cw = W;
          lastVh = window.innerHeight;
          const vh = window.innerHeight;
          const HDR = 96;
          const M = 12;
          centerY = (HDR + M - PAD) / 2;
          leftPill = -(vh / 2) + HDR + M + ps / 2;
          rightPill = vh / 2 - PAD - ps / 2;
          const span = rightPill - leftPill;
          ch = Math.min(vh * 0.62, 560);
          gap = Math.max(18, (span - ch - 2 * ps) / 2);
          ch = Math.max(180, Math.min(ch, span - 2 * ps - 2 * gap));
        } else {
          ps = 64;
          cw = clamp(W * 0.66, 520, 900);
          gap = Math.max(14, (W - cw - 2 * ps) / 2);
          ch = Math.min(window.innerHeight * 0.62, 520);
          centerY = 0;
          leftPill = -W / 2 + ps / 2;
          rightPill = W / 2 - ps / 2;
        }
        cw = Math.max(160, cw);
        pitch = ps + gap;
        offL = leftPill - pitch;
        offR = rightPill + pitch;
        carousel.style.setProperty('--mop-card-w', cw + 'px');
        carousel.style.setProperty('--mop-card-h', ch + 'px');
        carousel.style.setProperty('--mop-pill-size', ps + 'px');
      }

      function setSlide(i, s) {
        const slide = slides[i];
        setPos(slide, s.x);
        gsap.set(slide, { opacity: s.o });
        gsap.set(cards[i], { scale: s.cs, opacity: s.co, borderRadius: s.br + 'px' });
        gsap.set(pills[i], { opacity: s.po });
        if (texts[i]) gsap.set(texts[i], { opacity: s.cio });
        if (visuals[i]) gsap.set(visuals[i], { opacity: s.cio });
        slide.classList.toggle('is-card', !!s.isCard);
        slide.classList.toggle('is-pill', !s.isCard);
        slide.classList.toggle('is-hidden', s.o <= 0);
      }

      function updateMeta(k) {
        if (numEl) numEl.textContent = k + 1;
        if (barEl) barEl.style.width = Math.min(100, (k / (n - 1)) * 100) + '%';
      }

      function applyState(k) {
        for (let i = 0; i < n; i++) {
          const d = signed(i, k);
          const noLeft = k === 0 && d === -1;
          const noRight = k === n - 1 && d === 1;
          if (noLeft || noRight) {
            setSlide(i, { x: noLeft ? leftPill : rightPill, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
            continue;
          }
          if (d === 0) setSlide(i, { x: centerY, o: 1, cs: 1, co: 1, po: 0, br: 20, cio: 1, isCard: true });
          else if (d === 1) setSlide(i, { x: rightPill, o: 1, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
          else if (d === -1) setSlide(i, { x: leftPill, o: 1, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
          else if (d === 2) setSlide(i, { x: offR, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
          else setSlide(i, { x: offL, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
        }
        pills.forEach((p, i) => {
          const d = signed(i, k);
          const vis = (d === 1 && k !== n - 1) || (d === -1 && k !== 0);
          p.tabIndex = vis ? 0 : -1;
        });
        updateMeta(k);
      }

      // Un paso hacia delante (k -> k+1): el row completo se desliza un
      // slot hacia la izquierda manteniendo las separaciones constantes.
      // En los extremos la píldora que saldría no existe: la primera y la
      // última tarjeta no muestran píldora a un lado.
      function layoutStepAdv(p, k) {
        const m = p;
        const ci = SMOOTH(Math.min(p * 1.5, 1));
        const a = mod(k - 1, n), b = k, c = mod(k + 1, n), d = mod(k + 2, n);
        for (let i = 0; i < n; i++) {
          if (i === a) {
            if (k >= 1) setSlide(i, { x: lerp(leftPill, offL, p), o: 1 - Math.min(1, p / 0.4), cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
            else setSlide(i, { x: offL, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
          }
          else if (i === b) setSlide(i, { x: lerp(centerY, leftPill, p), o: 1, cs: lerp(1, ps / cw, m), co: 1 - m, po: m, br: lerp(20, 50, m), cio: 1 - ci, isCard: m < 0.5 });
          else if (i === c) setSlide(i, { x: lerp(rightPill, centerY, p), o: 1, cs: lerp(ps / cw, 1, m), co: m, po: 1 - m, br: lerp(50, 20, m), cio: ci, isCard: m >= 0.5 });
          else if (i === d) {
            if (k + 2 <= n - 1) setSlide(i, { x: lerp(offR, rightPill, p), o: clamp((p - 0.6) / 0.4, 0, 1), cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
            else setSlide(i, { x: offR, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
          }
          else setSlide(i, { x: offL, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
        }
      }

      // Un paso hacia atrás (k -> k-1): imagen espejo del avance.
      function layoutStepRev(p, k) {
        const m = p;
        const ci = SMOOTH(Math.min(p * 1.5, 1));
        const a = mod(k + 1, n), b = k, c = mod(k - 1, n), d = mod(k - 2, n);
        for (let i = 0; i < n; i++) {
          if (i === a) {
            if (k <= n - 2) setSlide(i, { x: lerp(rightPill, offR, p), o: 1 - Math.min(1, p / 0.4), cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
            else setSlide(i, { x: offR, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
          }
          else if (i === b) setSlide(i, { x: lerp(centerY, rightPill, p), o: 1, cs: lerp(1, ps / cw, m), co: 1 - m, po: m, br: lerp(20, 50, m), cio: 1 - ci, isCard: m < 0.5 });
          else if (i === c) setSlide(i, { x: lerp(leftPill, centerY, p), o: 1, cs: lerp(ps / cw, 1, m), co: m, po: 1 - m, br: lerp(50, 20, m), cio: ci, isCard: m >= 0.5 });
          else if (i === d) {
            if (k >= 2) setSlide(i, { x: lerp(offL, leftPill, p), o: clamp((p - 0.6) / 0.4, 0, 1), cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
            else setSlide(i, { x: offL, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
          }
          else setSlide(i, { x: offR, o: 0, cs: ps / cw, co: 0, po: 1, br: 50, cio: 0 });
        }
      }

      let state = 0;
      let pending = null;
      let stepTween = null;
      const stepProxy = { p: 0 };

      function killStep() {
        if (stepTween) { stepTween.kill(); stepTween = null; }
        pending = null;
      }

      function playStep(target) {
        if (pending === target && stepTween) return;
        const base = pending !== null ? pending : state;
        if (base !== state) { killStep(); state = base; applyState(state); }
        else killStep();
        const run = (p) => (target > base ? layoutStepAdv(p, base) : layoutStepRev(p, base));
        pending = target;
        run(0);
        stepProxy.p = 0;
        stepTween = gsap.to(stepProxy, {
          p: 1,
          duration: 0.55,
          ease: 'power2.inOut',
          overwrite: true,
          onUpdate: () => run(stepProxy.p),
          onComplete: () => { state = target; pending = null; stepTween = null; applyState(state); }
        });
      }

      function drive(q) {
        if (window.innerWidth !== lastVw || (isMobile() && window.innerHeight !== lastVh)) measure();
        const idx = Math.round(Math.max(0, Math.min(n - 1, q)));
        if (idx === state) return;
        if (Math.abs(idx - state) > 1) { killStep(); state = idx; applyState(state); return; }
        playStep(idx);
      }

      const st = ScrollTrigger.create({
        trigger: carousel,
        start: 'center center',
        end: () => '+=' + (n - 1) * Math.round(window.innerHeight * 0.9),
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => drive(self.progress * (n - 1)),
        onRefresh: function () { measure(); applyState(state); }
      });

      function goToStep(target) {
        target = Math.max(0, Math.min(n - 1, target));
        const pos = st.start + (st.end - st.start) * (target / (n - 1));
        if (window.__pageLenis) window.__pageLenis.scrollTo(pos);
        else window.scrollTo({ top: pos, behavior: 'smooth' });
      }

      pills.forEach((pill, i) => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const base = pending !== null ? pending : state;
          const d = signed(i, base);
          if (d === 1) goToStep(base + 1);
          else if (d === -1) goToStep(base - 1);
        });
      });

      measure();
      applyState(0);
    }
  }

  window.addEventListener('load', () => ScrollTrigger.refresh());
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
