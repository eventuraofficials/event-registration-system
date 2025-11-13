const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, authorizeRole } = require('../middleware/auth');

// Public routes
router.post('/login', adminController.login);

// Protected routes
router.get('/profile', authenticateToken, adminController.getProfile);
router.post('/refresh-token', authenticateToken, adminController.refreshToken);

// Super admin only
router.post('/create',
  authenticateToken,
  authorizeRole('super_admin'),
  adminController.createAdmin
);

module.exports = router;
