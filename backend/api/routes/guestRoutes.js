const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const { authenticateToken } = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');
const { validateCSRFToken } = require('../../middleware/csrf');

const uploadGuestFile = (req, res, next) => {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();

    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    return res.status(status).json({
      success: false,
      message: error.code === 'LIMIT_FILE_SIZE'
        ? 'File is too large. Maximum size is 5 MB.'
        : error.message || 'Invalid upload file'
    });
  });
};

// Public routes
router.post('/register', validateCSRFToken, guestController.selfRegister);
router.get('/verify', authenticateToken, guestController.getGuestByQR);
router.post('/checkin', authenticateToken, guestController.checkIn);

// Protected routes
router.post('/add', authenticateToken, guestController.addGuestManual);

router.post('/upload-excel',
  authenticateToken,
  uploadGuestFile,
  guestController.uploadExcel
);

router.get('/event/:event_id', authenticateToken, guestController.getGuestsByEvent);
router.get('/event/:event_id/stats', authenticateToken, guestController.getEventStats);
router.get('/event/:eventId/export', authenticateToken, guestController.exportGuestList);
router.post('/:id/resend-ticket', authenticateToken, guestController.resendTicket);
router.put('/:id', authenticateToken, guestController.updateGuest);
router.delete('/:id', authenticateToken, guestController.deleteGuest);

module.exports = router;
