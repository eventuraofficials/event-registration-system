const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database
const dbPath = path.join(__dirname, '../../data/event_registration.db');
const db = new Database(dbPath);

console.log('🔧 Initializing SQLite database...');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Drop existing tables
db.exec(`
  DROP TABLE IF EXISTS activity_logs;
  DROP TABLE IF EXISTS guests;
  DROP TABLE IF EXISTS events;
  DROP TABLE IF EXISTS admin_users;
`);

// Create admin_users table
db.exec(`
  CREATE TABLE admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create events table
db.exec(`
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_name TEXT NOT NULL,
    event_code TEXT UNIQUE NOT NULL,
    event_qr_code TEXT,
    event_date DATE NOT NULL,
    event_time TIME,
    venue TEXT,
    description TEXT,
    max_capacity INTEGER,
    registration_open INTEGER DEFAULT 1,
    registration_form_config TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
  );
`);

// Create guests table
db.exec(`
  CREATE TABLE guests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    guest_code TEXT UNIQUE NOT NULL,
    qr_code TEXT UNIQUE NOT NULL,

    full_name TEXT NOT NULL,
    email TEXT,
    contact_number TEXT,
    home_address TEXT,
    company_name TEXT,
    guest_category TEXT DEFAULT 'Regular',

    registration_type TEXT DEFAULT 'self_registered' CHECK(registration_type IN ('pre_registered', 'self_registered')),
    registration_source TEXT DEFAULT 'online_form' CHECK(registration_source IN ('excel_upload', 'online_form', 'manual')),

    attended INTEGER DEFAULT 0,
    check_in_time DATETIME,
    check_in_gate TEXT,
    checked_in_by INTEGER,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (checked_in_by) REFERENCES admin_users(id) ON DELETE SET NULL
  );
`);

// Create activity_logs table
db.exec(`
  CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    event_id INTEGER,
    guest_id INTEGER,
    action TEXT NOT NULL,
    description TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE
  );
`);

// Create indexes for better performance
db.exec(`
  CREATE INDEX idx_admin_email ON admin_users(email);
  CREATE INDEX idx_admin_username ON admin_users(username);
  CREATE INDEX idx_event_code ON events(event_code);
  CREATE INDEX idx_event_date ON events(event_date);
  CREATE INDEX idx_guest_code ON guests(guest_code);
  CREATE INDEX idx_qr_code ON guests(qr_code);
  CREATE INDEX idx_guest_email ON guests(email);
  CREATE INDEX idx_guest_name ON guests(full_name);
  CREATE INDEX idx_guest_company ON guests(company_name);
  CREATE INDEX idx_guest_attended ON guests(attended);
  CREATE INDEX idx_guest_event ON guests(event_id);
  CREATE INDEX idx_activity_action ON activity_logs(action);
  CREATE INDEX idx_activity_created ON activity_logs(created_at);
`);

console.log('✅ Tables created successfully');

// Insert default admin user
// SECURITY: Password is hashed, but should be changed after first login
const hashedPassword = bcrypt.hashSync('admin123', 10);

const insertAdmin = db.prepare(`
  INSERT INTO admin_users (username, email, password, full_name, role)
  VALUES (?, ?, ?, ?, ?)
`);

insertAdmin.run('admin', 'admin@event.com', hashedPassword, 'System Administrator', 'super_admin');

console.log('✅ Default admin user created');
console.log('⚠️  SECURITY: Change default admin password after first login!');

// Insert sample event
const insertEvent = db.prepare(`
  INSERT INTO events (event_name, event_code, event_date, event_time, venue, description, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

insertEvent.run(
  'Sample Conference 2025',
  'CONF2025',
  '2025-12-01',
  '09:00:00',
  'Grand Convention Center',
  'Annual Technology Conference',
  1
);

console.log('✅ Sample event created (CONF2025)');

// Verify tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('\n📋 Created tables:', tables.map(t => t.name).join(', '));

// Verify admin user
const admin = db.prepare('SELECT username, email, role FROM admin_users').get();
console.log('👤 Admin user:', admin);

// Verify event
const event = db.prepare('SELECT event_name, event_code FROM events').get();
console.log('📅 Sample event:', event);

console.log('\n🎉 Database initialization complete!');
console.log('📁 Database location:', dbPath);

db.close();
