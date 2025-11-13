# 🗄️ DATABASE SETUP GUIDE - REAL WORLD READY

Ito ang step-by-step guide para i-setup ang **REAL DATABASE** ng Event Registration System.

---

## 🎯 OPTION 1: XAMPP (Easiest - Recommended for Local/Testing)

### Step 1: Download XAMPP

1. Visit: https://www.apachefriends.org/download.html
2. Download XAMPP for Windows
3. Install XAMPP (Use default settings)

### Step 2: Start MySQL

1. Open **XAMPP Control Panel**
2. Click **"Start"** sa MySQL
3. Wait until green light appears

### Step 3: Open phpMyAdmin

1. Sa XAMPP Control Panel, click **"Admin"** button sa MySQL row
2. Browser will open: `http://localhost/phpmyadmin`

### Step 4: Create Database

1. Sa phpMyAdmin, click **"New"** sa left sidebar
2. Database name: `event_registration_db`
3. Collation: `utf8mb4_general_ci`
4. Click **"Create"**

### Step 5: Import Schema

1. Click ang `event_registration_db` sa left sidebar
2. Click **"Import"** tab sa top
3. Click **"Choose File"**
4. Select: `backend/config/schema.sql`
5. Click **"Import"** button sa bottom

✅ **TAPOS NA!** Database is now ready!

### Step 6: Verify

Check if may 4 tables:
- ✅ admin_users (with default admin)
- ✅ events (empty for now)
- ✅ guests (empty for now)
- ✅ activity_logs (empty for now)

### Step 7: Test Login

Default admin account:
```
Username: admin
Password: admin123
```

⚠️ **IMPORTANTE**: Change this password immediately after first login!

---

## 🎯 OPTION 2: MySQL Server (For Production/Live Server)

### Prerequisites

- MySQL Server 8.0+ installed
- MySQL Command Line or MySQL Workbench

### Step 1: Login to MySQL

```bash
mysql -u root -p
```

### Step 2: Create Database

```sql
CREATE DATABASE event_registration_db CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
```

### Step 3: Create User (Security)

```sql
CREATE USER 'event_admin'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';
GRANT ALL PRIVILEGES ON event_registration_db.* TO 'event_admin'@'localhost';
FLUSH PRIVILEGES;
```

### Step 4: Import Schema

```bash
mysql -u event_admin -p event_registration_db < backend/config/schema.sql
```

### Step 5: Update .env File

Edit `backend/.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=event_admin
DB_PASSWORD=YourStrongPassword123!
DB_NAME=event_registration_db
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Secret (CHANGE THIS!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h

# Application URL
APP_URL=http://localhost:5000
```

---

## 🔐 UPDATE .ENV FILE (Required!)

Edit: `backend/.env`

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=event_registration_db
DB_PORT=3306

# Server Configuration
PORT=5000
NODE_ENV=production

# JWT Secret - CHANGE THIS!
JWT_SECRET=MyEventSystem2025SecureJWTKey!ChangeThis
JWT_EXPIRES_IN=24h

# Application URL (Change if deploying)
APP_URL=http://localhost:5000
```

⚠️ **IMPORTANT**:
- If XAMPP: DB_PASSWORD is usually empty (blank)
- If MySQL Server: Use your MySQL password
- **ALWAYS change JWT_SECRET to a random strong string!**

---

## 🧪 TEST DATABASE CONNECTION

### Method 1: Start Server

```bash
cd C:\Users\Khell\event-registration-system
npm start
```

✅ **Success message:**
```
╔═══════════════════════════════════════════════════════╗
║  Event Registration System - Server Started          ║
╠═══════════════════════════════════════════════════════╣
║  Port: 5000                                           ║
║  Environment: production                              ║
╚═══════════════════════════════════════════════════════╝

✅ Database connected successfully
```

❌ **Error message:**
```
❌ Database connection failed:
```

**If you see error:**
1. Check if MySQL is running (XAMPP green light)
2. Check database name: `event_registration_db`
3. Check username/password in .env
4. Check if database exists in phpMyAdmin

### Method 2: Test Login

1. Open: `http://localhost:5000/admin.html`
2. Login:
   - Username: `admin`
   - Password: `admin123`
