const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

router.get('/', settingsController.getSettings);
router.put('/', authenticateToken, authorizeRole('super_admin'), settingsController.updateSettings);

module.exports = router;
