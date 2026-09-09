const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCSRFToken } = require('../backend/middleware/csrf');

function responseMock() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('CSRF middleware rejects cookie-authenticated mutations without a matching token', () => {
  const response = responseMock();
  validateCSRFToken({ method: 'POST', headers: {}, cookies: {}, body: {} }, response, () => {
    throw new Error('request should be rejected');
  });
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.message, 'CSRF token missing');
});

test('CSRF middleware accepts bearer-token mutations', () => {
  const response = responseMock();
  let continued = false;
  validateCSRFToken({ method: 'POST', headers: { authorization: 'Bearer token' }, cookies: {}, body: {} }, response, () => {
    continued = true;
  });
  assert.equal(continued, true);
});
