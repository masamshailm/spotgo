getJson('/api/manager/earnings').then(function (e) {
  if (!e) return;

  document.getElementById('stat-income').textContent = e.income;
  document.getElementById('stat-pending').textContent = e.pending;
  document.getElementById('stat-count').textContent = e.confirmedCount;

  // Table 1: one row per workspace
  let html = '<tr><th>Workspace</th><th>Confirmed bookings</th><th>Income (EGP)</th><th>Pending (EGP)</th></tr>';
  for (let i = 0; i < e.byWorkspace.length; i++) {
    const w = e.byWorkspace[i];
    html += '<tr><td>' + escapeHtml(pick(w, 'name')) + '</td><td>' + w.confirmed_count + '</td><td>' +
      w.income + '</td><td>' + w.pending + '</td></tr>';
  }
  document.getElementById('by-workspace').innerHTML = html;

  // Table 2: one row per month (the month the booking was made)
  html = '<tr><th>Month</th><th>Confirmed bookings</th><th>Income (EGP)</th></tr>';
  if (e.byMonth.length === 0) {
    html += '<tr><td colspan="3" class="area">No confirmed bookings yet.</td></tr>';
  }
  for (let i = 0; i < e.byMonth.length; i++) {
    const m = e.byMonth[i];
    html += '<tr><td>' + m.month + '</td><td>' + m.confirmed_count + '</td><td>' + m.income + '</td></tr>';
  }
  document.getElementById('by-month').innerHTML = html;
});
