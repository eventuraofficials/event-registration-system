const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const { authenticateToken } = require('../../middleware/auth');
const upload = require('../../middleware/upload');

// Public routes
router.post('/register', guestController.selfRegister);
router.get('/verify', guestController.getGuestByQR);

// Protected routes
router.post('/upload-excel',
  authenticateToken,
  upload.single('file'),
  guestController.uploadExcel
);

router.post('/checkin', authenticateToken, guestController.checkIn);
router.get('/event/:event_id', authenticateToken, guestController.getGuestsByEvent);
router.get('/event/:event_id/stats', authenticateToken, guestController.getEventStats);
router.get('/event/:eventId/export', authenticateToken, guestController.exportGuestList);
router.post('/:id/resend-ticket', authenticateToken, guestController.resendTicket);
router.put('/:id', authenticateToken, guestController.updateGuest);
router.delete('/:id', authenticateToken, guestController.deleteGuest);

module.exports = router;
