# Event Registration System with QR Code Integration

**A professional, production-ready event registration and attendance tracking system** featuring QR code generation, real-time check-in, Excel bulk upload, and comprehensive admin dashboard.

---

## Features

### Pre-Registration Phase
- **Excel Bulk Upload**: Upload pre-registered guest lists via Excel/CSV files
- **Data Validation**: Automatic validation of guest information with duplicate detection
- **Automatic QR Generation**: Unique QR codes generated for each guest

### Guest Self-Registration
- **Online Registration Portal**: Public-facing registration form
- **Real-time QR Code Generation**: Instant QR code upon successful registration
- **Email/Contact Verification**: Validates email format and contact numbers
- **Downloadable/Printable QR Codes**: Guests can save or print their entry tickets

### Onsite Check-In System
- **Live QR Code Scanner**: Camera-based QR scanning for iPad/tablet
- **Manual Entry Option**: Fallback manual guest code entry
- **Duplicate Check-in Prevention**: Alerts if guest already checked in
- **Real-time Statistics**: Live attendance counting
- **Offline-capable Design**: Minimal dependencies for reliable operation

### Admin Dashboard
- **Event Management**: Create, edit, and manage multiple events
- **Guest List Management**: View, search, filter, and manage attendees
- **Real-time Analytics**: Live attendance rates and statistics
- **Bulk Operations**: Mass upload and export capabilities
- **Role-based Access Control**: Super Admin, Admin, and Staff roles

### Reporting & Export
- **Multiple Export Formats**: Excel, PDF, and CSV export options
- **Attendance Reports**: Comprehensive attendance tracking and analytics
- **Custom Date Ranges**: Filter reports by date/event

---

## Tech Stack

### Backend
- **Node.js** with Express.js
- **MySQL** database
- **JWT** authentication
- **Multer** for file uploads
- **QRCode.js** for QR generation
- **xlsx** for Excel parsing

### Frontend
- **Vanilla JavaScript** (no framework dependencies)
- **HTML5 QR Code Scanner** library
- **Responsive CSS** with mobile-first design
- **Font Awesome** icons

---

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

### Step 1: Clone and Install Dependencies

```bash
cd event-registration-system
npm install
```

### Step 2: Database Setup

1. Create MySQL database:
```sql
CREATE DATABASE event_registration_db;
```

2. Import database schema:
```bash
mysql -u root -p event_registration_db < backend/config/schema.sql
```

Or run the SQL file manually in your MySQL client.

### Step 3: Environment Configuration

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` and configure your settings:
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=event_registration_db
JWT_SECRET=your_super_secret_jwt_key_change_this
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
```

### Step 4: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:5000`

---

## Usage Guide

### 1. Admin Login

**URL**: `http://localhost:5000/admin.html`

**Default Credentials**:
- Username: `admin`
- Password: `admin123`

**Important**: Change the default password after first login!

### 2. Create an Event

1. Login to Admin Dashboard
2. Go to **Events** section
3. Click **Create New Event**
4. Fill in event details:
   - Event Name
   - Event Code (unique identifier)
   - Date & Time
   - Venue
   - Description
5. Click **Create Event**

### 3. Pre-Register Guests (Excel Upload)

1. Download Excel template from **Upload Excel** section
2. Fill in guest information:
   - Full Name (Required)
   - Email
   - Contact Number
   - Home Address
   - Company Name
3. Select the event
4. Upload the Excel file
5. Review import summary

**Excel Format**:
```
Full Name       | Email              | Contact Number | Home Address    | Company Name
John Doe        | john@example.com   | 09123456789   | 123 Main St     | ABC Corp
Jane Smith      | jane@example.com   | 09987654321   | 456 Oak Ave     | XYZ Inc
```

### 4. Guest Self-Registration

**Public URL**: `http://localhost:5000/index.html`

Share this URL or create a QR code for it:
```
http://localhost:5000/index.html?event=CONF2025
```
(Replace CONF2025 with your event code)

**Process**:
1. Guest enters event code
2. Fills registration form
3. Receives unique QR code
4. Downloads/prints QR code for event entry

### 5. Onsite Check-In

**Check-in URL**: `http://localhost:5000/checkin.html`

**For iPad/Tablet**:
1. Open check-in page in Safari/Chrome
2. Enter event code
3. Allow camera access
4. Scan guest QR codes

**Features**:
- Auto-detects and validates QR codes
- Shows guest information on scan
- Prevents duplicate check-ins
- Real-time attendance statistics
- Manual code entry fallback

### 6. Generate Reports

1. Go to **Reports** section
2. Select event
3. Choose export format:
   - **Excel**: Full detailed report
   - **PDF**: Printable attendance sheet
   - **CSV**: Data for external analysis

---

## API Endpoints

### Public Endpoints

#### Get Event by Code
```http
GET /api/events/public/:event_code
```

#### Self-Register Guest
```http
POST /api/guests/register
Content-Type: application/json

{
  "event_id": 1,
  "full_name": "John Doe",
  "email": "john@example.com",
  "contact_number": "09123456789",
  "home_address": "123 Main St",
  "company_name": "ABC Corp"
}
```