3. If successful → Database is working! ✅
4. If error → Check .env settings

---

## 🔒 SECURITY CHECKLIST (BEFORE GOING LIVE!)

### 1. Change Default Admin Password

```sql
-- Login to phpMyAdmin, open SQL tab:
UPDATE admin_users
SET password = '$2a$10$NEW_BCRYPT_HASH_HERE'
WHERE username = 'admin';
```

Or change via admin dashboard after first login.

### 2. Change JWT Secret

Edit `.env`:
```env
JWT_SECRET=RandomString_$(date +%s)_ChangeThis!
```

Generate random string: https://randomkeygen.com/

### 3. Update Database Password

```sql
-- In MySQL:
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NewStrongPassword123!';
```

Then update `.env`:
```env
DB_PASSWORD=NewStrongPassword123!
```

### 4. Disable phpMyAdmin in Production

In XAMPP, edit `httpd-xampp.conf` and restrict access.

---

## 📊 VERIFY INSTALLATION

### Check Tables

```sql
USE event_registration_db;
SHOW TABLES;
```

Expected output:
```
+----------------------------------+
| Tables_in_event_registration_db  |
+----------------------------------+
| activity_logs                    |
| admin_users                      |
| events                           |
| guests                           |
+----------------------------------+
```

### Check Default Admin

```sql
SELECT username, email, role FROM admin_users;
```

Expected output:
```
+----------+--------------------+-------------+
| username | email              | role        |
+----------+--------------------+-------------+
| admin    | admin@event.com    | super_admin |
+----------+--------------------+-------------+
```

---

## ❓ TROUBLESHOOTING

### Error: "ECONNREFUSED"

**Problem:** Can't connect to MySQL

**Solution:**
1. Check XAMPP Control Panel - MySQL must be green
2. Try restart MySQL in XAMPP
3. Check port 3306 is not blocked

### Error: "Access denied for user"

**Problem:** Wrong username/password

**Solution:**
1. Check `.env` file DB_USER and DB_PASSWORD
2. For XAMPP, default is:
   - User: `root`
   - Password: (empty/blank)

### Error: "Unknown database"

**Problem:** Database not created

**Solution:**
1. Open phpMyAdmin
2. Create database: `event_registration_db`
3. Import `schema.sql`

### Error: "Table doesn't exist"

**Problem:** Schema not imported

**Solution:**
1. Open phpMyAdmin
2. Click database name
3. Import → Choose `backend/config/schema.sql`

### Port 3306 Already in Use

**Problem:** Another MySQL is running

**Solution:**
```bash
# Windows - Find process on port 3306
netstat -ano | findstr :3306

# Kill the process
taskkill /F /PID [process_id]

# Or change port in XAMPP config
```

---

## 🚀 NEXT STEPS AFTER DATABASE SETUP

1. ✅ Database created
2. ✅ Schema imported
3. ✅ .env updated
4. ✅ Server running without errors
5. ✅ Login successful

**NOW YOU CAN:**
- Create events
- Register guests
- Upload Excel files
- Scan QR codes
- Generate reports
- Everything works with REAL DATA! 🎉

---

## 💾 BACKUP YOUR DATABASE

**Important:** Always backup before making changes!

### Method 1: phpMyAdmin

1. Select `event_registration_db`
2. Click "Export" tab
3. Click "Export" button
4. Save `.sql` file

### Method 2: Command Line

```bash
mysqldump -u root -p event_registration_db > backup.sql
```

### Restore from Backup

```bash
mysql -u root -p event_registration_db < backup.sql
```

---

## 📞 NEED HELP?

Kung may problema:
1. Check error message sa server console
2. Check MySQL error log sa XAMPP
3. Verify all settings sa `.env`
4. Try restart MySQL service

**Your system is now PRODUCTION READY!** 🎉🚀
