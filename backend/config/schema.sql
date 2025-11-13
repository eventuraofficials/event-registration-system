-- Event Registration System Database Schema
-- Run this SQL file to create all necessary tables

CREATE DATABASE IF NOT EXISTS event_registration_db;
USE event_registration_db;

-- Admin Users Table
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role ENUM('super_admin', 'admin', 'staff') DEFAULT 'staff',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Events Table
CREATE TABLE IF NOT EXISTS events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_name VARCHAR(255) NOT NULL,
  event_code VARCHAR(50) UNIQUE NOT NULL,
  event_date DATE NOT NULL,
  event_time TIME,
  venue VARCHAR(255),
  description TEXT,
  registration_open BOOLEAN DEFAULT TRUE,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL,
  INDEX idx_event_code (event_code),
  INDEX idx_event_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Guests Table (Main Registration Data)
CREATE TABLE IF NOT EXISTS guests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id INT NOT NULL,
  guest_code VARCHAR(100) UNIQUE NOT NULL,
  qr_code VARCHAR(255) UNIQUE NOT NULL,

  -- Personal Information
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  contact_number VARCHAR(50),
  home_address TEXT,
  company_name VARCHAR(255),

  -- Registration Details
  registration_type ENUM('pre_registered', 'self_registered') DEFAULT 'self_registered',
  registration_source ENUM('excel_upload', 'online_form', 'manual') DEFAULT 'online_form',

  -- Attendance Status
  attended BOOLEAN DEFAULT FALSE,
  check_in_time TIMESTAMP NULL,
  checked_in_by INT NULL,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (checked_in_by) REFERENCES admin_users(id) ON DELETE SET NULL,

  INDEX idx_guest_code (guest_code),
  INDEX idx_qr_code (qr_code),
  INDEX idx_email (email),
  INDEX idx_full_name (full_name),
  INDEX idx_company (company_name),
  INDEX idx_attended (attended),
  INDEX idx_event_id (event_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Activity Logs Table (Audit Trail)
CREATE TABLE IF NOT EXISTS activity_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  event_id INT,
  guest_id INT,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (guest_id) REFERENCES guests(id) ON DELETE CASCADE,

  INDEX idx_action (action),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123)
INSERT INTO admin_users (username, email, password, full_name, role)
VALUES (
  'admin',
  'admin@event.com',
  '$2a$10$rZQ8qF6hJZYJZqJ5ZQJZQeJZQJZQJZQJZQJZQJZQJZQJZQJZQJZQO',
  'System Administrator',
  'super_admin'
);

-- Insert sample event
INSERT INTO events (event_name, event_code, event_date, event_time, venue, description, created_by)
VALUES (
  'Sample Conference 2025',
  'CONF2025',
  '2025-12-01',
  '09:00:00',
  'Grand Convention Center',
  'Annual Technology Conference',
  1
);
