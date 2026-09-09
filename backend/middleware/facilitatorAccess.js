const crypto = require('crypto');
const db = require('../db/config/database');

function hashAccessToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function createAccessToken() {
  return crypto.randomBytes(32).toString('base64url');
}

async function authenticateFacilitatorAccess(req, res, next) {
  try {
    const token = String(req.params.accessToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,100}$/.test(token)) {
      return res.status(404).json({ success: false, message: 'Facilitator portal not found' });
    }
    const [rows] = await db.execute(
      `SELECT fat.id AS access_id, fat.event_id, fat.user_id, fat.expires_at,
              e.client_id, e.event_name, e.event_code, e.event_slug,
              u.role, u.active
       FROM facilitator_access_tokens fat
       JOIN events e ON e.id = fat.event_id
       JOIN admin_users u ON u.id = fat.user_id
       JOIN event_user_assignments eu ON eu.event_id = fat.event_id AND eu.user_id = fat.user_id
      WHERE fat.token_hash = ? AND fat.status = 'active' AND fat.revoked_at IS NULL
         AND datetime(fat.expires_at) > datetime('now')
         AND u.active = 1 AND eu.role = 'FACILITATOR'`,
      [hashAccessToken(token)]
    );
    if (!rows[0]) return res.status(403).json({ success: false, message: 'Facilitator access is invalid or expired' });
    req.facilitatorAccess = rows[0];
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { hashAccessToken, createAccessToken, authenticateFacilitatorAccess };
