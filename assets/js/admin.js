/* Admin dashboard (front-end only).
 * NOTE: the passcode below is a placeholder to keep casual visitors out of the preview.
 * Real authentication arrives with the backend. */
(function () {
  var PASSCODE = 'bloom2026';
  var $ = function (id) { return document.getElementById(id); };
  var filter = 'all', query = '';
  var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function nice(d) { return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); }
  function sorted() { return BSC.bookings().slice().sort(function (a, b) { return (a.date + a.time).localeCompare(b.date + b.time); }); }

  /* Login */
  function open() { $('gate').hidden = true; $('app').hidden = false; renderAll(); }
  if (sessionStorage.getItem('bsc_admin') === '1') open();
  $('gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('pass').value === PASSCODE) { sessionStorage.setItem('bsc_admin', '1'); open(); }
    else { $('gate-err').textContent = 'That passcode is not right. Try again.'; $('pass').select(); }
  });
  $('logout').onclick = function () { sessionStorage.removeItem('bsc_admin'); location.reload(); };

  /* Navigation */
  document.querySelectorAll('.side-nav .t').forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll('.side-nav .t').forEach(function (x) { x.removeAttribute('aria-current'); });
      b.setAttribute('aria-current', 'page');
      document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('on'); });
      $('v-' + b.dataset.v).classList.add('on');
    };
  });

  /* Overview */
  function renderOverview() {
    var all = BSC.bookings(), todayStr = BSC.ymd(new Date());
    var pend = all.filter(function (b) { return b.status === 'pending'; }).length;
    var up = all.filter(function (b) { return b.status === 'confirmed' && b.date >= todayStr; }).length;
    var unread = BSC.enquiries().filter(function (m) { return !m.read; }).length;
    $('t-pend').textContent = pend; $('t-up').textContent = up; $('t-all').textContent = all.length; $('t-msg').textContent = unread;
    $('b-pend').hidden = !pend; $('b-pend').textContent = pend;
    $('b-msg').hidden = !unread; $('b-msg').textContent = unread;
    $('today-line').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + (pend ? '. ' + pend + (pend === 1 ? ' request is' : ' requests are') + ' waiting for you.' : '. You are all caught up.');

    var bars = $('bars'); bars.innerHTML = '';
    var counts = [], max = 1;
    for (var i = 0; i < 7; i++) {
      var d = new Date(); d.setDate(d.getDate() + i); var s = BSC.ymd(d);
      var n = all.filter(function (b) { return b.date === s && b.status !== 'cancelled'; }).length;
      counts.push({ d: d, n: n }); if (n > max) max = n;
    }
    counts.forEach(function (c) {
      var el = document.createElement('div'); el.className = 'bar';
      el.innerHTML = '<em>' + c.n + '</em><i style="height:0"></i><small>' + DAYS[c.d.getDay()] + '</small>';
      bars.appendChild(el);
      requestAnimationFrame(function () { el.querySelector('i').style.height = (c.n / max * 130 + 6) + 'px'; });
    });

    var tl = $('today-list'); var todays = sorted().filter(function (b) { return b.date === todayStr && b.status !== 'cancelled'; });
    tl.innerHTML = todays.length ? todays.map(function (b) {
      return '<li><span class="time">' + BSC.label(b.time) + '</span><span><b>' + esc(b.name) + '</b><br><span class="muted">' + esc(BSC.service(b.service).name) + '</span></span></li>';
    }).join('') : '<li class="muted">No visits today.</li>';
  }

  /* Bookings */
  function renderBookings() {
    var q = query.toLowerCase();
    var list = sorted().filter(function (b) {
      return (filter === 'all' || b.status === filter) && (!q || [b.name, b.child, b.phone, b.email].join(' ').toLowerCase().indexOf(q) >= 0);
    });
    $('rows').innerHTML = list.length ? list.map(function (b) {
      return '<tr><td><b>' + nice(b.date) + '</b><small>' + BSC.label(b.time) + '</small></td>' +
        '<td>' + esc(b.name) + '<small>' + esc(b.phone) + '</small><small>' + esc(b.email) + '</small></td>' +
        '<td>' + esc(b.child || '-') + '<small>' + esc(b.age || '') + '</small>' + (b.notes ? '<small>' + esc(b.notes) + '</small>' : '') + '</td>' +
        '<td>' + esc(BSC.service(b.service).name) + '</td>' +
        '<td><span class="pill ' + b.status + '">' + b.status + '</span></td>' +
        '<td><div class="acts">' +
        (b.status !== 'confirmed' ? '<button class="sbtn pri" data-a="confirm" data-id="' + b.id + '">Confirm</button>' : '') +
        (b.status !== 'cancelled' ? '<button class="sbtn" data-a="cancel" data-id="' + b.id + '">Cancel</button>' : '') +
        '<a class="sbtn" target="_blank" rel="noopener" href="' + BSC.gcalLink(b) + '">Google Calendar</a>' +
        '<button class="sbtn warn" data-a="delete" data-id="' + b.id + '">Delete</button></div></td></tr>';
    }).join('') : '<tr><td colspan="6"><div class="empty-state">No bookings here yet. New requests from the booking page will appear in this list.</div></td></tr>';
  }
  $('rows').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-a]'); if (!b) return;
    var l = BSC.bookings(), id = b.dataset.id;
    if (b.dataset.a === 'delete') { if (!confirm('Delete this booking? This cannot be undone.')) return; l = l.filter(function (x) { return x.id !== id; }); toast('Booking deleted'); }
    else { l.forEach(function (x) { if (x.id === id) x.status = b.dataset.a === 'confirm' ? 'confirmed' : 'cancelled'; }); toast(b.dataset.a === 'confirm' ? 'Booking confirmed' : 'Booking cancelled'); }
    BSC.saveBookings(l); renderAll();
  });
  document.querySelectorAll('.chip').forEach(function (c) {
    c.onclick = function () { filter = c.dataset.f; document.querySelectorAll('.chip').forEach(function (x) { x.setAttribute('aria-pressed', x === c); }); renderBookings(); };
  });
  $('q').addEventListener('input', function (e) { query = e.target.value; renderBookings(); });
  $('csv').onclick = function () {
    var rows = [['Date', 'Time', 'Type', 'Parent', 'Phone', 'Email', 'Child', 'Age', 'Status', 'Notes']].concat(sorted().map(function (b) {
      return [b.date, b.time, BSC.service(b.service).name, b.name, b.phone, b.email, b.child, b.age, b.status, b.notes];
    }));
    var csv = rows.map(function (r) { return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'bookings.csv'; a.click();
  };

  /* Messages */
  function renderMsgs() {
    var l = BSC.enquiries();
    $('msgs').innerHTML = l.length ? l.map(function (m) {
      return '<article class="msg ' + (m.read ? '' : 'unread') + '"><header><b>' + esc(m.name) + '</b><span class="muted">' + new Date(m.created).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) + '</span></header>' +
        '<span class="muted">' + esc(m.email) + (m.phone ? ' &middot; ' + esc(m.phone) : '') + (m.age ? ' &middot; Child: ' + esc(m.age) : '') + '</span>' +
        '<p>' + esc(m.message) + '</p><div class="acts"><a class="sbtn pri" href="mailto:' + esc(m.email) + '">Reply by email</a>' +
        '<button class="sbtn" data-m="read" data-id="' + m.id + '">' + (m.read ? 'Mark as new' : 'Mark as read') + '</button><button class="sbtn warn" data-m="del" data-id="' + m.id + '">Delete</button></div></article>';
    }).join('') : '<div class="box empty-state">No messages yet. Messages from the website contact form will show up here.</div>';
  }
  $('msgs').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-m]'); if (!b) return;
    var l = BSC.enquiries(), id = b.dataset.id;
    if (b.dataset.m === 'del') l = l.filter(function (x) { return x.id !== id; });
    else l.forEach(function (x) { if (x.id === id) x.read = !x.read; });
    BSC.saveEnquiries(l); renderAll();
  });

  /* Availability */
  function renderSettings() {
    var s = BSC.settings();
    $('days').innerHTML = DAYS.map(function (n, i) { return '<label><input type="checkbox" value="' + i + '"' + (s.days.indexOf(i) >= 0 ? ' checked' : '') + '><span>' + n + '</span></label>'; }).join('');
    $('s-start').value = s.start; $('s-end').value = s.end; $('s-slot').value = s.slot; $('s-notice').value = s.minNoticeHours; $('s-ahead').value = s.maxAheadDays;
    $('blocked').innerHTML = s.blocked.length ? s.blocked.slice().sort().map(function (d) { return '<span>' + nice(d) + '<button aria-label="Reopen ' + nice(d) + '" data-d="' + d + '">&times;</button></span>'; }).join('') : '<span class="muted" style="background:none;padding:0">No closed dates.</span>';
  }
  $('save-set').onclick = function () {
    var s = BSC.settings();
    s.days = Array.prototype.map.call(document.querySelectorAll('#days input:checked'), function (i) { return +i.value; });
    s.start = $('s-start').value || s.start; s.end = $('s-end').value || s.end; s.slot = +$('s-slot').value;
    s.minNoticeHours = +$('s-notice').value || 0; s.maxAheadDays = +$('s-ahead').value || 60;
    BSC.saveSettings(s); toast('Availability saved');
  };
  $('add-block').onclick = function () {
    var v = $('s-block').value; if (!v) return toast('Choose a date first');
    var s = BSC.settings(); if (s.blocked.indexOf(v) < 0) s.blocked.push(v); BSC.saveSettings(s); $('s-block').value = ''; renderSettings(); toast('Day closed');
  };
  $('blocked').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-d]'); if (!b) return;
    var s = BSC.settings(); s.blocked = s.blocked.filter(function (d) { return d !== b.dataset.d; }); BSC.saveSettings(s); renderSettings();
  });
  $('seed').onclick = function () {
    var names = [['Ayesha Khan', 'Zain', '3 years', 'tour'], ['Daniel Brooks', 'Maya', '18 months', 'call'], ['Priya Nair', 'Aarav', '5 years', 'enrol'], ['Sara Ahmed', 'Layla', '2 years', 'tour'], ['Michael Lee', 'Noah', '8 months', 'tour']];
    var times = ['09:00', '10:30', '13:00', '14:30', '16:00'], st = ['pending', 'confirmed', 'pending', 'confirmed', 'pending'], l = BSC.bookings(), made = 0, day = 0;
    while (made < names.length && day < 30) {
      var d = new Date(); d.setDate(d.getDate() + day++);
      if (BSC.settings().days.indexOf(d.getDay()) < 0) continue;
      var n = names[made];
      l.push({ id: BSC.uid(), service: n[3], date: BSC.ymd(d), time: times[made], name: n[0], phone: '(443) 555-01' + (10 + made), email: n[0].split(' ')[0].toLowerCase() + '@example.com', child: n[1], age: n[2], notes: '', status: st[made], created: new Date().toISOString() });
      made++;
    }
    BSC.saveBookings(l);
    BSC.addEnquiry({ name: 'Hina Raza', email: 'hina@example.com', phone: '', age: '1 to 3 years', message: 'Hello, do you have a full-time place from January?' });
    renderAll(); toast('Sample data added');
  };
  $('wipe').onclick = function () {
    if (!confirm('Clear all bookings and messages from this browser?')) return;
    BSC.saveBookings([]); BSC.saveEnquiries([]); renderAll(); toast('All data cleared');
  };

  function renderAll() { renderOverview(); renderBookings(); renderMsgs(); renderSettings(); }
})();
