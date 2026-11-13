const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const arabicData = require('./arabic-data');
// The database file (online the hosting website can choose another place with DB_FILE)
const db = new Database(process.env.DB_FILE || 'spotgo.db');

db.exec(`
  DROP TABLE IF EXISTS notifications;
  DROP TABLE IF EXISTS event_registrations;
  DROP TABLE IF EXISTS events;
  DROP TABLE IF EXISTS favorites;
  DROP TABLE IF EXISTS booking_addons;
  DROP TABLE IF EXISTS addons;
  DROP TABLE IF EXISTS reports;
  DROP TABLE IF EXISTS reviews;
  DROP TABLE IF EXISTS booking_slots;
  DROP TABLE IF EXISTS bookings;
  DROP TABLE IF EXISTS slots;
  DROP TABLE IF EXISTS rooms;
  DROP TABLE IF EXISTS workspaces;
  DROP TABLE IF EXISTS users;

  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    is_blocked INTEGER DEFAULT 0
  );

  CREATE TABLE workspaces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    manager_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    area TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    description TEXT,
    latitude REAL,
    longitude REAL,
    price REAL NOT NULL,
    rating REAL,
    image TEXT,
    cancel_hours_before INTEGER DEFAULT 1,
    is_approved INTEGER DEFAULT 1,
    name_ar TEXT,
    address_ar TEXT,
    description_ar TEXT,
    views INTEGER DEFAULT 0,
    FOREIGN KEY (manager_id) REFERENCES users(id)
  );

  CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    capacity INTEGER,
    price_per_hour REAL NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER NOT NULL,
    slot_date TEXT NOT NULL,
    start_hour INTEGER NOT NULL,
    time_label TEXT NOT NULL,
    is_booked INTEGER DEFAULT 0,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    total_price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_proof TEXT,
    refund_percent INTEGER,
    refund_amount REAL,
    refund_status TEXT DEFAULT 'none',
    cancelled_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
  );

  CREATE TABLE booking_slots (
    booking_id INTEGER NOT NULL,
    slot_id INTEGER NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (slot_id) REFERENCES slots(id)
  );

  CREATE TABLE reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    workspace_id INTEGER NOT NULL,
    rating INTEGER NOT NULL,
    comment TEXT,
    comment_ar TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    reporter_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id),
    FOREIGN KEY (reporter_id) REFERENCES users(id)
  );

  CREATE TABLE favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    workspace_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, workspace_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    title_ar TEXT,
    description TEXT,
    description_ar TEXT,
    event_date TEXT NOT NULL,
    start_hour INTEGER NOT NULL,
    duration_hours INTEGER NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    capacity INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE event_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    price REAL NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    message_ar TEXT,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE booking_addons (
    booking_id INTEGER NOT NULL,
    addon_id INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (addon_id) REFERENCES addons(id)
  );
`);

// ---------- Users ----------
const hash = bcrypt.hashSync('SpotGo#2026', 10);

const insertUser = db.prepare(
  'INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)'
);

const users = [
  ['Admin', 'admin@spotgo.com', '01000000001', 'admin'],
  ['Manager One', 'manager1@spotgo.com', '01000000002', 'manager'],
  ['Manager Two', 'manager2@spotgo.com', '01000000003', 'manager'],
  ['Student Test', 'student@spotgo.com', '01000000004', 'user'],
  ['Manager Three', 'manager3@spotgo.com', '01000000005', 'manager'],
  ['Mariam Hassan', 'mariam.hassan@example.com', '01000000006', 'user'],
  ['Omar Khaled', 'omar.khaled@example.com', '01000000007', 'user'],
  ['Nour Ahmed', 'nour.ahmed@example.com', '01000000008', 'user'],
  ['Youssef Adel', 'youssef.adel@example.com', '01000000009', 'user'],
  ['Salma Mostafa', 'salma.mostafa@example.com', '01000000010', 'user'],
  ['Karim Tarek', 'karim.tarek@example.com', '01000000011', 'user'],
  ['Hana Ibrahim', 'hana.ibrahim@example.com', '01000000012', 'user'],
  ['Ahmed Sherif', 'ahmed.sherif@example.com', '01000000013', 'user']
];

for (let i = 0; i < users.length; i++) {
  const u = users[i];
  insertUser.run(u[0], u[1], u[2], hash, u[3]);
}

