const crypto = require('crypto');
const db = require('../../db/config/database');
const { verifySignedQrPayload } = require('../../utils/qrGenerator');
const { createAccessToken, hashAccessToken } = require('../../middleware/facilitatorAccess');
const { encryptToken } = require('./eventAccessController');
const { resolveEventBranding } = require('../../utils/branding');

function parseConfig(value) {
  try { return value ? JSON.parse(value) : {}; } catch { return {}; }
}

async function getEventContext(eventId) {
  const [rows] = await db.execute(
    `SELECT e.id, e.client_id, e.event_name, e.event_code, e.event_slug,
            e.event_date, e.event_time, e.venue, e.event_logo, e.event_banner, e.client_name,
            e.registration_open, e.registration_form_config,
            c.name AS client_record_name, c.branding_config
     FROM events e JOIN clients c ON c.id = e.client_id WHERE e.id = ?`,
    [eventId]
  );
  return rows[0] || null;
}

async function getStats(eventId) {
  const [rows] = await db.execute(
    `SELECT COUNT(*) AS registered,
            SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) AS checked_in,
            SUM(CASE WHEN attended = 0 THEN 1 ELSE 0 END) AS remaining
     FROM guests WHERE event_id = ?`,
    [eventId]
  );
  const stats = rows[0] || {};
  const registered = Number(stats.registered || 0);
  const checkedIn = Number(stats.checked_in || 0);
  return {
    registered,
    checked_in: checkedIn,
    remaining: Number(stats.remaining || 0),
    attendance_rate: registered ? Math.round((checkedIn / registered) * 100) : 0
  };
}

