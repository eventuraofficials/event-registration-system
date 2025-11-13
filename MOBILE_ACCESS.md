# 📱 Access from Mobile/Tablet - Same WiFi

**Your Computer IP Address:** `192.168.1.6`

---

## 🌐 **LINKS FOR OTHER DEVICES**

Use these links on your **phone, tablet, or iPad** (must be on same WiFi):

---

### **📱 For Guests - Registration Portal**
```
http://192.168.1.6:5000
```
**or with event code:**
```
http://192.168.1.6:5000/index.html?event=DEMO2025
```

---

### **🔐 For Admin - Dashboard**
```
http://192.168.1.6:5000/admin.html
```
**Login:** demo / demo

---

### **📲 For Staff - Check-In Scanner**
```
http://192.168.1.6:5000/checkin.html
```

---

## 📋 **COPY-PASTE READY:**

**Guest Registration:**
```
http://192.168.1.6:5000
```

**Admin Dashboard:**
```
http://192.168.1.6:5000/admin.html
```

**Check-In Scanner:**
```
http://192.168.1.6:5000/checkin.html
```

---

## ✅ **HOW TO USE:**

### **Step 1: Make sure device is on SAME WiFi**
- Computer and phone/tablet must be on same WiFi network
- WiFi name: Check your current WiFi

### **Step 2: Open browser on mobile device**
- Safari (iPhone/iPad)
- Chrome (Android)
- Any browser

### **Step 3: Type or paste the link**
```
http://192.168.1.6:5000
```

### **Step 4: Bookmark it!**
- Add to home screen (looks like an app!)
- Or save bookmark for quick access

---

## 📱 **ADD TO HOME SCREEN (Make it look like an app!)**

### **iPhone/iPad:**
1. Open link in Safari
2. Tap the Share button (square with arrow)
3. Scroll down, tap "Add to Home Screen"
4. Name it: "Event Registration" or "Check-In Scanner"
5. Tap "Add"
6. Now it's an icon on your home screen!

### **Android:**
1. Open link in Chrome
2. Tap the menu (3 dots)
3. Tap "Add to Home screen"
4. Name it and tap "Add"
5. Icon appears on home screen!

---

## 🔧 **TROUBLESHOOTING**

### **Problem: Can't connect**

**Solution 1: Check WiFi**
- Make sure both devices on same WiFi
- Not cellular data!

**Solution 2: Firewall**
- Windows Firewall might be blocking
- Try temporarily disabling firewall
- Or add exception for port 5000

**Solution 3: Ping test**
On your phone browser, try:
```
http://192.168.1.6:5000/api/health
```
Should show:
```
{"success":true,"message":"Event Registration System API is running"}
```

---

## 🎯 **USE CASES**

### **Scenario 1: iPad at Event Entrance**
```
iPad URL: http://192.168.1.6:5000/checkin.html
Purpose: Scan guest QR codes
```

### **Scenario 2: Guest's Phone**
```
Phone URL: http://192.168.1.6:5000
Purpose: Self-register and get QR code
```

### **Scenario 3: Laptop for Admin**
```
Laptop URL: http://192.168.1.6:5000/admin.html
Purpose: Monitor attendance, manage event
```

---

## 💡 **PRO TIPS**

### **Tip 1: Create QR Code**
Create QR code of `http://192.168.1.6:5000`:
- Print on posters
- Display at entrance
- Guests scan to register!

### **Tip 2: Keep Screen Active**
On iPad/tablet for check-in:
- Disable auto-lock
- Keep brightness high
- Full screen mode

### **Tip 3: Test Before Event**
- Connect iPad to WiFi
- Open check-in page
- Test QR scanning
- Make sure camera works!

---

## ⚠️ **IMPORTANT NOTES**

### **Computer Must Stay On**
- Your computer (192.168.1.6) is the server
- Must be ON and connected to WiFi
- Don't close terminal/server
- Don't sleep/hibernate computer

### **Same WiFi Required**
- All devices must be on same network
- If WiFi changes, IP might change too
- Run `ipconfig` again to get new IP

### **IP Address Might Change**
If computer restarts or reconnects to WiFi:
- IP might change from 192.168.1.6 to something else
- Run `ipconfig` again
- Update links with new IP

---

## 🌟 **READY TO USE!**

**Your links are:**
- Guest: http://192.168.1.6:5000
- Admin: http://192.168.1.6:5000/admin.html
- Check-in: http://192.168.1.6:5000/checkin.html

**Send these to your devices and test!** 📱✨
