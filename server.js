const express = require('express');
const Database = require('better-sqlite3');

const session = require('express-session');
const bcrypt = require('bcryptjs');

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();

// DB_FILE and PORT can be changed (for testing, or by the hosting website).
// Default: spotgo.db on port 3000.
const DB_FILE = process.env.DB_FILE || 'spotgo.db';
const PORT = process.env.PORT || 3000;

// On a new server there is no database yet, so we create it with the sample data
// by running setup-db.js once. (On the laptop the database already exists, so this is skipped.)
if (!fs.existsSync(DB_FILE)) {
  console.log('No database found. Creating it with setup-db.js...');
  require('child_process').execFileSync(process.execPath, [path.join(__dirname, 'setup-db.js')], {
    stdio: 'inherit',
    env: Object.assign({}, process.env, { DB_FILE: DB_FILE })
  });
}

const db = new Database(DB_FILE);

// ---------- Updating an old database (migration) ----------
// New tables are created with "IF NOT EXISTS" and new columns are added only if
// they are missing, so the existing data is NOT deleted.
db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id INTEGER NOT NULL,
    reporter_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (review_id) REFERENCES reviews(id),
    FOREIGN KEY (reporter_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    workspace_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, workspace_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    title_ar TEXT,
    description TEXT,
    event_date TEXT NOT NULL,
    start_hour INTEGER NOT NULL,
    duration_hours INTEGER NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    capacity INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS event_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS addons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    workspace_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    name_ar TEXT,
    price REAL NOT NULL,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    message_ar TEXT,
    link TEXT,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS booking_addons (
    booking_id INTEGER NOT NULL,
    addon_id INTEGER NOT NULL,
    price REAL NOT NULL,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (addon_id) REFERENCES addons(id)
  );
`);

function addColumnIfMissing(table, column, type) {
  const columns = db.prepare('PRAGMA table_info(' + table + ')').all();
  const exists = columns.some(function (c) {
    return c.name === column;
  });
  if (!exists) {
    db.exec('ALTER TABLE ' + table + ' ADD COLUMN ' + column + ' ' + type);
  }
}

addColumnIfMissing('workspaces', 'name_ar', 'TEXT');
addColumnIfMissing('workspaces', 'address_ar', 'TEXT');
addColumnIfMissing('workspaces', 'description_ar', 'TEXT');
addColumnIfMissing('workspaces', 'views', 'INTEGER DEFAULT 0');
addColumnIfMissing('reviews', 'comment_ar', 'TEXT');
addColumnIfMissing('events', 'description_ar', 'TEXT');
addColumnIfMissing('bookings', 'refund_percent', 'INTEGER');
addColumnIfMissing('bookings', 'refund_amount', 'REAL');
addColumnIfMissing('bookings', 'refund_status', "TEXT DEFAULT 'none'");
addColumnIfMissing('bookings', 'cancelled_at', 'TEXT');

// Fill the Arabic text of the sample workspaces and reviews (only where it is empty)
const arabicData = require('./arabic-data');
const oldWorkspaces = db.prepare('SELECT id, name, area, address FROM workspaces WHERE name_ar IS NULL').all();
for (let i = 0; i < oldWorkspaces.length; i++) {
  const w = oldWorkspaces[i];
  const ar = arabicData.workspacesAr[w.name];
  if (ar) {
    db.prepare('UPDATE workspaces SET name_ar = ?, description_ar = ?, address_ar = ? WHERE id = ?')
      .run(ar.name, ar.description, arabicData.addressAr(w.address, w.area), w.id);
  }
}
const oldReviews = db.prepare('SELECT id, comment FROM reviews WHERE comment_ar IS NULL').all();
for (let i = 0; i < oldReviews.length; i++) {
  const ar = arabicData.reviewsAr[oldReviews[i].comment];
  if (ar) {
    db.prepare('UPDATE reviews SET comment_ar = ? WHERE id = ?').run(ar, oldReviews[i].id);
  }
}

app.use(express.json());

// Online, the site runs behind the hosting website's HTTPS proxy
app.set('trust proxy', 1);

// The secret that signs the login cookie. Online it comes from the hosting settings
// (SESSION_SECRET), so it is not written in the public code.
app.use(session({
  secret: process.env.SESSION_SECRET || 'spotgo-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax' }
}));

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, 'proof-' + req.params.id + '-' + Date.now() + ext);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowed = ['image/jpeg', 'image/png'];
    cb(null, allowed.includes(file.mimetype));
  }
});

app.use(express.static('public'));

// ---------- Helpers for dates and times ----------
function dateText(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + d;
}

function todayText() {
  return dateText(new Date());
}

function formatHour(hour) {
  let h = hour % 12;
  if (h === 0) {
    h = 12;
  }
  return h + ':00';
}

// Creates the 8 daily time slots (10:00 to 6:00) for a room, for a number of days.
// A slot that already exists is skipped, so this is safe to run twice.
function addSlotsForDays(roomId, firstDate, days) {
  const exists = db.prepare('SELECT id FROM slots WHERE room_id = ? AND slot_date = ? AND start_hour = ?');
  const insert = db.prepare(
    'INSERT INTO slots (room_id, slot_date, start_hour, time_label, is_booked) VALUES (?, ?, ?, ?, 0)'
  );

  for (let day = 0; day < days; day++) {
    const date = new Date(firstDate + 'T00:00:00');
    date.setDate(date.getDate() + day);
    const slotDate = dateText(date);

    for (let hour = 10; hour < 18; hour++) {
      if (!exists.get(roomId, slotDate, hour)) {
        insert.run(roomId, slotDate, hour, formatHour(hour) + ' - ' + formatHour(hour + 1));
      }
    }
  }
}

// Recalculates a workspace's rating from its reviews (null if no reviews are left)
function updateRating(workspaceId) {
  const avg = db
    .prepare('SELECT ROUND(AVG(rating), 1) AS a FROM reviews WHERE workspace_id = ?')
    .get(workspaceId).a;

  db.prepare('UPDATE workspaces SET rating = ? WHERE id = ?').run(avg, workspaceId);
}

// Saves a notification for a user (in English and Arabic). The user sees it under the bell.
function notify(userId, message, messageAr, link) {
  db.prepare('INSERT INTO notifications (user_id, message, message_ar, link) VALUES (?, ?, ?, ?)')
    .run(userId, message, messageAr, link);
}

// True if a slot belongs to a booking that is still pending or confirmed
function slotHasActiveBooking(slotId) {
  const row = db.prepare(`
    SELECT COUNT(*) AS n
    FROM booking_slots
    JOIN bookings ON booking_slots.booking_id = bookings.id
    WHERE booking_slots.slot_id = ? AND bookings.status IN ('pending', 'confirmed')
  `).get(slotId);

  return row.n > 0;
}

function slotStart(slotDate, startHour) {
  return new Date(slotDate + 'T' + String(startHour).padStart(2, '0') + ':00:00');
}

function getBookingTimes(bookingId) {
  const rows = db.prepare(`
    SELECT slots.slot_date, slots.time_label
    FROM booking_slots
    JOIN slots ON booking_slots.slot_id = slots.id
    WHERE booking_slots.booking_id = ?
    ORDER BY slots.slot_date, slots.start_hour
  `).all(bookingId);

  return rows.map(function (t) {
    return t.slot_date + ' · ' + t.time_label;
  });
}

// A booking is "past" when its LAST time slot has already ended
function isBookingPast(bookingId) {
  const last = db.prepare(`
    SELECT slots.slot_date, slots.start_hour
    FROM booking_slots
    JOIN slots ON booking_slots.slot_id = slots.id
    WHERE booking_slots.booking_id = ?
    ORDER BY slots.slot_date DESC, slots.start_hour DESC
    LIMIT 1
  `).get(bookingId);

  if (!last) return false;

  const endTime = slotStart(last.slot_date, last.start_hour + 1);
  return endTime < new Date();
}

// ---------- Workspaces ----------
app.get('/api/workspaces', function (req, res) {
  const workspaces = db.prepare(`
    SELECT workspaces.*, MIN(rooms.price_per_hour) AS min_price,
           GROUP_CONCAT(rooms.type || ':' || rooms.price_per_hour, '|') AS rooms_info
    FROM workspaces
    LEFT JOIN rooms ON rooms.workspace_id = workspaces.id
    WHERE workspaces.is_approved = 1
    GROUP BY workspaces.id
  `).all();
  res.json(workspaces);
});

app.get('/api/workspaces/:id', function (req, res) {
  const workspace = db
    .prepare('SELECT * FROM workspaces WHERE id = ? AND is_approved = 1')
    .get(req.params.id);

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  // Visitor counter: count each visitor once per session (refreshing does not count again)
  if (!req.session.viewed) {
    req.session.viewed = [];
  }
  if (!req.session.viewed.includes(workspace.id)) {
    req.session.viewed.push(workspace.id);
    db.prepare('UPDATE workspaces SET views = views + 1 WHERE id = ?').run(workspace.id);
    workspace.views = workspace.views + 1;
  }

  res.json(workspace);
});

app.get('/api/workspaces/:id/rooms', function (req, res) {
  const rooms = db
    .prepare('SELECT * FROM rooms WHERE workspace_id = ?')
    .all(req.params.id);

  res.json(rooms);
});

// The open days of a room, each with how many time slots are still free.
// A slot is free if nobody booked it AND its time has not passed yet.
// Example: [{ date: "2026-11-14", free: 6 }, { date: "2026-11-15", free: 0 }]
app.get('/api/rooms/:id/dates', function (req, res) {
  const slots = db
    .prepare('SELECT slot_date, start_hour, is_booked FROM slots WHERE room_id = ? AND slot_date >= ? ORDER BY slot_date, start_hour')
    .all(req.params.id, todayText());

  const now = new Date();
  const days = [];

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];

    // A new date starts a new day in the list
    if (days.length === 0 || days[days.length - 1].date !== s.slot_date) {
      days.push({ date: s.slot_date, free: 0 });
    }

    if (s.is_booked === 0 && slotStart(s.slot_date, s.start_hour) > now) {
      days[days.length - 1].free++;
    }
  }

  res.json(days);
});

app.get('/api/rooms/:id/slots', function (req, res) {
  const date = req.query.date || todayText();

  const slots = db
    .prepare('SELECT * FROM slots WHERE room_id = ? AND slot_date = ? ORDER BY start_hour')
    .all(req.params.id, date);

  const now = new Date();

  for (let i = 0; i < slots.length; i++) {
    slots[i].is_past = slotStart(slots[i].slot_date, slots[i].start_hour) <= now ? 1 : 0;
  }

  res.json(slots);
});

// ---------- Reviews ----------
app.get('/api/workspaces/:id/reviews', function (req, res) {
  const reviews = db.prepare(`
    SELECT reviews.id, reviews.rating, reviews.comment, reviews.comment_ar, reviews.created_at, users.full_name
    FROM reviews
    JOIN users ON reviews.user_id = users.id
    WHERE reviews.workspace_id = ?
    ORDER BY reviews.id DESC
  `).all(req.params.id);

  res.json(reviews);
});

app.post('/api/workspaces/:id/reviews', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const rating = Number(req.body.rating);
  const comment = (req.body.comment || '').trim().slice(0, 500);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    res.status(400).json({ error: 'Please choose a rating from 1 to 5' });
    return;
  }

  const booking = db.prepare(`
    SELECT bookings.id FROM bookings
    JOIN rooms ON bookings.room_id = rooms.id
    WHERE bookings.user_id = ? AND rooms.workspace_id = ? AND bookings.status = 'confirmed'
      AND bookings.id NOT IN (SELECT booking_id FROM reviews)
    ORDER BY bookings.id
    LIMIT 1
  `).get(req.session.user.id, req.params.id);

  if (!booking) {
    res.status(403).json({ error: 'You need a confirmed booking without a review to write a new review' });
    return;
  }

  db.prepare('INSERT INTO reviews (booking_id, user_id, workspace_id, rating, comment) VALUES (?, ?, ?, ?, ?)')
    .run(booking.id, req.session.user.id, req.params.id, rating, comment);

  updateRating(req.params.id);

  res.json({ ok: true });
});

// Any logged-in user (or manager) can report a review to the admin
app.post('/api/reviews/:id/report', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const reason = (req.body.reason || '').trim().slice(0, 300);

  if (reason.length < 3) {
    res.status(400).json({ error: 'Please write the reason for the report' });
    return;
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);

  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  if (review.user_id === req.session.user.id) {
    res.status(400).json({ error: 'You cannot report your own review' });
    return;
  }

  const already = db
    .prepare("SELECT id FROM reports WHERE review_id = ? AND reporter_id = ? AND status = 'open'")
    .get(review.id, req.session.user.id);

  if (already) {
    res.status(409).json({ error: 'You already reported this review' });
    return;
  }

  db.prepare('INSERT INTO reports (review_id, reporter_id, reason) VALUES (?, ?, ?)')
    .run(review.id, req.session.user.id, reason);

  res.json({ ok: true });
});

// ---------- Favorites ----------
app.get('/api/my/favorites', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const favorites = db.prepare(`
    SELECT workspaces.*, MIN(rooms.price_per_hour) AS min_price
    FROM favorites
    JOIN workspaces ON favorites.workspace_id = workspaces.id
    LEFT JOIN rooms ON rooms.workspace_id = workspaces.id
    WHERE favorites.user_id = ? AND workspaces.is_approved = 1
    GROUP BY workspaces.id
    ORDER BY favorites.id DESC
  `).all(req.session.user.id);

  res.json(favorites);
});

// { favorite: true } adds the workspace, { favorite: false } removes it
app.post('/api/favorites/:id', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const workspace = db.prepare('SELECT id FROM workspaces WHERE id = ? AND is_approved = 1').get(req.params.id);
  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  if (req.body.favorite) {
    // OR IGNORE: adding the same favorite twice does nothing (UNIQUE rule)
    db.prepare('INSERT OR IGNORE INTO favorites (user_id, workspace_id) VALUES (?, ?)')
      .run(req.session.user.id, workspace.id);
  } else {
    db.prepare('DELETE FROM favorites WHERE user_id = ? AND workspace_id = ?')
      .run(req.session.user.id, workspace.id);
  }

  res.json({ ok: true });
});

// ---------- Add-ons (extras like coffee or a projector) ----------
app.get('/api/workspaces/:id/addons', function (req, res) {
  const addons = db.prepare('SELECT * FROM addons WHERE workspace_id = ? ORDER BY price').all(req.params.id);
  res.json(addons);
});

function getBookingAddons(bookingId) {
  return db.prepare(`
    SELECT addons.name, addons.name_ar, booking_addons.price
    FROM booking_addons
    JOIN addons ON booking_addons.addon_id = addons.id
    WHERE booking_addons.booking_id = ?
  `).all(bookingId);
}

// ---------- Events (workshops and sessions held in a workspace) ----------
// The upcoming events, with how many people registered and if I registered
function getEvents(whereSql, params, userId) {
  return db.prepare(`
    SELECT events.*, workspaces.name AS workspace, workspaces.name_ar AS workspace_ar, workspaces.area,
           (SELECT COUNT(*) FROM event_registrations WHERE event_registrations.event_id = events.id) AS registered_count,
           (SELECT COUNT(*) FROM event_registrations
            WHERE event_registrations.event_id = events.id AND event_registrations.user_id = ?) AS registered
    FROM events
    JOIN workspaces ON events.workspace_id = workspaces.id
    WHERE workspaces.is_approved = 1 AND events.event_date >= ? ${whereSql}
    ORDER BY events.event_date, events.start_hour
  `).all(userId, todayText(), ...params);
}

app.get('/api/events', function (req, res) {
  const userId = req.session.user ? req.session.user.id : 0;
  res.json(getEvents('', [], userId));
});

app.get('/api/workspaces/:id/events', function (req, res) {
  const userId = req.session.user ? req.session.user.id : 0;
  res.json(getEvents('AND events.workspace_id = ?', [req.params.id], userId));
});

app.post('/api/events/:id/register', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }
  if (req.session.user.role !== 'user') {
    res.status(403).json({ error: 'Only customers can register for events' });
    return;
  }

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  if (slotStart(event.event_date, event.start_hour) <= new Date()) {
    res.status(400).json({ error: 'This event has already started' });
    return;
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM event_registrations WHERE event_id = ?').get(event.id).n;
  if (count >= event.capacity) {
    res.status(409).json({ error: 'This event is full' });
    return;
  }

  const result = db.prepare('INSERT OR IGNORE INTO event_registrations (event_id, user_id) VALUES (?, ?)')
    .run(event.id, req.session.user.id);

  if (result.changes === 0) {
    res.status(409).json({ error: 'You are already registered for this event' });
    return;
  }

  res.json({ ok: true });
});

app.post('/api/events/:id/unregister', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  db.prepare('DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?')
    .run(req.params.id, req.session.user.id);

  res.json({ ok: true });
});

// ---------- Notifications ----------
app.get('/api/my/notifications', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const list = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50')
    .all(req.session.user.id);

  const unread = db
    .prepare('SELECT COUNT(*) AS n FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(req.session.user.id).n;

  res.json({ unread: unread, notifications: list });
});

app.post('/api/my/notifications/read', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.session.user.id);
  res.json({ ok: true });
});

// ---------- Login, signup, logout ----------
app.post('/api/login', function (req, res) {
  const email = req.body.email;
  const password = req.body.password;

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    res.status(401).json({ error: 'Wrong email or password' });
    return;
  }

  if (user.is_blocked === 1) {
    res.status(403).json({ error: 'This account is blocked' });
    return;
  }

  req.session.user = { id: user.id, name: user.full_name, role: user.role };
  res.json(req.session.user);
});

app.post('/api/signup', function (req, res) {
  const fullName = (req.body.fullName || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const phone = (req.body.phone || '').trim();
  const password = req.body.password || '';

  if (!fullName || !email || !password) {
    res.status(400).json({ error: 'Please fill in your name, email, and password' });
    return;
  }

  if (!email.includes('@') || !email.includes('.')) {
    res.status(400).json({ error: 'Please enter a valid email' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);

  if (existing) {
    res.status(409).json({ error: 'This email is already registered' });
    return;
  }

  const hash = bcrypt.hashSync(password, 10);

  const result = db
    .prepare('INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)')
    .run(fullName, email, phone, hash, 'user');

  req.session.user = { id: Number(result.lastInsertRowid), name: fullName, role: 'user' };
  res.json(req.session.user);
});

app.get('/api/me', function (req, res) {
  if (req.session.user) {
    res.json(req.session.user);
  } else {
    res.json(null);
  }
});

app.post('/api/logout', function (req, res) {
  req.session.destroy();
  res.json({ ok: true });
});

// ---------- Bookings (user) ----------
app.get('/api/my/bookings', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const bookings = db.prepare(`
    SELECT bookings.id, bookings.total_price, bookings.status, bookings.payment_proof,
           bookings.refund_percent, bookings.refund_amount, bookings.refund_status,
           bookings.created_at, rooms.type AS room, rooms.workspace_id,
           workspaces.name AS workspace, workspaces.name_ar AS workspace_ar, workspaces.image AS image,
           (SELECT COUNT(*) FROM reviews WHERE reviews.booking_id = bookings.id) AS reviewed
    FROM bookings
    JOIN rooms ON bookings.room_id = rooms.id
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE bookings.user_id = ?
    ORDER BY bookings.id DESC
  `).all(req.session.user.id);

  for (let i = 0; i < bookings.length; i++) {
    bookings[i].times = getBookingTimes(bookings[i].id);
    bookings[i].is_past = isBookingPast(bookings[i].id);
    bookings[i].addons = getBookingAddons(bookings[i].id);
  }

  res.json(bookings);
});

app.get('/api/bookings/:id', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const booking = db.prepare(`
    SELECT bookings.id, bookings.total_price, bookings.status, bookings.payment_proof,
           bookings.created_at, rooms.workspace_id,
           rooms.type AS room, workspaces.name AS workspace, workspaces.name_ar AS workspace_ar,
           workspaces.address, workspaces.address_ar, workspaces.image,
           workspaces.phone AS workspace_phone, workspaces.cancel_hours_before AS cancel_hours
    FROM bookings
    JOIN rooms ON bookings.room_id = rooms.id
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE bookings.id = ? AND bookings.user_id = ?
  `).get(req.params.id, req.session.user.id);

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  booking.addons = getBookingAddons(booking.id);
  booking.times = getBookingTimes(booking.id);
  res.json(booking);
});

app.post('/api/bookings', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const roomId = req.body.roomId;
  const slotIds = req.body.slotIds;

  if (!roomId || !Array.isArray(slotIds) || slotIds.length === 0) {
    res.status(400).json({ error: 'Please choose a room and at least one time slot' });
    return;
  }

  const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(roomId);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const now = new Date();

  for (let i = 0; i < slotIds.length; i++) {
    const slot = db
      .prepare('SELECT * FROM slots WHERE id = ? AND room_id = ?')
      .get(slotIds[i], roomId);

    if (!slot || slot.is_booked === 1) {
      res.status(409).json({ error: 'One of the time slots is no longer available' });
      return;
    }

    if (slotStart(slot.slot_date, slot.start_hour) <= now) {
      res.status(400).json({ error: 'One of the time slots has already passed' });
      return;
    }
  }

  // Add-ons are optional. Each one must belong to the same workspace as the room,
  // and its price is read from the database (never from the browser).
  const addonIds = Array.isArray(req.body.addonIds) ? req.body.addonIds : [];
  const addons = [];

  for (let i = 0; i < addonIds.length; i++) {
    const addon = db
      .prepare('SELECT * FROM addons WHERE id = ? AND workspace_id = ?')
      .get(addonIds[i], room.workspace_id);

    if (!addon) {
      res.status(400).json({ error: 'One of the add-ons is not available' });
      return;
    }
    if (!addons.some(function (a) { return a.id === addon.id; })) {
      addons.push(addon);
    }
  }

  let addonsTotal = 0;
  for (let i = 0; i < addons.length; i++) {
    addonsTotal += addons[i].price;
  }

  const totalPrice = slotIds.length * room.price_per_hour + addonsTotal;

  const createBooking = db.transaction(function () {
    const result = db
      .prepare('INSERT INTO bookings (user_id, room_id, total_price) VALUES (?, ?, ?)')
      .run(req.session.user.id, roomId, totalPrice);

    const bookingId = result.lastInsertRowid;

    for (let i = 0; i < slotIds.length; i++) {
      db.prepare('INSERT INTO booking_slots (booking_id, slot_id) VALUES (?, ?)')
        .run(bookingId, slotIds[i]);

      db.prepare('UPDATE slots SET is_booked = 1 WHERE id = ?')
        .run(slotIds[i]);
    }

    for (let i = 0; i < addons.length; i++) {
      db.prepare('INSERT INTO booking_addons (booking_id, addon_id, price) VALUES (?, ?, ?)')
        .run(bookingId, addons[i].id, addons[i].price);
    }

    return bookingId;
  });

  const bookingId = createBooking();

  res.json({ bookingId: Number(bookingId), total: totalPrice, status: 'pending' });
});

app.post('/api/bookings/:id/proof', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.user.id);

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  upload.single('proof')(req, res, function (err) {
    if (err) {
      res.status(400).json({ error: 'File is too large (maximum 5 MB)' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: 'Please upload a JPG or PNG image' });
      return;
    }

    const firstUpload = !booking.payment_proof;

    db.prepare('UPDATE bookings SET payment_proof = ? WHERE id = ?')
      .run(req.file.filename, booking.id);

    // Notifications: the customer (first upload only) and the manager
    const place = db.prepare(`
      SELECT workspaces.manager_id, workspaces.name, workspaces.name_ar, rooms.type
      FROM rooms JOIN workspaces ON rooms.workspace_id = workspaces.id
      WHERE rooms.id = ?
    `).get(booking.room_id);
    const times = getBookingTimes(booking.id).join(', ');
    const nameAr = place.name_ar || place.name;
    const roomAr = arabicData.roomTypesAr[place.type] || place.type;

    if (firstUpload) {
      notify(booking.user_id,
        'Thank you! We received your payment proof for booking #' + booking.id + ' at ' + place.name +
          ' (' + place.type + ') on ' + times + '. You will get a notification when the workspace confirms it.',
        'شكرًا لك! استلمنا إثبات الدفع للحجز رقم ' + booking.id + ' في ' + nameAr + ' (' + roomAr + ') يوم ' +
          times + '. هيوصلك إشعار أول ما المكان يأكد الحجز.',
        'thank-you.html?booking=' + booking.id);
    }

    notify(place.manager_id,
      'New payment proof for booking #' + booking.id + ' at ' + place.name + ' (' + place.type + ') on ' + times +
        '. Please check it and confirm or reject the booking.',
      'إثبات دفع جديد للحجز رقم ' + booking.id + ' في ' + nameAr + ' (' + roomAr + ') يوم ' + times +
        '. من فضلك راجعه وأكد الحجز أو ارفضه.',
      'manager.html');

    res.json({ ok: true });
  });
});

// ---------- Cancellation and refunds ----------
// Every workspace has a number of hours (cancel_hours_before), for example 6:
//   cancel 6 hours or more before the start  -> 100% refund
//   cancel between 6 and 3 hours (half)      -> 50% refund
//   cancel in the last 3 hours               -> allowed, but no refund (0%)
// Money is only returned if the customer already paid (confirmed, or a payment proof was uploaded).
function refundInfo(booking) {
  if (booking.status !== 'pending' && booking.status !== 'confirmed') {
    return { error: 'This booking cannot be cancelled' };
  }

  const first = db.prepare(`
    SELECT slots.slot_date, slots.start_hour
    FROM booking_slots
    JOIN slots ON booking_slots.slot_id = slots.id
    WHERE booking_slots.booking_id = ?
    ORDER BY slots.slot_date, slots.start_hour
    LIMIT 1
  `).get(booking.id);

  const policy = db.prepare(`
    SELECT workspaces.cancel_hours_before AS hours
    FROM rooms
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE rooms.id = ?
  `).get(booking.room_id);

  const hoursLeft = (slotStart(first.slot_date, first.start_hour) - new Date()) / 3600000;

  if (hoursLeft <= 0) {
    return { error: 'This booking has already started, so it cannot be cancelled' };
  }

  let percent = 0;
  if (hoursLeft >= policy.hours) {
    percent = 100;
  } else if (hoursLeft >= policy.hours / 2) {
    percent = 50;
  }

  const paid = booking.status === 'confirmed' || Boolean(booking.payment_proof);
  const amount = paid ? Math.round(booking.total_price * percent / 100) : 0;

  return {
    percent: percent,
    amount: amount,
    paid: paid,
    total: booking.total_price,
    hoursLeft: Math.round(hoursLeft * 10) / 10,
    policyHours: policy.hours
  };
}

// Shows the customer what they will get back BEFORE they cancel
app.get('/api/bookings/:id/cancel-preview', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.user.id);

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  const info = refundInfo(booking);
  if (info.error) {
    res.status(400).json({ error: info.error });
    return;
  }

  res.json(info);
});

app.post('/api/bookings/:id/cancel', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.session.user.id);

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  const info = refundInfo(booking);

  if (info.error) {
    res.status(400).json({ error: info.error });
    return;
  }

  const cancel = db.transaction(function () {
    db.prepare(`
      UPDATE bookings
      SET status = 'cancelled', refund_percent = ?, refund_amount = ?, refund_status = ?,
          cancelled_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(info.percent, info.amount, info.amount > 0 ? 'due' : 'none', booking.id);

    db.prepare(`
      UPDATE slots SET is_booked = 0
      WHERE id IN (SELECT slot_id FROM booking_slots WHERE booking_id = ?)
    `).run(booking.id);
  });

  cancel();

  // Tell the manager (and remind them about the refund, if there is one)
  const place = db.prepare(`
    SELECT workspaces.manager_id, workspaces.name, workspaces.name_ar, rooms.type
    FROM rooms JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE rooms.id = ?
  `).get(booking.room_id);

  let refundEn = ' No refund is needed.';
  let refundAr = ' لا يوجد مبلغ مستحق.';
  if (info.amount > 0) {
    refundEn = ' Please refund EGP ' + info.amount + ' (' + info.percent + '%) to the customer.';
    refundAr = ' من فضلك رجّع ' + info.amount + ' جنيه (' + info.percent + '%) للعميل.';
  }

  notify(place.manager_id,
    'A customer cancelled booking #' + booking.id + ' at ' + place.name + ' (' + place.type + ').' + refundEn,
    'عميل ألغى الحجز رقم ' + booking.id + ' في ' + (place.name_ar || place.name) + ' (' +
      (arabicData.roomTypesAr[place.type] || place.type) + ').' + refundAr,
    'manager.html');

  res.json({ ok: true, percent: info.percent, amount: info.amount });
});

