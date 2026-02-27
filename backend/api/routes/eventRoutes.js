const express = require('express');
const router = express.Router();
const eventController = require('../controllers/eventController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');

// Public routes
router.get('/available', eventController.getAvailableEvents);
router.get('/checkin-available', eventController.getAllEventsForCheckIn); // For check-in page - shows ALL events
router.get('/public/:event_code', eventController.getEventByCode);

// Protected routes (Admin only)
router.post('/',
  authenticateToken,
  authorizeRole('super_admin', 'admin'),
  eventController.createEvent
);

router.get('/', authenticateToken, eventController.getAllEvents);
router.get('/:id', authenticateToken, eventController.getEventById);

router.put('/:id',
  authenticateToken,
  authorizeRole('super_admin', 'admin'),
  eventController.updateEvent
);

router.delete('/:id',
  authenticateToken,
  authorizeRole('super_admin', 'admin'),
  eventController.deleteEvent
);

router.patch('/:id/toggle-registration',
  authenticateToken,
  authorizeRole('super_admin', 'admin'),
  eventController.toggleRegistration
);

router.post('/:id/clone',
  authenticateToken,
  authorizeRole('super_admin', 'admin'),
  eventController.cloneEvent
);

module.exports = router;
