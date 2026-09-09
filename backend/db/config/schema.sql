-- SQLite schema for Event Registration System.
-- Runtime startup applies this shape and then runs additive migrations.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('super_admin', 'admin', 'staff')),
  client_id INTEGER,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  auth_version INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  branding_config TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
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
  registration_open INTEGER NOT NULL DEFAULT 1 CHECK (registration_open IN (0, 1)),
  registration_form_config TEXT,
  event_logo TEXT,
  event_banner TEXT,
  client_name TEXT,
  font_style TEXT,
  font_size TEXT,
  created_by INTEGER,
  event_slug TEXT,
  endorsement_status TEXT NOT NULL DEFAULT 'pending' CHECK (endorsement_status IN ('pending', 'endorsed', 'rejected')),
  endorsement_note TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE RESTRICT,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS client_user_assignments (
  client_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (client_id, user_id),
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS event_user_assignments (
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL,
  permissions_json TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (event_id, user_id),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS facilitator_access_tokens (
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

CREATE TABLE IF NOT EXISTS guests (
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
  registration_type TEXT NOT NULL DEFAULT 'self_registered' CHECK (registration_type IN ('pre_registered', 'self_registered')),
  registration_source TEXT NOT NULL DEFAULT 'online_form' CHECK (registration_source IN ('excel_upload', 'online_form', 'manual')),
  registration_status TEXT NOT NULL DEFAULT 'CONFIRMED',
  attendance_status TEXT NOT NULL DEFAULT 'NOT_ATTENDED',
  unique_guest_qr_identifier TEXT UNIQUE,
  attended INTEGER NOT NULL DEFAULT 0 CHECK (attended IN (0, 1)),
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

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_event_code ON events(event_code);
CREATE INDEX IF NOT EXISTS idx_guest_event ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guest_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guest_attended ON guests(attended);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);