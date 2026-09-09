const express = require('express');
const router = express.Router();
const controller = require('../controllers/eventPortalController');
const { authenticateToken } = require('../../middleware/auth');
const { authorizePortalEvent } = require('../../middleware/authorization');

const portalAccess = [
  authenticateToken,
  authorizePortalEvent({ field: 'eventIdentifier' })
];

router.get('/:eventIdentifier', ...portalAccess, controller.getPortal);
router.get('/:eventIdentifier/guests', ...portalAccess, controller.getGuests);
router.get('/:eventIdentifier/reports', ...portalAccess, controller.getReport);

module.exports = router;
