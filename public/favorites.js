const cardsBox = document.getElementById('cards');

function load() {
  getJson('/api/my/favorites').then(function (favorites) {
    if (!favorites) return;

    if (favorites.length === 0) {
      cardsBox.innerHTML = '<p class="area">You have no favorites yet.</p>';
      return;
    }

    let html = '';
    for (let i = 0; i < favorites.length; i++) {
      const w = favorites[i];

      let priceText = 'No rooms yet';
      if (w.min_price !== null) {
        priceText = 'From EGP ' + w.min_price + ' / hour';
      }

      html += `
        <article class="card">
          <button class="fav-btn saved" data-remove="${w.id}" aria-label="Remove from favorites">&#9829;</button>
          <img class="card-img" src="${escapeHtml(w.image)}" alt="${escapeHtml(pick(w, 'name'))}">
          <h3><a href="workspace.html?id=${w.id}">${escapeHtml(pick(w, 'name'))}</a></h3>
          <p class="area">${escapeHtml(w.area)}</p>
          <div class="card-bottom">
            <span>${w.rating ? 'Rating ' + w.rating : 'No ratings yet'}</span>
            <span class="price">${priceText}</span>
          </div>
        </article>
      `;
    }
    cardsBox.innerHTML = html;
  });
}

cardsBox.addEventListener('click', function (event) {
  const button = event.target.closest('button[data-remove]');
  if (!button) return;

  postJson('/api/favorites/' + button.dataset.remove, { favorite: false }).then(function (data) {
    if (data.error) {
      showMessage(data.error, false);
      return;
    }
    showMessage('Removed from favorites.', true);
    load();
  });
});

load();
