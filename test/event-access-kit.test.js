const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/db/config/database');
const controller = require('../backend/api/controllers/eventAccessController');
const { authenticateFacilitatorAccess } = require('../backend/middleware/facilitatorAccess');

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('revoking an event facilitator access kit link stops access', async () => {
  const stamp = Date.now();
  const client = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Access Kit Client', `access-kit-${stamp}`).lastInsertRowid;
  const admin = db.db.prepare("INSERT INTO admin_users (username, email, password, role, client_id) VALUES (?, ?, ?, 'admin', ?)").run(`kit-admin-${stamp}`, `kit-admin-${stamp}@example.test`, 'test', client).lastInsertRowid;
  const facilitator = db.db.prepare("INSERT INTO admin_users (username, email, password, role, client_id) VALUES (?, ?, ?, 'staff', ?)").run(`kit-fac-${stamp}`, `kit-fac-${stamp}@example.test`, 'test', client).lastInsertRowid;
  const event = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(client, 'Access Kit Event', `KIT${stamp}`, `kit-event-${stamp}`, '2030-01-01').lastInsertRowid;
  db.db.prepare("INSERT INTO client_user_assignments (client_id, user_id, role) VALUES (?, ?, 'CLIENT_ADMIN')").run(client, admin);
  db.db.prepare("INSERT INTO event_user_assignments (event_id, user_id, role) VALUES (?, ?, 'FACILITATOR')").run(event, facilitator);

  try {
    const issueResponse = responseMock();
    await controller.issueFacilitator({ params: { eventId: event }, body: { user_id: facilitator }, user: { id: admin, role: 'admin', client_id: client } }, issueResponse);
    assert.equal(issueResponse.statusCode, 201);
    const accessUrl = issueResponse.body.facilitator.access_url;
    const token = accessUrl.split('/').pop();

    const activeRequest = { params: { accessToken: token } };
    const activeResponse = responseMock();
    let activeNext = false;
    await authenticateFacilitatorAccess(activeRequest, activeResponse, () => { activeNext = true; });
    assert.equal(activeNext, true);

    const accessId = db.db.prepare('SELECT id FROM facilitator_access_tokens WHERE event_id = ? AND user_id = ? ORDER BY id DESC LIMIT 1').get(event, facilitator).id;
    const deactivateResponse = responseMock();
    await controller.updateFacilitatorStatus({ params: { accessId }, body: { status: 'inactive' }, user: { id: admin, role: 'admin', client_id: client } }, deactivateResponse);
    const inactiveRequest = { params: { accessToken: token } };
    const inactiveResponse = responseMock();
    let inactiveNext = false;
    await authenticateFacilitatorAccess(inactiveRequest, inactiveResponse, () => { inactiveNext = true; });
    assert.equal(inactiveNext, false);
    assert.equal(inactiveResponse.statusCode, 403);

    const activateResponse = responseMock();
    await controller.updateFacilitatorStatus({ params: { accessId }, body: { status: 'active' }, user: { id: admin, role: 'admin', client_id: client } }, activateResponse);
    const reactivatedRequest = { params: { accessToken: token } };
    const reactivatedResponse = responseMock();
    let reactivatedNext = false;
    await authenticateFacilitatorAccess(reactivatedRequest, reactivatedResponse, () => { reactivatedNext = true; });
    assert.equal(reactivatedNext, true);

    const revokeResponse = responseMock();
    await controller.updateFacilitatorStatus({ params: { accessId }, body: { status: 'revoked' }, user: { id: admin, role: 'admin', client_id: client } }, revokeResponse);
    assert.equal(revokeResponse.statusCode, 200);

    const revokedRequest = { params: { accessToken: token } };
    const revokedResponse = responseMock();
    let revokedNext = false;
    await authenticateFacilitatorAccess(revokedRequest, revokedResponse, () => { revokedNext = true; });
    assert.equal(revokedNext, false);
    assert.equal(revokedResponse.statusCode, 403);
  } finally {
    db.db.prepare('DELETE FROM events WHERE id = ?').run(event);
    db.db.prepare('DELETE FROM clients WHERE id = ?').run(client);
    db.db.prepare('DELETE FROM admin_users WHERE id IN (?, ?)').run(admin, facilitator);
  }
});