#### Verify Guest (for check-in)
```http
GET /api/guests/verify?guest_code=GUEST-XXX&event_id=1
```

#### Check-In Guest
```http
POST /api/guests/checkin
Content-Type: application/json

{
  "guest_code": "GUEST-XXX",
  "event_id": 1
}
```

### Protected Endpoints (Require Authentication)

#### Admin Login
```http
POST /api/admin/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

#### Create Event
```http
POST /api/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "event_name": "Tech Conference 2025",
  "event_code": "TECH2025",
  "event_date": "2025-12-01",
  "event_time": "09:00:00",
  "venue": "Convention Center",
  "description": "Annual tech conference"
}
```

#### Upload Excel
```http
POST /api/guests/upload-excel
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <excel_file>
event_id: 1
```

#### Get Guests by Event
```http
GET /api/guests/event/:event_id?status=attended
Authorization: Bearer <token>
```

---

## File Structure

```
event-registration-system/
├── backend/
│   ├── config/
│   │   ├── database.js          # Database connection
│   │   └── schema.sql            # Database schema
│   ├── controllers/
│   │   ├── adminController.js    # Admin operations
│   │   ├── eventController.js    # Event management
│   │   └── guestController.js    # Guest & check-in
│   ├── middleware/
│   │   ├── auth.js               # JWT authentication
│   │   └── upload.js             # File upload config
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── eventRoutes.js
│   │   └── guestRoutes.js
│   ├── utils/
│   │   ├── excelParser.js        # Excel processing
│   │   └── qrGenerator.js        # QR code generation
│   └── server.js                 # Main server file
├── public/
│   ├── css/
│   │   ├── style.css             # Main styles
│   │   ├── admin.css             # Admin dashboard styles
│   │   └── checkin.css           # Check-in page styles
│   ├── js/
│   │   ├── config.js             # API configuration
│   │   ├── register.js           # Registration logic
│   │   ├── checkin.js            # Check-in logic
│   │   └── admin.js              # Admin dashboard logic
│   ├── index.html                # Guest registration page
│   ├── checkin.html              # Check-in scanner page
│   └── admin.html                # Admin dashboard
├── uploads/                      # Uploaded files directory
├── .env.example                  # Environment template
├── .gitignore
├── package.json
└── README.md
```

---

## Security Considerations

### Production Deployment Checklist

1. **Change Default Credentials**
   - Update admin password immediately
   - Use strong, unique passwords

2. **Secure JWT Secret**
   - Generate a strong random secret key
   - Never commit `.env` file to version control

3. **Enable HTTPS**
   - Use SSL certificate (Let's Encrypt)
   - Redirect HTTP to HTTPS

4. **Database Security**
   - Use strong database passwords
   - Limit database user privileges
   - Enable MySQL firewall rules

5. **File Upload Security**
   - Limit file sizes (default: 5MB)
   - Validate file types
   - Scan for malware if needed

6. **Rate Limiting**
   - Add rate limiting middleware
   - Prevent brute-force attacks

7. **Input Validation**
   - Sanitize all user inputs
   - Use parameterized queries (already implemented)

8. **CORS Configuration**
   - Configure allowed origins in production
   - Restrict API access to trusted domains

---

## Troubleshooting

### Database Connection Error
```
❌ Database connection failed: Access denied
```
**Solution**: Check MySQL credentials in `.env` file

### Camera Not Working on Check-In Page
**Solution**:
- Ensure HTTPS is enabled (cameras require secure context)
- Check browser permissions
- Use Safari on iOS or Chrome on Android

### Excel Upload Fails
**Solution**:
- Check file format (.xlsx, .xls, .csv)
- Ensure column headers match template
- Check file size (max 5MB)

### QR Code Not Generating
**Solution**:
- Check backend logs for errors
- Ensure QRCode library is installed
- Verify database guest_code is unique

---

## Mobile Optimization

The system is fully responsive and optimized for:
- **Tablets** (iPad, Android tablets) - Perfect for check-in stations
- **Smartphones** - Guest self-registration
- **Desktop** - Admin dashboard management

Recommended devices for check-in:
- iPad (iOS 12+)
- Android tablets (Chrome browser)
- Laptops with webcam

---

## Future Enhancements

Potential features to add:
- [ ] Email notifications with QR codes
- [ ] SMS integration for OTP verification
- [ ] Badge printing integration
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Guest check-out tracking
- [ ] VIP/category-based registration
- [ ] Integration with payment gateways
- [ ] Mobile app (React Native/Flutter)

---

## Support

For issues and questions:
- Check the troubleshooting section
- Review API documentation
- Check server logs: `backend/server.log`

---

## License

MIT License - Free to use for personal and commercial projects

---

## Credits

Developed by: **Your Name**
Technology Stack: Node.js, MySQL, HTML5, CSS3, JavaScript
QR Library: html5-qrcode
Icons: Font Awesome

---

**Salamat at enjoy coding! 🚀**
