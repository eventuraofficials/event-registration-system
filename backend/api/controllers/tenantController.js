const db = require('../../db/config/database');
const { normalizedRole, ROLE } = require('../../middleware/authorization');

function clean(value, max = 160) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

exports.listClients = async (req, res) => {
  const [clients] = await db.execute(
    `SELECT c.id, c.name, c.slug, c.status, c.branding_config, c.created_at, c.updated_at,
            COUNT(DISTINCT e.id) AS event_count
     FROM clients c
     LEFT JOIN events e ON e.client_id = c.id
     GROUP BY c.id
     ORDER BY c.name ASC`
  );
  res.json({ success: true, clients });
};

exports.createClient = async (req, res) => {
  const name = clean(req.body.name);
  const slug = clean(req.body.slug, 100).toLowerCase();
  if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return res.status(400).json({ success: false, message: 'Name and a valid slug are required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO clients (name, slug, status, branding_config) VALUES (?, ?, ?, ?)',
      [name, slug, 'active', req.body.branding_config ? JSON.stringify(req.body.branding_config) : null]
    );
    res.status(201).json({ success: true, client: { id: result.insertId, name, slug, status: 'active' } });
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) {
      return res.status(409).json({ success: false, message: 'Client slug already exists' });
    }
    throw error;
  }
};

exports.getClientBranding = async (req, res) => {
  const clientId = Number(req.params.clientId);
  const [rows] = await db.execute('SELECT id, name, slug, branding_config FROM clients WHERE id = ?', [clientId]);
  if (!rows[0]) return res.status(404).json({ success: false, message: 'Client not found' });
  let branding = {};
  try { branding = JSON.parse(rows[0].branding_config || '{}'); } catch {}
  res.json({ success: true, client: { id: rows[0].id, name: rows[0].name, slug: rows[0].slug }, branding });
};

exports.updateClientBranding = async (req, res) => {
  const clientId = Number(req.params.clientId);
  const branding = req.body.branding && typeof req.body.branding === 'object' ? req.body.branding : req.body;
  await db.execute('UPDATE clients SET branding_config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [JSON.stringify(branding), clientId]);
  res.json({ success: true, message: 'Client branding saved' });
};

exports.assignClientUser = async (req, res) => {
  const clientId = Number(req.params.clientId);
  const userId = Number(req.body.user_id);
  const role = clean(req.body.role, 40).toUpperCase();
  if (!Number.isInteger(clientId) || !Number.isInteger(userId) || role !== 'CLIENT_ADMIN') {
    return res.status(400).json({ success: false, message: 'Valid client, user, and CLIENT_ADMIN role are required' });
  }
  const [clients] = await db.execute('SELECT id FROM clients WHERE id = ?', [clientId]);
  const [users] = await db.execute('SELECT id FROM admin_users WHERE id = ? AND active = 1', [userId]);
  if (!clients.length || !users.length) return res.status(404).json({ success: false, message: 'Client or user not found' });
  await db.execute(
    `INSERT INTO client_user_assignments (client_id, user_id, role) VALUES (?, ?, ?)
     ON CONFLICT(client_id, user_id) DO UPDATE SET role = excluded.role`,
    [clientId, userId, role]
  );
  await db.execute('UPDATE admin_users SET client_id = ? WHERE id = ?', [clientId, userId]);
  res.json({ success: true, message: 'User assigned to client' });
};

exports.assignEventUser = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const userId = Number(req.body.user_id);
  const role = clean(req.body.role, 40).toUpperCase();
  if (!Number.isInteger(eventId) || !Number.isInteger(userId) || !['CLIENT_ADMIN', 'QC', 'FACILITATOR'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Valid event, user, and event role are required' });
  }
  const [events] = await db.execute('SELECT id, client_id FROM events WHERE id = ?', [eventId]);
  const [users] = await db.execute('SELECT id FROM admin_users WHERE id = ? AND active = 1', [userId]);
  if (!events.length || !users.length) return res.status(404).json({ success: false, message: 'Event or user not found' });
  if (role === 'CLIENT_ADMIN' && normalizedRole(req.user) !== ROLE.MASTER_ADMIN) {
    return res.status(403).json({ success: false, message: 'Only the master admin can assign client administrators to events' });
  }
  if (normalizedRole(req.user) !== ROLE.MASTER_ADMIN) {
    const [clientUsers] = await db.execute(
      `SELECT 1 FROM client_user_assignments WHERE client_id = ? AND user_id = ?`,
      [events[0].client_id, userId]
    );
    if (!clientUsers.length) return res.status(403).json({ success: false, message: 'User must be assigned to this client first' });
  }
  await db.execute(
    `INSERT INTO event_user_assignments (event_id, user_id, role, permissions_json) VALUES (?, ?, ?, ?)
     ON CONFLICT(event_id, user_id) DO UPDATE SET role = excluded.role, permissions_json = excluded.permissions_json`,
    [eventId, userId, role, req.body.permissions ? JSON.stringify(req.body.permissions) : null]
  );
  res.json({ success: true, message: 'User assigned to event' });
};

exports.listEventAssignments = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const [assignments] = await db.execute(
    `SELECT eu.event_id, eu.user_id, eu.role, eu.permissions_json, u.username, u.email, u.full_name
     FROM event_user_assignments eu JOIN admin_users u ON u.id = eu.user_id
     WHERE eu.event_id = ? ORDER BY u.full_name, u.username`,
    [eventId]
  );
  res.json({ success: true, assignments });
};

exports.listAssignableEventUsers = async (req, res) => {
  const eventId = Number(req.params.eventId);
  const [events] = await db.execute('SELECT client_id FROM events WHERE id = ?', [eventId]);
  if (!events[0]) return res.status(404).json({ success: false, message: 'Event not found' });
  const role = normalizedRole(req.user);
  const params = [events[0].client_id, role];
  const clientFilter = role === ROLE.MASTER_ADMIN ? '' : 'AND cua.client_id = ?';
  if (role !== ROLE.MASTER_ADMIN) params.push(events[0].client_id);
  const [users] = await db.execute(
    `SELECT DISTINCT u.id, u.full_name, u.username, u.email, u.role AS account_role
     FROM admin_users u
     LEFT JOIN client_user_assignments cua ON cua.user_id = u.id
     WHERE u.active = 1 AND u.role <> 'super_admin' ${clientFilter}
     ORDER BY u.full_name, u.username`,
    params
  );
  res.json({ success: true, users });
};
