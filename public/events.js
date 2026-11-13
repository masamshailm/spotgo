const eventList = document.getElementById('event-list');
const pageMessage = document.getElementById('page-message');
const tabButtons = document.querySelectorAll('.tab');

let allEvents = [];
let currentTab = 'all';
let currentUser = null;

function prettyDate(text) {
  const date = new Date(text + 'T00:00:00');
  return date.toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' });
}

function showMessage(text, ok) {
  pageMessage.textContent = text;
  pageMessage.className = ok ? 'page-message ok' : 'page-message error';
}

function render() {
  let html = '';

  for (let i = 0; i < allEvents.length; i++) {
    const e = allEvents[i];
    if (currentTab === 'mine' && !e.registered) continue;

    const seatsLeft = e.capacity - e.registered_count;
    const price = e.price > 0 ? 'EGP ' + e.price : 'Free';

    // The button depends on: am I registered? is it full?
    let button = '';
    if (e.registered) {
      button = '<span class="status status-confirmed">registered</span> ' +
        '<button class="reject-btn small-btn" data-unregister="' + e.id + '">Cancel registration</button>';
    } else if (seatsLeft <= 0) {
      button = '<span class="status status-rejected">full</span>';
    } else if (!currentUser || currentUser.role === 'user') {
      button = '<button class="book-btn small-btn" data-register="' + e.id + '">Register</button>';
    }

    html += `
      <div class="event-card">
        <div class="event-date">
          <b>${new Date(e.event_date + 'T00:00:00').getDate()}</b>
          <span>${new Date(e.event_date + 'T00:00:00').toLocaleDateString(dateLocale(), { month: 'short' })}</span>
        </div>
        <div class="b-main">
          <h3>${escapeHtml(pick(e, 'title'))}</h3>
          <div>${escapeHtml(pick(e, 'description') || '')}</div>
          <div class="area">
            <a href="workspace.html?id=${e.workspace_id}">${escapeHtml(pick(e, 'workspace'))}</a> · ${escapeHtml(e.area)}
          </div>
          <div class="area">${prettyDate(e.event_date)} · ${e.start_hour}:00 - ${e.start_hour + e.duration_hours}:00</div>
        </div>
        <div class="b-side">
          <b>${price}</b>
          <div class="area">${seatsLeft} seats left</div>
          <div>${button}</div>
        </div>
      </div>
    `;
  }

  if (html === '') {
    html = currentTab === 'mine'
      ? '<p class="area">You did not register for any event yet.</p>'
      : '<p class="area">No upcoming events.</p>';
  }

  eventList.innerHTML = html;
}

function load() {
  fetch('/api/events')
    .then(function (response) {
      return response.json();
    })
    .then(function (events) {
      allEvents = events;
      render();
    });
}

eventList.addEventListener('click', function (event) {
  const button = event.target.closest('button');
  if (!button) return;

  let url = '';
  let okText = '';
  if (button.dataset.register) {
    url = '/api/events/' + button.dataset.register + '/register';
    okText = 'You are registered. See you there!';
  } else if (button.dataset.unregister) {
    if (!confirm('Cancel your registration?')) return;
    url = '/api/events/' + button.dataset.unregister + '/unregister';
    okText = 'Your registration was cancelled.';
  } else {
    return;
  }

  fetch(url, { method: 'POST' })
    .then(function (response) {
      if (response.status === 401) {
        window.location.href = 'login.html?next=' + encodeURIComponent('/events.html');
        return null;
      }
      return response.json();
    })
    .then(function (data) {
      if (!data) return;
      if (data.error) {
        showMessage(data.error, false);
      } else {
        showMessage(okText, true);
      }
      load();
    });
});

for (let i = 0; i < tabButtons.length; i++) {
  tabButtons[i].addEventListener('click', function () {
    for (let j = 0; j < tabButtons.length; j++) {
      tabButtons[j].classList.remove('active');
    }
    tabButtons[i].classList.add('active');
    currentTab = tabButtons[i].dataset.tab;
    render();
  });
}

fetch('/api/me')
  .then(function (response) {
    return response.json();
  })
  .then(function (user) {
    currentUser = user;
    load();
  });
