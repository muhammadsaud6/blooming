/* Blooming Stars — front-end data layer.
 * Everything is kept in localStorage so the booking page, the contact form and the
 * admin dashboard work together before a backend exists.
 * When the backend is built, replace the functions in the "STORAGE" block with API calls
 * (see CONFIG for where Google Calendar will plug in). */
window.BSC = (function () {
  var CONFIG = {
    timezone: 'America/New_York',
    // Backend phase: Google Calendar ID + API endpoint go here.
    googleCalendarId: '',
    apiBase: ''
  };
  var K = { b: 'bsc_bookings', s: 'bsc_settings', e: 'bsc_enquiries' };
  var defaults = {
    days: [1, 2, 3, 4, 5], start: '08:00', end: '17:00', slot: 30, maxAheadDays: 60, minNoticeHours: 12,
    blocked: [],
    services: [
      { id: 'tour', name: 'Visit and tour', mins: 30, note: 'Meet Mrs. Sadia and see the space' },
      { id: 'call', name: 'Phone call', mins: 15, note: 'A quick chat about availability' },
      { id: 'enrol', name: 'Enrolment meeting', mins: 45, note: 'Paperwork and settling-in plan' }
    ]
  };

  /* STORAGE */
  function read(k, fb) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? fb : v; } catch (e) { return fb; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  function settings() { return Object.assign({}, defaults, read(K.s, {})); }
  function saveSettings(s) { write(K.s, s); }
  function bookings() { return read(K.b, []); }
  function saveBookings(l) { write(K.b, l); }
  function enquiries() { return read(K.e, []); }
  function saveEnquiries(l) { write(K.e, l); }

  function uid() { return Math.random().toString(36).slice(2, 9); }
  function pad(n) { return String(n).padStart(2, '0'); }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function toMin(t) { var p = t.split(':'); return +p[0] * 60 + +p[1]; }
  function fromMin(m) { return pad(Math.floor(m / 60)) + ':' + pad(m % 60); }
  function label(t) { var m = toMin(t), h = Math.floor(m / 60), ap = h >= 12 ? 'pm' : 'am'; h = h % 12 || 12; return h + ':' + pad(m % 60) + ' ' + ap; }

  function slotsFor(dateStr) {
    var s = settings(), d = new Date(dateStr + 'T00:00:00');
    if (s.days.indexOf(d.getDay()) < 0 || s.blocked.indexOf(dateStr) >= 0) return [];
    var taken = bookings().filter(function (b) { return b.date === dateStr && b.status !== 'cancelled'; }).map(function (b) { return b.time; });
    var out = [], now = Date.now() + s.minNoticeHours * 3600000;
    for (var m = toMin(s.start); m + s.slot <= toMin(s.end); m += s.slot) {
      var t = fromMin(m), when = new Date(dateStr + 'T' + t + ':00').getTime();
      out.push({ time: t, taken: taken.indexOf(t) >= 0 || when < now });
    }
    return out;
  }
  function isDayOpen(d) {
    var s = settings(), str = ymd(d);
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var last = new Date(today.getTime() + s.maxAheadDays * 86400000);
    if (d < today || d > last) return false;
    return slotsFor(str).some(function (x) { return !x.taken; });
  }
  function addBooking(b) {
    var l = bookings(); b.id = uid(); b.status = 'pending'; b.created = new Date().toISOString();
    l.push(b); saveBookings(l); return b;
  }
  function addEnquiry(e) { var l = enquiries(); e.id = uid(); e.created = new Date().toISOString(); e.read = false; l.unshift(e); saveEnquiries(l); return e; }

  function service(id) { return settings().services.filter(function (x) { return x.id === id; })[0] || settings().services[0]; }
  function endTime(b) { return fromMin(toMin(b.time) + service(b.service).mins); }
  function stamp(date, time) { return date.replace(/-/g, '') + 'T' + time.replace(':', '') + '00'; }

  // Opens a pre-filled Google Calendar event (works today, no backend needed)
  function gcalLink(b) {
    var sv = service(b.service);
    var q = new URLSearchParams({
      action: 'TEMPLATE',
      text: sv.name + ' at Blooming Stars Child Care',
      dates: stamp(b.date, b.time) + '/' + stamp(b.date, endTime(b)),
      ctz: CONFIG.timezone,
      details: 'Booked for ' + (b.child || 'your child') + '. Questions? Call (443) 840-0115.',
      location: 'Columbia, MD 21045'
    });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  function ics(b) {
    var sv = service(b.service);
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Blooming Stars//Booking//EN', 'BEGIN:VEVENT',
      'UID:' + b.id + '@bloomingstars', 'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
      'DTSTART;TZID=' + CONFIG.timezone + ':' + stamp(b.date, b.time), 'DTEND;TZID=' + CONFIG.timezone + ':' + stamp(b.date, endTime(b)),
      'SUMMARY:' + sv.name + ' at Blooming Stars Child Care', 'LOCATION:Columbia\\, MD 21045', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  return { CONFIG: CONFIG, settings: settings, saveSettings: saveSettings, bookings: bookings, saveBookings: saveBookings,
    enquiries: enquiries, saveEnquiries: saveEnquiries, slotsFor: slotsFor, isDayOpen: isDayOpen, addBooking: addBooking,
    addEnquiry: addEnquiry, service: service, endTime: endTime, gcalLink: gcalLink, ics: ics, ymd: ymd, label: label, uid: uid };
})();
