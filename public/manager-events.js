const form = document.getElementById('event-form');
const list = document.getElementById('list');

function todayText() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

// Fill the "Workspace" list with the manager's workspaces
getJson('/api/manager/workspaces').then(function (workspaces) {
  if (!workspaces) return;
  let options = '';
  for (let i = 0; i < workspaces.length; i++) {
    options += '<option value="' + workspaces[i].id + '">' + escapeHtml(pick(workspaces[i], 'name')) + '</option>';
  }
  document.getElementById('ws-select').innerHTML = options;
});

function load() {
  getJson('/api/manager/events').then(function (events) {
    if (!events) return;

    if (events.length === 0) {
      list.innerHTML = '<p class="area">No events yet.</p>';
      return;
    }

    let html = '';
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      const isPast = e.event_date < todayText();

      // The people who registered
      let people = '';
      for (let j = 0; j < e.people.length; j++) {
        const p = e.people[j];
        people += '<div class="area">' + escapeHtml(p.full_name) + ' · ' + escapeHtml(p.email) + ' · ' + escapeHtml(p.phone || '') + '</div>';
      }
      if (people === '') {
        people = '<div class="area">No one registered yet.</div>';
      }

      html += `
        <div class="b-row">
          <div class="b-main">
            <b>${escapeHtml(pick(e, 'title'))}</b> ${isPast ? '<span class="status">ended</span>' : ''}
            <div class="area">${escapeHtml(pick(e, 'workspace'))} · ${e.event_date} · ${e.start_hour}:00 - ${e.start_hour + e.duration_hours}:00 · ${e.price > 0 ? 'EGP ' + e.price : 'Free'}</div>
            <details>
              <summary>${e.registered_count} / ${e.capacity} registered</summary>
              ${people}
            </details>
          </div>
          <div class="b-side">
            <button class="reject-btn small-btn" data-delete="${e.id}">Delete</button>
          </div>
        </div>
      `;
    }
    list.innerHTML = html;
  });
}

form.addEventListener('submit', function (event) {
  event.preventDefault();

  const data = {};
  new FormData(form).forEach(function (value, key) {
    data[key] = value;
  });

  postJson('/api/manager/events', data).then(function (result) {
    if (result.error) {
      showMessage(result.error, false);
      return;
    }
    showMessage('Event created. Customers can now register on the Events page.', true);
    form.reset();
    document.getElementById('event-date').min = todayText();
    load();
  });
});

list.addEventListener('click', function (event) {
  const button = event.target.closest('button[data-delete]');
  if (!button) return;

  if (!confirm('Delete this event and its registrations?')) return;

  postJson('/api/manager/events/' + button.dataset.delete + '/delete').then(function (result) {
    if (result.error) {
      showMessage(result.error, false);
      return;
    }
    showMessage('Event deleted.', true);
    load();
  });
});

document.getElementById('event-date').min = todayText();
load();
