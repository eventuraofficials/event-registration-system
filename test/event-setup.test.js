const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeEventSetup } = require('../backend/utils/eventSetup');

test('defaults to a hybrid event setup when no mode is provided', () => {
  const result = normalizeEventSetup({});

  assert.equal(result.registration_mode, 'hybrid');
  assert.deepEqual(result.registration_fields, ['full_name', 'email', 'contact_number']);
  assert.equal(result.checkin_settings.mode, 'scan_or_manual');
  assert.equal(result.badge_settings.print_mode, 'standard');
  assert.equal(result.qr_settings.size, 'medium');
});

test('keeps explicit setup values and normalizes mode names', () => {
  const result = normalizeEventSetup({
    registration_mode: 'Online Registration',
    registration_fields: ['full_name', 'email', 'company_name'],
    checkin_settings: { mode: 'manual_only' },
    badge_settings: { print_mode: 'vip' },
    qr_settings: { size: 'large' }
  });

  assert.equal(result.registration_mode, 'online');
  assert.deepEqual(result.registration_fields, ['full_name', 'email', 'company_name']);
  assert.equal(result.checkin_settings.mode, 'manual_only');
  assert.equal(result.badge_settings.print_mode, 'vip');
  assert.equal(result.qr_settings.size, 'large');
});
