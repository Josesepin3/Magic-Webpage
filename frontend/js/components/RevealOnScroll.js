(function () {
  document.documentElement.classList.add('reveal-js');

  var targets = document.querySelectorAll('[data-reveal]');
  if (!targets.length) return;

  function reveal(el) {
    el.classList.add('revealed');
  }

  if (!('IntersectionObserver' in window)) {
    targets.forEach(reveal);
    return;
  }

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        reveal(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach(function (el) {
    var delay = parseInt(el.getAttribute('data-reveal-delay'), 10);
    if (delay) el.style.transitionDelay = delay + 'ms';
    observer.observe(el);
  });
})();
