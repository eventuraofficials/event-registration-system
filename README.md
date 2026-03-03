# Event Registration System — Eventura

A production-ready event registration and attendance tracking system with QR code ticketing, Excel bulk import, and a mobile-friendly admin dashboard.

**Live Demo**: https://event-registration-system-ya13.onrender.com

---

## Features

- **Guest Self-Registration** — Public form with instant QR code boarding-pass ticket
- **Event Logo / Banner** — Upload a custom logo shown on the registration page, ticket, and share page
- **Site Branding** — Customize the site name per client (e.g. "Samsung Event Registration")
- **Email QR Tickets** — Ticket emailed after registration (requires SMTP config — optional)
- **Excel Bulk Import** — Pre-register guests via `.xlsx`/`.csv`; QR tickets auto-sent if email is enabled
- **QR Code Check-In** — Camera scanner or manual code entry on any device
- **Admin Dashboard** — Manage events, guests, staff accounts, and reports
- **Guest Categories** — Tag guests (VIP, Regular, etc.) for easy filtering
- **Export Reports** — Download attendance list as Excel, PDF, or CSV
- **Role-based Access** — Super Admin and Staff roles
- **Staff Management** — Create/delete staff accounts (super admin only)
- **Activity Logs** — Audit trail of all admin actions
- **Clone Events** — Duplicate an existing event as a starting point
- **Pagination** — Server-side pagination handles 1,000+ guest lists smoothly
- **Mobile Ready** — Fully responsive on iPhone, iPad, tablet, and desktop

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: SQLite (via `better-sqlite3`) — zero setup, auto-initializes on startup
- **Auth**: JWT (`jsonwebtoken`)
- **QR**: `qrcode` (generation), `html5-qrcode` (scanning)
- **Excel**: `exceljs`
- **Email**: `nodemailer` (optional)
- **Frontend**: Vanilla HTML / CSS / JavaScript

---

## Local Development

### Prerequisites
- Node.js v16+
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
# Edit .env — set JWT_SECRET to a random string (min 32 chars)

# 4. Start dev server
npm run dev
```

Server starts at `http://localhost:5000`

### Default Admin Login
- **Username**: `admin`
- **Password**: `admin123`

> Change this password immediately after first login via Settings → Change Password.

---

## Deployment (Render.com)

