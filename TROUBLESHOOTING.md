# Event Registration System - Troubleshooting Guide

## Problem: "Can't reach this site" when accessing from phone

Kung hindi mo ma-access ang system from phone, sundin ang mga hakbang na ito:

---

## Solution 1: Check Same WiFi Network

**IMPORTANT:** Phone at Computer dapat naka-connect sa SAME WiFi network!

### Paano i-check:

**Sa Computer:**
1. Press `Win + R`
2. Type `cmd` and press Enter
3. Type `ipconfig` and press Enter
4. Look for "IPv4 Address" under your WiFi adapter
   - Should be: `192.168.1.6` (or similar)

**Sa Phone:**
1. Go to Settings > WiFi
2. Click yung connected WiFi network
3. Check IP address - dapat same network (e.g., `192.168.1.xxx`)
4. **Wag mobile data!** - make sure WiFi talaga

---

## Solution 2: Allow Port 5000 in Windows Firewall

Windows Firewall might be blocking connections to port 5000.

### Manual Steps (Run as Administrator):

1. **Open PowerShell as Administrator:**
   - Press `Win + X`
   - Click "Windows PowerShell (Admin)" or "Terminal (Admin)"

2. **Run this command:**
```powershell
netsh advfirewall firewall add rule name="Event Registration System - Port 5000" dir=in action=allow protocol=TCP localport=5000
```

3. **Verify the rule was added:**
```powershell
netsh advfirewall firewall show rule name="Event Registration System - Port 5000"
```

---

## Solution 3: Test Network Connection from Phone

**Sa phone browser**, try to access these URLs one by one:

### Test 1: Server Health Check
```
http://192.168.1.6:5000/api/health
```
**Expected:** Should show JSON message: `{"success":true,"message":"Event Registration System API is running"...}`

### Test 2: Registration Page (with event code)
```
http://192.168.1.6:5000/index.html?event=CONF2025
```
**Expected:** Should show event details at registration form

### Test 3: Admin Panel (from computer browser)
```
http://localhost:5000/admin.html
```
**Expected:** Should show login page

---

## Solution 4: Disable Windows Firewall Temporarily (For Testing Only)

**WARNING:** Only for testing! Re-enable after testing.

1. Press `Win + R`
2. Type `firewall.cpl` and press Enter
3. Click "Turn Windows Defender Firewall on or off" (left side)
4. Select "Turn off Windows Defender Firewall" for Private network
5. Click OK
6. **Try accessing from phone again**
7. **Re-enable firewall after testing!**

---

## Solution 5: Check Your Network IP Address

Baka nag-change ang IP address ng computer mo.

### Get current IP:

**Option A - Quick way:**
1. Open PowerShell
2. Run: `ipconfig | findstr IPv4`
3. Look for the IP address (e.g., `192.168.1.6`)

**Option B - Network Settings:**
1. Press `Win + I` (Settings)
2. Network & Internet > WiFi
3. Click your connected network
4. Scroll down to "Properties"
5. Look for "IPv4 address"

### If IP changed (not `192.168.1.6`):

You need to update the IP in these files:

1. **`.env`** - Update `APP_URL`
2. **`public/js/config.js`** - Update `API_BASE_URL`
3. **`public/js/admin.js`** - Update fallback URL (line 423)

Then restart the server.

---

## Quick Diagnostic Checklist

- [ ] Phone and computer on same WiFi network (not mobile data)
- [ ] Server is running (you should see the startup message)
- [ ] IP address is correct (`192.168.1.6` or your actual IP)
- [ ] Windows Firewall allows port 5000
- [ ] Test URL works from computer browser: `http://192.168.1.6:5000/api/health`
- [ ] Test URL works from phone browser: `http://192.168.1.6:5000/api/health`

---

## Still Not Working?

### Alternative: Use ngrok (for external access)

If local network access still doesn't work, you can use ngrok:

1. Download ngrok: https://ngrok.com/download
2. Extract and run:
```bash
ngrok http 5000
```
3. Ngrok will give you a URL like: `https://abc123.ngrok.io`
4. Update `.env`:
```
APP_URL=https://abc123.ngrok.io
```
5. Restart server
6. Use the ngrok URL from anywhere (even outside your WiFi)

---

## Contact Information

If wala pa ring gumagana after trying all solutions:
- Check if antivirus is blocking
- Check router settings (AP isolation might be enabled)
- Try connecting both devices to mobile hotspot instead
