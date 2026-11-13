const list = document.getElementById('list');
const message = document.getElementById('admin-message');
const tabButtons = document.querySelectorAll('.tab');

let currentTab = 'users';
let firstLoad = true;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showMessage(text) {
  message.textContent = text;
  message.style.fontWeight = 'bold';
  message.scrollIntoView({ block: 'center' });
}

function post(url, body) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  })
    .then(function (response) {
      return response.json().catch(function () {
        return { error: 'Server error (' + response.status + ')' };
      });
    })
    .catch(function () {
      return { error: 'Cannot reach the server' };
    });
}

function handle(data) {
  if (data.error) {
    showMessage(data.error);
    return;
  }
  refresh();
}

function loadStats() {
  fetch('/api/admin/stats')
    .then(function (response) {
      if (response.status === 403) {
        if (firstLoad) {
          window.location.href = 'login.html?next=' + encodeURIComponent('/admin.html');
        } else {
          showMessage('Your session has ended. Please log in again.');
        }
        return null;
      }
      return response.json();
    })
    .then(function (s) {
      firstLoad = false;
      if (!s) return;
      document.getElementById('stat-users').textContent = s.users;
      document.getElementById('stat-workspaces').textContent = s.workspaces;
      document.getElementById('stat-bookings').textContent = s.bookings;
      document.getElementById('stat-income').textContent = s.income;
      document.getElementById('stat-reports').textContent = s.reports;
      document.getElementById('stat-views').textContent = s.views;
      document.getElementById('count-reports').textContent = '(' + s.reports + ')';
    });
}

function loadReports() {
  fetch('/api/admin/reports')
    .then(function (response) {
      return response.json();
    })
    .then(function (reports) {
      if (!Array.isArray(reports)) return;

      if (reports.length === 0) {
        list.innerHTML = '<p class="area">No open reports.</p>';
        return;
      }

      let html = '';

      for (let i = 0; i < reports.length; i++) {
        const r = reports[i];

        html += `
          <div class="b-row">
            <div class="b-main">
              <b>${escapeHtml(pick(r, 'workspace'))}</b> · ${r.rating} / 5 · by ${escapeHtml(r.author)}
              <div>"${escapeHtml(pick(r, 'comment') || '')}"</div>
              <div class="area">Reported by ${escapeHtml(r.reporter)} (${escapeHtml(r.reporter_role)}): ${escapeHtml(r.reason)}</div>
            </div>
            <div class="b-side">
              <button class="reject-btn small-btn" data-report="${r.id}" data-action="delete">Delete review</button>
              <button class="book-btn small-btn" data-report="${r.id}" data-action="dismiss">Keep review</button>
            </div>
          </div>
        `;
      }

      list.innerHTML = html;
    });
}

function loadUsers() {
  fetch('/api/admin/users')
    .then(function (response) {
      return response.json();
    })
    .then(function (users) {
      if (!Array.isArray(users)) return;
      let html = '';

      for (let i = 0; i < users.length; i++) {
        const u = users[i];

        let action = '';
        if (u.role !== 'admin') {
          if (u.is_blocked === 1) {
            action = '<button class="book-btn small-btn" data-user="' + u.id + '" data-blocked="false">Unblock</button>';
          } else {
            action = '<button class="reject-btn small-btn" data-user="' + u.id + '" data-blocked="true">Block</button>';
          }
        }

        let state = '<span class="status status-confirmed">active</span>';
        if (u.is_blocked === 1) {
          state = '<span class="status status-rejected">blocked</span>';
        }

        html += `
          <div class="b-row">
            <div class="b-main">
              <b>${escapeHtml(u.full_name)}</b> · ${escapeHtml(u.role)}
              <div class="area">${escapeHtml(u.email)} · ${escapeHtml(u.phone || '')}</div>
            </div>
            <div class="b-side">${state}<div>${action}</div></div>
          </div>
        `;
      }

      list.innerHTML = html;
    });
}

function loadWorkspaces() {
  fetch('/api/admin/workspaces')
    .then(function (response) {
      return response.json();
    })
    .then(function (workspaces) {
      if (!Array.isArray(workspaces)) return;
      let html = '';

      for (let i = 0; i < workspaces.length; i++) {
        const w = workspaces[i];

        let state = '<span class="status status-pending">hidden</span>';
        let toggle = '<button class="book-btn small-btn" data-ws="' + w.id + '" data-approved="true">Approve</button>';

        if (w.is_approved === 1) {
          state = '<span class="status status-confirmed">visible</span>';
          toggle = '<button class="reject-btn small-btn" data-ws="' + w.id + '" data-approved="false">Hide</button>';
        }

        const remove = '<button class="reject-btn small-btn" data-delete="' + w.id + '">Delete</button>';

        html += `
          <div class="b-row">
            <div class="b-main">
              <b>${escapeHtml(pick(w, 'name'))}</b> · ${escapeHtml(w.area)}
              <div class="area">Manager: ${escapeHtml(w.manager)} · ${w.bookings} bookings · ${w.views} visitors</div>
            </div>
            <div class="b-side">${state}<div>${toggle} ${remove}</div></div>
          </div>
        `;
      }

      list.innerHTML = html;
    });
}

function refresh() {
  message.textContent = '';
  loadStats();

  if (currentTab === 'users') {
    loadUsers();
  } else if (currentTab === 'workspaces') {
    loadWorkspaces();
  } else {
    loadReports();
  }
}

function openTab(name) {
  for (let j = 0; j < tabButtons.length; j++) {
    tabButtons[j].classList.toggle('active', tabButtons[j].dataset.tab === name);
  }
  currentTab = name;
  refresh();
}

for (let i = 0; i < tabButtons.length; i++) {
  tabButtons[i].addEventListener('click', function () {
    openTab(tabButtons[i].dataset.tab);
  });
}

// The side links (Users, Workspaces, Reports) open the matching tab
const sideLinks = document.querySelectorAll('.side-link[data-go]');
for (let i = 0; i < sideLinks.length; i++) {
  sideLinks[i].addEventListener('click', function () {
    openTab(sideLinks[i].dataset.go);
  });
}

list.addEventListener('click', function (event) {
  const button = event.target.closest('button');
  if (!button) return;

  if (button.dataset.user) {
    post('/api/admin/users/' + button.dataset.user + '/block', {
      blocked: button.dataset.blocked === 'true'
    }).then(handle);
  }

  if (button.dataset.ws) {
    post('/api/admin/workspaces/' + button.dataset.ws + '/approve', {
      approved: button.dataset.approved === 'true'
    }).then(handle);
  }

  if (button.dataset.delete) {
    if (!confirm('Delete this workspace permanently?')) return;

    post('/api/admin/workspaces/' + button.dataset.delete + '/delete').then(handle);
  }

  if (button.dataset.report) {
    if (button.dataset.action === 'delete' && !confirm('Delete this review permanently?')) return;

    post('/api/admin/reports/' + button.dataset.report + '/resolve', {
      action: button.dataset.action
    }).then(handle);
  }
});

document.getElementById('logout-link').addEventListener('click', function (event) {
  event.preventDefault();
  fetch('/api/logout', { method: 'POST' }).then(function () {
    window.location.href = 'index.html';
  });
});

refresh();