exports.issueAccessLink = async (req, res) => {
  const eventId = Number(req.params.id);
  const userId = Number(req.body.user_id);
  const expiresHours = Math.min(Math.max(Number(req.body.expires_hours) || 24, 1), 168);
  if (!Number.isInteger(eventId) || !Number.isInteger(userId)) {
    return res.status(400).json({ success: false, message: 'Valid event and facilitator are required' });
  }
  const [assignments] = await db.execute(
    `SELECT 1 FROM event_user_assignments eu
     JOIN admin_users u ON u.id = eu.user_id
     WHERE eu.event_id = ? AND eu.user_id = ? AND eu.role = 'FACILITATOR' AND u.active = 1`,
    [eventId, userId]
  );
  if (!assignments.length) return res.status(404).json({ success: false, message: 'Facilitator is not assigned to this event' });
  const rawToken = createAccessToken();
  const expiresAt = new Date(Date.now() + expiresHours * 60 * 60 * 1000).toISOString();
  await db.execute(
    `INSERT INTO facilitator_access_tokens (event_id, user_id, token_hash, token_ciphertext, expires_at, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [eventId, userId, hashAccessToken(rawToken), encryptToken(rawToken), expiresAt]
  );
  res.status(201).json({
    success: true,
    access_token: rawToken,
    expires_at: expiresAt,
    access_url: `/facilitator/${rawToken}`
  });
};

exports.getPortal = async (req, res) => {
  const event = await getEventContext(req.facilitatorAccess.event_id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
  const branding = resolveEventBranding({
    clientBranding: event.branding_config,
    eventBranding: parseConfig(event.registration_form_config).branding,
    clientName: event.client_name || event.client_record_name,
    eventName: event.event_name,
    eventLogo: event.event_logo,
    eventBanner: event.event_banner
  });
  res.json({
    success: true,
    portal: {
      facilitator_id: req.facilitatorAccess.user_id,
      event: {
        id: event.id,
        client_id: event.client_id,
        name: event.event_name,
        code: event.event_code,
        slug: event.event_slug,
        date: event.event_date,
        time: event.event_time,
        venue: event.venue,
        registration_open: Boolean(event.registration_open),
        branding
      },
      stats: await getStats(event.id)
    }
  });
};

function verifyCurrentEventQr(rawPayload, eventId) {
  const verification = verifySignedQrPayload(rawPayload);
  if (!verification.valid) return { valid: false, status: 400, message: 'Invalid QR code' };
  if (Number(verification.payload.eventId) !== Number(eventId)) {
    return { valid: false, status: 409, message: 'This QR code belongs to another event' };
  }
  return { valid: true, payload: verification.payload };
}

exports.verifyGuest = async (req, res) => {
  const qrPayload = req.body.qr_payload;
  const validation = verifyCurrentEventQr(qrPayload, req.facilitatorAccess.event_id);
  if (!validation.valid) return res.status(validation.status).json({ success: false, message: validation.message });
  const [guests] = await db.execute(
    `SELECT g.id, g.event_id, g.guest_code, g.full_name, g.email, g.contact_number,
            g.company, g.company_name, g.registration_status, g.attendance_status,
            g.attended, g.check_in_time, g.checked_in_by,
            u.full_name AS checked_in_by_name
     FROM guests g LEFT JOIN admin_users u ON u.id = g.checked_in_by
     WHERE g.event_id = ? AND g.guest_code = ?`,
    [req.facilitatorAccess.event_id, validation.payload.guestCode]
  );
  if (!guests[0]) return res.status(404).json({ success: false, message: 'Guest is not registered for this event' });
  res.json({ success: true, guest: guests[0] });
};

exports.checkInGuest = async (req, res) => {
  let guestCode;
  if (req.body.qr_payload) {
    const validation = verifyCurrentEventQr(req.body.qr_payload, req.facilitatorAccess.event_id);
    if (!validation.valid) return res.status(validation.status).json({ success: false, message: validation.message });
    guestCode = validation.payload.guestCode;
  } else {
    guestCode = String(req.body.guest_code || '').trim();
    if (!guestCode) return res.status(400).json({ success: false, message: 'QR payload or guest code is required' });
  }
  const eventId = req.facilitatorAccess.event_id;
  const [guests] = await db.execute(
    `SELECT id, full_name, attended, check_in_time, checked_in_by
     FROM guests WHERE event_id = ? AND guest_code = ?`,
    [eventId, guestCode]
  );
  if (!guests[0]) return res.status(404).json({ success: false, message: 'Guest is not registered for this event' });
  if (guests[0].attended) {
    const [details] = await db.execute(
      `SELECT g.check_in_time, u.full_name AS checked_in_by_name
       FROM guests g LEFT JOIN admin_users u ON u.id = g.checked_in_by WHERE g.id = ?`,
      [guests[0].id]
    );
    return res.status(409).json({ success: false, already_checked_in: true, message: 'Already checked in', guest: { ...guests[0], ...details[0] } });
  }
  const [result] = await db.execute(
    `UPDATE guests SET attended = 1, attendance_status = 'ATTENDED',
      check_in_time = datetime('now'), checked_in_by = ?
     WHERE id = ? AND event_id = ? AND attended = 0`,
    [req.facilitatorAccess.user_id, guests[0].id, eventId]
  );
  if (!result.affectedRows) return res.status(409).json({ success: false, message: 'Guest was already checked in' });
  res.json({ success: true, message: 'Guest marked as attended', guest: { ...guests[0], attended: 1, attendance_status: 'ATTENDED', checked_in_by: req.facilitatorAccess.user_id } });
};

exports.searchGuests = async (req, res) => {
  const term = `%${String(req.query.q || '').trim().slice(0, 80)}%`;
  const [guests] = await db.execute(
    `SELECT id, guest_code, full_name, email, company, company_name,
            registration_status, attendance_status, attended, check_in_time
     FROM guests WHERE event_id = ?
       AND (full_name LIKE ? OR email LIKE ? OR company_name LIKE ? OR guest_code LIKE ?)
     ORDER BY full_name ASC LIMIT 50`,
    [req.facilitatorAccess.event_id, term, term, term, term]
  );
  res.json({ success: true, guests });
};
