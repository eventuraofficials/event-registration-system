const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/db/config/database');
const { canAccessEvent, authorizePortalEvent } = require('../backend/middleware/authorization');

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('Client A portal cannot resolve or access Client B Event B', async () => {
  const stamp = Date.now();
  const clientA = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Portal Client A', `portal-a-${stamp}`).lastInsertRowid;
  const clientB = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Portal Client B', `portal-b-${stamp}`).lastInsertRowid;
  const user = db.db.prepare("INSERT INTO admin_users (username, email, password, role, client_id) VALUES (?, ?, ?, 'admin', ?)").run(`portal-${stamp}`, `portal-${stamp}@example.test`, 'test', clientA).lastInsertRowid;
  const eventA = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(clientA, 'Client A Event', `PORTALA${stamp}`, `portal-a-event-${stamp}`, '2030-01-01').lastInsertRowid;
  const eventB = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(clientB, 'Client B Event', `PORTALB${stamp}`, `portal-b-event-${stamp}`, '2030-01-01').lastInsertRowid;
  db.db.prepare("INSERT INTO client_user_assignments (client_id, user_id, role) VALUES (?, ?, 'CLIENT_ADMIN')").run(clientA, user);

  try {
    const identity = { id: Number(user), role: 'admin', client_id: Number(clientA), active: 1 };
    assert.equal((await canAccessEvent(identity, Number(eventA))).allowed, true);
    assert.equal((await canAccessEvent(identity, Number(eventB))).allowed, false);

    const response = responseMock();
    let continued = false;
    await authorizePortalEvent()({
      params: { eventIdentifier: `portal-b-event-${stamp}` },
      user: identity
    }, response, () => { continued = true; });
    assert.equal(continued, false);
    assert.equal(response.statusCode, 403);
    assert.match(response.body.message, /not authorized/i);
  } finally {
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(eventA, eventB);
    db.db.prepare('DELETE FROM clients WHERE id IN (?, ?)').run(clientA, clientB);
    db.db.prepare('DELETE FROM admin_users WHERE id = ?').run(user);
  }
});
