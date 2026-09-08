const test = require('node:test');
const assert = require('node:assert/strict');
const { validateGuestData, checkDuplicates } = require('../backend/utils/excelParser');

test('validates guest rows and reports invalid email and phone values', () => {
  const result = validateGuestData([
    { full_name: 'Ana Cruz', email: 'ana@example.com', contact_number: '+639171234567' },
    { full_name: 'Broken Guest', email: 'not-an-email', contact_number: '12' }
  ]);

  assert.equal(result.totalRows, 2);
  assert.equal(result.validRows, 1);
  assert.equal(result.invalidRows, 1);
  assert.deepEqual(result.errors[0].errors, ['Invalid email format', 'Invalid phone number format']);
});

test('detects duplicate guests using normalized name and email', () => {
  const result = checkDuplicates([
    { full_name: 'Ana Cruz', email: 'ana@example.com' },
    { full_name: 'ana cruz', email: 'ANA@example.com' },
    { full_name: 'Ben Santos', email: 'ben@example.com' }
  ]);

  assert.equal(result.length, 1);
  assert.equal(result[0].row, 3);
  assert.equal(result[0].duplicateOf, 2);
});

test('rejects rows without a full name', () => {
  const result = validateGuestData([
    { full_name: '', email: 'guest@example.com', contact_number: '' }
  ]);

  assert.equal(result.validRows, 0);
  assert.equal(result.invalidRows, 1);
  assert.equal(result.errors[0].errors[0], 'Full Name is required');
});
