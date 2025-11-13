# 📖 HOW TO USE - Event Registration System

**Complete step-by-step guide on how to use the system for your events!**

---

## 🎯 **TYPICAL WORKFLOW**

```
BEFORE EVENT → DURING EVENT → AFTER EVENT
    ↓               ↓              ↓
 Setup Event    Check-in       Reports
 Add Guests     Scan QR        Analytics
```

---

## 👥 **WHO USES WHAT?**

| User | Uses | Purpose |
|------|------|---------|
| **Event Organizer** | Admin Dashboard | Create events, manage guests |
| **Guests** | Registration Portal | Register online, get QR code |
| **Registration Staff** | Check-In Scanner | Scan QR codes at event entrance |

---

# 📋 **PART 1: SETUP (Before Event)**

## **Step 1: Admin Login**

**1.1 Open Admin Dashboard**
```
http://localhost:5000/admin.html
```

**1.2 Login**
- Username: `admin`
- Password: `admin123`
- Click "Login"

**✅ You'll see the dashboard with sidebar menu**

---

## **Step 2: Create Your Event**

**2.1 Go to Events Section**
- Click **"Events"** in left sidebar
- Click **"Create New Event"** button

**2.2 Fill in Event Details**

```
Event Name: Summer Conference 2025
Event Code: SUMMER2025         ← Important! Guests will use this
Event Date: 2025-08-15
Event Time: 09:00 AM
Venue: Grand Convention Center
Description: Annual summer tech conference
```

**2.3 Click "Create Event"**

**✅ Event is now created!**

---

## **Step 3: Add Guests (2 Options)**

### **OPTION A: Upload Excel File (Bulk Upload)**

**3.1 Prepare Excel File**

Create Excel file with these columns:
```
Full Name       | Email              | Contact Number | Home Address  | Company Name
John Doe        | john@example.com   | 09123456789   | 123 Main St   | ABC Corp
Jane Smith      | jane@example.com   | 09987654321   | 456 Oak Ave   | XYZ Inc
Mike Johnson    | mike@example.com   | 09111222333   | 789 Pine Rd   | Tech Co
```

**OR Download Template:**
- Go to "Upload Excel" section
- Click "Download Excel Template"
- Fill it with your guest data

**3.2 Upload File**
- Click **"Upload Excel"** in sidebar
- Select your event from dropdown
- Click "Select File" or drag & drop
- Choose your Excel file
- Click upload

**3.3 Review Results**
- System shows import summary
- Total imported
- Any errors or duplicates
- All guests now have QR codes!

**✅ All guests pre-registered!**

---

### **OPTION B: Guests Self-Register Online**

**3.1 Get Registration Link**

Your registration link:
```
http://localhost:5000/index.html?event=SUMMER2025
```
(Replace SUMMER2025 with your event code)

**3.2 Share the Link**
- Post on Facebook/social media
- Send via email
- Add to event invitation
- Print QR code that links to it

**3.3 Guests Register Themselves**
- They click the link
- Fill the form (name, email, etc.)
- Submit
- Get their unique QR code instantly!
- Download/print their QR code

**✅ Guests registered with QR codes!**

---

## **Step 4: Manage Guest List**

**4.1 View All Guests**
- Click **"Guests"** in sidebar
- Select your event from dropdown
- See complete guest list

**4.2 Search Guests**
- Use search box to find specific guest
- Filter by "Attended" or "Not Attended"

**4.3 Edit or Delete**
- Click edit/delete buttons per guest
- Update information if needed

---

# 🎪 **PART 2: EVENT DAY (Onsite Check-In)**

## **Setup Check-In Station**

### **Equipment Needed:**
- iPad or Android tablet (recommended)
- OR laptop with webcam
- Good lighting for QR scanning

### **Setup Process:**

**1. Open Check-In Page**
```
http://localhost:5000/checkin.html
```

**2. Enter Event Code**
- Type: `SUMMER2025` (your event code)
- Click "Start Check-In"

**3. Allow Camera Access**
- Browser will ask for camera permission
- Click "Allow"

**✅ Scanner is ready!**

---

## **How to Check In Guests**

### **METHOD 1: QR Code Scanning (Recommended)**

**When Guest Arrives:**

