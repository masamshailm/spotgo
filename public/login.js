const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginButton = document.getElementById('login-btn');
const errorText = document.getElementById('login-error');

function login() {
  errorText.textContent = '';

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: emailInput.value.trim(),
      password: passwordInput.value
    })
  })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (data.error) {
        errorText.textContent = data.error;
        return;
      }

      const next = new URLSearchParams(window.location.search).get('next');

      if (next && next.startsWith('/') && !next.startsWith('//')) {
        window.location.href = next;
      } else if (data.role === 'manager') {
        window.location.href = 'manager.html';
      } else if (data.role === 'admin') {
        window.location.href = 'admin.html';
      } else {
        window.location.href = 'index.html';
      }
    });
}

loginButton.addEventListener('click', login);

passwordInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    login();
  }
});