app.get('/api/bookings/:id/proof-image', function (req, res) {
  if (!req.session.user) {
    res.status(401).json({ error: 'Please log in first' });
    return;
  }

  const booking = db.prepare(`
    SELECT bookings.user_id, bookings.payment_proof, workspaces.manager_id
    FROM bookings
    JOIN rooms ON bookings.room_id = rooms.id
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE bookings.id = ?
  `).get(req.params.id);

  if (!booking || !booking.payment_proof) {
    res.status(404).json({ error: 'No proof found' });
    return;
  }

  const me = req.session.user;
  const allowed =
    me.role === 'admin' ||
    me.id === booking.user_id ||
    me.id === booking.manager_id;

  if (!allowed) {
    res.status(403).json({ error: 'Not allowed' });
    return;
  }

  res.sendFile(path.join(__dirname, 'uploads', booking.payment_proof));
});

// ---------- Manager ----------
function requireManager(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'manager') {
    res.status(403).json({ error: 'Managers only' });
    return;
  }
  next();
}

app.get('/api/manager/bookings', requireManager, function (req, res) {
  const bookings = db.prepare(`
    SELECT bookings.id, bookings.total_price, bookings.status, bookings.payment_proof,
           bookings.refund_percent, bookings.refund_amount, bookings.refund_status,
           bookings.created_at, users.full_name, users.email, users.phone,
           rooms.type AS room, workspaces.name AS workspace, workspaces.name_ar AS workspace_ar
    FROM bookings
    JOIN users ON bookings.user_id = users.id
    JOIN rooms ON bookings.room_id = rooms.id
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE workspaces.manager_id = ?
    ORDER BY bookings.id DESC
  `).all(req.session.user.id);

  for (let i = 0; i < bookings.length; i++) {
    bookings[i].times = getBookingTimes(bookings[i].id);
    bookings[i].addons = getBookingAddons(bookings[i].id);
  }

  res.json(bookings);
});

