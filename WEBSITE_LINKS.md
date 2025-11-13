# 🌐 Event Registration System - Website Links

**All URLs for your Event Registration System**

---

## 📍 **LOCAL DEVELOPMENT URLs** (While Testing)

### **For Admin:**

**Admin Dashboard (Login)**
```
http://localhost:5000/admin.html
```
**Login Credentials:**
- Demo Mode: `demo` / `demo` (no database needed)
- Full Mode: `admin` / `admin123` (requires database)

---

### **For Event Staff:**

**Check-In Scanner**
```
http://localhost:5000/checkin.html
```
Use this on iPad/tablet at event entrance to scan QR codes.

---

### **For Guests:**

**Registration Portal (Homepage)**
```
http://localhost:5000
```
or
```
http://localhost:5000/index.html
```

**Registration with Event Code**
```
http://localhost:5000/index.html?event=YOUR_EVENT_CODE
```
Examples:
- `http://localhost:5000/index.html?event=CONF2025`
- `http://localhost:5000/index.html?event=SUMMER2025`
- `http://localhost:5000/index.html?event=DEMO2025`

---

## 🚀 **PRODUCTION URLs** (When Deployed Online)

Replace `localhost:5000` with your actual domain:

### **If deployed to:**

**Example: Heroku**
```
https://your-app-name.herokuapp.com
https://your-app-name.herokuapp.com/admin.html
https://your-app-name.herokuapp.com/checkin.html
```

**Example: Your Own Domain**
```
https://yourdomain.com
https://yourdomain.com/admin.html
https://yourdomain.com/checkin.html
```

**Example: Subdomain**
```
https://events.yourcompany.com
https://events.yourcompany.com/admin.html
https://events.yourcompany.com/checkin.html
```

---

## 📋 **URL STRUCTURE**

```
Main Site:
├── / (homepage - registration portal)
├── /index.html (same as homepage)
├── /admin.html (admin dashboard)
└── /checkin.html (check-in scanner)

API Endpoints:
├── /api/health (health check)
├── /api/admin/login (admin login)
├── /api/events (event management)
└── /api/guests (guest management)
```

---

## 🎯 **HOW TO SHARE LINKS**

### **For Guests (Registration):**

**Method 1: Direct Link**
```
Share: http://localhost:5000
```

**Method 2: With Event Code (Better!)**
```
Share: http://localhost:5000/index.html?event=CONF2025
```
Guests won't need to type event code manually!

**Method 3: Create QR Code**
Generate QR code for the registration link and:
- Print on posters
- Add to email invitations
- Post on social media
- Display at event venue

---

### **For Event Staff:**

**Check-In Scanner Link:**
```
http://localhost:5000/checkin.html
```

Save as bookmark on iPad/tablet:
1. Open link on device
2. Add to home screen
3. Looks like a real app!

---

### **For Yourself (Admin):**

**Admin Dashboard:**
```
http://localhost:5000/admin.html
```

Bookmark this for quick access!

---

## 🔗 **SHAREABLE FORMATS**

### **Email Template:**
```
Subject: Register for [Event Name]

Dear Guest,

Please register for our upcoming event:

Registration Link: http://localhost:5000/index.html?event=CONF2025

Event Details:
- Name: Conference 2025
- Date: December 1, 2025
- Venue: Grand Convention Center

After registration, you'll receive a QR code. Please bring it for entry.

Thank you!
```

---

### **Social Media Post:**
```
🎉 REGISTER NOW! 🎉

Join us for Conference 2025!
📅 December 1, 2025
📍 Grand Convention Center

Register here: http://localhost:5000/index.html?event=CONF2025

✅ Quick registration
✅ Get your QR code instantly
✅ Easy check-in on event day

#Conference2025 #EventRegistration
```

---

### **SMS Template:**
```
Hi! Register for Conference 2025: http://localhost:5000/index.html?event=CONF2025

See you there!
```

---

## 💡 **PRO TIPS**

### **1. Use Short URLs**
When deployed online, use URL shorteners:
- `bit.ly/conf2025` instead of long URL
- `tinyurl.com/eventconf` for easy sharing

### **2. Create QR Codes**
Generate QR codes for:
- Registration portal (for posters)
- Check-in scanner (for staff devices)
- Individual events (for targeted invites)

Tools:
- https://qr.io
- https://www.qr-code-generator.com
- Built-in QR generation in system!

### **3. Multiple Event Codes**
Create separate event codes for:
- VIP guests: `?event=VIP2025`
- General admission: `?event=GA2025`
- Staff: `?event=STAFF2025`

### **4. Tracking**
Add tracking parameters:
```
http://localhost:5000/index.html?event=CONF2025&source=facebook
http://localhost:5000/index.html?event=CONF2025&source=email
```

---

## 🌍 **ACCESSING FROM OTHER DEVICES**

### **Same WiFi Network:**

Replace `localhost` with your computer's IP address:

**Find your IP:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

**Then use:**
```
http://192.168.1.100:5000
http://192.168.1.100:5000/admin.html
http://192.168.1.100:5000/checkin.html
```

**Example Use Case:**
- Your laptop: `http://localhost:5000/admin.html`
- Your iPad: `http://192.168.1.100:5000/checkin.html`
- Guest's phone: `http://192.168.1.100:5000`

---

## 🔒 **SECURITY NOTES**

### **Development (localhost):**
- ✅ Safe for testing
- ❌ Only accessible from your computer
- ❌ Not for real events yet

### **Production (deployed):**
- ✅ Use HTTPS (not HTTP)
- ✅ Change default passwords
- ✅ Enable firewall
- ✅ Regular backups

---

## 📊 **QUICK REFERENCE CARD**

**Print this and keep handy:**

```
┌─────────────────────────────────────┐
│   EVENT REGISTRATION SYSTEM URLs    │
├─────────────────────────────────────┤
│                                     │
│ GUEST REGISTRATION:                 │
│ http://localhost:5000               │
│                                     │
│ CHECK-IN SCANNER:                   │
│ http://localhost:5000/checkin.html  │
│                                     │
│ ADMIN DASHBOARD:                    │
│ http://localhost:5000/admin.html    │
│                                     │
│ LOGIN:                              │
│ • demo / demo (demo mode)           │
│ • admin / admin123 (full mode)      │
│                                     │
└─────────────────────────────────────┘
```

---

## 🎉 **READY TO USE!**

All links are active and ready!

**Current Status:**
- ✅ Server running on port 5000
- ✅ All pages accessible
- ✅ Demo mode available
- ⏸️ Database needed for full functionality

---

**Need help?** Check the other documentation files:
- README.md - Complete guide
- QUICKSTART.md - 5-minute setup
- HOW_TO_USE.md - Usage instructions
