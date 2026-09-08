const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEventSummary } = require('../backend/utils/eventSummary');

test('builds a lightweight event summary from guest attendance data', () => {
  const summary = buildEventSummary([
    { attended: 1, registration_source: 'online_form', check_in_time: '2026-09-20T08:42:00Z' },
    { attended: 1, registration_source: 'excel_upload', check_in_time: '2026-09-20T08:52:00Z' },
    { attended: 0, registration_source: 'manual', check_in_time: null },
    { attended: 0, registration_source: 'online_form', check_in_time: null }
  ]);

  assert.equal(summary.total_registered, 4);
  assert.equal(summary.total_attended, 2);
  assert.equal(summary.no_shows, 2);
  assert.equal(summary.walk_ins, 1);
  assert.equal(summary.attendance_rate, 50);
  assert.match(summary.peak_check_in_time, /\d{1,2}:\d{2}\s(AM|PM)/);
  assert.ok(summary.peak_check_in_time.includes(' - '));
});
