const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/db/config/database');
const { canAccessEvent, authorizeGuestAccess } = require('../backend/middleware/authorization');

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('event authorization denies cross-client and unassigned-event access', async () => {
  const stamp = Date.now();
  const clientA = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Isolation A', `isolation-a-${stamp}`).lastInsertRowid;
  const clientB = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Isolation B', `isolation-b-${stamp}`).lastInsertRowid;
  const user = db.db.prepare("INSERT INTO admin_users (username, email, password, role, client_id) VALUES (?, ?, ?, 'admin', ?)").run(`isolation-${stamp}`, `isolation-${stamp}@example.test`, 'test', clientA).lastInsertRowid;
  const eventA = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(clientA, 'Event A', `ISOA${stamp}`, `isoa-${stamp}`, '2030-01-01').lastInsertRowid;
  const eventB = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(clientB, 'Event B', `ISOB${stamp}`, `isob-${stamp}`, '2030-01-01').lastInsertRowid;
  try {
    db.db.prepare("INSERT INTO client_user_assignments (client_id, user_id, role) VALUES (?, ?, 'CLIENT_ADMIN')").run(clientA, user);
    db.db.prepare("INSERT INTO event_user_assignments (event_id, user_id, role) VALUES (?, ?, 'CLIENT_ADMIN')").run(eventA, user);

    const identity = { id: Number(user), role: 'admin', client_id: Number(clientA), active: 1 };
    const allowed = await canAccessEvent(identity, Number(eventA));
    const denied = await canAccessEvent(identity, Number(eventB));

    assert.equal(allowed.allowed, true);
    assert.equal(denied.allowed, false);
    assert.equal(denied.status, 403);
  } finally {
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(eventA, eventB);
    db.db.prepare('DELETE FROM clients WHERE id IN (?, ?)').run(clientA, clientB);
    db.db.prepare('DELETE FROM admin_users WHERE id = ?').run(user);
  }
});

test('guest authorization denies a guest from an unassigned event', async () => {
  const stamp = Date.now();
  const clientA = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Guest Isolation A', `guest-isolation-a-${stamp}`).lastInsertRowid;
  const clientB = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Guest Isolation B', `guest-isolation-b-${stamp}`).lastInsertRowid;
  const user = db.db.prepare("INSERT INTO admin_users (username, email, password, role, client_id) VALUES (?, ?, ?, 'admin', ?)").run(`guest-${stamp}`, `guest-${stamp}@example.test`, 'test', clientA).lastInsertRowid;
  const event = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(clientB, 'Guest Event', `ISOG${stamp}`, `isog-${stamp}`, '2030-01-01').lastInsertRowid;
  const guest = db.db.prepare("INSERT INTO guests (event_id, guest_code, qr_code, full_name) VALUES (?, ?, ?, ?)").run(event, `GUEST-${stamp}`, `qr-${stamp}`, 'Guest').lastInsertRowid;

  try {
    const response = responseMock();
    let continued = false;
    await authorizeGuestAccess()({ params: { id: guest }, user: { id: user, role: 'admin', client_id: clientA } }, response, () => {
      continued = true;
    });

    assert.equal(continued, false);
    assert.equal(response.statusCode, 403);
    assert.match(response.body.message, /not authorized/i);
  } finally {
    db.db.prepare('DELETE FROM guests WHERE id = ?').run(guest);
    db.db.prepare('DELETE FROM events WHERE id = ?').run(event);
    db.db.prepare('DELETE FROM clients WHERE id IN (?, ?)').run(clientA, clientB);
    db.db.prepare('DELETE FROM admin_users WHERE id = ?').run(user);
  }
});