// ---------- Workspaces and their rooms ----------
const images = [
  'images/desk-hub.jpg',
  'images/workspace-cairo.jpg',
  'images/hive.jpg',
  'images/nile-corner.jpg',
  'images/focus-lab.jpg',
  'images/study-nook.jpg',
  'images/orbit.jpg',
  'images/quiet-hours.jpg',
  'images/garden-city.jpg',
  'images/pioneer.jpg',
  'images/maadi-study.jpg',
  'images/sunrise.jpg'
];

const workspaces = [
  { manager: 2, name: 'The Desk Hub', area: 'Zamalek', lat: 30.0626, lng: 31.2197, price: 150, rating: 4.8, cancel: 1, approved: 1,
    desc: 'A bright coworking space with fast Wi-Fi and free coffee.',
    rooms: [['Private Room', 4, 60], ['Shared Space', 12, 25]] },
  { manager: 2, name: 'WorkSpace Cairo', area: 'Downtown', lat: 30.0444, lng: 31.2357, price: 120, rating: 4.6, cancel: 2, approved: 1,
    desc: 'A central workspace close to the metro, ideal for meetings.',
    rooms: [['Meeting Room', 8, 100], ['Shared Space', 20, 30]] },
  { manager: 3, name: 'Hive Workspace', area: 'Maadi', lat: 29.9602, lng: 31.2569, price: 100, rating: 4.7, cancel: 1, approved: 1,
    desc: 'A calm space with private rooms and co-working desks.',
    rooms: [['Private Room', 2, 50], ['Co-working Desk', 15, 20]] },
  { manager: 3, name: 'Nile Corner', area: 'Dokki', lat: 30.0384, lng: 31.2118, price: 90, rating: 4.4, cancel: 1, approved: 1,
    desc: 'A friendly space for students and freelancers near the Nile.',
    rooms: [['Shared Space', 16, 20], ['Meeting Room', 10, 90]] },
  { manager: 5, name: 'Focus Lab', area: 'Nasr City', lat: 30.0561, lng: 31.3656, price: 80, rating: 4.5, cancel: 2, approved: 1,
    desc: 'A quiet study space with a workshop room for training sessions.',
    rooms: [['Quiet Desk Area', 20, 15], ['Private Room', 3, 45], ['Workshop Room', 30, 150]] },
  { manager: 5, name: 'The Study Nook', area: 'Heliopolis', lat: 30.087, lng: 31.33, price: 70, rating: 4.3, cancel: 1, approved: 1,
    desc: 'An affordable quiet space for long study hours.',
    rooms: [['Quiet Desk Area', 14, 18], ['Private Room', 2, 40]] },
  { manager: 2, name: 'Orbit Coworking', area: 'New Cairo', lat: 30.0074, lng: 31.4913, price: 130, rating: 4.7, cancel: 3, approved: 1,
    desc: 'A modern space with meeting and workshop rooms.',
    rooms: [['Co-working Desk', 25, 30], ['Meeting Room', 12, 110], ['Workshop Room', 40, 180]] },
  { manager: 3, name: 'Quiet Hours Hub', area: 'Mohandessin', lat: 30.0561, lng: 31.2, price: 85, rating: 4.6, cancel: 1, approved: 1,
    desc: 'A silent-only space designed for deep focus.',
    rooms: [['Quiet Desk Area', 12, 22], ['Private Room', 4, 55]] },
  { manager: 5, name: 'Garden City Desks', area: 'Garden City', lat: 30.0359, lng: 31.2318, price: 95, rating: 4.2, cancel: 2, approved: 1,
    desc: 'A calm space in a green neighborhood.',
    rooms: [['Shared Space', 18, 25], ['Meeting Room', 8, 95]] },
  { manager: 2, name: 'Pioneer Hub', area: '6th of October', lat: 29.9285, lng: 30.9188, price: 75, rating: 4.4, cancel: 1, approved: 1,
    desc: 'A large space with co-working desks and a workshop room.',
    rooms: [['Co-working Desk', 30, 18], ['Workshop Room', 35, 130]] },
  { manager: 3, name: 'Maadi Study Space', area: 'Maadi', lat: 29.965, lng: 31.26, price: 80, rating: 4.5, cancel: 1, approved: 1,
    desc: 'A student-friendly space with quiet desks and private rooms.',
    rooms: [['Quiet Desk Area', 10, 20], ['Private Room', 2, 45]] },
  { manager: 5, name: 'Sunrise Desks', area: 'Nasr City', lat: 30.06, lng: 31.34, price: 60, rating: null, cancel: 1, approved: 0,
    desc: 'A new space waiting for admin approval.',
    rooms: [['Shared Space', 10, 20]] }
];

