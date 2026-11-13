const roomSelect = document.getElementById('room-select');
const dayInput = document.getElementById('day-input');
const slotsBox = document.getElementById('manager-slots');
const openUntil = document.getElementById('open-until');
const addDaysButton = document.getElementById('add-days-btn');

let rooms = [];   // all the manager's rooms: { id, label, last_date }

function todayText() {
  const now = new Date();
  return now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');
}

function loadRooms(keepRoomId) {
  getJson('/api/manager/workspaces').then(function (workspaces) {
    if (!workspaces) return;

    rooms = [];
    let options = '';

    for (let i = 0; i < workspaces.length; i++) {
      for (let j = 0; j < workspaces[i].rooms.length; j++) {
        const r = workspaces[i].rooms[j];
        rooms.push({ id: r.id, last_date: r.last_date });
        options += '<option value="' + r.id + '">' +
          escapeHtml(pick(workspaces[i], 'name')) + ' · ' + escapeHtml(r.type) + '</option>';
      }
    }

    if (rooms.length === 0) {
      roomSelect.innerHTML = '<option>No rooms yet</option>';
      slotsBox.innerHTML = '<p class="area">Add a room first from My Workspaces.</p>';
      return;
    }

    roomSelect.innerHTML = options;
    if (keepRoomId) roomSelect.value = keepRoomId;
    showOpenUntil();
    loadSlots();
  });
}

function showOpenUntil() {
  const room = rooms.find(function (r) {
    return String(r.id) === roomSelect.value;
  });
  openUntil.textContent = 'This room is open for booking until ' + (room && room.last_date ? room.last_date : '-') + '.';
  if (room && room.last_date) dayInput.max = room.last_date;
}

function loadSlots() {
  getJson('/api/manager/rooms/' + roomSelect.value + '/slots?date=' + dayInput.value).then(function (slots) {
    if (!slots) return;

    if (slots.length === 0) {
      slotsBox.innerHTML = '<p class="area">This day is not open yet. Use "Open 7 more days".</p>';
      return;
    }

    let html = '';
    for (let i = 0; i < slots.length; i++) {
      const s = slots[i];
      // Only free and closed (blocked) slots can be clicked
      const disabled = (s.state === 'booked' || s.state === 'passed') ? ' disabled' : '';
      html += '<button class="slot-state ' + s.state + '" data-id="' + s.id + '" data-state="' + s.state + '"' + disabled + '>' +
        s.time_label + '</button>';
    }
    slotsBox.innerHTML = html;
  });
}

slotsBox.addEventListener('click', function (event) {
  const button = event.target.closest('button[data-id]');
  if (!button || button.disabled) return;

  // free -> close it, blocked -> open it again
  const block = button.dataset.state === 'free';

  postJson('/api/manager/slots/' + button.dataset.id + '/block', { blocked: block }).then(function (data) {
    if (data.error) {
      showMessage(data.error, false);
    }
    loadSlots();
  });
});

addDaysButton.addEventListener('click', function () {
  postJson('/api/manager/rooms/' + roomSelect.value + '/add-days').then(function (data) {
    if (data.error) {
      showMessage(data.error, false);
      return;
    }
    showMessage('7 more days are now open for booking.', true);
    loadRooms(roomSelect.value);
  });
});

roomSelect.addEventListener('change', function () {
  showOpenUntil();
  loadSlots();
});

dayInput.addEventListener('change', loadSlots);

dayInput.value = todayText();
dayInput.min = todayText();
loadRooms();
