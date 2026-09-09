const express = require('express');
const router = express.Router();
const controller = require('../controllers/facilitatorController');
const { authenticateFacilitatorAccess } = require('../../middleware/facilitatorAccess');

const scoped = [authenticateFacilitatorAccess];
router.get('/:accessToken', ...scoped, controller.getPortal);
router.get('/:accessToken/guests', ...scoped, controller.searchGuests);
router.post('/:accessToken/verify', ...scoped, controller.verifyGuest);
router.post('/:accessToken/check-in', ...scoped, controller.checkInGuest);

module.exports = router;
