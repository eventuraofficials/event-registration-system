# Database Setup Guide - XAMPP Method

## ✅ Step-by-Step Complete Guide

Follow these steps carefully para gumana ang lahat! 🚀

---

## Step 1: Download XAMPP (2 minutes)

**1.1 Visit XAMPP Website**
- Open browser
- Go to: **https://www.apachefriends.org/download.html**
- Click **"XAMPP for Windows"**
- Download the latest version (around 150MB)

**1.2 Wait for Download**
- File name: `xampp-windows-x64-X.X.X-installer.exe`
- Save it to Downloads folder

---

## Step 2: Install XAMPP (3 minutes)

**2.1 Run Installer**
- Double-click the downloaded file
- If Windows asks "Allow this app?", click **Yes**

**2.2 Installation Steps**
- Click **Next**
- Select components (default is fine)
- Click **Next**
- Choose installation folder: `C:\xampp` (default)
- Click **Next**
- Uncheck "Learn more about Bitnami" (optional)
- Click **Next**
- Click **Next** to start installation
- **Wait 2-3 minutes** for installation

**2.3 Finish Installation**
- Check "Do you want to start the Control Panel now?"
- Click **Finish**

---

## Step 3: Start MySQL (30 seconds)

**3.1 XAMPP Control Panel**
- If not open, run: `C:\xampp\xampp-control.exe`
- You'll see the XAMPP Control Panel

**3.2 Start MySQL**
- Find "MySQL" row
- Click **"Start"** button (will turn green)
- Status should show "Running"

**Success!** Green light means MySQL is running! ✅

---

## Step 4: Open phpMyAdmin (30 seconds)

**4.1 Click Admin Button**
- In XAMPP Control Panel
- On MySQL row, click **"Admin"** button
- Browser will open: `http://localhost/phpmyadmin`

**OR just type in browser:**
```
http://localhost/phpmyadmin
```

You should see phpMyAdmin interface! 🎉

---

## Step 5: Create Database (1 minute)

**5.1 Click "New"**
- On the left sidebar
- Click **"New"** (top of database list)

**5.2 Create Database**
- Database name: **`event_registration_db`** (copy exactly!)
- Collation: Leave as default (utf8mb4_general_ci)
- Click **"Create"** button

**Success!** Database created! ✅

---

## Step 6: Import Schema (2 minutes)

**6.1 Select Database**
- Click on **`event_registration_db`** (left sidebar)
- Database should be highlighted

**6.2 Go to Import Tab**
- Click **"Import"** tab (top menu)

**6.3 Choose File**
- Click **"Choose File"** button
- Navigate to: `C:\Users\Khell\event-registration-system\backend\config\schema.sql`
- Select **`schema.sql`**
- Click **Open**

**6.4 Import**
- Scroll down
- Click **"Go"** button (bottom right)
- Wait 2-3 seconds

**6.5 Success Message**
- You should see: **"Import has been successfully finished"**
- Green checkmark ✅

**6.6 Verify Tables Created**
- Click on `event_registration_db` (left sidebar)
- You should see 4 tables:
  - ✅ admin_users
  - ✅ events
  - ✅ guests
  - ✅ activity_logs

**Perfect!** Database is ready! 🎉

---

## Step 7: Update Configuration (ALREADY DONE!)

**Good news!** The `.env` file is already configured for XAMPP!

The password is blank (default for XAMPP):
```env
DB_PASSWORD=
```

**No changes needed!** ✅

---

## Step 8: Restart Server (1 minute)

**8.1 Stop Current Server**
- Go back to your terminal/command prompt
- The server is already running
- **We'll restart it now**

**I'll do this for you automatically...**

---

## Step 9: Test the System! 🎉

Once restarted, open browser and visit:

**1. Admin Dashboard**
```
http://localhost:5000/admin.html
```
**Login:**
- Username: `admin`
- Password: `admin123`

**2. Create Your First Event**
- Click "Events" → "Create New Event"
- Fill in details
- Click "Create Event"

**3. Test Registration**
```
http://localhost:5000/index.html
```
- Enter your event code
- Register a guest
- Get QR code!

**4. Test Check-In**
```
http://localhost:5000/checkin.html
```
- Enter event code
- Scan the QR code you got!

---

## ✅ Checklist

Before we restart, make sure:

- [ ] XAMPP installed
- [ ] MySQL started (green in XAMPP)
- [ ] Database `event_registration_db` created
- [ ] Schema imported (4 tables visible)
- [ ] phpMyAdmin shows tables

**Everything checked?** Great! Ready to restart! 🚀

---

## 🆘 Troubleshooting

**MySQL won't start in XAMPP?**
- Another MySQL is running
- Solution: Change port to 3307 in XAMPP config

**Can't access phpMyAdmin?**
- Make sure Apache is also started in XAMPP
- Click "Start" on Apache row

**Import failed?**
- Make sure you selected the right file
- Path: `C:\Users\Khell\event-registration-system\backend\config\schema.sql`

**Still having issues?**
- Stop XAMPP
- Restart XAMPP as Administrator
- Try again

---

## 🎯 Current Status

Tell me when you're done with these steps:

✅ XAMPP installed?
✅ MySQL running (green)?
✅ Database created?
✅ Schema imported?

**Type "done" when ready to restart the server!** 😊
