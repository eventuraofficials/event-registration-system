# Quick Start Guide

Get your Event Registration System up and running in **5 minutes**!

## Step 1: Install Dependencies (1 min)

```bash
cd event-registration-system
npm install
```

## Step 2: Setup Database (2 min)

### Option A: Using MySQL Command Line
```bash
# Create database
mysql -u root -p -e "CREATE DATABASE event_registration_db;"

# Import schema
mysql -u root -p event_registration_db < backend/config/schema.sql
```

### Option B: Using MySQL Workbench / phpMyAdmin
1. Open your MySQL client
2. Create new database: `event_registration_db`
3. Run the SQL file: `backend/config/schema.sql`

## Step 3: Configure Environment (1 min)

```bash
# Copy environment template
copy .env.example .env
```

Edit `.env` and set your MySQL password:
```env
DB_PASSWORD=your_mysql_password
```

**That's it!** Other settings can stay as default for development.

## Step 4: Start Server (30 sec)

```bash
npm start
```

You should see:
```
╔═══════════════════════════════════════════════════════╗
║  Event Registration System - Server Started          ║
╠═══════════════════════════════════════════════════════╣
║  Port: 5000                                           ║
║  Environment: development                             ║
║  API Docs: http://localhost:5000/api/health           ║
╚═══════════════════════════════════════════════════════╝
```

## Step 5: Access the System (30 sec)

Open your browser and visit:

### Admin Dashboard
```
http://localhost:5000/admin.html

Username: admin
Password: admin123
```

### Guest Registration
```
http://localhost:5000/index.html
```

### Check-In Scanner
```
http://localhost:5000/checkin.html
```

---

## Your First Event in 3 Steps

### 1. Create Event (Admin Dashboard)
- Login to admin dashboard
- Go to "Events" → Click "Create New Event"
- Fill in:
  - Event Name: "Sample Conference 2025"
  - Event Code: "SAMPLE2025"
  - Date: Pick any future date
- Click "Create Event"

### 2. Register a Guest
- Open guest registration page
- Enter event code: "SAMPLE2025"
- Fill in your details
- Get your QR code!

### 3. Test Check-In
- Open check-in page
- Enter event code: "SAMPLE2025"
- Scan the QR code you just received
- ✅ Success!

---

## Common Issues

### "Database connection failed"
- Check if MySQL is running
- Verify password in `.env` file
- Ensure database `event_registration_db` exists

### "Port 5000 already in use"
- Change `PORT=5001` in `.env` file
- Or kill process using port 5000

### Camera not working on check-in page
- For local testing, use manual code entry
- For production, use HTTPS (cameras require secure context)

---

## What's Next?

✅ **You're ready!** Start using your event registration system.

**Recommended next steps:**
1. Upload bulk guests via Excel (see template in Upload section)
2. Customize the design (edit files in `public/css/`)
3. Share registration link with your guests
4. Setup check-in station on a tablet

**Need help?** Check the full [README.md](README.md) for detailed documentation.

---

**Happy event managing! 🎉**