app.post('/api/manager/bookings/:id/status', requireManager, function (req, res) {
  const newStatus = req.body.status;

  if (newStatus !== 'confirmed' && newStatus !== 'rejected') {
    res.status(400).json({ error: 'Invalid status' });
    return;
  }

  const booking = db.prepare(`
    SELECT bookings.id, bookings.user_id, bookings.status, rooms.type AS room,
           workspaces.name AS workspace, workspaces.name_ar AS workspace_ar
    FROM bookings
    JOIN rooms ON bookings.room_id = rooms.id
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE bookings.id = ? AND workspaces.manager_id = ?
  `).get(req.params.id, req.session.user.id);

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  // Only a pending booking can be confirmed or rejected (so the customer is not notified twice)
  if (booking.status !== 'pending') {
    res.status(400).json({ error: 'This booking is no longer pending' });
    return;
  }

  db.prepare('UPDATE bookings SET status = ? WHERE id = ?')
    .run(newStatus, booking.id);

  if (newStatus === 'rejected') {
    db.prepare(`
      UPDATE slots SET is_booked = 0
      WHERE id IN (SELECT slot_id FROM booking_slots WHERE booking_id = ?)
    `).run(booking.id);
  }

  // Tell the customer what happened
  const times = getBookingTimes(booking.id).join(', ');
  const placeAr = (booking.workspace_ar || booking.workspace) + ' (' + (arabicData.roomTypesAr[booking.room] || booking.room) + ')';
  const place = booking.workspace + ' (' + booking.room + ')';

  if (newStatus === 'confirmed') {
    notify(booking.user_id,
      'Your booking at ' + place + ' on ' + times + ' was confirmed. See you there!',
      'تم تأكيد حجزك في ' + placeAr + ' يوم ' + times + '. في انتظارك!',
      'my-bookings.html');
  } else {
    notify(booking.user_id,
      'Sorry, your booking at ' + place + ' on ' + times + ' was rejected. The time slots are open again.',
      'للأسف تم رفض حجزك في ' + placeAr + ' يوم ' + times + '. الأوقات أصبحت متاحة مرة أخرى.',
      'my-bookings.html');
  }

  res.json({ ok: true });
});

