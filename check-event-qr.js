const Database = require('better-sqlite3');
const path = require('path');

// Connect to database
const dbPath = path.join(__dirname, 'data/event_registration.db');
const db = new Database(dbPath);

try {
  // Get the sample event
  const event = db.prepare('SELECT id, event_name, event_code, event_qr_code FROM events WHERE event_code = ?').get('CONF2025');

  if (!event) {
    console.log('❌ Event not found');
    db.close();
    process.exit(1);
  }

  console.log('📅 Event:', event.event_name);
  console.log('🔑 Event Code:', event.event_code);
  console.log('📊 Event ID:', event.id);

  if (event.event_qr_code) {
    console.log('✅ Event QR code exists!');
    console.log('📏 QR code length:', event.event_qr_code.length, 'characters');
    console.log('🔍 QR code preview:', event.event_qr_code.substring(0, 100) + '...');

    // Try to decode what URL is in the QR code
    if (event.event_qr_code.startsWith('data:image/png;base64,')) {
      console.log('✅ QR code format is correct (base64 PNG)');
    } else {
      console.log('⚠️ QR code format might be wrong');
    }
  } else {
    console.log('❌ Event QR code is NULL or empty!');
  }
} catch (error) {
  console.error('❌ Error:', error);
} finally {
  db.close();
}