const insertWorkspace = db.prepare(
  'INSERT INTO workspaces (manager_id, name, area, address, phone, description, latitude, longitude, price, rating, image, cancel_hours_before, is_approved, name_ar, address_ar, description_ar, views) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

const insertRoom = db.prepare(
  'INSERT INTO rooms (workspace_id, type, capacity, price_per_hour) VALUES (?, ?, ?, ?)'
);

for (let i = 0; i < workspaces.length; i++) {
  const w = workspaces[i];
  const address = (10 + i) + ' Sample Street, ' + w.area + ', Cairo';
  const phone = '0100010' + String(1000 + i);

  const ar = arabicData.workspacesAr[w.name];

  // Full refund if cancelled this many hours before (half refund in the second half of it)
  const fullRefundHours = { 1: 6, 2: 12, 3: 24 }[w.cancel];
  const views = w.approved ? 40 + ((i * 37) % 120) : 0;   // sample visitor numbers

  const result = insertWorkspace.run(
    w.manager, w.name, w.area, address, phone, w.desc,
    w.lat, w.lng, w.price, w.rating, images[i], fullRefundHours, w.approved,
    ar.name, arabicData.addressAr(address, w.area), ar.description, views
  );

  const workspaceId = result.lastInsertRowid;

  for (let j = 0; j < w.rooms.length; j++) {
    const r = w.rooms[j];
    insertRoom.run(workspaceId, r[0], r[1], r[2]);
  }
}

// ---------- Time slots: 8 hours a day (10:00 to 6:00), for today and the next 13 days ----------
const insertSlot = db.prepare(
  'INSERT INTO slots (room_id, slot_date, start_hour, time_label, is_booked) VALUES (?, ?, ?, ?, 0)'
);

function formatHour(hour) {
  let h = hour % 12;
  if (h === 0) {
    h = 12;
  }
  return h + ':00';
}

function dateText(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

const allRooms = db.prepare('SELECT id FROM rooms').all();

for (let r = 0; r < allRooms.length; r++) {
  for (let day = 0; day < 14; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);
    const slotDate = dateText(date);

    for (let hour = 10; hour < 18; hour++) {
      const label = formatHour(hour) + ' - ' + formatHour(hour + 1);
      insertSlot.run(allRooms[r].id, slotDate, hour, label);
    }
  }
}

// ---------- Sample bookings (they book slots of tomorrow) ----------
const insertBooking = db.prepare(
  'INSERT INTO bookings (user_id, room_id, total_price, status) VALUES (?, ?, ?, ?)'
);

const linkSlot = db.prepare(
  'INSERT INTO booking_slots (booking_id, slot_id) VALUES (?, ?)'
);

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const tomorrowText = dateText(tomorrow);

function addBooking(userId, roomId, status, hour) {
  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);
  const slot = db
    .prepare('SELECT id FROM slots WHERE room_id = ? AND slot_date = ? AND start_hour = ?')
    .get(roomId, tomorrowText, hour);

  const result = insertBooking.run(userId, roomId, room.price_per_hour, status);
  linkSlot.run(result.lastInsertRowid, slot.id);

  if (status === 'pending' || status === 'confirmed') {
    db.prepare('UPDATE slots SET is_booked = 1 WHERE id = ?').run(slot.id);
  }
}

addBooking(4, 1, 'confirmed', 11);
addBooking(4, 1, 'pending', 14);
addBooking(4, 3, 'confirmed', 11);
addBooking(4, 3, 'pending', 14);
addBooking(6, 5, 'confirmed', 11);
addBooking(7, 5, 'pending', 14);
addBooking(8, 7, 'confirmed', 11);
addBooking(9, 9, 'confirmed', 11);
addBooking(10, 9, 'pending', 14);
addBooking(6, 14, 'confirmed', 11);
addBooking(11, 14, 'pending', 14);
addBooking(12, 17, 'confirmed', 11);
addBooking(13, 19, 'rejected', 10);
addBooking(7, 3, 'cancelled', 12);
addBooking(8, 12, 'confirmed', 11);
addBooking(9, 21, 'pending', 11);

// ---------- Sample reviews (linked to confirmed bookings) ----------
const insertReview = db.prepare(
  'INSERT INTO reviews (booking_id, user_id, workspace_id, rating, comment, comment_ar) VALUES (?, ?, ?, ?, ?, ?)'
);

function addReview(bookingId, userId, workspaceId, rating, comment) {
  insertReview.run(bookingId, userId, workspaceId, rating, comment, arabicData.reviewsAr[comment] || null);
}

