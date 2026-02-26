# Event Registration System

A professional event registration and attendance tracking system with QR code check-in, Excel bulk upload, and an admin dashboard.

**Live Demo**: https://event-registration-system-ya13.onrender.com

---

## Features

- **Guest Self-Registration** — Public registration form with instant QR code ticket
- **Excel Bulk Upload** — Pre-register guests via Excel/CSV file
- **QR Code Check-In** — Camera-based scanner or manual code entry
- **Admin Dashboard** — Manage events, guests, reports, and exports
- **Export Reports** — Download guest list as Excel, PDF, or CSV
- **Role-based Access** — Super Admin, Admin, and Staff roles
- **Mobile Ready** — Works on iPhone, iPad, Android, and desktop

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (via better-sqlite3) — no setup required, auto-initializes on startup
- **Auth**: JWT (jsonwebtoken)
- **QR**: qrcode (generation), html5-qrcode (scanning)
- **Excel**: ExcelJS
- **Email**: Nodemailer (optional)
- **Frontend**: Vanilla HTML/CSS/JavaScript

---

## Local Development

### Prerequisites
- Node.js v14+
- npm

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/eventuraofficials/event-registration-system.git
cd event-registration-system

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.production .env
# Edit .env — set JWT_SECRET to any random string (min 32 chars)

# 4. Start development server
npm run dev
```

The server starts at `http://localhost:5000`

### Default Admin Login
- **Username**: `admin`
- **Password**: `admin123`

> Change this password after first login.

---

## Deployment (Render.com)

1. Push to GitHub
2. Create a new **Web Service** on [render.com](https://render.com)
3. Connect your GitHub repo
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:
   - `NODE_ENV` = `production`
   - `PORT` = `10000`
   - `JWT_SECRET` = *(generate with: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` )*
   - `APP_URL` = `https://your-app-name.onrender.com`
   - `CORS_ORIGIN` = `https://your-app-name.onrender.com`

> **Note**: Free tier uses ephemeral storage — database resets on restart. Add a Persistent Disk ($7/mo) for permanent data.

---

## File Structure

```
event-registration-system/
├── backend/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── adminController.js
│   │   │   ├── eventController.js
│   │   │   └── guestController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── upload.js
│   │   └── routes/
│   │       ├── adminRoutes.js
│   │       ├── eventRoutes.js
│   │       └── guestRoutes.js
│   ├── db/
│   │   └── config/
│   │       ├── database.js        # DB connection + auto-init schema
│   │       └── init-sqlite.js     # Manual DB reset/seed script
│   ├── utils/
│   │   ├── backup.js
│   │   ├── excelParser.js
│   │   ├── logger.js
│   │   └── qrGenerator.js
│   └── server.js
├── public/
│   ├── css/
│   │   ├── layouts/
│   │   │   ├── minimalist-layout.css
│   │   │   ├── admin.css
│   │   │   └── checkin.css
│   │   ├── components/
│   │   └── theme/
│   ├── js/
│   │   └── pages/
│   │       ├── admin.js
│   │       ├── checkin.js
│   │       └── register.js
│   └── pages/
│       ├── admin.html             # Admin dashboard
│       ├── index.html             # Guest registration
│       ├── checkin.html           # QR check-in scanner
│       └── share-event.html       # Event QR sharing page
├── data/                          # SQLite database (auto-created)
├── uploads/                       # Uploaded Excel files
├── logs/                          # Server logs
├── start-production.js            # Production startup script
├── .env.production                # Environment template
└── package.json
```

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/available` | Get events open for registration |
| GET | `/api/events/checkin-available` | Get all events for check-in |
| GET | `/api/events/public/:event_code` | Get event details by code |
| POST | `/api/guests/register` | Self-register a guest |
| GET | `/api/guests/verify?guest_code=X` | Verify guest QR code |
| POST | `/api/guests/checkin` | Check in a guest |

### Protected Endpoints (Bearer Token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/profile` | Get current admin profile |
| POST | `/api/events` | Create event |
| GET | `/api/events` | List all events |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| PATCH | `/api/events/:id/toggle-registration` | Open/close registration |
| GET | `/api/guests/event/:id` | Get guests for event |
| GET | `/api/guests/event/:id/export` | Export guests as Excel |
| POST | `/api/guests/upload-excel` | Bulk upload guests |
| DELETE | `/api/guests/:id` | Delete guest |

---

## Usage

### 1. Create an Event
1. Login at `/pages/admin.html`
2. Go to **Events** → **Create New Event**
3. Fill in name, code, date, venue
4. A QR code is auto-generated linking to the registration page

### 2. Guest Registration
Share the registration link: `https://your-app.onrender.com/pages/index.html?event=EVENTCODE`

Guests fill the form and receive a QR code ticket.

### 3. Check-In
Open `/pages/checkin.html` on a tablet/phone:
- Select the event
- Scan guest QR codes with camera
- Or enter guest code manually

### 4. Export Reports
Go to **Reports** section → select event → export as **Excel**, **PDF**, or **CSV**.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | Yes | Server port (10000 for Render) |
| `JWT_SECRET` | Yes | Random string, min 32 chars |
| `APP_URL` | Yes | Full app URL (for QR code generation) |
| `CORS_ORIGIN` | Yes | Allowed origin for CORS |
| `EMAIL_ENABLED` | No | `true` to enable email notifications |
| `EMAIL_HOST` | No | SMTP host (e.g. smtp.gmail.com) |
| `EMAIL_PORT` | No | SMTP port (587) |
| `EMAIL_USER` | No | SMTP email address |
| `EMAIL_PASSWORD` | No | SMTP app password |

---

## Troubleshooting

**Login fails with "Server error"**
- Check Render logs — likely `JWT_SECRET` not set or DB failed to init

**Camera not working on check-in**
- Camera requires HTTPS — use the deployed URL, not localhost on other devices

**Data resets after a while**
- Expected on Render free tier (ephemeral disk) — upgrade to Persistent Disk for permanent storage

**Excel upload fails**
- Ensure columns: `Full Name`, `Email`, `Contact Number`, `Home Address`, `Company Name`
- Max file size: 10MB

---

## License

MIT — Free to use for personal and commercial projects.
