const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { validateCSRFToken } = require('../../middleware/csrf');

// Public routes (login limiter applied via app.get)
router.post('/login', (req, res, next) => {
  const loginLimiter = req.app.get('loginLimiter');
  if (loginLimiter) return loginLimiter(req, res, next);
  next();
}, adminController.login);

// Protected routes
router.get('/profile', authenticateToken, adminController.getProfile);
router.post('/refresh-token', authenticateToken, adminController.refreshToken);
router.post('/logout', authenticateToken, validateCSRFToken, adminController.logout);
router.post('/change-password', authenticateToken, validateCSRFToken, adminController.changePassword);
router.put('/profile', authenticateToken, validateCSRFToken, adminController.updateProfile);

// Activity logs
router.get('/activity-logs', authenticateToken, adminController.getActivityLogs);

// Email
router.post('/test-email', authenticateToken, validateCSRFToken, authorizeRole('super_admin'), adminController.testEmailConnection);

// Super admin only
router.post('/create', authenticateToken, validateCSRFToken, authorizeRole('super_admin'), adminController.createAdmin);
router.get('/users', authenticateToken, authorizeRole('super_admin'), adminController.listAdmins);
router.delete('/users/:id', authenticateToken, validateCSRFToken, authorizeRole('super_admin'), adminController.deleteAdmin);

module.exports = router;
