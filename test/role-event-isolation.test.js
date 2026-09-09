const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/db/config/database');
const { canAccessEvent } = require('../backend/middleware/authorization');

test('facilitator access is limited to its assigned event', async () => {
  const stamp = Date.now();
  const client = db.db.prepare("INSERT INTO clients (name, slug, status) VALUES (?, ?, 'active')").run('Facilitator Client', `facilitator-client-${stamp}`).lastInsertRowid;
  const user = db.db.prepare("INSERT INTO admin_users (username, email, password, role, client_id) VALUES (?, ?, ?, 'staff', ?)").run(`facilitator-${stamp}`, `facilitator-${stamp}@example.test`, 'test', client).lastInsertRowid;
  const eventA = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(client, 'Assigned Event', `FACA${stamp}`, `faca-${stamp}`, '2030-01-01').lastInsertRowid;
  const eventB = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(client, 'Other Event', `FACB${stamp}`, `facb-${stamp}`, '2030-01-01').lastInsertRowid;
  db.db.prepare("INSERT INTO event_user_assignments (event_id, user_id, role) VALUES (?, ?, 'FACILITATOR')").run(eventA, user);

  try {
    const identity = { id: Number(user), role: 'staff', client_id: Number(client), active: 1 };
    assert.equal((await canAccessEvent(identity, Number(eventA))).allowed, true);
    assert.equal((await canAccessEvent(identity, Number(eventB))).allowed, false);
  } finally {
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(eventA, eventB);
    db.db.prepare('DELETE FROM clients WHERE id = ?').run(client);
    db.db.prepare('DELETE FROM admin_users WHERE id = ?').run(user);
  }
});
