const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/db/config/database');
const { generateSignedQrPayload } = require('../backend/utils/qrGenerator');
const { hashAccessToken, authenticateFacilitatorAccess } = require('../backend/middleware/facilitatorAccess');
const controller = require('../backend/api/controllers/facilitatorController');

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function resolveAccess(token) {
  const req = { params: { accessToken: token } };
  const response = responseMock();
  let continued = false;
  await authenticateFacilitatorAccess(req, response, () => { continued = true; });
  assert.equal(continued, true);
  return req.facilitatorAccess;
}

test('facilitator QR from Event B is rejected by Event A portal', async () => {
  const stamp = Date.now();
  const client = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Facilitator QR Client', `fac-qr-client-${stamp}`).lastInsertRowid;
  const user = db.db.prepare("INSERT INTO admin_users (username, email, password, role, client_id) VALUES (?, ?, ?, 'staff', ?)").run(`fac-qr-${stamp}`, `fac-qr-${stamp}@example.test`, 'test', client).lastInsertRowid;
  const eventA = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(client, 'Event A', `FQRA${stamp}`, `fqr-a-${stamp}`, '2030-01-01').lastInsertRowid;
  const eventB = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(client, 'Event B', `FQRB${stamp}`, `fqr-b-${stamp}`, '2030-01-01').lastInsertRowid;
  const guest = db.db.prepare("INSERT INTO guests (event_id, guest_code, qr_code, unique_guest_qr_identifier, full_name) VALUES (?, ?, ?, ?, ?)").run(eventB, `FQR-GUEST-${stamp}`, 'qr', `FQR-GUEST-${stamp}`, 'Event B Guest').lastInsertRowid;
  db.db.prepare("INSERT INTO event_user_assignments (event_id, user_id, role) VALUES (?, ?, 'FACILITATOR')").run(eventA, user);
  const token = `facilitator-token-${stamp}-abcdefghijklmnopqrstuvwxyz`;
  db.db.prepare('INSERT INTO facilitator_access_tokens (event_id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)').run(eventA, user, hashAccessToken(token), new Date(Date.now() + 3600000).toISOString());

  try {
    const access = await resolveAccess(token);
    const response = responseMock();
    await controller.verifyGuest({ facilitatorAccess: access, body: { qr_payload: generateSignedQrPayload(`FQR-GUEST-${stamp}`, eventB) } }, response);
    assert.equal(response.statusCode, 409);
    assert.match(response.body.message, /another event/i);
    assert.equal(db.db.prepare('SELECT attended FROM guests WHERE id = ?').get(guest).attended, 0);
  } finally {
    db.db.prepare('DELETE FROM guests WHERE id = ?').run(guest);
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(eventA, eventB);
    db.db.prepare('DELETE FROM clients WHERE id = ?').run(client);
    db.db.prepare('DELETE FROM admin_users WHERE id = ?').run(user);
  }
});
