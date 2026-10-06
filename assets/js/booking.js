/* Booking page logic (front-end only; data lives in BSC / localStorage) */
(function () {
  var S = BSC.settings();
  var today = new Date(); today.setHours(0, 0, 0, 0);
  var state = { service: S.services[0].id, date: null, time: null, month: new Date(today.getFullYear(), today.getMonth(), 1) };
  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function renderServices() {
    $('svc').innerHTML = '';
    S.services.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button'; b.setAttribute('aria-pressed', s.id === state.service);
      b.innerHTML = '<b>' + s.name + '</b><small>' + s.mins + ' min. ' + s.note + '</small>';
      b.onclick = function () { state.service = s.id; renderServices(); renderSummary(); };
      $('svc').appendChild(b);
    });
  }

  function renderCal() {
    var m = state.month, first = new Date(m.getFullYear(), m.getMonth(), 1);
    $('calTitle').textContent = MONTHS[m.getMonth()] + ' ' + m.getFullYear();
    $('prev').disabled = first <= new Date(today.getFullYear(), today.getMonth(), 1);
    var cal = $('cal'); cal.innerHTML = '';
    DOW.forEach(function (d) { var e = document.createElement('div'); e.className = 'dow'; e.textContent = d; cal.appendChild(e); });
    for (var i = 0; i < first.getDay(); i++) { var sp = document.createElement('span'); sp.className = 'e'; cal.appendChild(sp); }
    var days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
    for (var d = 1; d <= days; d++) {
      var dt = new Date(m.getFullYear(), m.getMonth(), d), str = BSC.ymd(dt);
      var b = document.createElement('button'); b.type = 'button'; b.textContent = d;
      b.disabled = !BSC.isDayOpen(dt);
      if (+dt === +today) b.classList.add('today');
      b.setAttribute('aria-pressed', state.date === str);
      b.setAttribute('aria-label', dt.toDateString() + (b.disabled ? ', unavailable' : ''));
      (function (s) { b.onclick = function () { state.date = s; state.time = null; renderCal(); renderSlots(); renderSummary(); }; })(str);
      cal.appendChild(b);
    }
  }

  function renderSlots() {
    var box = $('slots'); box.innerHTML = '';
    if (!state.date) { $('slotHint').textContent = 'Pick a day first.'; return; }
    var list = BSC.slotsFor(state.date);
    var free = list.filter(function (x) { return !x.taken; }).length;
    $('slotHint').textContent = free ? free + ' times open on ' + new Date(state.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + '.' : 'No times left on this day. Please choose another day.';
    list.forEach(function (x) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = BSC.label(x.time); b.disabled = x.taken;
      b.setAttribute('aria-pressed', state.time === x.time);
      b.onclick = function () { state.time = x.time; renderSlots(); renderSummary(); };
      box.appendChild(b);
    });
  }

  function renderSummary() {
    var sv = BSC.service(state.service), d = state.date ? new Date(state.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : null;
    function row(k, v) { return '<li><span>' + k + '</span>' + (v ? '<b>' + v + '</b>' : '<span class="none">Not chosen</span>') + '</li>'; }
    $('sum').innerHTML = row('Booking', sv.name) + row('Day', d) + row('Time', state.time ? BSC.label(state.time) : null);
  }

  $('prev').onclick = function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() - 1, 1); renderCal(); };
  $('next').onclick = function () { state.month = new Date(state.month.getFullYear(), state.month.getMonth() + 1, 1); renderCal(); };

  $('bk-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var err = $('err'); err.textContent = '';
    var f = Object.fromEntries(new FormData(e.target).entries());
    if (!state.date || !state.time) { err.textContent = 'Choose a day and a time first.'; return; }
    if (!f.name.trim() || !f.phone.trim() || !/^\S+@\S+\.\S+$/.test(f.email)) { err.textContent = 'Enter your name, phone and a valid email.'; return; }
    var b = BSC.addBooking({ service: state.service, date: state.date, time: state.time, name: f.name.trim(), phone: f.phone.trim(), email: f.email.trim(), child: f.child, age: f.age, notes: f.notes });
    var when = new Date(b.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + ' at ' + BSC.label(b.time);
    $('ok-msg').textContent = BSC.service(b.service).name + ' on ' + when + '. Mrs. Sadia will confirm by phone or email.';
    $('gcal').href = BSC.gcalLink(b);
    $('ics').href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(BSC.ics(b));
    $('ok').classList.add('show');
    $('gcal').focus();
    e.target.reset(); state.date = null; state.time = null;
    renderCal(); renderSlots(); renderSummary();
  });

  document.documentElement.classList.add('ready');
  renderServices(); renderCal(); renderSlots(); renderSummary();
})();
