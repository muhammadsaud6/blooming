/* Blooming Stars Child Care — site behaviour */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Preloader: plays once per visit, then the hero animation starts
  function finishPreloader() {
    var pre = document.getElementById('pre');
    if (!pre || pre.classList.contains('done')) return;
    pre.classList.add('done');
    root.classList.add('ready');
    try { sessionStorage.setItem('bsc_seen', '1'); } catch (e) {}
    setTimeout(function () { pre.remove(); }, 1800);
  }
  if (root.classList.contains('skip-pre') || !document.getElementById('pre')) {
    root.classList.add('ready');
  } else {
    document.body.style.overflow = 'hidden';
    var wait = reduce ? 400 : 3000;
    window.addEventListener('load', function () {
      setTimeout(function () { document.body.style.overflow = ''; finishPreloader(); }, wait);
    });
    setTimeout(function () { document.body.style.overflow = ''; finishPreloader(); }, wait + 3000); // safety
  }

  // Twinkling stars in hero
  var stars = document.querySelector('.stars');
  if (stars) {
    for (var i = 0; i < 70; i++) {
      var s = document.createElement('i');
      var size = (Math.random() * 3 + 1).toFixed(1) + 'px';
      s.style.cssText = 'left:' + Math.random() * 100 + '%;top:' + Math.random() * 100 + '%;--s:' + size + ';--d:' + (Math.random() * 3 + 1.5).toFixed(1) + 's;animation-delay:-' + (Math.random() * 4).toFixed(1) + 's';
      stars.appendChild(s);
    }
  }

  // Nav: solid on scroll, mobile menu
  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.burger');
  var menu = document.querySelector('.menu');
  function onScroll() {
    if (nav) nav.classList.toggle('solid', window.scrollY > 40);
    var flower = document.querySelector('.scroll-flower');
    var line = document.querySelector('.scroll-line');
    if (flower && line) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      var y = p * (window.innerHeight - 60) + 8;
      flower.style.transform = 'translateY(' + y + 'px)';
      line.style.transform = 'scaleY(' + p + ')';
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (burger) {
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }
    });
  }

  // Scroll reveal
  var els = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else { els.forEach(function (el) { el.classList.add('in'); }); }

  // Toast helper
  window.toast = function (msg) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    setTimeout(function () { t.classList.remove('show'); }, 3200);
  };

  // Enquiry form (saved locally until the backend exists)
  var form = document.getElementById('enquiry');
  if (form && window.BSC) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = Object.fromEntries(new FormData(form).entries());
      BSC.addEnquiry(d);
      form.reset();
      toast('Message sent. We will get back to you soon.');
    });
  }
})();
