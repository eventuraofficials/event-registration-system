const jwt = require('jsonwebtoken');
const db = require('../db/config/database');

/**
 * Verify JWT token middleware
 */
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const user = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.execute(
      'SELECT id, username, email, full_name, role, client_id, active, auth_version FROM admin_users WHERE id = ?',
      [user.id]
    );
    const currentUser = users[0];
    if (!currentUser || !currentUser.active || Number(currentUser.auth_version || 1) !== Number(user.auth_version || 1)) {
      return res.status(403).json({ success: false, message: 'Invalid or revoked token' });
    }
    req.user = currentUser;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Check if user has required role
 */
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
};
