const selects = document.querySelectorAll('.compare-select');
const table = document.getElementById('compare-table');

let allWorkspaces = [];

// Turns "Private Room:40|Shared Space:25" into a list of { type, price }
function parseRooms(text) {
  const rooms = [];
  if (!text) return rooms;

  const parts = text.split('|');
  for (let i = 0; i < parts.length; i++) {
    const pieces = parts[i].split(':');
    rooms.push({ type: pieces[0], price: Number(pieces[1]) });
  }
  return rooms;
}

fetch('/api/workspaces')
  .then(function (response) {
    return response.json();
  })
  .then(function (workspaces) {
    allWorkspaces = workspaces;

    // Fill the 3 lists with the workspace names
    for (let s = 0; s < selects.length; s++) {
      let options = '<option value="">Choose a workspace</option>';
      for (let i = 0; i < workspaces.length; i++) {
        options += '<option value="' + workspaces[i].id + '">' +
          escapeHtml(pick(workspaces[i], 'name')) + ' (' + escapeHtml(workspaces[i].area) + ')</option>';
      }
      selects[s].innerHTML = options;
    }

    // compare.html?ids=1,3 chooses workspaces 1 and 3 from the start
    const ids = (new URLSearchParams(window.location.search).get('ids') || '').split(',');
    for (let s = 0; s < selects.length && s < ids.length; s++) {
      selects[s].value = ids[s];
    }

    renderTable();
  });

for (let s = 0; s < selects.length; s++) {
  selects[s].addEventListener('change', renderTable);
}

function renderTable() {
  // The workspaces the user chose (empty lists are skipped)
  const chosen = [];
  for (let s = 0; s < selects.length; s++) {
    const w = allWorkspaces.find(function (x) {
      return String(x.id) === selects[s].value;
    });
    if (w) chosen.push(w);
  }

  if (chosen.length === 0) {
    table.innerHTML = '<tr><td class="area">Choose at least one workspace above.</td></tr>';
    return;
  }

  // Find the best values: the lowest price, the highest rating, the most flexible cancellation
  let lowestPrice = Infinity;
  let highestRating = 0;
  let mostCancelHours = Infinity;
  for (let i = 0; i < chosen.length; i++) {
    const w = chosen[i];
    if (w.min_price !== null && w.min_price < lowestPrice) lowestPrice = w.min_price;
    if (w.rating && w.rating > highestRating) highestRating = w.rating;
    if (w.cancel_hours_before < mostCancelHours) mostCancelHours = w.cancel_hours_before;
  }

  // Only highlight when 2 or more workspaces are compared
  const highlight = chosen.length > 1;

  function cell(content, isBest) {
    if (highlight && isBest) {
      return '<td class="best">' + content + '</td>';
    }
    return '<td>' + content + '</td>';
  }

  let html = '<tr><th></th>';
  for (let i = 0; i < chosen.length; i++) {
    html += '<th><img class="compare-img" src="' + escapeHtml(chosen[i].image) + '" alt=""><br>' +
      escapeHtml(pick(chosen[i], 'name')) + '</th>';
  }
  html += '</tr>';

  // Area
  html += '<tr><th>Area</th>';
  for (let i = 0; i < chosen.length; i++) {
    html += cell(escapeHtml(chosen[i].area), false);
  }
  html += '</tr>';

  // Rating
  html += '<tr><th>Rating</th>';
  for (let i = 0; i < chosen.length; i++) {
    const r = chosen[i].rating;
    html += cell(r ? r + ' / 5' : 'No ratings yet', r && r === highestRating);
  }
  html += '</tr>';

  // Lowest price
  html += '<tr><th>Price from</th>';
  for (let i = 0; i < chosen.length; i++) {
    const p = chosen[i].min_price;
    html += cell(p !== null ? 'EGP ' + p + ' / hour' : 'No rooms yet', p !== null && p === lowestPrice);
  }
  html += '</tr>';

  // Rooms with their prices
  html += '<tr><th>Rooms</th>';
  for (let i = 0; i < chosen.length; i++) {
    const rooms = parseRooms(chosen[i].rooms_info);
    let list = '';
    for (let j = 0; j < rooms.length; j++) {
      list += escapeHtml(rooms[j].type) + ': EGP ' + rooms[j].price + '<br>';
    }
    html += cell(list || 'No rooms yet', false);
  }
  html += '</tr>';

  // Refund policy (fewer hours before = more flexible for the customer)
  html += '<tr><th>Full refund</th>';
  for (let i = 0; i < chosen.length; i++) {
    const h = chosen[i].cancel_hours_before;
    html += cell('Up to ' + h + ' hours before', h === mostCancelHours);
  }
  html += '</tr>';

  // Address
  html += '<tr><th>Address</th>';
  for (let i = 0; i < chosen.length; i++) {
    html += cell(escapeHtml(pick(chosen[i], 'address') || 'Not available'), false);
  }
  html += '</tr>';

  // Book button
  html += '<tr><th></th>';
  for (let i = 0; i < chosen.length; i++) {
    html += cell('<a class="book-btn" href="workspace.html?id=' + chosen[i].id + '">View and book</a>', false);
  }
  html += '</tr>';

  table.innerHTML = html;
}