1. Push to GitHub
2. Create a **Web Service** on [render.com](https://render.com)
3. Connect your repo
4. Set:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add Environment Variables:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `JWT_SECRET` | *(generate: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)* |
| `APP_URL` | `https://your-app-name.onrender.com` |
| `CORS_ORIGIN` | `https://your-app-name.onrender.com` |
| `KEEP_ALIVE` | `true` *(prevents free-tier spin-down)* |

### Persistent Storage (Recommended)

Free tier uses **ephemeral storage** — the database and uploaded files reset on every restart. To persist data:

1. Upgrade to **Render Starter** ($7/mo)
2. Add a **Disk** → mount at `/opt/render/project/src/data` (for the database)
3. Add a second **Disk** → mount at `/opt/render/project/src/uploads` (for event logos)

### Multiple Clients

Deploy a **separate Render Web Service** per client (same GitHub repo, different env vars). This provides full isolation — separate database, separate uploads, separate admin accounts.

---

## File Structure

```
event-registration-system/
├── backend/
│   ├── api/
│   │   ├── controllers/
│   │   │   ├── adminController.js
│   │   │   ├── eventController.js
│   │   │   ├── guestController.js
│   │   │   └── settingsController.js
│   │   └── routes/
│   │       ├── adminRoutes.js
│   │       ├── eventRoutes.js
│   │       ├── guestRoutes.js
│   │       └── settingsRoutes.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── upload.js            # Excel + image upload (multer)
│   ├── db/
│   │   └── config/
│   │       ├── database.js      # DB connection + auto-init schema + migrations
│   │       └── init-sqlite.js   # Manual DB reset/seed script
│   ├── utils/
│   │   ├── emailService.js
│   │   ├── excelParser.js
│   │   ├── logger.js
│   │   └── qrGenerator.js
│   └── server.js
├── public/
│   ├── css/
│   │   ├── layouts/             # admin.css, checkin.css, minimalist-layout.css
│   │   ├── components/          # components.css, qr-ticket.css
│   │   └── theme/               # modern-theme.css
│   ├── js/
│   │   ├── core/                # config.js, security-utils.js
│   │   └── pages/
│   │       ├── admin.js
│   │       ├── checkin.js
│   │       └── register.js
│   └── pages/
│       ├── admin.html           # Admin dashboard
│       ├── checkin.html         # QR check-in scanner
│       ├── index.html           # Guest registration
│       ├── landing.html         # Root landing page
│       └── share-event.html     # Event QR sharing page
├── data/                        # SQLite DB (auto-created)
├── uploads/
│   └── event-logos/             # Uploaded event banners
├── logs/                        # Server logs
├── start-production.js          # Production startup script
├── .env.production              # Environment template
└── package.json
```

---

## API Reference

### Public Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/events/available` | Events open for registration |
| GET | `/api/events/checkin-available` | All events (for check-in page) |
| GET | `/api/events/public/:event_code` | Event details by code |
| POST | `/api/guests/register` | Self-register a guest |
| GET | `/api/guests/verify?guest_code=X` | Verify guest QR code |
| POST | `/api/guests/checkin` | Check in a guest |
| GET | `/api/settings` | Site branding settings |

### Protected Endpoints (Bearer Token required)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Admin login |
| GET | `/api/admin/profile` | Current admin profile |
| PUT | `/api/admin/profile` | Update profile |
| POST | `/api/admin/change-password` | Change password |
| GET | `/api/admin/activity-logs` | Recent activity log |
| GET | `/api/admin/users` | List staff accounts (super admin) |
| POST | `/api/admin/create` | Create staff account (super admin) |
| DELETE | `/api/admin/users/:id` | Delete staff account (super admin) |
| PUT | `/api/settings` | Update site branding (super admin) |
| POST | `/api/events` | Create event |
| GET | `/api/events` | List all events |
| PUT | `/api/events/:id` | Update event |
| DELETE | `/api/events/:id` | Delete event |
| PATCH | `/api/events/:id/toggle-registration` | Open/close registration |
| POST | `/api/events/:id/logo` | Upload event logo/banner |
| POST | `/api/events/:id/clone` | Clone event |
| GET | `/api/guests/event/:id` | Guests for an event (paginated) |
| GET | `/api/guests/event/:id?slim=true` | Guest list without QR data (check-in) |
| GET | `/api/guests/event/:id/stats` | Event attendance stats |
| GET | `/api/guests/event/:id/export` | Export guest list (Excel) |
| POST | `/api/guests/add` | Manually add a guest (admin) |
| POST | `/api/guests/upload-excel` | Bulk import guests |
| PUT | `/api/guests/:id` | Edit guest |
| DELETE | `/api/guests/:id` | Delete guest |
| POST | `/api/guests/:id/resend-ticket` | Resend QR ticket email |

---

## Usage

### 1. Create an Event
1. Login at `/pages/admin.html`
2. **Events** → **Create New Event**
3. Fill in name, code, date, venue, and optionally upload a logo/banner
4. A QR code is auto-generated for the registration page

### 2. Share the Event
- Copy the registration link from **Share Event**
- Or download/print the event QR code for physical signage

### 3. Guest Registration
Guests open `https://your-app.onrender.com/pages/index.html?event=EVENTCODE`, fill the form, and receive a QR code ticket.

### 4. Check-In
Open `/pages/checkin.html` on a tablet/phone:
- Select the event from the dropdown
- Scan guest QR codes with the camera
- Or enter the guest code manually

### 5. Export Reports
**Reports** section → select event → export as **Excel**, **PDF**, or **CSV**.

### 6. Site Branding
**Settings** → **Site Branding** (super admin only) → set the site name (e.g. "Samsung Event Registration"). Applies to all page headers and browser tabs instantly.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | Yes | Server port (`10000` for Render) |
| `JWT_SECRET` | Yes | Random string, min 32 chars |
| `APP_URL` | Yes | Full app URL (used for QR code links) |
| `CORS_ORIGIN` | Yes | Allowed CORS origin |
| `KEEP_ALIVE` | No | `true` — self-ping every 14min to prevent Render spin-down |
| `EMAIL_ENABLED` | No | `true` to enable email notifications |
| `EMAIL_HOST` | No | SMTP host (e.g. `smtp.gmail.com`) |
| `EMAIL_PORT` | No | SMTP port (`587` TLS / `465` SSL) |
| `EMAIL_USER` | No | SMTP email address |
| `EMAIL_PASSWORD` | No | SMTP app password |
| `EMAIL_FROM` | No | Sender name, e.g. `Eventura <noreply@events.com>` |

---

## Troubleshooting

**Login fails with "Server error"**
Check server logs — likely `JWT_SECRET` not set or DB failed to initialize.

**Camera not working on check-in**
Camera requires HTTPS. Use the deployed URL, not a local IP on other devices.

**Data resets after a while**
Expected on Render free tier (ephemeral disk). Add a Persistent Disk (Starter plan) for permanent storage.

**Excel upload fails**
Required columns: `Full Name`, `Email`, `Contact Number`, `Home Address`, `Company Name`. Max 5 MB.

**Logo not showing**
Ensure the file is JPG, PNG, GIF, or WebP and under 2 MB.

**Site name not updating on pages**
The branding is loaded on every page via `/api/settings`. If it still shows the old name, do a hard refresh (Ctrl+Shift+R).

---

## License

MIT — Free to use for personal and commercial projects.