// The manager sent the refund money to the customer (outside the website)
app.post('/api/manager/bookings/:id/refunded', requireManager, function (req, res) {
  const booking = db.prepare(`
    SELECT bookings.*, workspaces.name AS workspace, workspaces.name_ar AS workspace_ar
    FROM bookings
    JOIN rooms ON bookings.room_id = rooms.id
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE bookings.id = ? AND workspaces.manager_id = ?
  `).get(req.params.id, req.session.user.id);

  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  if (booking.refund_status !== 'due') {
    res.status(400).json({ error: 'There is no refund waiting for this booking' });
    return;
  }

  db.prepare("UPDATE bookings SET refund_status = 'refunded' WHERE id = ?").run(booking.id);

  notify(booking.user_id,
    'Your refund of EGP ' + booking.refund_amount + ' for the cancelled booking at ' + booking.workspace + ' was sent.',
    'تم إرسال المبلغ المسترد (' + booking.refund_amount + ' جنيه) لحجزك الملغي في ' + (booking.workspace_ar || booking.workspace) + '.',
    'my-bookings.html');

  res.json({ ok: true });
});

// ---------- Manager: workspaces, rooms, and availability ----------
const ROOM_TYPES = [
  'Co-working Desk', 'Meeting Room', 'Private Room',
  'Quiet Desk Area', 'Shared Space', 'Workshop Room'
];

