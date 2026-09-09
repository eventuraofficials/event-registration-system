const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { validateCSRFToken } = require('../../middleware/csrf');
const { authorizeEventAccess } = require('../../middleware/authorization');
const { authorizeClientAccess } = require('../../middleware/authorization');

router.get('/', authenticateToken, authorizeRole('super_admin'), tenantController.listClients);
router.post('/', authenticateToken, validateCSRFToken, authorizeRole('super_admin'), tenantController.createClient);
router.get('/:clientId/branding', authenticateToken, authorizeClientAccess(), tenantController.getClientBranding);
router.put('/:clientId/branding', authenticateToken, validateCSRFToken, authorizeClientAccess(), authorizeRole('super_admin', 'admin'), tenantController.updateClientBranding);
router.post('/:clientId/users', authenticateToken, validateCSRFToken, authorizeRole('super_admin'), tenantController.assignClientUser);
router.post('/events/:eventId/users', authenticateToken, validateCSRFToken, authorizeEventAccess({ field: 'eventId' }), authorizeRole('super_admin', 'admin'), tenantController.assignEventUser);
router.get('/events/:eventId/users', authenticateToken, authorizeEventAccess({ field: 'eventId' }), authorizeRole('super_admin', 'admin'), tenantController.listEventAssignments);
router.get('/events/:eventId/assignable-users', authenticateToken, authorizeEventAccess({ field: 'eventId' }), authorizeRole('super_admin', 'admin'), tenantController.listAssignableEventUsers);

module.exports = router;
