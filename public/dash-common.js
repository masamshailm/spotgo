// Shared helpers for the dashboard pages (manager pages)

// Makes text safe to put inside HTML (stops XSS)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// GET request. If the user is not allowed (401/403), go to the login page.
function getJson(url) {
  return fetch(url).then(function (response) {
    if (response.status === 401 || response.status === 403) {
      window.location.href = 'login.html?next=' + encodeURIComponent(window.location.pathname);
      return null;
    }
    return response.json();
  });
}

// POST request with a JSON body. Always returns an object (with "error" if it failed).
function postJson(url, body) {
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

// Shows a message at the top of the page (green when ok, red when error)
function showMessage(text, ok) {
  const box = document.getElementById('page-message');
  box.textContent = text;
  box.className = ok ? 'page-message ok' : 'page-message error';
  box.scrollIntoView({ block: 'center' });
}

document.getElementById('logout-link').addEventListener('click', function (event) {
  event.preventDefault();
  fetch('/api/logout', { method: 'POST' }).then(function () {
    window.location.href = 'index.html';
  });
});
