// I Got You — driver demo. Service-free, placeholder-ready.
// All ride status mutations stay on this device (in-memory + localStorage).
// No real maps, SMS, auth, payments, or email.

(function () {
  'use strict';

  var STORAGE_KEY = 'igotyou-driver-demo-v1';

  // Demo run sheet — handcrafted to mirror the rider/admin demo data.
  var SEED_RIDES = [
    {
      id: 'IGY-2210',
      riderName: 'Marie L.',
      phone: '+15550100144',
      phoneDisplay: '(555) 010-0144',
      pickup: '4150 S Harrison Blvd, Ogden',
      destination: 'Salt Lake City International Airport',
      pickupTime: '5:15 AM',
      pickupTimeISO: '05:15',
      rideType: 'Airport run',
      accessibility: 'Help loading two suitcases',
      dispatcherNote: 'Flight at 7:30 AM. Arrive 5 minutes early.',
      status: 'completed'
    },
    {
      id: 'IGY-2211',
      riderName: 'Walter & Ruth Hernandez',
      phone: '+15550100173',
      phoneDisplay: '(555) 010-0173',
      pickup: 'Cottonwood Senior Living, Ogden',
      destination: "Smith's Marketplace, 12th Street",
      pickupTime: '10:00 AM',
      pickupTimeISO: '10:00',
      rideType: 'Senior errand · weekly',
      accessibility: 'Walker assist; please park close to the lobby',
      dispatcherNote: 'Wait up to 30 minutes for return trip same day.',
      status: 'assigned'
    },
    {
      id: 'IGY-2212',
      riderName: 'Demo Rider',
      phone: '+15550100198',
      phoneDisplay: '(555) 010-0198',
      pickup: 'Ogden FrontRunner Station',
      destination: 'McKay-Dee Hospital',
      pickupTime: '2:30 PM',
      pickupTimeISO: '14:30',
      rideType: 'Medical appointment',
      accessibility: 'Front-seat preference; soft-spoken',
      dispatcherNote: 'Call rider 10 minutes before arrival.',
      status: 'assigned'
    },
    {
      id: 'IGY-2213',
      riderName: 'James O.',
      phone: '+15550100211',
      phoneDisplay: '(555) 010-0211',
      pickup: 'Weber State University, Shepherd Union',
      destination: '1820 Jefferson Ave, Ogden',
      pickupTime: '4:45 PM',
      pickupTimeISO: '16:45',
      rideType: 'Local ride',
      accessibility: 'No notes',
      dispatcherNote: 'Standard pickup.',
      status: 'assigned'
    }
  ];

  var STATUS_FLOW = ['assigned', 'enroute', 'arrived', 'completed'];
  var STATUS_LABELS = {
    assigned: 'Assigned',
    enroute: 'En route',
    arrived: 'Arrived',
    completed: 'Completed'
  };

  // ---- State ----

  function loadState() {
    try {
      var raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.rides)) return null;
      return parsed;
    } catch (err) {
      return null;
    }
  }

  function saveState(state) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) { /* no-op for demo */ }
  }

  function freshState() {
    return {
      rides: SEED_RIDES.map(function (r) { return Object.assign({}, r); })
    };
  }

  var state = loadState() || freshState();

  // ---- Helpers ----

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDateLong(date) {
    try {
      return date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      });
    } catch (err) {
      return 'Today';
    }
  }

  function timeOfDay(hour) {
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  function nextRideOf(rides) {
    return rides.find(function (r) { return r.status !== 'completed'; }) || null;
  }

  function mapsUrl(query) {
    // Universal maps link: opens Apple Maps on iOS, Google Maps elsewhere — no API key.
    return 'https://maps.google.com/?q=' + encodeURIComponent(query);
  }

  // ---- Rendering ----

  function renderHeader() {
    var now = new Date();
    var dateEl = document.getElementById('today-date');
    if (dateEl) dateEl.textContent = formatDateLong(now);
    var todEl = document.getElementById('time-of-day');
    if (todEl) todEl.textContent = timeOfDay(now.getHours());
  }

  function renderSummary() {
    var total = state.rides.length;
    var completed = state.rides.filter(function (r) { return r.status === 'completed'; }).length;
    var next = nextRideOf(state.rides);

    document.getElementById('stat-total').textContent = String(total);
    document.getElementById('stat-completed').textContent = completed + ' / ' + total;
    document.getElementById('stat-next').textContent = next ? next.pickupTime : 'All done';
  }

  function statusBadge(status) {
    return (
      '<span class="status-badge" data-status="' + status + '" aria-label="Ride status: ' +
      STATUS_LABELS[status] + '">' + STATUS_LABELS[status] + '</span>'
    );
  }

  function actionButtons(ride, isNext) {
    var status = ride.status;
    var buttons = [];

    // Open maps — pickup if not arrived, destination once arrived.
    var mapsTarget = (status === 'arrived') ? ride.destination : ride.pickup;
    var mapsLabel = (status === 'arrived') ? 'Open destination in maps' : 'Open pickup in maps';
    buttons.push(
      '<a class="btn btn-outline" href="' + mapsUrl(mapsTarget) +
      '" target="_blank" rel="noopener noreferrer" data-ride-id="' + ride.id +
      '" aria-label="' + escapeHtml(mapsLabel) + ' for ride ' + ride.id +
      '"><span aria-hidden="true">🗺</span> Open maps</a>'
    );

    // Call rider
    buttons.push(
      '<a class="btn btn-outline" href="tel:' + escapeHtml(ride.phone) +
      '" aria-label="Call rider ' + escapeHtml(ride.riderName) + ' at ' + escapeHtml(ride.phoneDisplay) +
      '"><span aria-hidden="true">📞</span> Call rider</a>'
    );

    // Status progression button(s)
    if (status === 'assigned') {
      buttons.push(
        '<button class="btn btn-secondary btn-block" type="button" data-action="advance" data-ride-id="' +
        ride.id + '" data-next="enroute" aria-label="Mark en route for ride ' + ride.id +
        ' from ' + escapeHtml(ride.pickup) + '">Mark en route</button>'
      );
    } else if (status === 'enroute') {
      buttons.push(
        '<button class="btn btn-secondary btn-block" type="button" data-action="advance" data-ride-id="' +
        ride.id + '" data-next="arrived" aria-label="Mark arrived at pickup for ride ' + ride.id +
        '">Mark arrived</button>'
      );
    } else if (status === 'arrived') {
      buttons.push(
        '<button class="btn btn-success btn-block" type="button" data-action="advance" data-ride-id="' +
        ride.id + '" data-next="completed" aria-label="Complete ride ' + ride.id +
        ' for ' + escapeHtml(ride.riderName) + '">Complete ride</button>'
      );
    } else {
      buttons.push(
        '<button class="btn btn-outline btn-block" type="button" data-action="reopen" data-ride-id="' +
        ride.id + '" aria-label="Reopen ride ' + ride.id + ' (demo only)">Reopen ride <span class="visually-hidden">(demo only)</span></button>'
      );
    }

    return '<div class="actions" role="group" aria-label="Driver actions for ride ' + ride.id + '">' + buttons.join('') + '</div>';
  }

  function rideCard(ride, isNext) {
    return (
      '<li>' +
        '<article class="ride-card' + (isNext ? ' is-next' : '') + '" data-status="' + ride.status +
        '" aria-labelledby="ride-' + ride.id + '-time">' +
          '<header class="ride-top">' +
            '<div>' +
              '<span class="ride-id">' + escapeHtml(ride.id) + ' · ' + escapeHtml(ride.rideType) + '</span>' +
              '<span class="ride-pickup-time" id="ride-' + ride.id + '-time">' +
                '<span class="visually-hidden">Pickup at </span>' + escapeHtml(ride.pickupTime) +
              '</span>' +
            '</div>' +
            statusBadge(ride.status) +
          '</header>' +

          '<div class="ride-rider">' +
            '<span class="name">' + escapeHtml(ride.riderName) + '</span>' +
            '<span class="ride-type">' + escapeHtml(ride.phoneDisplay) + '</span>' +
          '</div>' +

          '<div class="ride-route" aria-label="Route">' +
            '<div class="route-row">' +
              '<div class="route-icon pickup" aria-hidden="true">P</div>' +
              '<div>' +
                '<span class="label">Pickup</span>' +
                '<span class="value">' + escapeHtml(ride.pickup) + '</span>' +
              '</div>' +
            '</div>' +
            '<div class="route-row">' +
              '<div class="route-icon drop" aria-hidden="true">D</div>' +
              '<div>' +
                '<span class="label">Destination</span>' +
                '<span class="value">' + escapeHtml(ride.destination) + '</span>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="access-notes" aria-label="Accessibility notes">' +
            '<span class="icon" aria-hidden="true">i</span>' +
            '<div>' +
              '<span class="label">Accessibility &amp; rider notes</span>' +
              '<span class="text">' + escapeHtml(ride.accessibility) + '</span>' +
            '</div>' +
          '</div>' +

          '<p class="dispatch-microcopy">Dispatch: ' + escapeHtml(ride.dispatcherNote) + '</p>' +

          actionButtons(ride, isNext) +
        '</article>' +
      '</li>'
    );
  }

  function renderRunSheet() {
    var body = document.getElementById('run-sheet-body');
    if (!body) return;
    var dateEl = document.getElementById('run-sheet-date');
    var driverEl = document.getElementById('run-sheet-driver');
    var printedEl = document.getElementById('run-sheet-printed');
    var now = new Date();
    if (dateEl) dateEl.textContent = formatDateLong(now);
    if (driverEl) {
      var nameEl = document.getElementById('driver-name');
      var name = nameEl ? nameEl.textContent : 'Driver';
      driverEl.textContent = 'Driver: ' + (name || 'Driver');
    }
    if (printedEl) {
      try { printedEl.textContent = now.toLocaleString(); }
      catch (e) { printedEl.textContent = now.toISOString(); }
    }
    body.innerHTML = state.rides.map(function (ride, idx) {
      var notes = [
        ride.accessibility ? 'Access: ' + ride.accessibility : '',
        ride.dispatcherNote ? 'Dispatch: ' + ride.dispatcherNote : ''
      ].filter(Boolean).join(' — ');
      return (
        '<tr>' +
          '<td>' + (idx + 1) + '</td>' +
          '<td>' + escapeHtml(ride.pickupTime) + '</td>' +
          '<td><strong>' + escapeHtml(ride.riderName) + '</strong><br><span class="rs-muted">' + escapeHtml(ride.id) + ' · ' + escapeHtml(ride.rideType) + '</span></td>' +
          '<td>' + escapeHtml(ride.phoneDisplay) + '</td>' +
          '<td>' + escapeHtml(ride.pickup) + '</td>' +
          '<td>' + escapeHtml(ride.destination) + '</td>' +
          '<td>' + escapeHtml(notes || 'No notes') + '</td>' +
          '<td>' + escapeHtml(STATUS_LABELS[ride.status] || ride.status) + '</td>' +
        '</tr>'
      );
    }).join('');
  }

  function render() {
    renderHeader();
    renderSummary();
    var list = document.getElementById('ride-list');
    var next = nextRideOf(state.rides);
    list.innerHTML = state.rides
      .map(function (ride) { return rideCard(ride, next && ride.id === next.id); })
      .join('');
    renderRunSheet();
  }

  // ---- Events ----

  function showToast(message) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(function () {
      toast.classList.remove('is-visible');
    }, 2400);
  }

  function advanceRide(rideId, nextStatus) {
    var ride = state.rides.find(function (r) { return r.id === rideId; });
    if (!ride) return;
    ride.status = nextStatus;
    saveState(state);
    render();
    var msg = 'Demo only · ' + ride.id + ' marked ' + STATUS_LABELS[nextStatus].toLowerCase();
    showToast(msg);
  }

  function reopenRide(rideId) {
    var ride = state.rides.find(function (r) { return r.id === rideId; });
    if (!ride) return;
    ride.status = 'assigned';
    saveState(state);
    render();
    showToast('Demo only · ' + ride.id + ' reopened');
  }

  function resetDemo() {
    state = freshState();
    saveState(state);
    render();
    showToast('Demo reset · all rides assigned');
  }

  document.addEventListener('click', function (event) {
    var btn = event.target.closest('button[data-action]');
    if (!btn) return;
    var rideId = btn.getAttribute('data-ride-id');
    var action = btn.getAttribute('data-action');
    if (action === 'advance') {
      advanceRide(rideId, btn.getAttribute('data-next'));
    } else if (action === 'reopen') {
      reopenRide(rideId);
    }
  });

  function printRunSheet() {
    // Re-render to capture latest state, then open print dialog.
    renderRunSheet();
    showToast('Opening print dialog…');
    setTimeout(function () { window.print(); }, 60);
  }

  document.addEventListener('DOMContentLoaded', function () {
    render();
    var resetBtn = document.getElementById('reset-demo');
    if (resetBtn) resetBtn.addEventListener('click', resetDemo);
    var printBtn = document.getElementById('print-run-sheet');
    if (printBtn) printBtn.addEventListener('click', printRunSheet);
    // Keep run sheet fresh whenever a print is initiated via Ctrl/Cmd+P.
    window.addEventListener('beforeprint', renderRunSheet);
  });
})();
