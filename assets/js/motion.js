/* Blooming Stars — extra motion layer. Load after main.js. */
(function () {
  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  // Page transition: fade out before following an internal link
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var href = a.getAttribute('href');
    if (a.target === '_blank' || a.hasAttribute('download') || !/\.html(#.*)?$/.test(href)) return;
    if (a.pathname === location.pathname) return; // same-page anchor
    e.preventDefault();
    root.classList.add('leaving');
    setTimeout(function () { location.href = a.href; }, 280);
  });
  window.addEventListener('pageshow', function () { root.classList.remove('leaving'); });

  if (reduce) return;

  // Scroll progress bar
  var bar = document.createElement('div');
  bar.className = 'progress'; bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  // Hero parallax (scroll + mouse)
  var hero = document.querySelector('.hero'), heroWrap = hero && hero.querySelector('.wrap'), art = document.querySelector('.hero-art');
  var mx = 0, my = 0;
  function onScroll() {
    var max = root.scrollHeight - innerHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? scrollY / max : 0) + ')';
    if (heroWrap && scrollY < innerHeight * 1.2) heroWrap.style.transform = 'translateY(' + scrollY * 0.25 + 'px)';
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  if (art && finePointer) {
    hero.addEventListener('mousemove', function (e) {
      mx = (e.clientX / innerWidth - 0.5) * 30; my = (e.clientY / innerHeight - 0.5) * 30;
      art.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
    });
    hero.addEventListener('mouseleave', function () { art.style.transform = ''; });
  }

  // Extra reveal targets + direction variants
  function tag(sel, variant, stagger) {
    $$(sel).forEach(function (el, i) {
      if (el.closest('.hero,.bk-hero,.nav,.pre,.ok')) return;
      el.classList.add('rv');
      if (variant) el.classList.add(variant);
      if (stagger) el.style.transitionDelay = (i % 6) * 0.09 + 's';
    });
  }
  tag('.about-card', 'rv-l');
  tag('.visit .form', 'rv-r');
  tag('.photo-card', 'rv-z');
  tag('.why-item', 'rv-z');
  tag('.bento .card', 'rv-f');
  tag('.fm-card:nth-child(odd)', 'rv-l');
  tag('.fm-card:nth-child(even)', 'rv-r');
  tag('.bk > .panel', 'rv-f', true);
  tag('.info-list li', 'rv-l', true);
  tag('.foot .wrap > div', null, true);
  tag('.gallery-note, .stat');

  // Word-by-word headings
  $$('h2.rv').forEach(function (h) {
    if (h.children.length) return;
    var words = h.textContent.trim().split(/\s+/);
    h.textContent = '';
    words.forEach(function (w, i) {
      var s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i); s.textContent = w;
      h.appendChild(s);
      if (i < words.length - 1) h.appendChild(document.createTextNode(' '));
    });
    h.classList.add('split');
  });

  // Observe every .rv (main.js only saw the ones in the HTML)
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add('in'); io.unobserve(el);
      setTimeout(function () { el.classList.add('settled'); el.style.transitionDelay = ''; }, 1400);
      if (el.matches('.stat')) count(el.querySelector('b'));
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.rv').forEach(function (el) { io.observe(el); });

  // Count-up numbers ("10+", "2.3K")
  function count(b) {
    var m = b && b.textContent.trim().match(/^(\d+(?:\.\d+)?)(\D*)$/);
    if (!m) return;
    var end = parseFloat(m[1]), dec = (m[1].split('.')[1] || '').length, suffix = m[2], t0 = null;
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min(1, (t - t0) / 1600), e = 1 - Math.pow(1 - p, 3);
      b.textContent = (end * e).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // 3D tilt on cards
  if (finePointer) {
    $$('.card, .photo-card, .fm-card, .why-item, .about-card, .tu-card, .pol-item').forEach(function (el) {
      el.classList.add('tilt');
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transition = 'transform .15s ease-out';
        el.style.transform = 'perspective(900px) rotateY(' + x * 10 + 'deg) rotateX(' + -y * 10 + 'deg) translateY(-6px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
        el.style.transform = '';
      });
    });
  }

  // Booking widgets: stagger only when the month / day actually changes, not on every click
  [['cal', 'calTitle'], ['slots', 'slotHint'], ['svc', null]].forEach(function (pair) {
    var box = document.getElementById(pair[0]);
    if (!box) return;
    var last = null;
    function mark() {
      var key = pair[1] ? document.getElementById(pair[1]).textContent : 'once';
      var btns = $$(':scope > button', box);
      if (key !== last) { btns.forEach(function (b, i) { b.style.setProperty('--i', i); }); box.classList.add('stagger'); }
      else box.classList.remove('stagger');
      last = key;
    }
    mark();
    new MutationObserver(mark).observe(box, { childList: true });
  });

  // Colourful sparkle burst on click
  var colours = ['#E8416B', '#F7B91F', '#86C566', '#3AA7E0', '#8A66C8'];
  document.addEventListener('pointerdown', function (e) {
    for (var i = 0; i < 8; i++) {
      var s = document.createElement('i'), ang = (i / 8) * Math.PI * 2, dist = 26 + Math.random() * 22;
      s.className = 'spark';
      s.style.cssText = 'left:' + (e.clientX - 4) + 'px;top:' + (e.clientY - 4) + 'px;background:' + colours[i % 5] +
        ';--x:' + Math.cos(ang) * dist + 'px;--y:' + Math.sin(ang) * dist + 'px';
      document.body.appendChild(s);
      setTimeout(s.remove.bind(s), 750);
    }
  });
})();