1. **Guest shows their QR code**
   - On phone screen
   - Printed on paper
   - Email/screenshot

2. **Staff holds scanner to QR code**
   - Hold steady for 1-2 seconds
   - Scanner automatically reads it

3. **System Responds:**
   - ✅ **Success Sound** = Guest checked in!
   - Shows guest name and info
   - Modal appears confirming check-in
   - Auto-closes after 3 seconds

4. **Guest can enter event!**

**If Already Checked In:**
- ❌ **Error Sound** = Already attended
- Shows previous check-in time
- Prevents duplicate entry

---

### **METHOD 2: Manual Code Entry (Backup)**

**If scanner not working:**

1. Ask guest for their **Guest Code**
   - Example: `SELF-L9X6YZ2-ABC1`

2. Type code in "Manual Entry" box

3. Click "Check In"

4. Same confirmation as QR scan

---

### **Real-Time Statistics**

**Dashboard shows:**
- **Total Scanned**: How many scanned today
- **Success**: Successful check-ins
- **Errors**: Duplicates or invalid scans

**Recent Check-ins List:**
- Shows last 10 check-ins
- Names, companies, timestamps
- Color-coded (green = success, red = error)

---

## **During Event - Monitoring**

**Admin can monitor live:**

1. Open admin dashboard on computer
2. Go to "Guests" section
3. Select the event
4. Filter: "Attended"
5. See all checked-in guests in real-time!

**Or check statistics:**
- Go to "Overview" section
- See attendance rate
- Total registered vs attended

---

# 📊 **PART 3: AFTER EVENT (Reports)**

## **Generate Attendance Report**

**1. Go to Reports Section**
- Click **"Reports"** in sidebar

**2. Select Event**
- Choose your event from dropdown

**3. Export Format**

### **Option A: Excel Export**
- Click "Export to Excel"
- Opens Excel file with:
  - Guest Code
  - Full Name
  - Email, Phone, Company
  - Attendance Status
  - Check-in Time

### **Option B: CSV Export**
- Click "Export to CSV"
- Downloads CSV file
- Can open in Excel/Google Sheets
- Good for data analysis

### **Option C: PDF Export**
- Click "Export to PDF"
- Printable attendance sheet
- Professional formatting
- Good for filing/records

---

## **Report Contains:**

```
┌────────────────────────────────────────────────────────┐
│ ATTENDANCE REPORT - Summer Conference 2025            │
├────────────────────────────────────────────────────────┤
│ Total Registered: 250                                  │
│ Total Attended:   187                                  │
│ No-Shows:         63                                   │
│ Attendance Rate:  74.8%                                │
├────────────────────────────────────────────────────────┤
│ Guest Code | Name      | Company | Status | Time      │
├────────────────────────────────────────────────────────┤
│ SELF-123   | John Doe  | ABC     | ✓     | 9:15 AM   │
│ PRE-456    | Jane Smith| XYZ     | ✓     | 9:23 AM   │
│ SELF-789   | Mike Lee  | Tech Co | ✗     | -         │
└────────────────────────────────────────────────────────┘
```

---

## **View Analytics**

**Dashboard Shows:**

1. **Overview Stats**
   - Total events
   - Total guests
   - Total attended
   - Attendance percentage

2. **Per Event Stats**
   - Registered count
   - Attended count
   - No-shows
   - Peak check-in times

3. **Guest Distribution**
   - By company
   - By registration type (pre-reg vs self-reg)
   - By check-in time

---

# 💡 **COMMON SCENARIOS**

## **Scenario 1: Walk-in Guest (Not Pre-registered)**

**Option A: Quick Register at Entrance**
1. Staff opens registration portal on tablet
2. Enter event code
3. Fill guest info (30 seconds)
4. QR code generated instantly
5. Scan the QR code
6. Guest enters!

**Option B: Add via Admin Dashboard**
1. Admin creates guest manually
2. System generates QR code
3. Show QR to scanner
4. Guest enters!

---

## **Scenario 2: Guest Lost QR Code**

**Solution:**
1. Go to admin dashboard
2. Click "Guests" section
3. Search guest by name/email
4. View their QR code on screen
5. Scan it from computer screen
6. OR note their guest code
7. Use manual entry

---

## **Scenario 3: Multiple Events Same Day**

