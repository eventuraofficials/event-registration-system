const crypto = require('crypto');

/**
 * Modern CSRF Protection using Double Submit Cookie Pattern
 *
 * This implementation doesn't require session storage and is stateless.
 * It uses the double-submit cookie pattern which is secure and scalable.
 *
 * Note: csurf package is deprecated, so we use a custom secure implementation.
 */

/**
 * Generate a secure random CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isSecureRequest(req) {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

/**
 * Middleware to generate and set CSRF token
 * Sets token in both cookie and response header
 */
function setCSRFToken(req, res, next) {
  // Skip if token already exists
  if (req.cookies && req.cookies.csrfToken) {
    return next();
  }

  const token = generateCSRFToken();

  // Set cookie with security flags
  res.cookie('csrfToken', token, {
    httpOnly: false, // Must be accessible by JavaScript
    secure: isSecureRequest(req),
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  // Also attach to request for immediate use
  req.csrfToken = token;

  next();
}

/**
 * Middleware to validate CSRF token on state-changing requests
 * Apply this to POST, PUT, PATCH, DELETE routes
 */
function validateCSRFToken(req, res, next) {
  // Bearer-token requests are not authenticated by browser cookies and are
  // therefore outside the classic CSRF threat model.
  if (req.headers.authorization) return next();

  // Skip for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const cookieToken = req.cookies?.csrfToken;
  const headerToken = req.headers['x-csrf-token'] || req.body?.csrfToken;

  // Validate token exists
  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token missing'
    });
  }

  // Validate tokens match (timing-safe comparison)
  const cookieBuffer = Buffer.from(cookieToken);
  const headerBuffer = Buffer.from(headerToken);
  if (cookieBuffer.length !== headerBuffer.length || !crypto.timingSafeEqual(cookieBuffer, headerBuffer)) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token'
    });
  }

  next();
}

/**
 * Route handler to send CSRF token to client
 */
function sendCSRFToken(req, res) {
  const token = req.csrfToken || req.cookies?.csrfToken || generateCSRFToken();

  // Set cookie if not already set
  if (!req.cookies?.csrfToken) {
    res.cookie('csrfToken', token, {
      httpOnly: false,
      secure: isSecureRequest(req),
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });
  }

  res.json({ csrfToken: token });
}

module.exports = {
  setCSRFToken,
  validateCSRFToken,
  sendCSRFToken,
  generateCSRFToken
};