// Returns the workspace only if it belongs to the logged-in manager
function getMyWorkspace(req, workspaceId) {
  return db
    .prepare('SELECT * FROM workspaces WHERE id = ? AND manager_id = ?')
    .get(workspaceId, req.session.user.id);
}

// Returns the room only if its workspace belongs to the logged-in manager
function getMyRoom(req, roomId) {
  return db.prepare(`
    SELECT rooms.*
    FROM rooms
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE rooms.id = ? AND workspaces.manager_id = ?
  `).get(roomId, req.session.user.id);
}

// Checks the workspace form. Returns { error } or { data }
function readWorkspaceForm(body) {
  const name = (body.name || '').trim().slice(0, 80);
  const area = (body.area || '').trim().slice(0, 50);
  const address = (body.address || '').trim().slice(0, 150);
  const phone = (body.phone || '').trim().slice(0, 20);
  const description = (body.description || '').trim().slice(0, 500);
  const nameAr = (body.nameAr || '').trim().slice(0, 80);
  const addressAr = (body.addressAr || '').trim().slice(0, 150);
  const descriptionAr = (body.descriptionAr || '').trim().slice(0, 500);
  const cancelHours = Number(body.cancelHours);

  let latitude = null;
  let longitude = null;
  if (body.latitude !== '' && body.latitude !== undefined && body.latitude !== null) {
    latitude = Number(body.latitude);
  }
  if (body.longitude !== '' && body.longitude !== undefined && body.longitude !== null) {
    longitude = Number(body.longitude);
  }

  if (!name || !area) {
    return { error: 'Please fill in the workspace name and area' };
  }
  if (!Number.isInteger(cancelHours) || cancelHours < 0 || cancelHours > 72) {
    return { error: 'Full refund hours must be a whole number from 0 to 72' };
  }
  if ((latitude !== null && (isNaN(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== null && (isNaN(longitude) || longitude < -180 || longitude > 180))) {
    return { error: 'Please enter a valid latitude and longitude' };
  }

  return {
    data: {
      name, area, address, phone, description, cancelHours, latitude, longitude,
      // Empty Arabic fields are saved as NULL, so the English text is shown instead
      nameAr: nameAr || null, addressAr: addressAr || null, descriptionAr: descriptionAr || null
    }
  };
}

// Checks the room form. Returns { error } or { data }
function readRoomForm(body) {
  const type = body.type;
  const capacity = Number(body.capacity);
  const price = Number(body.price);

  if (!ROOM_TYPES.includes(type)) {
    return { error: 'Please choose a valid room type' };
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 200) {
    return { error: 'Capacity must be a whole number from 1 to 200' };
  }
  if (isNaN(price) || price < 1 || price > 10000) {
    return { error: 'Price per hour must be from 1 to 10000 EGP' };
  }

  return { data: { type, capacity, price } };
}

app.get('/api/manager/workspaces', requireManager, function (req, res) {
  const workspaces = db
    .prepare('SELECT * FROM workspaces WHERE manager_id = ? ORDER BY id')
    .all(req.session.user.id);

  for (let i = 0; i < workspaces.length; i++) {
    workspaces[i].rooms = db.prepare(`
      SELECT rooms.*,
             (SELECT COUNT(*) FROM bookings WHERE bookings.room_id = rooms.id) AS bookings,
             (SELECT MAX(slot_date) FROM slots WHERE slots.room_id = rooms.id) AS last_date
      FROM rooms
      WHERE workspace_id = ?
      ORDER BY id
    `).all(workspaces[i].id);

    workspaces[i].addons = db.prepare(`
      SELECT addons.*,
             (SELECT COUNT(*) FROM booking_addons WHERE booking_addons.addon_id = addons.id) AS used
      FROM addons
      WHERE workspace_id = ?
      ORDER BY id
    `).all(workspaces[i].id);
  }

  res.json(workspaces);
});

// ---------- Manager: add-ons ----------
app.post('/api/manager/workspaces/:id/addons', requireManager, function (req, res) {
  if (!getMyWorkspace(req, req.params.id)) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const name = (req.body.name || '').trim().slice(0, 60);
  const nameAr = (req.body.nameAr || '').trim().slice(0, 60);
  const price = Number(req.body.price);

  if (!name) {
    res.status(400).json({ error: 'Please write the add-on name' });
    return;
  }
  if (isNaN(price) || price < 0 || price > 10000) {
    res.status(400).json({ error: 'Add-on price must be from 0 to 10000 EGP' });
    return;
  }

  db.prepare('INSERT INTO addons (workspace_id, name, name_ar, price) VALUES (?, ?, ?, ?)')
    .run(req.params.id, name, nameAr || null, price);

  res.json({ ok: true });
});

app.post('/api/manager/addons/:id/delete', requireManager, function (req, res) {
  const addon = db.prepare(`
    SELECT addons.*
    FROM addons
    JOIN workspaces ON addons.workspace_id = workspaces.id
    WHERE addons.id = ? AND workspaces.manager_id = ?
  `).get(req.params.id, req.session.user.id);

  if (!addon) {
    res.status(404).json({ error: 'Add-on not found' });
    return;
  }

  const used = db.prepare('SELECT COUNT(*) AS n FROM booking_addons WHERE addon_id = ?').get(addon.id).n;
  if (used > 0) {
    res.status(409).json({ error: 'This add-on is part of old bookings, so it cannot be deleted.' });
    return;
  }

  db.prepare('DELETE FROM addons WHERE id = ?').run(addon.id);
  res.json({ ok: true });
});

// ---------- Manager: events ----------
app.get('/api/manager/events', requireManager, function (req, res) {
  const events = db.prepare(`
    SELECT events.*, workspaces.name AS workspace, workspaces.name_ar AS workspace_ar,
           (SELECT COUNT(*) FROM event_registrations WHERE event_registrations.event_id = events.id) AS registered_count
    FROM events
    JOIN workspaces ON events.workspace_id = workspaces.id
    WHERE workspaces.manager_id = ?
    ORDER BY events.event_date DESC, events.start_hour
  `).all(req.session.user.id);

  // The names of the people who registered
  for (let i = 0; i < events.length; i++) {
    events[i].people = db.prepare(`
      SELECT users.full_name, users.email, users.phone
      FROM event_registrations
      JOIN users ON event_registrations.user_id = users.id
      WHERE event_registrations.event_id = ?
      ORDER BY event_registrations.id
    `).all(events[i].id);
  }

  res.json(events);
});

app.post('/api/manager/events', requireManager, function (req, res) {
  const workspaceId = req.body.workspaceId;
  if (!getMyWorkspace(req, workspaceId)) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const title = (req.body.title || '').trim().slice(0, 100);
  const titleAr = (req.body.titleAr || '').trim().slice(0, 100);
  const description = (req.body.description || '').trim().slice(0, 500);
  const descriptionAr = (req.body.descriptionAr || '').trim().slice(0, 500);
  const date = req.body.date || '';
  const startHour = Number(req.body.startHour);
  const duration = Number(req.body.duration);
  const price = Number(req.body.price);
  const capacity = Number(req.body.capacity);

  if (!title) {
    res.status(400).json({ error: 'Please write the event title' });
    return;
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date < todayText()) {
    res.status(400).json({ error: 'Please choose a date from today onwards' });
    return;
  }
  if (!Number.isInteger(startHour) || startHour < 8 || startHour > 22) {
    res.status(400).json({ error: 'Start hour must be from 8 to 22' });
    return;
  }
  if (!Number.isInteger(duration) || duration < 1 || duration > 8) {
    res.status(400).json({ error: 'Duration must be from 1 to 8 hours' });
    return;
  }
  if (isNaN(price) || price < 0 || price > 10000) {
    res.status(400).json({ error: 'Price must be from 0 to 10000 EGP' });
    return;
  }
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    res.status(400).json({ error: 'Capacity must be a whole number from 1 to 500' });
    return;
  }

  db.prepare(`
    INSERT INTO events (workspace_id, title, title_ar, description, description_ar, event_date, start_hour, duration_hours, price, capacity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(workspaceId, title, titleAr || null, description, descriptionAr || null, date, startHour, duration, price, capacity);

  res.json({ ok: true });
});

app.post('/api/manager/events/:id/delete', requireManager, function (req, res) {
  const event = db.prepare(`
    SELECT events.*
    FROM events
    JOIN workspaces ON events.workspace_id = workspaces.id
    WHERE events.id = ? AND workspaces.manager_id = ?
  `).get(req.params.id, req.session.user.id);

  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const remove = db.transaction(function () {
    db.prepare('DELETE FROM event_registrations WHERE event_id = ?').run(event.id);
    db.prepare('DELETE FROM events WHERE id = ?').run(event.id);
  });

  remove();
  res.json({ ok: true });
});

// A new workspace is hidden until the admin approves it
app.post('/api/manager/workspaces', requireManager, function (req, res) {
  const form = readWorkspaceForm(req.body);
  if (form.error) {
    res.status(400).json({ error: form.error });
    return;
  }

  const f = form.data;
  const result = db.prepare(`
    INSERT INTO workspaces (manager_id, name, area, address, phone, description, latitude, longitude,
                            price, rating, image, cancel_hours_before, is_approved,
                            name_ar, address_ar, description_ar)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, 'images/sunrise.jpg', ?, 0, ?, ?, ?)
  `).run(req.session.user.id, f.name, f.area, f.address, f.phone, f.description,
    f.latitude, f.longitude, f.cancelHours, f.nameAr, f.addressAr, f.descriptionAr);

  res.json({ ok: true, id: Number(result.lastInsertRowid) });
});

app.post('/api/manager/workspaces/:id', requireManager, function (req, res) {
  if (!getMyWorkspace(req, req.params.id)) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const form = readWorkspaceForm(req.body);
  if (form.error) {
    res.status(400).json({ error: form.error });
    return;
  }

  const f = form.data;
  db.prepare(`
    UPDATE workspaces
    SET name = ?, area = ?, address = ?, phone = ?, description = ?,
        latitude = ?, longitude = ?, cancel_hours_before = ?,
        name_ar = ?, address_ar = ?, description_ar = ?
    WHERE id = ?
  `).run(f.name, f.area, f.address, f.phone, f.description,
    f.latitude, f.longitude, f.cancelHours, f.nameAr, f.addressAr, f.descriptionAr, req.params.id);

  res.json({ ok: true });
});

// Adding a room also opens its time slots for the next 14 days
app.post('/api/manager/workspaces/:id/rooms', requireManager, function (req, res) {
  if (!getMyWorkspace(req, req.params.id)) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  const form = readRoomForm(req.body);
  if (form.error) {
    res.status(400).json({ error: form.error });
    return;
  }

  const addRoom = db.transaction(function () {
    const result = db
      .prepare('INSERT INTO rooms (workspace_id, type, capacity, price_per_hour) VALUES (?, ?, ?, ?)')
      .run(req.params.id, form.data.type, form.data.capacity, form.data.price);

    addSlotsForDays(result.lastInsertRowid, todayText(), 14);
  });

  addRoom();
  res.json({ ok: true });
});

app.post('/api/manager/rooms/:id', requireManager, function (req, res) {
  if (!getMyRoom(req, req.params.id)) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const form = readRoomForm(req.body);
  if (form.error) {
    res.status(400).json({ error: form.error });
    return;
  }

  // The new price is used for new bookings only; old bookings keep their saved total
  db.prepare('UPDATE rooms SET type = ?, capacity = ?, price_per_hour = ? WHERE id = ?')
    .run(form.data.type, form.data.capacity, form.data.price, req.params.id);

  res.json({ ok: true });
});

app.post('/api/manager/rooms/:id/delete', requireManager, function (req, res) {
  const room = getMyRoom(req, req.params.id);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const count = db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE room_id = ?').get(room.id).n;

  if (count > 0) {
    res.status(409).json({ error: 'This room has bookings, so it cannot be deleted.' });
    return;
  }

  const remove = db.transaction(function () {
    db.prepare('DELETE FROM slots WHERE room_id = ?').run(room.id);
    db.prepare('DELETE FROM rooms WHERE id = ?').run(room.id);
  });

  remove();
  res.json({ ok: true });
});

// Opens 7 more days after the room's last open day
app.post('/api/manager/rooms/:id/add-days', requireManager, function (req, res) {
  const room = getMyRoom(req, req.params.id);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const last = db.prepare('SELECT MAX(slot_date) AS d FROM slots WHERE room_id = ?').get(room.id).d;

  let first = todayText();
  if (last && last >= first) {
    const next = new Date(last + 'T00:00:00');
    next.setDate(next.getDate() + 1);
    first = dateText(next);
  }

  addSlotsForDays(room.id, first, 7);
  res.json({ ok: true });
});

// The slots of one day, each with its state: free, booked, blocked, or passed
app.get('/api/manager/rooms/:id/slots', requireManager, function (req, res) {
  const room = getMyRoom(req, req.params.id);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }

  const date = req.query.date || todayText();
  const slots = db
    .prepare('SELECT * FROM slots WHERE room_id = ? AND slot_date = ? ORDER BY start_hour')
    .all(room.id, date);

  const now = new Date();

  for (let i = 0; i < slots.length; i++) {
    const s = slots[i];

    if (slotStart(s.slot_date, s.start_hour) <= now) {
      s.state = 'passed';
    } else if (s.is_booked === 0) {
      s.state = 'free';
    } else if (slotHasActiveBooking(s.id)) {
      s.state = 'booked';
    } else {
      s.state = 'blocked';
    }
  }

  res.json(slots);
});

// A "blocked" slot is closed by the manager (is_booked = 1 but no booking uses it)
app.post('/api/manager/slots/:id/block', requireManager, function (req, res) {
  const slot = db.prepare(`
    SELECT slots.*
    FROM slots
    JOIN rooms ON slots.room_id = rooms.id
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE slots.id = ? AND workspaces.manager_id = ?
  `).get(req.params.id, req.session.user.id);

  if (!slot) {
    res.status(404).json({ error: 'Time slot not found' });
    return;
  }

  if (slotStart(slot.slot_date, slot.start_hour) <= new Date()) {
    res.status(400).json({ error: 'This time slot has already passed' });
    return;
  }

  if (slotHasActiveBooking(slot.id)) {
    res.status(409).json({ error: 'This time slot is booked by a customer' });
    return;
  }

  const blocked = req.body.blocked ? 1 : 0;
  db.prepare('UPDATE slots SET is_booked = ? WHERE id = ?').run(blocked, slot.id);
  res.json({ ok: true });
});

// ---------- Manager: earnings and reviews ----------
app.get('/api/manager/earnings', requireManager, function (req, res) {
  const managerId = req.session.user.id;

  const byWorkspace = db.prepare(`
    SELECT workspaces.id, workspaces.name, workspaces.name_ar,
           COALESCE(SUM(CASE WHEN bookings.status = 'confirmed' THEN bookings.total_price END), 0) AS income,
           COALESCE(SUM(CASE WHEN bookings.status = 'pending' THEN bookings.total_price END), 0) AS pending,
           COUNT(CASE WHEN bookings.status = 'confirmed' THEN 1 END) AS confirmed_count
    FROM workspaces
    LEFT JOIN rooms ON rooms.workspace_id = workspaces.id
    LEFT JOIN bookings ON bookings.room_id = rooms.id
    WHERE workspaces.manager_id = ?
    GROUP BY workspaces.id
    ORDER BY income DESC
  `).all(managerId);

  const byMonth = db.prepare(`
    SELECT strftime('%Y-%m', bookings.created_at) AS month,
           SUM(bookings.total_price) AS income,
           COUNT(*) AS confirmed_count
    FROM bookings
    JOIN rooms ON bookings.room_id = rooms.id
    JOIN workspaces ON rooms.workspace_id = workspaces.id
    WHERE workspaces.manager_id = ? AND bookings.status = 'confirmed'
    GROUP BY month
    ORDER BY month DESC
  `).all(managerId);

  let income = 0;
  let pending = 0;
  let confirmedCount = 0;
  for (let i = 0; i < byWorkspace.length; i++) {
    income += byWorkspace[i].income;
    pending += byWorkspace[i].pending;
    confirmedCount += byWorkspace[i].confirmed_count;
  }

  res.json({ income, pending, confirmedCount, byWorkspace, byMonth });
});

app.get('/api/manager/reviews', requireManager, function (req, res) {
  const reviews = db.prepare(`
    SELECT reviews.id, reviews.rating, reviews.comment, reviews.comment_ar, reviews.created_at,
           users.full_name, workspaces.name AS workspace, workspaces.name_ar AS workspace_ar,
           (SELECT COUNT(*) FROM reports
            WHERE reports.review_id = reviews.id AND reports.status = 'open') AS open_reports
    FROM reviews
    JOIN users ON reviews.user_id = users.id
    JOIN workspaces ON reviews.workspace_id = workspaces.id
    WHERE workspaces.manager_id = ?
    ORDER BY reviews.id DESC
  `).all(req.session.user.id);

  res.json(reviews);
});

// ---------- Admin ----------
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    res.status(403).json({ error: 'Admins only' });
    return;
  }
  next();
}

app.get('/api/admin/stats', requireAdmin, function (req, res) {
  res.json({
    users: db.prepare('SELECT COUNT(*) AS n FROM users').get().n,
    workspaces: db.prepare('SELECT COUNT(*) AS n FROM workspaces').get().n,
    bookings: db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n,
    income: db.prepare("SELECT COALESCE(SUM(total_price), 0) AS n FROM bookings WHERE status = 'confirmed'").get().n,
    reports: db.prepare("SELECT COUNT(*) AS n FROM reports WHERE status = 'open'").get().n,
    views: db.prepare('SELECT COALESCE(SUM(views), 0) AS n FROM workspaces').get().n
  });
});

// ---------- Admin: reports on reviews ----------
app.get('/api/admin/reports', requireAdmin, function (req, res) {
  const reports = db.prepare(`
    SELECT reports.id, reports.reason, reports.created_at,
           reporter.full_name AS reporter, reporter.role AS reporter_role,
           reviews.id AS review_id, reviews.rating, reviews.comment, reviews.comment_ar,
           author.full_name AS author, workspaces.name AS workspace, workspaces.name_ar AS workspace_ar
    FROM reports
    JOIN users AS reporter ON reports.reporter_id = reporter.id
    JOIN reviews ON reports.review_id = reviews.id
    JOIN users AS author ON reviews.user_id = author.id
    JOIN workspaces ON reviews.workspace_id = workspaces.id
    WHERE reports.status = 'open'
    ORDER BY reports.id DESC
  `).all();

  res.json(reports);
});

// action "delete" removes the review, action "dismiss" keeps it
app.post('/api/admin/reports/:id/resolve', requireAdmin, function (req, res) {
  const action = req.body.action;

  if (action !== 'delete' && action !== 'dismiss') {
    res.status(400).json({ error: 'Invalid action' });
    return;
  }

  const report = db.prepare("SELECT * FROM reports WHERE id = ? AND status = 'open'").get(req.params.id);

  if (!report) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  if (action === 'dismiss') {
    db.prepare("UPDATE reports SET status = 'dismissed' WHERE id = ?").run(report.id);
    res.json({ ok: true });
    return;
  }

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(report.review_id);

  const removeReview = db.transaction(function () {
    db.prepare('DELETE FROM reports WHERE review_id = ?').run(review.id);
    db.prepare('DELETE FROM reviews WHERE id = ?').run(review.id);
    updateRating(review.workspace_id);
  });

  removeReview();
  res.json({ ok: true });
});

app.get('/api/admin/users', requireAdmin, function (req, res) {
  const users = db
    .prepare('SELECT id, full_name, email, phone, role, is_blocked FROM users ORDER BY id')
    .all();
  res.json(users);
});

app.post('/api/admin/users/:id/block', requireAdmin, function (req, res) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);

  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  if (user.role === 'admin') {
    res.status(400).json({ error: 'Admin accounts cannot be blocked' });
    return;
  }

  const blocked = req.body.blocked ? 1 : 0;
  db.prepare('UPDATE users SET is_blocked = ? WHERE id = ?').run(blocked, user.id);
  res.json({ ok: true });
});

app.get('/api/admin/workspaces', requireAdmin, function (req, res) {
  const workspaces = db.prepare(`
    SELECT workspaces.id, workspaces.name, workspaces.name_ar, workspaces.area, workspaces.is_approved,
           workspaces.views, users.full_name AS manager,
           (SELECT COUNT(*) FROM bookings
            JOIN rooms ON bookings.room_id = rooms.id
            WHERE rooms.workspace_id = workspaces.id) AS bookings
    FROM workspaces
    JOIN users ON workspaces.manager_id = users.id
    ORDER BY workspaces.id
  `).all();

  res.json(workspaces);
});

app.post('/api/admin/workspaces/:id/approve', requireAdmin, function (req, res) {
  const approved = req.body.approved ? 1 : 0;

  const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(req.params.id);

  if (!workspace) {
    res.status(404).json({ error: 'Workspace not found' });
    return;
  }

  db.prepare('UPDATE workspaces SET is_approved = ? WHERE id = ?').run(approved, workspace.id);

  // Tell the manager when a hidden workspace becomes visible
  if (approved === 1 && workspace.is_approved !== 1) {
    notify(workspace.manager_id,
      'Your workspace "' + workspace.name + '" was approved and is now visible to customers.',
      'تمت الموافقة على مكانك "' + (workspace.name_ar || workspace.name) + '" وأصبح ظاهرًا للعملاء.',
      'manager-workspaces.html');
  }

  res.json({ ok: true });
});

app.post('/api/admin/workspaces/:id/delete', requireAdmin, function (req, res) {
  const count = db.prepare(`
    SELECT COUNT(*) AS n FROM bookings
    JOIN rooms ON bookings.room_id = rooms.id
    WHERE rooms.workspace_id = ?
  `).get(req.params.id).n;

  if (count > 0) {
    res.status(409).json({ error: 'This workspace has bookings. Hide it instead of deleting it.' });
    return;
  }

  const remove = db.transaction(function (id) {
    db.prepare('DELETE FROM favorites WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM event_registrations WHERE event_id IN (SELECT id FROM events WHERE workspace_id = ?)').run(id);
    db.prepare('DELETE FROM events WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM addons WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM reports WHERE review_id IN (SELECT id FROM reviews WHERE workspace_id = ?)').run(id);
    db.prepare('DELETE FROM reviews WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM slots WHERE room_id IN (SELECT id FROM rooms WHERE workspace_id = ?)').run(id);
    db.prepare('DELETE FROM rooms WHERE workspace_id = ?').run(id);
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
  });

  remove(req.params.id);
  res.json({ ok: true });
});

app.listen(PORT, function () {
  console.log('Server running at http://localhost:' + PORT);
});