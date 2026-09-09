const express = require('express');
const router = express.Router();
const controller = require('../controllers/eventAccessController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { validateCSRFToken } = require('../../middleware/csrf');

const adminOnly = [authenticateToken, validateCSRFToken, authorizeRole('super_admin', 'admin')];

router.get('/events/:eventId', authenticateToken, authorizeRole('super_admin', 'admin'), controller.getKit);
router.patch('/events/:eventId/endorsement', ...adminOnly, controller.updateEndorsement);
router.post('/events/:eventId/facilitators', ...adminOnly, controller.issueFacilitator);
router.patch('/facilitators/:accessId/status', ...adminOnly, controller.updateFacilitatorStatus);
router.post('/facilitators/:accessId/regenerate', ...adminOnly, controller.regenerateFacilitator);
router.post('/facilitators/:accessId/revoke', ...adminOnly, (req, res, next) => {
  req.body.status = 'revoked';
  controller.updateFacilitatorStatus(req, res, next);
});

module.exports = router;
