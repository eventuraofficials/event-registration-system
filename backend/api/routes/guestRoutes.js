const express = require('express');
const router = express.Router();
const guestController = require('../controllers/guestController');
const { authenticateToken } = require('../../middleware/auth');
const { upload } = require('../../middleware/upload');
const { validateCSRFToken } = require('../../middleware/csrf');
const { authorizeEventAccess, authorizeGuestAccess, authorizeEventRole, ROLE } = require('../../middleware/authorization');

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
router.get('/verify', authenticateToken, authorizeEventAccess({ source: 'query', field: 'event_id' }), guestController.getGuestByQR);
router.post('/checkin', authenticateToken, validateCSRFToken, authorizeEventAccess({ source: 'body', field: 'event_id' }), guestController.checkIn);

// Protected routes
router.post('/add', authenticateToken, validateCSRFToken, authorizeEventAccess({ source: 'body', field: 'event_id' }), guestController.addGuestManual);

router.post('/upload-excel',
  authenticateToken,
  validateCSRFToken,
  authorizeEventAccess({ source: 'body', field: 'event_id' }),
  uploadGuestFile,
  guestController.uploadExcel
);

router.get('/event/:event_id', authenticateToken, authorizeEventAccess({ field: 'event_id' }), guestController.getGuestsByEvent);
router.get('/event/:event_id/stats', authenticateToken, authorizeEventAccess({ field: 'event_id' }), guestController.getEventStats);
router.get('/event/:eventId/export', authenticateToken, authorizeEventAccess({ field: 'eventId' }), guestController.exportGuestList);
router.get('/event/:eventId/export.pdf', authenticateToken, authorizeEventAccess({ field: 'eventId' }), guestController.exportGuestPdf);
router.post('/:id/resend-ticket', authenticateToken, validateCSRFToken, authorizeGuestAccess(), authorizeEventRole(ROLE.MASTER_ADMIN, ROLE.CLIENT_ADMIN, ROLE.QC), guestController.resendTicket);
router.put('/:id', authenticateToken, validateCSRFToken, authorizeGuestAccess(), authorizeEventRole(ROLE.MASTER_ADMIN, ROLE.CLIENT_ADMIN, ROLE.QC), guestController.updateGuest);
router.delete('/:id', authenticateToken, validateCSRFToken, authorizeGuestAccess(), authorizeEventRole(ROLE.MASTER_ADMIN, ROLE.CLIENT_ADMIN, ROLE.QC), guestController.deleteGuest);

module.exports = router;
