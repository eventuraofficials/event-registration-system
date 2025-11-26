
const db = require('../config/database');

/**
 * Security Audit Logger
 * Logs all critical security events
 */

async function logSecurityEvent(event) {
  const {
    userId = null,
    action,
    details = null,
    ipAddress = null,
    userAgent = null,
    status = 'success'
  } = event;

  try {
    const [result] = await db.query(
      `INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [userId, action, JSON.stringify(details), ipAddress, userAgent, status]
    );

    return result;
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

async function logLogin(userId, success, ipAddress, userAgent) {
  return logSecurityEvent({
    userId,
    action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
    details: { timestamp: new Date().toISOString() },
    ipAddress,
    userAgent,
    status: success ? 'success' : 'failed'
  });
}

async function logLogout(userId, ipAddress) {
  return logSecurityEvent({
    userId,
    action: 'LOGOUT',
    ipAddress,
    status: 'success'
  });
}

async function logUnauthorizedAccess(userId, resource, ipAddress) {
  return logSecurityEvent({
    userId,
    action: 'UNAUTHORIZED_ACCESS',
    details: { resource },
    ipAddress,
    status: 'blocked'
  });
}

module.exports = {
  logSecurityEvent,
  logLogin,
  logLogout,
  logUnauthorizedAccess
};
