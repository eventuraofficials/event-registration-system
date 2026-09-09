const db = require('../db/config/database');

const ROLE = Object.freeze({
  MASTER_ADMIN: 'MASTER_ADMIN',
  CLIENT_ADMIN: 'CLIENT_ADMIN',
  QC: 'QC',
  FACILITATOR: 'FACILITATOR'
});

function normalizedRole(user) {
  if (!user) return '';
  if (user.role === 'super_admin') return ROLE.MASTER_ADMIN;
  if (user.role === 'admin') return ROLE.CLIENT_ADMIN;
  if (user.role === 'staff') return ROLE.FACILITATOR;
  return String(user.role || '').toUpperCase();
}

function eventIdFromRequest(req, source = 'params', field = 'id') {
  const values = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
  const value = values?.[field];
  const eventId = Number(value);
  return Number.isInteger(eventId) && eventId > 0 ? eventId : null;
}

async function getEventScope(eventId) {
  if (!eventId) return null;
  const [rows] = await db.execute(
    'SELECT id, client_id FROM events WHERE id = ?',
    [eventId]
  );
  return rows[0] || null;
}

async function canAccessClient(user, clientId) {
  if (normalizedRole(user) === ROLE.MASTER_ADMIN) return true;
  const [assignments] = await db.execute(
    'SELECT 1 FROM client_user_assignments WHERE client_id = ? AND user_id = ?',
    [clientId, user.id]
  );
  return assignments.length > 0;
}

async function canAccessEvent(user, eventId) {
  const event = await getEventScope(eventId);
  if (!event) return { allowed: false, status: 404, message: 'Event not found' };

  const role = normalizedRole(user);
  if (role === ROLE.MASTER_ADMIN) return { allowed: true, event };

  if (role === ROLE.CLIENT_ADMIN && await canAccessClient(user, event.client_id)) {
    const [assignments] = await db.execute(
      `SELECT 1 FROM event_user_assignments
       WHERE event_id = ? AND user_id = ? AND role IN ('CLIENT_ADMIN', 'admin')`,
      [eventId, user.id]
    );
    if (assignments.length > 0 || await canAccessClient(user, event.client_id)) {
      return { allowed: true, event };
    }
  }

  const [assignments] = await db.execute(
    `SELECT 1 FROM event_user_assignments
     WHERE event_id = ? AND user_id = ? AND role IN ('CLIENT_ADMIN', 'QC', 'FACILITATOR', 'admin', 'staff')`,
    [eventId, user.id]
  );
  if (assignments.length > 0) return { allowed: true, event };

  return { allowed: false, status: 403, message: 'You are not authorized to access this event' };
}

function authorizeEventAccess({ source = 'params', field = 'id' } = {}) {
  return async (req, res, next) => {
    try {
      const eventId = eventIdFromRequest(req, source, field);
      if (!eventId) return res.status(400).json({ success: false, message: 'Valid event ID is required' });
      const result = await canAccessEvent(req.user, eventId);
      if (!result.allowed) return res.status(result.status).json({ success: false, message: result.message });
      req.eventScope = result.event;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function authorizePortalEvent({ source = 'params', field = 'eventIdentifier' } = {}) {
  return async (req, res, next) => {
    try {
      const values = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const identifier = String(values?.[field] || '').trim();
      if (!identifier || !/^[a-zA-Z0-9_-]{3,120}$/.test(identifier)) {
        return res.status(404).json({ success: false, message: 'Event portal not found' });
      }
      const [events] = await db.execute(
        'SELECT id, client_id FROM events WHERE event_slug = ? OR event_code = ? LIMIT 1',
        [identifier, identifier]
      );
      if (!events[0]) return res.status(404).json({ success: false, message: 'Event portal not found' });
      const result = await canAccessEvent(req.user, events[0].id);
      if (!result.allowed) return res.status(403).json({ success: false, message: 'You are not authorized to access this event portal' });
      req.eventScope = result.event;
      req.portalEventIdentifier = identifier;
      next();
    } catch (error) {
      next(error);
    }
  };
}

function authorizeGuestAccess({ source = 'params', field = 'id' } = {}) {
  return async (req, res, next) => {
    try {
      const values = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const guestId = Number(values?.[field]);
      if (!Number.isInteger(guestId) || guestId < 1) {
        return res.status(400).json({ success: false, message: 'Valid guest ID is required' });
      }
      const [guests] = await db.execute('SELECT event_id FROM guests WHERE id = ?', [guestId]);
      if (!guests[0]) return res.status(404).json({ success: false, message: 'Guest not found' });
      const result = await canAccessEvent(req.user, guests[0].event_id);
      if (!result.allowed) return res.status(result.status).json({ success: false, message: result.message });
      req.eventScope = result.event;
      req.guestScope = { id: guestId, event_id: guests[0].event_id };
      next();
    } catch (error) {
      next(error);
    }
  };
}

function authorizeEventRole(...allowedRoles) {
  return async (req, res, next) => {
    const role = normalizedRole(req.user);
    if (allowedRoles.includes(role) || (role === ROLE.MASTER_ADMIN && allowedRoles.includes(ROLE.MASTER_ADMIN))) return next();
    if (req.eventScope?.id && allowedRoles.includes(ROLE.QC)) {
      const [assignments] = await db.execute(
        `SELECT 1 FROM event_user_assignments
         WHERE event_id = ? AND user_id = ? AND role = 'QC'`,
        [req.eventScope.id, req.user.id]
      );
      if (assignments.length > 0) return next();
    }
    return res.status(403).json({ success: false, message: 'You do not have permission for this event action' });
  };
}

function authorizeClientAccess({ source = 'params', field = 'clientId' } = {}) {
  return async (req, res, next) => {
    try {
      const values = source === 'body' ? req.body : source === 'query' ? req.query : req.params;
      const clientId = Number(values?.[field]);
      if (!Number.isInteger(clientId) || clientId < 1) {
        return res.status(400).json({ success: false, message: 'Valid client ID is required' });
      }
      if (await canAccessClient(req.user, clientId)) {
        req.clientScope = { id: clientId };
        return next();
      }
      return res.status(403).json({ success: false, message: 'You are not authorized to access this client' });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  ROLE,
  normalizedRole,
  getEventScope,
  canAccessClient,
  canAccessEvent,
  authorizeEventAccess,
  authorizePortalEvent,
  authorizeGuestAccess,
  authorizeEventRole,
  authorizeClientAccess
};
