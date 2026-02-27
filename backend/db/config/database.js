// Use SQLite instead of MySQL (no installation required!)
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Ensure data directory exists
const dataDir = path.join(__dirname, '../../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database file
const dbPath = path.join(dataDir, 'event_registration.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Auto-initialize schema (safe to run every startup)
db.exec(`
  CREATE TABLE IF NOT EXISTS admin_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'staff' CHECK(role IN ('super_admin', 'admin', 'staff')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
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

  CREATE TABLE IF NOT EXISTS guests (
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

  CREATE TABLE IF NOT EXISTS activity_logs (
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

  CREATE INDEX IF NOT EXISTS idx_admin_email ON admin_users(email);
  CREATE INDEX IF NOT EXISTS idx_admin_username ON admin_users(username);
  CREATE INDEX IF NOT EXISTS idx_event_code ON events(event_code);
  CREATE INDEX IF NOT EXISTS idx_event_date ON events(event_date);
  CREATE INDEX IF NOT EXISTS idx_guest_code ON guests(guest_code);
  CREATE INDEX IF NOT EXISTS idx_qr_code ON guests(qr_code);
  CREATE INDEX IF NOT EXISTS idx_guest_email ON guests(email);
  CREATE INDEX IF NOT EXISTS idx_guest_name ON guests(full_name);
  CREATE INDEX IF NOT EXISTS idx_guest_attended ON guests(attended);
  CREATE INDEX IF NOT EXISTS idx_guest_event ON guests(event_id);
`);

// Seed default admin user if none exists
const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
if (adminCount.count === 0) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  db.prepare(
    'INSERT INTO admin_users (username, email, password, full_name, role) VALUES (?, ?, ?, ?, ?)'
  ).run('admin', 'admin@event.com', hashedPassword, 'System Administrator', 'super_admin');
  console.log('✅ Default admin user created (admin / admin123)');
}

console.log('✅ SQLite Database connected and ready');

// Wrapper to make it compatible with MySQL promise-based queries
const promisePool = {
  async query(sql, params = []) {
    try {
      const cleanSql = sql.trim();

      if (cleanSql.toUpperCase().startsWith('SELECT')) {
        const stmt = db.prepare(cleanSql);
        const rows = params.length > 0 ? stmt.all(...params) : stmt.all();
        return [rows, null];
      }

      const stmt = db.prepare(cleanSql);
      const result = params.length > 0 ? stmt.run(...params) : stmt.run();

      return [
        {
          insertId: result.lastInsertRowid,
          affectedRows: result.changes,
          changedRows: result.changes
        },
        null
      ];
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('Database query error:', error.message);
        console.error('SQL:', sql);
        console.error('Params:', params);
      } else {
        console.error('Database query error:', error.message);
      }
      throw error;
    }
  },

  async execute(sql, params = []) {
    return this.query(sql, params);
  },

  promise() {
    return this;
  }
};

module.exports = promisePool;
module.exports.db = db;
