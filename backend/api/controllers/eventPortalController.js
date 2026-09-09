const db = require('../../db/config/database');
const { normalizedRole, ROLE } = require('../../middleware/authorization');
const { resolveEventBranding } = require('../../utils/branding');

function parseJson(value, fallback = {}) {
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function getPortalRole(req, assignmentRows) {
  const role = normalizedRole(req.user);
  if (role === ROLE.MASTER_ADMIN) return ROLE.MASTER_ADMIN;
  if (role === ROLE.CLIENT_ADMIN) return ROLE.CLIENT_ADMIN;
  return assignmentRows[0]?.role || role;
}

async function getPortalContext(eventId, req) {
  const [events] = await db.execute(
    `SELECT e.id, e.client_id, e.event_name, e.event_code, e.event_slug, e.event_date,
            e.event_time, e.venue, e.description, e.status, e.registration_open,
            e.max_capacity, e.registration_form_config, e.event_logo, e.event_banner,
            e.client_name, e.font_style, e.font_size,
            c.name AS client_name_from_record, c.slug AS client_slug, c.branding_config
     FROM events e
     JOIN clients c ON c.id = e.client_id
     WHERE e.id = ?`,
    [eventId]
  );
  if (!events[0]) return null;

  const [assignments] = await db.execute(
    `SELECT role, permissions_json FROM event_user_assignments
     WHERE event_id = ? AND user_id = ?`,
    [eventId, req.user.id]
  );

  const event = events[0];
  const registrationConfig = parseJson(event.registration_form_config);
  const branding = resolveEventBranding({
    clientBranding: event.branding_config,
    eventBranding: registrationConfig.branding,
    clientName: event.client_name || event.client_name_from_record,
    eventName: event.event_name,
    eventLogo: event.event_logo,
    eventBanner: event.event_banner
  });

  const [statsRows] = await db.execute(
    `SELECT COUNT(*) AS registered,
            SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) AS attended,
            SUM(CASE WHEN attended = 0 THEN 1 ELSE 0 END) AS not_attended
     FROM guests WHERE event_id = ?`,
    [eventId]
  );

  const [facilitators] = await db.execute(
    `SELECT u.id, u.username, u.email, u.full_name, eu.role
     FROM event_user_assignments eu JOIN admin_users u ON u.id = eu.user_id
     WHERE eu.event_id = ? AND eu.role = 'FACILITATOR' AND u.active = 1
     ORDER BY u.full_name, u.username`,
    [eventId]
  );
  const [qcUsers] = await db.execute(
    `SELECT u.id, u.username, u.email, u.full_name, eu.role
     FROM event_user_assignments eu JOIN admin_users u ON u.id = eu.user_id
     WHERE eu.event_id = ? AND eu.role = 'QC' AND u.active = 1
     ORDER BY u.full_name, u.username`,
    [eventId]
  );

  const portalRole = getPortalRole(req, assignments);
  const canViewGuests = [ROLE.MASTER_ADMIN, ROLE.CLIENT_ADMIN, 'QC', 'CLIENT_ADMIN', 'FACILITATOR'].includes(portalRole);
  const canViewReports = canViewGuests;
  const canManageAssignments = [ROLE.MASTER_ADMIN, ROLE.CLIENT_ADMIN].includes(portalRole);
  const canCheckIn = canViewGuests;

  return {
    event: {
      id: event.id,
      client_id: event.client_id,
      client_slug: event.client_slug,
      event_name: event.event_name,
      event_code: event.event_code,
      event_slug: event.event_slug,
      event_date: event.event_date,
      event_time: event.event_time,
      venue: event.venue,
      description: event.description,
      status: event.status,
      registration_open: Boolean(event.registration_open),
      max_capacity: event.max_capacity,
      registration_url: `/pages/index.html?event=${encodeURIComponent(event.event_code)}`,
      branding,
      registration_config: registrationConfig
    },
    stats: {
      registered: Number(statsRows[0]?.registered || 0),
      attended: Number(statsRows[0]?.attended || 0),
      not_attended: Number(statsRows[0]?.not_attended || 0)
    },
    access: {
      role: portalRole,
      can_view_guests: canViewGuests,
      can_view_reports: canViewReports,
      can_check_in: canCheckIn,
      can_manage_assignments: canManageAssignments
    },
    facilitators: canManageAssignments ? facilitators : [],
    qc_users: canManageAssignments ? qcUsers : []
  };
}

exports.getPortal = async (req, res) => {
  const context = await getPortalContext(req.eventScope.id, req);
  if (!context) return res.status(404).json({ success: false, message: 'Event portal not found' });
  res.json({ success: true, portal: context });
};

exports.getGuests = async (req, res) => {
  const search = String(req.query.search || '').trim().slice(0, 100);
  const status = req.query.status;
  let query = `SELECT id, event_id, guest_code, full_name, email, contact_number,
                      address, home_address, company, company_name, guest_category,
                      registration_status, attendance_status, attended, check_in_time,
                      checked_in_by, created_at
               FROM guests WHERE event_id = ?`;
  const params = [req.eventScope.id];
  if (search) {
    query += ' AND (full_name LIKE ? OR email LIKE ? OR guest_code LIKE ? OR company_name LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }
  if (status === 'attended') query += " AND (attendance_status = 'ATTENDED' OR attended = 1)";
  if (status === 'not_attended') query += " AND attendance_status = 'NOT_ATTENDED' AND attended = 0";
  query += ' ORDER BY created_at DESC LIMIT 200';
  const [guests] = await db.execute(query, params);
  res.json({ success: true, guests });
};

exports.getReport = async (req, res) => {
  const [rows] = await db.execute(
    `SELECT DATE(check_in_time) AS day, COUNT(*) AS check_ins
     FROM guests WHERE event_id = ? AND attended = 1
     GROUP BY DATE(check_in_time) ORDER BY day ASC`,
    [req.eventScope.id]
  );
  res.json({ success: true, report: { check_ins_by_day: rows } });
};
