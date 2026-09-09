const QRCode = require('qrcode');
const crypto = require('crypto');
const db = require('../../db/config/database');
const { canAccessEvent, normalizedRole, ROLE } = require('../../middleware/authorization');
const { createAccessToken, hashAccessToken } = require('../../middleware/facilitatorAccess');

function appUrl() {
  return String(process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || `http://localhost:${process.env.PORT || 5000}`).replace(/\/$/, '');
}

function canManageEvent(user) {
  return [ROLE.MASTER_ADMIN, ROLE.CLIENT_ADMIN].includes(normalizedRole(user));
}

function encryptionKey() {
  return crypto.createHash('sha256').update(String(process.env.JWT_SECRET)).digest();
}

function encryptToken(token) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url');
}
exports.encryptToken = encryptToken;

function decryptToken(value) {
  if (!value) return null;
  try {
    const packed = Buffer.from(value, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), packed.subarray(0, 12));
    decipher.setAuthTag(packed.subarray(12, 28));
    return Buffer.concat([decipher.update(packed.subarray(28)), decipher.final()]).toString('utf8');
  } catch { return null; }
}

async function assertEventManager(req, eventId) {
  if (!canManageEvent(req.user)) return { ok: false, status: 403, message: 'Only authorized event administrators can manage access' };
  const access = await canAccessEvent(req.user, eventId);
  if (!access.allowed) return { ok: false, status: access.status, message: access.message };
  return { ok: true, event: access.event };
}

async function getEvent(eventId) {
  const [rows] = await db.execute(
        `SELECT e.id, e.client_id, e.event_name, e.event_code, e.event_slug, e.event_qr_code,
          e.event_date, e.event_logo, e.client_name, e.endorsement_status, e.endorsement_note,
          c.name AS client_name_record
     FROM events e JOIN clients c ON c.id = e.client_id WHERE e.id = ?`,
    [eventId]
  );
  return rows[0] || null;
}

