const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
process.env.JWT_SECRET ||= 'security-isolation-test-secret-12345678901234567890';

const db = require('../backend/db/config/database');
const jwt = require('jsonwebtoken');
const eventController = require('../backend/api/controllers/eventController');
const facilitatorController = require('../backend/api/controllers/facilitatorController');
const adminController = require('../backend/api/controllers/adminController');
const { generateSignedQrPayload } = require('../backend/utils/qrGenerator');
const { hashAccessToken, authenticateFacilitatorAccess } = require('../backend/middleware/facilitatorAccess');
const { authenticateToken } = require('../backend/middleware/auth');
const { canAccessEvent, authorizeEventAccess, authorizePortalEvent, authorizeGuestAccess, authorizeClientAccess } = require('../backend/middleware/authorization');

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

async function denied(middleware, req) {
  const response = responseMock();
  let continued = false;
  await middleware(req, response, () => { continued = true; });
  return { response, continued };
}

async function setupFixture() {
  const stamp = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const clientA = db.db.prepare("INSERT INTO clients (name, slug, status, branding_config) VALUES (?, ?, 'active', ?)").run('Security Client A', `security-a-${stamp}`, JSON.stringify({ brand_name: 'A Brand', primary_color: '#112233' })).lastInsertRowid;
  const clientB = db.db.prepare("INSERT INTO clients (name, slug, status, branding_config) VALUES (?, ?, 'active', ?)").run('Security Client B', `security-b-${stamp}`, JSON.stringify({ brand_name: 'B Brand', primary_color: '#445566' })).lastInsertRowid;
  const eventA = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(clientA, 'Security Event A', `SECA${stamp}`, `security-event-a-${stamp}`, '2030-01-01').lastInsertRowid;
  const eventB = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(clientB, 'Security Event B', `SECB${stamp}`, `security-event-b-${stamp}`, '2030-01-01').lastInsertRowid;
  const guestA = db.db.prepare("INSERT INTO guests (event_id, guest_code, qr_code, unique_guest_qr_identifier, full_name, email) VALUES (?, ?, ?, ?, ?, ?)").run(eventA, `GUEST-A-${stamp}`, 'qr-a', `GUEST-A-${stamp}`, 'Guest A', `guest-a-${stamp}@example.test`).lastInsertRowid;
  const guestB = db.db.prepare("INSERT INTO guests (event_id, guest_code, qr_code, unique_guest_qr_identifier, full_name, email) VALUES (?, ?, ?, ?, ?, ?)").run(eventB, `GUEST-B-${stamp}`, 'qr-b', `GUEST-B-${stamp}`, 'Guest B', `guest-b-${stamp}@example.test`).lastInsertRowid;

  const users = {};
  for (const [key, name, role, clientId] of [
    ['clientAdminA', 'CLIENT_ADMIN_A', 'admin', clientA],
    ['clientAdminB', 'CLIENT_ADMIN_B', 'admin', clientB],
    ['facilitatorA', 'FACILITATOR_A', 'staff', clientA],
    ['facilitatorB', 'FACILITATOR_B', 'staff', clientB],
    ['qcA', 'QC_A', 'staff', clientA],
    ['qcB', 'QC_B', 'staff', clientB]
  ]) {
    users[key] = db.db.prepare("INSERT INTO admin_users (username, email, password, role, client_id) VALUES (?, ?, ?, ?, ?)").run(`${key}-${stamp}`, `${key}-${stamp}@example.test`, 'test', role, clientId).lastInsertRowid;
  }

  db.db.prepare("INSERT INTO client_user_assignments (client_id, user_id, role) VALUES (?, ?, 'CLIENT_ADMIN')").run(clientA, users.clientAdminA);
  db.db.prepare("INSERT INTO client_user_assignments (client_id, user_id, role) VALUES (?, ?, 'CLIENT_ADMIN')").run(clientB, users.clientAdminB);
  for (const [user, event, role] of [
    [users.facilitatorA, eventA, 'FACILITATOR'], [users.facilitatorB, eventB, 'FACILITATOR'],
    [users.qcA, eventA, 'QC'], [users.qcB, eventB, 'QC']
  ]) db.db.prepare('INSERT INTO event_user_assignments (event_id, user_id, role) VALUES (?, ?, ?)').run(event, user, role);

  const facilitatorToken = `security-facilitator-token-${stamp}-abcdefghijklmnopqrstuvwxyz`;
  db.db.prepare('INSERT INTO facilitator_access_tokens (event_id, user_id, token_hash, expires_at, status) VALUES (?, ?, ?, ?, \'active\')').run(eventA, users.facilitatorA, hashAccessToken(facilitatorToken), new Date(Date.now() + 3600000).toISOString());

  return { stamp, clientA, clientB, eventA, eventB, guestA, guestB, users, facilitatorToken };
}

