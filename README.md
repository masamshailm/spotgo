# SpotGo

SpotGo is a web application that helps students, freelancers, and trainers in Cairo find, compare, and book study and work spaces by the hour.

TM471 Final Year Project · Arab Open University, Egypt · Masa Ibrahem · Supervisor: Dr. Ahmed Hagag

## Features

- Search (English and Arabic, with typo tolerance), filters, nearest place (GPS), map, and compare
- Booking by the hour with a monthly calendar, add-ons, and payment-proof upload
- Refund policy: 100% / 50% / 0% depending on when the customer cancels
- Notifications, favorites, events, reviews, and reports
- Three roles: user, workspace manager, and admin
- Arabic and English (right to left), light and dark mode, and four colors

## Technologies

Node.js, Express, SQLite (better-sqlite3), bcryptjs, express-session, multer, HTML, CSS, and JavaScript.

## Run it on your computer

```
npm install
node setup-db.js
node server.js
```

Then open http://localhost:3000

If there is no database yet, `node server.js` creates it automatically with the sample data.

## Test accounts

All accounts use the password `SpotGo#2026`:

- admin@spotgo.com
- manager1@spotgo.com
- student@spotgo.com
