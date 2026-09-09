-- SQLite migration: enhancement fields.
-- Applied fields are also guarded in database.js for existing installations.

ALTER TABLE guests ADD COLUMN guest_category TEXT DEFAULT 'Regular';
ALTER TABLE guests ADD COLUMN check_in_gate TEXT;
ALTER TABLE events ADD COLUMN max_capacity INTEGER;
ALTER TABLE events ADD COLUMN event_qr_code TEXT;

CREATE INDEX IF NOT EXISTS idx_guest_category ON guests(guest_category);
CREATE INDEX IF NOT EXISTS idx_check_in_gate ON guests(check_in_gate);