addReview(1, 4, 1, 5, 'Bright place with fast internet. Perfect for studying.');
addReview(3, 4, 2, 4, 'Great meeting room, a bit busy at noon.');
addReview(5, 6, 3, 5, 'My favorite spot in Maadi.');
addReview(7, 8, 4, 4, 'Friendly staff and good value for the price.');

// ---------- Sample add-ons (extras added to a booking) ----------
const insertAddon = db.prepare('INSERT INTO addons (workspace_id, name, name_ar, price) VALUES (?, ?, ?, ?)');
insertAddon.run(1, 'Coffee and water', 'قهوة ومياه', 30);
insertAddon.run(1, 'Locker', 'خزانة', 15);
insertAddon.run(2, 'Projector', 'بروجكتور', 50);
insertAddon.run(2, 'Coffee and water', 'قهوة ومياه', 25);
insertAddon.run(3, 'Printing (20 pages)', 'طباعة (20 صفحة)', 20);
insertAddon.run(5, 'Projector', 'بروجكتور', 40);
insertAddon.run(5, 'Snacks', 'سناكس', 35);
insertAddon.run(7, 'Whiteboard and markers', 'سبورة وأقلام', 20);
insertAddon.run(11, 'Coffee and water', 'قهوة ومياه', 20);

// ---------- Sample events (in the coming days) ----------
function dayFromToday(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dateText(d);
}

const insertEvent = db.prepare(`
  INSERT INTO events (workspace_id, title, title_ar, description, description_ar, event_date, start_hour, duration_hours, price, capacity)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
insertEvent.run(5, 'Intro to Web Development', 'مقدمة في تطوير المواقع',
  'A beginner workshop about HTML, CSS, and JavaScript.', 'ورشة للمبتدئين عن HTML وCSS وJavaScript.',
  dayFromToday(3), 12, 3, 150, 20);
insertEvent.run(7, 'Freelancing 101', 'أساسيات العمل الحر',
  'How to find clients and price your work as a freelancer.', 'إزاي تلاقي عملاء وتسعّر شغلك كفريلانسر.',
  dayFromToday(5), 18, 2, 0, 30);
insertEvent.run(3, 'Group Study Night', 'ليلة مذاكرة جماعية',
  'A quiet study session with free coffee for students.', 'جلسة مذاكرة هادئة مع قهوة مجانية للطلبة.',
  dayFromToday(2), 18, 3, 50, 15);

// Sample event registrations and favorites for the student account (user 4)
db.prepare('INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)').run(1, 4);
db.prepare('INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)').run(1, 6);
db.prepare('INSERT INTO favorites (user_id, workspace_id) VALUES (?, ?)').run(4, 3);
db.prepare('INSERT INTO favorites (user_id, workspace_id) VALUES (?, ?)').run(4, 5);

// ---------- Sample report (a user reports a review to the admin) ----------
db.prepare('INSERT INTO reports (review_id, reporter_id, reason) VALUES (?, ?, ?)')
  .run(4, 9, 'This review looks like an advertisement.');

// ---------- Sample notification (the student's first booking was confirmed) ----------
db.prepare('INSERT INTO notifications (user_id, message, message_ar, link) VALUES (?, ?, ?, ?)').run(
  4,
  'Your booking at The Desk Hub (Private Room) on ' + tomorrowText + ' · 11:00 - 12:00 was confirmed. See you there!',
  'تم تأكيد حجزك في ذا ديسك هب (غرفة خاصة) يوم ' + tomorrowText + ' · 11:00 - 12:00. في انتظارك!',
  'my-bookings.html'
);

// ---------- Check the numbers ----------
console.log('Users:', db.prepare('SELECT COUNT(*) AS n FROM users').get().n);
console.log('Workspaces:', db.prepare('SELECT COUNT(*) AS n FROM workspaces').get().n);
console.log('Rooms:', db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n);
console.log('Slots:', db.prepare('SELECT COUNT(*) AS n FROM slots').get().n);
console.log('Bookings:', db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n);
console.log('Reviews:', db.prepare('SELECT COUNT(*) AS n FROM reviews').get().n);
console.log('Reports:', db.prepare('SELECT COUNT(*) AS n FROM reports').get().n);
console.log('Add-ons:', db.prepare('SELECT COUNT(*) AS n FROM addons').get().n);
console.log('Events:', db.prepare('SELECT COUNT(*) AS n FROM events').get().n);
console.log('Favorites:', db.prepare('SELECT COUNT(*) AS n FROM favorites').get().n);