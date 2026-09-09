const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { imageUpload } = require('../../middleware/upload');
const { validateCSRFToken } = require('../../middleware/csrf');
const { authorizeEventAccess } = require('../../middleware/authorization');
const facilitatorController = require('../controllers/facilitatorController');

// Public routes
router.get('/checkin-available', authenticateToken, eventController.getAllEventsForCheckIn); // Assigned events only
router.get('/public/:event_code', eventController.getEventByCode);

// Protected routes (Admin only)
router.post('/',
  authenticateToken,
  validateCSRFToken,
  authorizeRole('super_admin', 'admin'),
  eventController.createEvent
);

router.get('/', authenticateToken, eventController.getAllEvents);
router.get('/:id', authenticateToken, authorizeEventAccess(), eventController.getEventById);

router.put('/:id',
  authenticateToken,
  validateCSRFToken,
  authorizeEventAccess(),
  authorizeRole('super_admin', 'admin'),
  eventController.updateEvent
);

router.delete('/:id',
  authenticateToken,
  validateCSRFToken,
  authorizeEventAccess(),
  authorizeRole('super_admin', 'admin'),
  eventController.deleteEvent
);

router.patch('/:id/toggle-registration',
  authenticateToken,
  validateCSRFToken,
  authorizeEventAccess(),
  authorizeRole('super_admin', 'admin'),
  eventController.toggleRegistration
);

router.post('/:id/clone',
  authenticateToken,
  validateCSRFToken,
  authorizeEventAccess(),
  authorizeRole('super_admin', 'admin'),
  eventController.cloneEvent
);

router.post('/:id/logo',
  authenticateToken,
  validateCSRFToken,
  authorizeEventAccess(),
  authorizeRole('super_admin', 'admin'),
  imageUpload.single('logo'),
  eventController.uploadEventLogo
);

router.post('/:id/facilitator-access',
  authenticateToken,
  validateCSRFToken,
  authorizeEventAccess(),
  authorizeRole('super_admin', 'admin'),
  facilitatorController.issueAccessLink
);

router.put('/:id/branding',
  authenticateToken,
  validateCSRFToken,
  authorizeEventAccess(),
  authorizeRole('super_admin', 'admin'),
  eventController.updateEventBranding
);

module.exports = router;
