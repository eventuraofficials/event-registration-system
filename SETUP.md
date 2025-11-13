# Event Registration System - Setup Guide

## 🚀 Quick Start

### Prerequisites
- **Node.js** v18 or higher
- **npm** v8 or higher
- **Git** (optional, for cloning)

### Installation Steps

1. **Clone or Download the Repository**
```bash
git clone <repository-url>
cd event-registration-system
```

2. **Install Dependencies**
```bash
npm install
```

3. **Configure Environment Variables**

   The `.env` file is already configured with defaults. Review and update if needed:
   ```env
   PORT=5000
   HOST=0.0.0.0
   NODE_ENV=development
   APP_URL=http://192.168.1.6:5000
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-min-32-chars
   ```

   ⚠️ **IMPORTANT FOR PRODUCTION**: Generate a secure JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Initialize Database**

   The system uses SQLite - no separate database server needed!
   Database file: `data/event_registration.db`

   The database is already initialized with:
   - Admin user: `admin` / `admin123`
   - All necessary tables and schemas

5. **Start the Server**
```bash
npm start
```

   The server will start on `http://localhost:5000`

---

## 🧪 Running Tests

### Automated Test Suite

Run the complete authentication test suite:
```bash
node test-auth.js
```

This tests:
- ✅ Admin login
- ✅ User creation
- ✅ New user login
- ✅ Profile retrieval
- ✅ Token refresh
- ✅ Input validation (empty fields, XSS, SQL injection)
- ✅ Password strength validation
- ✅ Email format validation

**Expected Result**: `✅ ALL TESTS PASSED! (100% success rate)`

---

## 📁 Project Structure

```
event-registration-system/
├── backend/
│   ├── config/
│   │   ├── database.js          # Database connection wrapper
│   │   └── init-sqlite.js        # Database initialization
│   ├── controllers/
│   │   ├── adminController.js    # Admin authentication logic
│   │   ├── eventController.js    # Event management
│   │   └── guestController.js    # Guest management
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── upload.js             # File upload handling
│   ├── routes/
│   │   ├── adminRoutes.js        # Admin API routes
│   │   ├── eventRoutes.js        # Event API routes
│   │   └── guestRoutes.js        # Guest API routes
│   ├── utils/
│   │   ├── backup.js             # Database backup
│   │   ├── logger.js             # Logging utility
│   │   └── qrGenerator.js        # QR code generation
│   └── server.js                 # Main server file
├── public/
│   ├── css/                      # Stylesheets
│   ├── js/
│   │   ├── admin.js              # Admin panel JavaScript
│   │   ├── config.js             # Frontend configuration
│   │   ├── register.js           # Registration form
│   │   └── checkin.js            # Check-in functionality
│   ├── admin.html                # Admin panel
│   ├── index.html                # Registration page
│   └── checkin.html              # Check-in page
├── data/
│   └── event_registration.db     # SQLite database
├── .env                          # Environment configuration
├── package.json                  # Dependencies
├── test-auth.js                  # Automated test suite
└── SETUP.md                      # This file
```

---

## 🔐 Authentication & Security

### Features Implemented

✅ **Password Hashing**
- Bcrypt with salt rounds: 10
- Secure password storage

✅ **JWT Token Authentication**
- 24-hour token expiration
- Secure token generation with HS256

✅ **Input Validation**
- Username: 3-50 characters, alphanumeric + underscore
- Email: Valid email format
- Password: Minimum 8 characters
- XSS prevention: HTML tags stripped
- SQL Injection prevention: Parameterized queries

✅ **Rate Limiting**
- API routes: 100 requests per 15 minutes
- Login endpoint: 5 attempts per 15 minutes

✅ **Role-Based Access Control**
- Roles: `super_admin`, `staff`
- Protected endpoints with role checks

---

## 🌐 API Endpoints

### Authentication

**POST** `/api/admin/login`
```json
{
  "username": "admin",
  "password": "admin123"
}
```
Response:
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "super_admin"
  }
}
```

**GET** `/api/admin/profile` (Protected)
- Headers: `Authorization: Bearer <token>`

**POST** `/api/admin/refresh-token` (Protected)
- Headers: `Authorization: Bearer <token>`

**POST** `/api/admin/create` (Super Admin Only)
```json
{
  "username": "newadmin",
  "email": "admin@example.com",
  "password": "SecurePass123!",
  "full_name": "New Admin",
  "role": "staff"
}
```

---

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `HOST` | Server host | `0.0.0.0` |
| `NODE_ENV` | Environment | `development` |
| `APP_URL` | Application URL | `http://192.168.1.6:5000` |
| `JWT_SECRET` | JWT secret key | Change in production! |
| `AUTO_BACKUP` | Enable auto backups | `true` |
| `BACKUP_INTERVAL_HOURS` | Backup frequency | `24` |
| `CORS_ORIGIN` | CORS allowed origin | `*` |

---

## 📝 Default Credentials

**Admin Account:**
- Username: `admin`
- Password: `admin123`
- Role: `super_admin`

⚠️ **IMPORTANT**: Change the default password in production!

---

## 🛠️ Troubleshooting

### Server won't start
```bash
# Check if port 5000 is already in use
netstat -ano | findstr :5000

# Kill the process if needed
taskkill /PID <process-id> /F
```

### Database issues
```bash
# Reinitialize database
node backend/config/init-sqlite.js
```

### Tests failing
```bash
# Make sure server is running
npm start

# Run tests in another terminal
node test-auth.js
```

### Token errors
- Check that `JWT_SECRET` is set in `.env`
- Verify token hasn't expired (24h default)
- Clear browser localStorage and login again

---

## 🚢 Deployment

### Production Checklist

- [ ] Change `JWT_SECRET` to a secure random string
- [ ] Update `APP_URL` to your production domain
- [ ] Set `NODE_ENV=production`
- [ ] Change default admin password
- [ ] Configure `CORS_ORIGIN` to your domain
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Review rate limiting settings

### Example Production `.env`
```env
PORT=443
HOST=0.0.0.0
NODE_ENV=production
APP_URL=https://yourdomain.com
JWT_SECRET=<generate-with-crypto-randomBytes>
CORS_ORIGIN=https://yourdomain.com
```

---

## ✅ Definition of Done

- [x] User can register, login, and logout successfully
- [x] Database saves and retrieves users correctly
- [x] No runtime or console errors
- [x] Input validation works (empty fields, format checks)
- [x] Passwords are hashed with bcrypt
- [x] App runs from clean clone
- [x] XSS prevention implemented
- [x] SQL injection prevention (parameterized queries)
- [x] Rate limiting active
- [x] JWT authentication working
- [x] Role-based access control functioning
- [x] Automated tests pass (100% success rate)

---

## 📞 Support

For issues or questions:
1. Check this setup guide
2. Review the troubleshooting section
3. Run the automated tests: `node test-auth.js`
4. Check server logs in console

---

## 📄 License

MIT License - See LICENSE file for details

---

**🎉 System Status: FULLY OPERATIONAL**

All authentication features are working perfectly with 0 errors!
