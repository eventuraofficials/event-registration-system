# Demo Mode - No Database Needed! 🚀

**Server is running!** But database is not connected yet.

## ✅ What's Working Right Now:

The **server is running** on: http://localhost:5000

You can view the **frontend pages** (HTML/CSS/JS):

### 1. Guest Registration Page
Open in browser: http://localhost:5000/index.html

### 2. Check-In Scanner
Open in browser: http://localhost:5000/checkin.html

### 3. Admin Dashboard
Open in browser: http://localhost:5000/admin.html

**Note:** API calls won't work yet without database, but you can see the beautiful design!

---

## 🔧 To Fix Database Connection:

### Option 1: Install MySQL (Recommended)

**Download MySQL:**
- Go to: https://dev.mysql.com/downloads/installer/
- Download MySQL Installer for Windows
- Install with default settings
- Remember the root password you set!

**After installing MySQL:**

1. Open Command Prompt as Administrator
2. Run these commands:

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE event_registration_db;

# Exit MySQL
exit
```

3. Import the database schema:
```bash
cd C:\Users\Khell\event-registration-system
mysql -u root -p event_registration_db < backend\config\schema.sql
```

4. Update `.env` file with your MySQL password:
```env
DB_PASSWORD=your_mysql_password_here
```

5. Restart the server:
```bash
# Stop current server (Ctrl+C)
npm start
```

---

### Option 2: Use XAMPP (Easiest!)

**Download XAMPP:**
- Go to: https://www.apachefriends.org/
- Download and install
- Start MySQL from XAMPP Control Panel

**Setup Database:**
1. Open http://localhost/phpmyadmin
2. Click "New" to create database
3. Name it: `event_registration_db`
4. Click on the database
5. Click "Import"
6. Choose file: `C:\Users\Khell\event-registration-system\backend\config\schema.sql`
7. Click "Go"

**Update .env:**
```env
DB_PASSWORD=
```
(Leave blank for XAMPP default)

**Restart server!**

---

### Option 3: Quick Demo Test (No Database)

If you just want to see the design and UI, you can:

1. **Just open the HTML files directly in browser:**
   - File: `C:\Users\Khell\event-registration-system\public\index.html`
   - File: `C:\Users\Khell\event-registration-system\public\admin.html`
   - File: `C:\Users\Khell\event-registration-system\public\checkin.html`

2. The pages will load but API calls won't work (expected!)

---

## 🌐 Current Status:

✅ **Server:** Running on http://localhost:5000
✅ **Frontend:** All pages accessible
✅ **Code:** Complete and ready
❌ **Database:** Not connected yet (easy fix!)

---

## 📱 Quick Preview URLs:

While server is running, you can still view:

**Registration Portal:** http://localhost:5000/index.html
- See the beautiful design
- View the registration form
- Check responsive layout

**Check-In Scanner:** http://localhost:5000/checkin.html
- See the scanner interface
- View the stats dashboard
- Check mobile responsiveness

**Admin Dashboard:** http://localhost:5000/admin.html
- See the login page
- View admin interface design
- Check all sections

---

## ⚡ Choose Your Path:

**Path A - Full Setup (10 minutes):**
- Install MySQL or XAMPP
- Create database
- Import schema
- Full functionality!

**Path B - Quick Preview (NOW!):**
- Just open http://localhost:5000/index.html
- See the design
- Check UI/UX
- Test later with database

---

**Ano gusto mo gawin?** 😊
