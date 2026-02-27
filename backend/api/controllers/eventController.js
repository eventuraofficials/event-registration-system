const db = require('../../db/config/database');
/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(String(email).toLowerCase());
}

/**
 * Sanitize string input
 */
function sanitizeString(str, maxLength = 255) {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
}

const QRCode = require('qrcode');

/**
 * Get available events (public - for registration page dropdown)
 */
exports.getAvailableEvents = async (req, res) => {
  try {
    const [events] = await db.execute(
      `SELECT
        id,
        event_name,
        event_code,
        event_date,
        event_time,
        venue,
        registration_open
      FROM events
      WHERE registration_open = 1
      ORDER BY event_date ASC`
    );

    res.json({
      success: true,
      events
    });

  } catch (error) {
    console.error('Get available events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Create new event
 */
exports.createEvent = async (req, res) => {
  try {
    let { event_name, event_code, event_date, event_time, venue, description, max_capacity, registration_open } = req.body;

    // Sanitize inputs
    event_name = sanitizeString(event_name, 255);
    event_code = sanitizeString(event_code, 50);
    venue = sanitizeString(venue, 255);
    description = sanitizeString(description, 1000);

    // Validate event_code format (alphanumeric, dash, underscore only)
    if (!/^[a-zA-Z0-9_-]+$/.test(event_code)) {
      return res.status(400).json({
        success: false,
        message: 'Event code can only contain letters, numbers, dashes, and underscores'
      });
    }

    // Enhanced input validation
    if (!event_name || !event_code || !event_date) {
      return res.status(400).json({
        success: false,
        message: 'Event name, code, and date are required'
      });
    }

    // Check if event code already exists
    const [existing] = await db.execute(
      'SELECT id FROM events WHERE event_code = ?',
      [event_code]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Event code already exists'
      });
    }

    // Generate Event QR Code (contains registration URL)
    // Auto-detect production URL if APP_URL not set
    let baseURL;
    if (process.env.APP_URL) {
      baseURL = process.env.APP_URL.trim(); // Remove any whitespace/newlines
    } else if (process.env.RENDER) {
      // Render.com environment - use RENDER_EXTERNAL_URL
      baseURL = process.env.RENDER_EXTERNAL_URL || 'https://event-registration-system-vaj3.onrender.com';
    } else {
      baseURL = 'http://localhost:5000';
    }

    const registrationURL = `${baseURL}/index.html?event=${event_code}`;
    console.log('Generated registration URL:', registrationURL);

    const eventQRCode = await QRCode.toDataURL(registrationURL, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Insert event
    const [result] = await db.execute(
      `INSERT INTO events (
        event_name, event_code, event_qr_code, event_date, event_time,
        venue, description, max_capacity, registration_open, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        event_name,
        event_code,
        eventQRCode,
        event_date,
        event_time || null,
        venue || null,
        description || null,
        max_capacity || null,
        registration_open !== undefined ? (registration_open ? 1 : 0) : 1, // Default to open (1)
        req.user.id
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      event: {
        id: result.insertId,
        event_name,
        event_code,
        event_qr_code: eventQRCode,
        registration_url: registrationURL
      }
    });

  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get all events
 */
exports.getAllEvents = async (req, res) => {
  try {
    const [events] = await db.execute(
      `SELECT
        e.*,
        a.full_name as created_by_name,
        COUNT(g.id) as total_guests,
        SUM(CASE WHEN g.attended = 1 THEN 1 ELSE 0 END) as total_attended
      FROM events e
      LEFT JOIN admin_users a ON e.created_by = a.id
      LEFT JOIN guests g ON e.id = g.event_id
      GROUP BY e.id
      ORDER BY e.event_date DESC`
    );

    res.json({
      success: true,
      count: events.length,
      events
    });

  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get single event by ID
 */
exports.getEventById = async (req, res) => {
  try {
    const { id } = req.params;

    const [events] = await db.execute(
      `SELECT
        e.*,
        a.full_name as created_by_name
      FROM events e
      LEFT JOIN admin_users a ON e.created_by = a.id
      WHERE e.id = ?`,
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      event: events[0]
    });

  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get event by code (for public registration)
 */
exports.getEventByCode = async (req, res) => {
  try {
    const { event_code } = req.params;

    const [events] = await db.execute(
      `SELECT
        id, event_name, event_code, event_date,
        event_time, venue, description, registration_open, registration_form_config
      FROM events
      WHERE event_code = ?`,
      [event_code]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Parse form config if it exists
    const event = events[0];
    if (event.registration_form_config) {
      try {
        event.registration_form_config = JSON.parse(event.registration_form_config);
      } catch (e) {
        // If parsing fails, use default config
        event.registration_form_config = {
          fields: {
            full_name: { enabled: true, required: true, label: 'Full Name' },
            email: { enabled: true, required: true, label: 'Email Address' },
            contact_number: { enabled: true, required: true, label: 'Contact Number' },
            home_address: { enabled: true, required: false, label: 'Home Address' },
            company_name: { enabled: true, required: false, label: 'Company Name' },
            guest_category: { enabled: true, required: false, label: 'Guest Category' }
          },
          custom_fields: []
        };
      }
    }

    res.json({
      success: true,
      event
    });

  } catch (error) {
    console.error('Get event by code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Update event
 */
exports.updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const { event_name, event_date, event_time, venue, description, registration_open, max_capacity, registration_form_config } = req.body;

    console.log('🔍 Update Event Debug:', {
      id,
      event_name,
      has_form_config: !!registration_form_config,
      req_body: req.body
    });

    // Check if request body is empty
    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }

    // If only updating form config (no event_name provided), do partial update
    if (!event_name && registration_form_config) {
      console.log('✅ Using PARTIAL UPDATE (form config only)');
      const formConfigString = JSON.stringify(registration_form_config);

      const [result] = await db.execute(
        `UPDATE events SET registration_form_config = ? WHERE id = ?`,
        [formConfigString, id]
      );

      console.log('📊 SQLite result:', result);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Event not found'
        });
      }

      return res.json({
        success: true,
        message: 'Form configuration updated successfully'
      });
    }

    // Validate required fields for full update
    if (!event_name || !event_date) {
      return res.status(400).json({
        success: false,
        message: 'event_name and event_date are required for event update'
      });
    }

    console.log('⚠️ Using FULL UPDATE');

    // Full event update
    const formConfigString = registration_form_config
      ? JSON.stringify(registration_form_config)
      : null;

    const [result] = await db.execute(
      `UPDATE events SET
        event_name = ?,
        event_date = ?,
        event_time = ?,
        venue = ?,
        description = ?,
        registration_open = COALESCE(?, registration_open),
        max_capacity = ?,
        registration_form_config = COALESCE(?, registration_form_config)
      WHERE id = ?`,
      [event_name, event_date, event_time || null, venue || null, description || null,
       registration_open, max_capacity || null, formConfigString, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event updated successfully'
    });

  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Delete event
 */
exports.deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute('DELETE FROM events WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Event deleted successfully'
    });

  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Toggle registration status
 */
exports.toggleRegistration = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute(
      'UPDATE events SET registration_open = NOT registration_open WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.json({
      success: true,
      message: 'Registration status updated'
    });

  } catch (error) {
    console.error('Toggle registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get all events for check-in (returns ALL events, not just registration_open ones)
 */
exports.getAllEventsForCheckIn = async (req, res) => {
  try {
    const [events] = await db.execute(
      `SELECT
        id,
        event_name,
        event_code,
        event_date,
        event_time,
        venue,
        registration_open
      FROM events
      ORDER BY event_date DESC`
    );

    res.json({
      success: true,
      events
    });

  } catch (error) {
    console.error('Get all events for check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Clone/duplicate an event
 */
exports.cloneEvent = async (req, res) => {
  try {
    const { id } = req.params;

    const [events] = await db.execute('SELECT * FROM events WHERE id = ?', [id]);
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const src = events[0];
    const newCode = src.event_code + '_COPY' + Date.now().toString().slice(-4);
    const newName = src.event_name + ' (Copy)';

    // Generate new QR code for the cloned event
    let baseURL = process.env.APP_URL || 'http://localhost:5000';
    const registrationURL = `${baseURL}/pages/index.html?event=${newCode}`;
    const eventQRCode = await QRCode.toDataURL(registrationURL, {
      errorCorrectionLevel: 'H', type: 'image/png', width: 400, margin: 2
    });

    const [result] = await db.execute(
      `INSERT INTO events (event_name, event_code, event_qr_code, event_date, event_time,
        venue, description, max_capacity, registration_open, registration_form_config, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [newName, newCode, eventQRCode, src.event_date, src.event_time,
       src.venue, src.description, src.max_capacity,
       src.registration_form_config, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Event cloned successfully',
      event: { id: result.insertId, event_name: newName, event_code: newCode }
    });
  } catch (error) {
    console.error('Clone event error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = exports;
