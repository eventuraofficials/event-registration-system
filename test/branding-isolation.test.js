const test = require('node:test');
const assert = require('node:assert/strict');
const db = require('../backend/db/config/database');
const eventController = require('../backend/api/controllers/eventController');

function responseMock() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test('public event branding resolves only from the event client and event override', async () => {
  const stamp = Date.now();
  const clientA = db.db.prepare("INSERT INTO clients (name, slug, status, branding_config) VALUES (?, ?, 'active', ?)").run('Brand Client A', `brand-a-${stamp}`, JSON.stringify({ brand_name: 'ABC', primary_color: '#112233', background_color: '#eeeeee' })).lastInsertRowid;
  const clientB = db.db.prepare("INSERT INTO clients (name, slug, status, branding_config) VALUES (?, ?, 'active', ?)").run('Brand Client B', `brand-b-${stamp}`, JSON.stringify({ brand_name: 'XYZ', primary_color: '#445566', background_color: '#dddddd' })).lastInsertRowid;
  const eventA = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status, registration_form_config) VALUES (?, ?, ?, ?, ?, 'active', ?)").run(clientA, 'ABC Launch', `BRANDA${stamp}`, `brand-a-event-${stamp}`, '2030-01-01', JSON.stringify({ branding: { confirmation_title: 'Welcome ABC' } })).lastInsertRowid;
  const eventB = db.db.prepare("INSERT INTO events (client_id, event_name, event_code, event_slug, event_date, status) VALUES (?, ?, ?, ?, ?, 'active')").run(clientB, 'XYZ Conference', `BRANDB${stamp}`, `brand-b-event-${stamp}`, '2030-01-01').lastInsertRowid;

  try {
    const responseA = responseMock();
    await eventController.getEventByCode({ params: { event_code: `BRANDA${stamp}` } }, responseA);
    assert.equal(responseA.statusCode, 200);
    assert.equal(responseA.body.event.branding.brand_name, 'ABC');
    assert.equal(responseA.body.event.branding.primary_color, '#112233');
    assert.equal(responseA.body.event.branding.confirmation_title, 'Welcome ABC');

    const responseB = responseMock();
    await eventController.getEventByCode({ params: { event_code: `BRANDB${stamp}` } }, responseB);
    assert.equal(responseB.statusCode, 200);
    assert.equal(responseB.body.event.branding.brand_name, 'XYZ');
    assert.notEqual(responseB.body.event.branding.primary_color, '#112233');
  } finally {
    db.db.prepare('DELETE FROM events WHERE id IN (?, ?)').run(eventA, eventB);
    db.db.prepare('DELETE FROM clients WHERE id IN (?, ?)').run(clientA, clientB);
  }
});
