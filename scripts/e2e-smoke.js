const assert = require('node:assert/strict');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:5000';
const adminUsername = process.env.SMOKE_ADMIN_USERNAME || 'admin';
const adminPassword = process.env.SMOKE_ADMIN_PASSWORD || process.env.ADMIN_INITIAL_PASSWORD;

if (!adminPassword) {
  throw new Error('Set SMOKE_ADMIN_PASSWORD or ADMIN_INITIAL_PASSWORD before running the E2E smoke test');
}

async function request(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.arrayBuffer();
  return { response, body };
}

async function main() {
  const login = await request('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: adminUsername, password: adminPassword })
  });
  assert.equal(login.response.status, 200, 'admin login must succeed');
  assert.equal(login.body.success, true);

  const token = login.body.token;
  const auth = { Authorization: `Bearer ${token}` };
  const eventCode = `SMOKE${Date.now().toString().slice(-8)}`;
  let eventId;

  try {
    const created = await request('/api/events', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({
        event_name: 'Automated Smoke Event',
        event_code: eventCode,
        event_date: '2030-01-15',
        event_time: '09:00',
        venue: 'Smoke Test Venue',
        max_capacity: 3
      })
    });
    assert.equal(created.response.status, 201, 'event creation must succeed');
    assert.equal(created.body.success, true);
    eventId = created.body.event.id;

    const csv = 'Full Name,Email,Contact Number,Company Name\nImported Guest,imported-smoke@example.com,+639171234568,Import Co';
    const previewFile = new FormData();
    previewFile.append('file', new Blob([csv], { type: 'text/csv' }), 'smoke-guests.csv');
    previewFile.append('event_id', String(eventId));

    const preview = await request('/api/guests/upload-excel?preview=true', {
      method: 'POST',
      headers: auth,
      body: previewFile
    });
    assert.equal(preview.response.status, 200, 'guest import preview must succeed');
    assert.equal(preview.body.preview, true);
    assert.equal(preview.body.summary.importable, 1);

    const confirmedFile = new FormData();
    confirmedFile.append('file', new Blob([csv], { type: 'text/csv' }), 'smoke-guests.csv');
    confirmedFile.append('event_id', String(eventId));
    const imported = await request('/api/guests/upload-excel', {
      method: 'POST',
      headers: auth,
      body: confirmedFile
    });
    assert.equal(imported.response.status, 200, 'guest import confirmation must succeed');
    assert.equal(imported.body.summary.imported, 1);

    const guest = {
      event_id: eventId,
      full_name: 'Smoke Test Guest',
      email: `smoke-${Date.now()}@example.com`,
      contact_number: '+639171234567',
      company_name: 'Smoke Test Co'
    };

    const registered = await request('/api/guests/register', {
      method: 'POST',
      body: JSON.stringify(guest)
    });
    assert.equal(registered.response.status, 201, 'guest registration must succeed');
    assert.equal(registered.body.success, true);
    const guestCode = registered.body.guest.guestCode;
    assert.ok(guestCode, 'registration must return a guest code');

    const verified = await request(`/api/guests/verify?guest_code=${encodeURIComponent(guestCode)}&event_id=${eventId}`, {
      headers: auth
    });
    assert.equal(verified.response.status, 200, 'authenticated QR verification must succeed');
    assert.equal(verified.body.guest.full_name, guest.full_name);

    const checkedIn = await request('/api/guests/checkin', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ guest_code: guestCode, event_id: eventId })
    });
    assert.equal(checkedIn.response.status, 200, 'first check-in must succeed');
    assert.equal(checkedIn.body.success, true);

    const duplicate = await request('/api/guests/checkin', {
      method: 'POST',
      headers: auth,
      body: JSON.stringify({ guest_code: guestCode, event_id: eventId })
    });
    assert.equal(duplicate.response.status, 400, 'duplicate check-in must be rejected');
    assert.match(duplicate.body.message, /already checked in/i);

    const stats = await request(`/api/guests/event/${eventId}/stats`, { headers: auth });
    assert.equal(stats.response.status, 200, 'guest stats must be available');
    assert.equal(Number(stats.body.stats.total_attended), 1);

    const report = await request(`/api/guests/event/${eventId}/export`, { headers: auth });
    assert.equal(report.response.status, 200, 'attendance export must succeed');
    assert.ok(report.body.byteLength > 100, 'export must contain data');

    console.log(`E2E smoke passed: event=${eventCode}, guest=${guestCode}`);
  } finally {
    if (eventId) {
      await request(`/api/events/${eventId}`, { method: 'DELETE', headers: auth }).catch(() => {});
    }
  }
}

main().catch(error => {
  console.error(`E2E smoke failed: ${error.message}`);
  process.exitCode = 1;
});