function identity(id, role, clientId) { return { id: Number(id), role, client_id: Number(clientId), active: 1, auth_version: 1 }; }

async function resolveFacilitator(token) {
  const req = { params: { accessToken: token } };
  const response = responseMock();
  let continued = false;
  await authenticateFacilitatorAccess(req, response, () => { continued = true; });
  assert.equal(continued, true);
  return req.facilitatorAccess;
}

test('complete Client/Event isolation matrix', async () => {
  const fixture = await setupFixture();
  const clientAUser = identity(fixture.users.clientAdminA, 'admin', fixture.clientA);
  const clientBUser = identity(fixture.users.clientAdminB, 'admin', fixture.clientB);
  const facilitatorA = identity(fixture.users.facilitatorA, 'staff', fixture.clientA);
  const qcA = identity(fixture.users.qcA, 'staff', fixture.clientA);
  const results = [];
  const record = (name, expected, actual, vulnerability = 'None') => { const pass = expected === actual; results.push({ test: name, expected, actual, pass, vulnerability }); assert.equal(pass, true, `${name}: ${actual}`); };

  try {
    record('1. Client A accesses Event B portal URL', '403', String((await denied(authorizePortalEvent(), { params: { eventIdentifier: `security-event-b-${fixture.stamp}` }, user: clientAUser })).response.statusCode));
    record('2. Client A accesses Guest B', '403', String((await denied(authorizeGuestAccess(), { params: { id: fixture.guestB }, user: clientAUser })).response.statusCode));
    record('3. Facilitator A accesses Event B', '403', String((await canAccessEvent(facilitatorA, fixture.eventB)).status));
    const facAccess = await resolveFacilitator(fixture.facilitatorToken);
    const qrB = generateSignedQrPayload(`GUEST-B-${fixture.stamp}`, fixture.eventB);
    const qrBResponse = responseMock();
    await facilitatorController.verifyGuest({ facilitatorAccess: facAccess, body: { qr_payload: qrB } }, qrBResponse);
    record('4. Facilitator A scans Guest B QR', '409', String(qrBResponse.statusCode));
    record('5. QC A accesses Event B', '403', String((await canAccessEvent(qcA, fixture.eventB)).status));
    record('6. Client A modifies event_id to Event B', '403', String((await denied(authorizeEventAccess({ source: 'body', field: 'event_id' }), { body: { event_id: fixture.eventB }, user: clientAUser })).response.statusCode));
    record('7. Client A modifies client_id to Client B', '403', String((await denied(authorizeClientAccess(), { params: { clientId: fixture.clientB }, user: clientAUser })).response.statusCode));
    record('8. Browser URL changed to Event B', '403', String((await denied(authorizePortalEvent(), { params: { eventIdentifier: `security-event-b-${fixture.stamp}` }, user: clientAUser })).response.statusCode));

    const eventListResponse = responseMock();
    await eventController.getAllEvents({ user: clientAUser }, eventListResponse);
    record('8a. Client A event list query excludes Event B', 'true', String(eventListResponse.body.events.length === 1 && eventListResponse.body.events[0].id === fixture.eventA));
    const guestBRoute = await denied(authorizeEventAccess({ source: 'params', field: 'event_id' }), { params: { event_id: fixture.eventB }, user: clientAUser });
    record('8b. Client A guest/report route boundary blocks Event B query', '403', String(guestBRoute.response.statusCode));

    const token = jwt.sign({ id: clientAUser.id, role: 'admin', client_id: fixture.clientA, auth_version: 1 }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const logoutResponse = responseMock();
    await adminController.logout({ user: clientAUser }, logoutResponse);
    const reusedResponse = responseMock();
    let reusedNext = false;
    await authenticateToken({ headers: { authorization: `Bearer ${token}` } }, reusedResponse, () => { reusedNext = true; });
    record('9. Reuse old admin session after logout', '403', String(reusedResponse.statusCode));
    assert.equal(reusedNext, false);

    const accessId = db.db.prepare('SELECT id FROM facilitator_access_tokens WHERE event_id = ? AND user_id = ?').get(fixture.eventA, fixture.users.facilitatorA).id;
    const revokeResponse = responseMock();
    await require('../backend/api/controllers/eventAccessController').updateFacilitatorStatus({ params: { accessId }, body: { status: 'revoked' }, user: clientAUser }, revokeResponse);
    const revokedResponse = responseMock();
    let revokedNext = false;
    await authenticateFacilitatorAccess({ params: { accessToken: fixture.facilitatorToken } }, revokedResponse, () => { revokedNext = true; });
    record('10. Revoked facilitator token reuse', '403', String(revokedResponse.statusCode));
    assert.equal(revokedNext, false);

    const facAccessB = await (async () => {
      const tokenB = `security-facilitator-b-token-${fixture.stamp}-abcdefghijklmnopqrstuvwxyz`;
      db.db.prepare('INSERT INTO facilitator_access_tokens (event_id, user_id, token_hash, expires_at, status) VALUES (?, ?, ?, ?, \'active\')').run(fixture.eventB, fixture.users.facilitatorB, hashAccessToken(tokenB), new Date(Date.now() + 3600000).toISOString());
      return resolveFacilitator(tokenB);
    })();
    const guestAQr = generateSignedQrPayload(`GUEST-A-${fixture.stamp}`, fixture.eventA);
    const wrongEventResponse = responseMock();
    await facilitatorController.verifyGuest({ facilitatorAccess: facAccessB, body: { qr_payload: guestAQr } }, wrongEventResponse);
    record('11. Guest A QR scanned in Event B', '409', String(wrongEventResponse.statusCode));
    const tokenA2 = `security-facilitator-a2-token-${fixture.stamp}-abcdefghijklmnopqrstuvwxyz`;
    db.db.prepare('INSERT INTO facilitator_access_tokens (event_id, user_id, token_hash, expires_at, status) VALUES (?, ?, ?, ?, \'active\')').run(fixture.eventA, fixture.users.facilitatorA, hashAccessToken(tokenA2), new Date(Date.now() + 3600000).toISOString());
    const eventAAccess = await resolveFacilitator(tokenA2);
    const guestBInAResponse = responseMock();
    await facilitatorController.verifyGuest({ facilitatorAccess: eventAAccess, body: { qr_payload: qrB } }, guestBInAResponse);
    record('12. Guest B QR scanned in Event A', '409', String(guestBInAResponse.statusCode));

    const publicSource = fs.readFileSync(path.join(__dirname, '..', 'public/js/pages/event-portal.js'), 'utf8');
    const facilitatorSource = fs.readFileSync(path.join(__dirname, '..', 'public/js/pages/facilitator.js'), 'utf8');
    record('Frontend event portal uses event-scoped API', 'true', String(publicSource.includes('/api/event-portals/') && !publicSource.includes('/events/available')));
    record('Frontend facilitator portal uses access-token API', 'true', String(facilitatorSource.includes('/api/facilitator-portals/')));
    assert.equal(logoutResponse.statusCode, 200);
    assert.equal(results.every(item => item.pass), true);
  } finally {
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(fixture.eventA, fixture.eventB);
    db.db.prepare('DELETE FROM clients WHERE id IN (?, ?)').run(fixture.clientA, fixture.clientB);
    db.db.prepare('DELETE FROM admin_users WHERE id IN (?, ?, ?, ?, ?, ?)').run(...Object.values(fixture.users));
  }
});