async function accessUrl(eventId, userId) {
  const rawToken = createAccessToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db.execute(
    `INSERT INTO facilitator_access_tokens (event_id, user_id, token_hash, token_ciphertext, expires_at, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [eventId, userId, hashAccessToken(rawToken), encryptToken(rawToken), expiresAt]
  );
  return { rawToken, expiresAt, url: `${appUrl()}/facilitator/${rawToken}` };
}

async function serializeFacilitator(row) {
  const rawToken = decryptToken(row.token_ciphertext);
  const url = row.status === 'active' && row.revoked_at === null && rawToken
    ? `${appUrl()}/facilitator/${rawToken}`
    : null;
  return {
    id: row.id,
    user_id: row.user_id,
    full_name: row.full_name,
    username: row.username,
    email: row.email,
    status: row.status,
    expires_at: row.expires_at,
    revoked_at: row.revoked_at,
    access_url: url,
    access_qr: url ? await QRCode.toDataURL(url, { width: 280, margin: 2 }) : null
  };
}

exports.getKit = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const permission = await assertEventManager(req, eventId);
  if (!permission.ok) return res.status(permission.status).json({ success: false, message: permission.message });
  const event = await getEvent(eventId);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

  const registrationUrl = `${appUrl()}/pages/index.html?event=${encodeURIComponent(event.event_code)}`;
  const clientPortalUrl = `${appUrl()}/event/${encodeURIComponent(event.event_slug || event.event_code)}`;
  const [rows] = await db.execute(
    `SELECT fat.id, fat.user_id, fat.expires_at, fat.revoked_at, fat.status,
            u.full_name, u.username, u.email
     FROM facilitator_access_tokens fat JOIN admin_users u ON u.id = fat.user_id
     WHERE fat.event_id = ? ORDER BY fat.created_at DESC`,
    [eventId]
  );
  const facilitators = await Promise.all(rows.map(row => serializeFacilitator(row)));
  const [assignedFacilitators] = await db.execute(
    `SELECT u.id, u.full_name, u.username, u.email
     FROM event_user_assignments eu JOIN admin_users u ON u.id = eu.user_id
     WHERE eu.event_id = ? AND eu.role = 'FACILITATOR' AND u.active = 1
     ORDER BY u.full_name, u.username`,
    [eventId]
  );
  const [assignableUsers] = await db.execute(
    `SELECT DISTINCT u.id, u.full_name, u.username, u.email
     FROM admin_users u
     LEFT JOIN client_user_assignments cua ON cua.user_id = u.id AND cua.client_id = ?
     WHERE u.active = 1 AND u.role <> 'super_admin'
       AND (? = 'MASTER_ADMIN' OR cua.user_id IS NOT NULL)
     ORDER BY u.full_name, u.username`,
    [event.client_id, normalizedRole(req.user)]
  );
  res.json({
    success: true,
    kit: {
      event: { id: event.id, client_id: event.client_id, name: event.event_name, code: event.event_code, endorsement_status: event.endorsement_status, endorsement_note: event.endorsement_note || '' },
      client_name: event.client_name || event.client_name_record,
      registration: { url: registrationUrl, qr: event.event_qr_code || await QRCode.toDataURL(registrationUrl, { width: 320, margin: 2 }) },
      client_qc: { url: clientPortalUrl, qr: await QRCode.toDataURL(clientPortalUrl, { width: 320, margin: 2 }) },
      facilitators,
      assigned_facilitators: assignedFacilitators,
      assignable_users: assignableUsers
    }
  });
};

exports.updateEndorsement = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const permission = await assertEventManager(req, eventId);
  if (!permission.ok) return res.status(permission.status).json({ success: false, message: permission.message });
  const status = String(req.body.status || '').toLowerCase();
  const note = String(req.body.note || '').replace(/<[^>]*>/g, '').trim().slice(0, 500);
  if (!['pending', 'endorsed', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid endorsement status' });
  }
  await db.execute('UPDATE events SET endorsement_status = ?, endorsement_note = ? WHERE id = ?', [status, note || null, eventId]);
  res.json({ success: true, endorsement: { status, note } });
};

exports.issueFacilitator = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const permission = await assertEventManager(req, eventId);
  if (!permission.ok) return res.status(permission.status).json({ success: false, message: permission.message });
  const userId = Number(req.body.user_id);
  if (!Number.isInteger(userId)) return res.status(400).json({ success: false, message: 'Facilitator user is required' });
  const [assigned] = await db.execute(
    `SELECT u.id, u.full_name, u.username, u.email FROM event_user_assignments eu
     JOIN admin_users u ON u.id = eu.user_id
     WHERE eu.event_id = ? AND eu.user_id = ? AND eu.role = 'FACILITATOR' AND u.active = 1`,
    [eventId, userId]
  );
  if (!assigned[0]) return res.status(404).json({ success: false, message: 'Active facilitator is not assigned to this event' });
  const token = await accessUrl(eventId, userId);
  res.status(201).json({ success: true, facilitator: { ...assigned[0], status: 'active', expires_at: token.expiresAt, access_url: token.url, access_qr: await QRCode.toDataURL(token.url, { width: 280, margin: 2 }) } });
};

async function getAccessRecord(accessId) {
  const [rows] = await db.execute('SELECT * FROM facilitator_access_tokens WHERE id = ?', [accessId]);
  return rows[0] || null;
}

exports.updateFacilitatorStatus = async (req, res) => {
  const record = await getAccessRecord(Number(req.params.accessId));
  if (!record) return res.status(404).json({ success: false, message: 'Facilitator access not found' });
  const permission = await assertEventManager(req, record.event_id);
  if (!permission.ok) return res.status(permission.status).json({ success: false, message: permission.message });
  const status = String(req.body.status || '').toLowerCase();
  if (!['active', 'inactive', 'revoked'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid access status' });
  if (record.status === 'revoked' && status !== 'revoked') {
    return res.status(409).json({ success: false, message: 'Revoked access cannot be reactivated; generate a new link' });
  }
  await db.execute(
    `UPDATE facilitator_access_tokens SET status = ?, revoked_at = CASE WHEN ? = 'revoked' THEN CURRENT_TIMESTAMP ELSE revoked_at END WHERE id = ?`,
    [status, status, record.id]
  );
  res.json({ success: true, status });
};

exports.regenerateFacilitator = async (req, res) => {
  const record = await getAccessRecord(Number(req.params.accessId));
  if (!record) return res.status(404).json({ success: false, message: 'Facilitator access not found' });
  const permission = await assertEventManager(req, record.event_id);
  if (!permission.ok) return res.status(permission.status).json({ success: false, message: permission.message });
  await db.execute("UPDATE facilitator_access_tokens SET status = 'revoked', revoked_at = CURRENT_TIMESTAMP WHERE id = ?", [record.id]);
  const token = await accessUrl(record.event_id, record.user_id);
  res.status(201).json({ success: true, status: 'active', expires_at: token.expiresAt, access_url: token.url, access_qr: await QRCode.toDataURL(token.url, { width: 280, margin: 2 }) });
};
