const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { validateCSRFToken } = require('../../middleware/csrf');

router.get('/', settingsController.getSettings);
router.put('/', authenticateToken, validateCSRFToken, authorizeRole('super_admin'), settingsController.updateSettings);

module.exports = router;
