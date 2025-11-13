const db = require('../config/database');
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
    console.log('📥 CREATE EVENT - Request body:', JSON.stringify(req.body, null, 2));

    const { event_name, event_code, event_date, event_time, venue, description, max_capacity, registration_open } = req.body;

    console.log('📋 Extracted fields:', { event_name, event_code, event_date });

    // Validate required fields
    if (!event_name || !event_code || !event_date) {
      console.log('❌ Validation failed - Missing fields:', {
        has_event_name: !!event_name,
        has_event_code: !!event_code,
        has_event_date: !!event_date
      });
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
    const registrationURL = `${process.env.APP_URL || 'http://localhost:5000'}/index.html?event=${event_code}`;
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

module.exports = exports;
