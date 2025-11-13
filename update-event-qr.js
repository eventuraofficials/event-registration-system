const Database = require('better-sqlite3');
const QRCode = require('qrcode');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'data/event_registration.db');
const db = new Database(dbPath);

async function updateEventQRCode() {
  try {
    // Get the sample event
    const event = db.prepare('SELECT * FROM events WHERE event_code = ?').get('CONF2025');

    if (!event) {
      console.log('❌ Event not found');
      return;
    }

    console.log('📅 Found event:', event.event_name);

    // Generate Event QR Code
    const registrationURL = `http://192.168.1.6:5000/index.html?event=${event.event_code}`;
    const eventQRCode = await QRCode.toDataURL(registrationURL, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Update event with QR code
    const updateStmt = db.prepare('UPDATE events SET event_qr_code = ? WHERE id = ?');
    updateStmt.run(eventQRCode, event.id);

    console.log('✅ Event QR code generated and updated!');
    console.log('📱 Registration URL:', registrationURL);
    console.log('\n🎯 Next steps:');
    console.log('1. Go to: http://192.168.1.6:5000/admin.html (or http://localhost:5000/admin.html)');
    console.log('2. Login: admin / admin123');
    console.log('3. Click "View" on "Sample Conference 2025" to see the Event QR code');
    console.log('4. Scan the Event QR code with your phone');
    console.log('\n📝 Or test directly with this URL on your phone:');
    console.log(`   ${registrationURL}`);
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
  }
}

updateEventQRCode();
