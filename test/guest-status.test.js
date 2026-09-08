const test = require('node:test');
const assert = require('node:assert/strict');
const { getGuestStatus, matchesGuestFilter, buildGuestStatusFilter } = require('../backend/utils/guestStatus');

test('classifies a checked-in guest as attended', () => {
  const guest = { attended: 1, registration_source: 'online_form', guest_category: 'VIP' };

  assert.equal(getGuestStatus(guest), 'attended');
  assert.equal(matchesGuestFilter('attended', guest), true);
});

test('treats manual walk-ins as a walk-in registration source', () => {
  const guest = { attended: 0, registration_source: 'manual', guest_category: 'Regular' };

  assert.equal(getGuestStatus(guest), 'walk_in');
  assert.equal(matchesGuestFilter('walk_in', guest), true);
  assert.equal(matchesGuestFilter('registered', guest), false);
});

test('treats un-attended online guests as registered status', () => {
  const guest = { attended: 0, registration_source: 'online_form', guest_category: 'Regular' };

  assert.equal(getGuestStatus(guest), 'registered');
  assert.equal(matchesGuestFilter('registered', guest), true);
  assert.equal(matchesGuestFilter('vip', guest), false);
});

test('builds the correct filter clause for admin guest statuses', () => {
  const walkInClause = buildGuestStatusFilter('walk_in', 'g');
  const companyClause = buildGuestStatusFilter('company', 'g');
  const attendedClause = buildGuestStatusFilter('attended', 'g');

  assert.match(walkInClause.whereClause, /registration_source/i);
  assert.match(companyClause.whereClause, /company_name/i);
  assert.match(attendedClause.whereClause, /attended/i);
  assert.equal(Array.isArray(walkInClause.params), true);
  assert.equal(Array.isArray(companyClause.params), true);
  assert.equal(Array.isArray(attendedClause.params), true);
});
