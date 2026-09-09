const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database
const dbPath = path.join(__dirname, '../../../data/event_registration.db');
const db = new Database(dbPath);

console.log('🔧 Initializing SQLite database...');

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Drop existing tables
db.exec(`
  DROP TABLE IF EXISTS activity_logs;
  DROP TABLE IF EXISTS event_user_assignments;
  DROP TABLE IF EXISTS facilitator_access_tokens;
  DROP TABLE IF EXISTS client_user_assignments;
  DROP TABLE IF EXISTS guests;
  DROP TABLE IF EXISTS events;
  DROP TABLE IF EXISTS clients;
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
    client_id INTEGER,
    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0, 1)),
    auth_version INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

db.exec(`
  CREATE TABLE clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    branding_config TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create events table
db.exec(`
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
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
    event_slug TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
  );
`);

db.exec(`
  CREATE TABLE client_user_assignments (
    client_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (client_id, user_id),
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  );
  CREATE TABLE event_user_assignments (
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    permissions_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id, user_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
  );
  CREATE TABLE facilitator_access_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    token_ciphertext TEXT,
    expires_at DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'revoked')),
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
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
    address TEXT,
    company_name TEXT,
    company TEXT,
    guest_category TEXT DEFAULT 'Regular',

    registration_type TEXT DEFAULT 'self_registered' CHECK(registration_type IN ('pre_registered', 'self_registered')),
    registration_source TEXT DEFAULT 'online_form' CHECK(registration_source IN ('excel_upload', 'online_form', 'manual')),
    registration_status TEXT NOT NULL DEFAULT 'CONFIRMED',
    attendance_status TEXT NOT NULL DEFAULT 'NOT_ATTENDED',
    unique_guest_qr_identifier TEXT UNIQUE,

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
  CREATE INDEX idx_event_client ON events(client_id);
  CREATE INDEX idx_event_slug ON events(event_slug);
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

db.prepare('INSERT INTO clients (name, slug, status) VALUES (?, ?, ?)')
  .run(process.env.LEGACY_CLIENT_NAME || 'Default Client', process.env.LEGACY_CLIENT_SLUG || 'default-client', 'active');

console.log('✅ Tables created successfully');

// Seed the first admin only from an explicitly supplied password.
const initialPassword = process.env.ADMIN_INITIAL_PASSWORD;
if (!initialPassword || initialPassword.length < 12) {
  throw new Error('Set ADMIN_INITIAL_PASSWORD to a strong password before initializing the database.');
}
const hashedPassword = bcrypt.hashSync(initialPassword, 12);

const insertAdmin = db.prepare(`
  INSERT INTO admin_users (username, email, password, full_name, role)
  VALUES (?, ?, ?, ?, ?)
`);

insertAdmin.run(
  process.env.ADMIN_INITIAL_USERNAME || 'admin',
  process.env.ADMIN_INITIAL_EMAIL || 'admin@event.com',
  hashedPassword,
  'System Administrator',
  'super_admin'
);

console.log('✅ Default admin user created');

// Insert sample event
const insertEvent = db.prepare(`
  INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, event_time, venue, description, created_by)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

if (process.env.SEED_SAMPLE_DATA === 'true') {
  insertEvent.run(
    1,
    'Sample Conference 2025',
    'CONF2025',
    'conf2025',
    '2025-12-01',
    '09:00:00',
    'Grand Convention Center',
    'Annual Technology Conference',
    1
  );
  console.log('✅ Sample event created (CONF2025)');
}

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