**Setup:**
1. Create each event with unique code
2. Example: `CONF-MORNING`, `CONF-AFTERNOON`
3. Use separate tablets per event
4. OR switch event code on same tablet

---

## **Scenario 4: VIP/Regular Guests**

**Option A: Use Company Field**
- VIP guests: Company = "VIP"
- Regular: Company = their actual company
- Filter by company in guest list

**Option B: Separate Events**
- Create "VIP Registration"
- Create "General Registration"
- Different QR codes, different entrances

---

# 🔧 **TIPS & BEST PRACTICES**

## **Before Event**

✅ **Test the system 1-2 days before**
- Do a test registration
- Test QR scanning
- Check all equipment

✅ **Upload guest list early**
- At least 3 days before
- Gives time to fix errors
- Guests can see they're registered

✅ **Prepare backup device**
- Extra tablet/laptop
- In case main device fails

✅ **Print some QR codes**
- For VIPs or problem guests
- As backup if phone dies

---

## **During Event**

✅ **Have good lighting**
- QR scanner needs clear view
- Avoid direct sunlight on screen

✅ **Position scanner properly**
- Eye level for easy scanning
- Table/stand for tablet
- Clear signage

✅ **Have manual entry ready**
- For emergencies
- For phone battery dead cases

✅ **Monitor statistics**
- Check attendance rate
- Identify no-shows
- Track peak times

---

## **After Event**

✅ **Export data immediately**
- Before closing browser
- Save multiple formats

✅ **Back up the database**
- Important for records
- For future events reference

✅ **Send thank you emails**
- Use exported email list
- Include event photos

---

# 🎯 **QUICK REFERENCE**

## **URLs to Remember**

```
Guest Registration:  http://localhost:5000
Admin Dashboard:     http://localhost:5000/admin.html
Check-In Scanner:    http://localhost:5000/checkin.html
```

## **Default Login**

```
Username: admin
Password: admin123
```
**⚠️ Change this after first login!**

## **Event Code Format**

```
CONF2025      ← Short, easy to type
SUMMER2025    ← Descriptive
TECH-AUG-15   ← With date
```

---

# 📱 **MOBILE USAGE**

## **For Guests (Mobile Phones)**

**Register:**
1. Open registration link on phone
2. Fill form (5 minutes)
3. Get QR code
4. Screenshot or download it
5. Show at event entrance

**Show QR Code:**
- From photo gallery
- From email
- From screenshot
- Brightness at max for easier scanning

---

## **For Staff (Tablet/iPad)**

**Check-In App:**
1. Use Safari (iOS) or Chrome (Android)
2. Open checkin.html
3. Keep screen active (disable auto-lock)
4. Use tablet stand for stability
5. Good lighting angle

**Tips:**
- Full screen mode (hide browser UI)
- Disable notifications
- Fully charged + power bank backup

---

# ❓ **TROUBLESHOOTING**

## **Problem: QR Code Won't Scan**

**Solutions:**
1. Increase screen brightness
2. Hold steady (don't shake)
3. Adjust distance (6-12 inches)
4. Check camera focus
5. Use manual entry as backup

## **Problem: Guest Not Found**

**Check:**
1. Correct event code?
2. Guest registered for this event?
3. Check spelling of name
4. Search by email instead

## **Problem: Already Checked In**

**This is normal!** Prevents duplicate entry.
- Show them their previous check-in time
- Explain it's for accuracy
- Allow entry (they're verified)

## **Problem: Camera Not Working**

**Solutions:**
1. Check browser permissions
2. Reload page and allow camera
3. Try different browser
4. Use manual entry method

---

# 🎊 **SUCCESS METRICS**

**Your event is successful when:**

✅ **90%+ attendance rate**
✅ **Fast check-in (under 5 seconds per guest)**
✅ **Zero check-in errors**
✅ **All data captured accurately**
✅ **Complete attendance report ready**

---

# 🚀 **READY TO USE!**

**Your complete event registration system:**
- ✅ Professional design
- ✅ Easy to use
- ✅ Fast check-in
- ✅ Real-time monitoring
- ✅ Complete reports

**GOOD LUCK WITH YOUR EVENT!** 🎉

---

*For technical support, check README.md or QUICKSTART.md*
