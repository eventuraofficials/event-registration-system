-- Migration: Add enhancement features
-- Date: 2025-01-09
-- Description: Adds guest categories, event capacity, check-in gate tracking

-- Add guest_category to guests table
ALTER TABLE guests
ADD COLUMN guest_category ENUM('VIP', 'Speaker', 'Sponsor', 'Media', 'Regular') DEFAULT 'Regular' AFTER company_name;

-- Add check-in gate/point tracking
ALTER TABLE guests
ADD COLUMN check_in_gate VARCHAR(50) NULL AFTER check_in_time;

-- Add max_capacity to events table
ALTER TABLE events
ADD COLUMN max_capacity INT DEFAULT NULL AFTER description,
ADD COLUMN event_qr_code LONGTEXT NULL AFTER event_code;

-- Create index for performance
CREATE INDEX idx_guest_category ON guests(guest_category);
CREATE INDEX idx_check_in_gate ON guests(check_in_gate);
