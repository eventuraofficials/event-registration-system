const db = require('../config/database');
const { generateGuestCode, generateQRCode } = require('../utils/qrGenerator');
const { parseExcelFile, validateGuestData, checkDuplicates } = require('../utils/excelParser');
const fs = require('fs');

/**
 * Upload Excel file and bulk import guests
 */
exports.uploadExcel = async (req, res) => {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const { event_id } = req.body;

    if (!event_id) {
      return res.status(400).json({
        success: false,
        message: 'Event ID is required'
      });
    }

    filePath = req.file.path;

    // Parse Excel file (now async with exceljs)
    const guests = await parseExcelFile(filePath);

    if (guests.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid guest data found in the file'
      });
    }

    // Validate data
    const validation = validateGuestData(guests);

    if (validation.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        validation
      });
    }

    // Check for duplicates
    const duplicates = checkDuplicates(validation.validGuests);

    // Import guests to database
    const imported = [];
    const failed = [];

    for (const guest of validation.validGuests) {
      try {
        const guestCode = generateGuestCode('PRE');
        const qrCode = await generateQRCode(guestCode, event_id);

        const [result] = await db.execute(
          `INSERT INTO guests (
            event_id, guest_code, qr_code, full_name, email,
            contact_number, home_address, company_name,
            registration_type, registration_source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pre_registered', 'excel_upload')`,
          [
            event_id,
            guestCode,
            qrCode,
            guest.full_name,
            guest.email || null,
            guest.contact_number || null,
            guest.home_address || null,
            guest.company_name || null
          ]
        );

        imported.push({
          id: result.insertId,
          name: guest.full_name,
          guestCode: guestCode
        });

      } catch (error) {
        failed.push({
          name: guest.full_name,
          error: error.message
        });
      }
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: 'Excel file processed successfully',
      summary: {
        totalRows: validation.totalRows,
        imported: imported.length,
        failed: failed.length,
        duplicatesFound: duplicates.length
      },
      imported,
      failed,
      duplicates
    });

  } catch (error) {
    console.error('Excel upload error:', error);

    // Clean up file on error
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(500).json({
      success: false,
      message: 'Failed to process Excel file',
      error: error.message
    });
  }
};

/**
 * Self-registration - Guest registers online
 */
exports.selfRegister = async (req, res) => {
  try {
    const { event_id, full_name, email, contact_number, home_address, company_name, guest_category } = req.body;

    // Validate required fields
    if (!event_id || !full_name || !email || !contact_number) {
      return res.status(400).json({
        success: false,
        message: 'Event ID, full name, email, and contact number are required'
      });
    }

    // Check if event exists and is open for registration
    const [events] = await db.execute(
      'SELECT id, event_name, registration_open, max_capacity FROM events WHERE id = ?',
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (!events[0].registration_open) {
      return res.status(400).json({
        success: false,
        message: 'Registration is currently closed for this event'
      });
    }

    // Check event capacity limit
    if (events[0].max_capacity) {
      const [countResult] = await db.execute(
        'SELECT COUNT(*) as total FROM guests WHERE event_id = ?',
        [event_id]
      );

      if (countResult[0].total >= events[0].max_capacity) {
        return res.status(400).json({
          success: false,
          message: 'Sorry, this event has reached its maximum capacity'
        });
      }
    }

    // Check for duplicate registration
    const [existing] = await db.execute(
      'SELECT id FROM guests WHERE event_id = ? AND email = ?',
      [event_id, email]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    // Generate guest code and QR code
    const guestCode = generateGuestCode('SELF');
    const qrCode = await generateQRCode(guestCode, event_id);

    // Validate guest category
    const validCategories = ['VIP', 'Speaker', 'Sponsor', 'Media', 'Regular'];
    const category = guest_category && validCategories.includes(guest_category) ? guest_category : 'Regular';

    // Insert guest
    const [result] = await db.execute(
      `INSERT INTO guests (
        event_id, guest_code, qr_code, full_name, email,
        contact_number, home_address, company_name, guest_category,
        registration_type, registration_source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'self_registered', 'online_form')`,
      [
        event_id,
        guestCode,
        qrCode,
        full_name,
        email,
        contact_number,
        home_address || null,
        company_name || null,
        category
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your QR code has been generated.',
      guest: {
        id: result.insertId,
        guestCode: guestCode,
        qrCode: qrCode,
        full_name: full_name,
        email: email,
        guest_category: category,
        event_name: events[0].event_name
      }
    });

  } catch (error) {
    console.error('Self registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

/**
 * Get guest by QR code (for check-in)
 */
exports.getGuestByQR = async (req, res) => {
  try {
    const { guest_code, event_id } = req.query;

    if (!guest_code || !event_id) {
      return res.status(400).json({
        success: false,
        message: 'Guest code and event ID are required'
      });
    }

    const [guests] = await db.execute(
      `SELECT
        g.*,
        e.event_name,
        e.event_date,
        a.full_name as checked_in_by_name
      FROM guests g
      JOIN events e ON g.event_id = e.id
      LEFT JOIN admin_users a ON g.checked_in_by = a.id
      WHERE g.guest_code = ? AND g.event_id = ?`,
      [guest_code, event_id]
    );

    if (guests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    res.json({
      success: true,
      guest: guests[0]
    });

  } catch (error) {
    console.error('Get guest by QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Mark guest as attended (check-in)
 */
exports.checkIn = async (req, res) => {
  try {
    const { guest_code, event_id } = req.body;
    const checkedInBy = req.user ? req.user.id : null;

    if (!guest_code || !event_id) {
      return res.status(400).json({
        success: false,
        message: 'Guest code and event ID are required'
      });
    }

    // Check if guest exists
    const [guests] = await db.execute(
      'SELECT id, full_name, attended FROM guests WHERE guest_code = ? AND event_id = ?',
      [guest_code, event_id]
    );

    if (guests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    const guest = guests[0];

    if (guest.attended) {
      return res.status(400).json({
        success: false,
        message: 'Guest has already checked in',
        guest: guest
      });
    }

    // Update guest as attended
    await db.execute(
      "UPDATE guests SET attended = 1, check_in_time = datetime('now'), checked_in_by = ? WHERE id = ?",
      [checkedInBy, guest.id]
    );

    res.json({
      success: true,
      message: 'Check-in successful',
      guest: {
        id: guest.id,
        name: guest.full_name,
        check_in_time: new Date()
      }
    });

  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Check-in failed'
    });
  }
};

/**
 * Get all guests for an event
 */
exports.getGuestsByEvent = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { search, status } = req.query;

    let query = `
      SELECT
        g.*,
        e.event_name,
        a.full_name as checked_in_by_name
      FROM guests g
      JOIN events e ON g.event_id = e.id
      LEFT JOIN admin_users a ON g.checked_in_by = a.id
      WHERE g.event_id = ?
    `;

    const params = [event_id];

    // Add search filter
    if (search) {
      query += ` AND (
        g.full_name LIKE ? OR
        g.email LIKE ? OR
        g.company_name LIKE ? OR
        g.guest_code LIKE ?
      )`;
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }

    // Add status filter
    if (status === 'attended') {
      query += ` AND g.attended = 1`;
    } else if (status === 'not_attended') {
      query += ` AND g.attended = 0`;
    }

    query += ` ORDER BY g.created_at DESC`;

    const [guests] = await db.execute(query, params);

    res.json({
      success: true,
      count: guests.length,
      guests
    });

  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Get guest statistics for an event
 */
exports.getEventStats = async (req, res) => {
  try {
    const { event_id } = req.params;

    const [stats] = await db.execute(
      `SELECT
        COUNT(*) as total_registered,
        SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as total_attended,
        SUM(CASE WHEN attended = 0 THEN 1 ELSE 0 END) as total_not_attended,
        SUM(CASE WHEN registration_type = 'pre_registered' THEN 1 ELSE 0 END) as pre_registered,
        SUM(CASE WHEN registration_type = 'self_registered' THEN 1 ELSE 0 END) as self_registered
      FROM guests
      WHERE event_id = ?`,
      [event_id]
    );

    res.json({
      success: true,
      stats: stats[0]
    });

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Delete a guest
 */
exports.deleteGuest = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await db.execute('DELETE FROM guests WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    res.json({
      success: true,
      message: 'Guest deleted successfully'
    });

  } catch (error) {
    console.error('Delete guest error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

/**
 * Export guest list to Excel
 */
exports.exportGuestList = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { status } = req.query;

    // Get event details
    const [events] = await db.execute(
      'SELECT event_name, event_code, event_date FROM events WHERE id = ?',
      [eventId]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    const event = events[0];

    // Build query based on status filter
    let query = `
      SELECT
        guest_code,
        full_name,
        email,
        contact_number,
        home_address,
        company_name,
        guest_category,
        attended,
        check_in_time,
        check_in_gate,
        created_at as registration_date
      FROM guests
      WHERE event_id = ?
    `;

    const params = [eventId];

    if (status === 'attended') {
      query += ' AND attended = 1';
    } else if (status === 'not_attended') {
      query += ' AND attended = 0';
    }

    query += ' ORDER BY created_at DESC';

    const [guests] = await db.execute(query, params);

    if (guests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No guests found for this event'
      });
    }

    // Prepare data for Excel
    const excelData = guests.map(guest => ({
      'Guest Code': guest.guest_code,
      'Full Name': guest.full_name,
      'Email': guest.email,
      'Contact Number': guest.contact_number,
      'Home Address': guest.home_address || '',
      'Company Name': guest.company_name || '',
      'Guest Category': guest.guest_category || 'Regular',
      'Check-in Status': guest.attended ? 'Checked In' : 'Not Checked In',
      'Check-in Time': guest.check_in_time || '',
      'Check-in Gate': guest.check_in_gate || '',
      'Registration Date': guest.registration_date
    }));

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    worksheet['!cols'] = [
      { wch: 15 }, // Guest Code
      { wch: 25 }, // Full Name
      { wch: 30 }, // Email
      { wch: 18 }, // Contact Number
      { wch: 35 }, // Home Address
      { wch: 25 }, // Company Name
      { wch: 15 }, // Guest Category
      { wch: 18 }, // Check-in Status
      { wch: 20 }, // Check-in Time
      { wch: 15 }, // Check-in Gate
      { wch: 20 }  // Registration Date
    ];

    XLSX.utils.book_append_sheet(workbook, worksheet, 'Guest List');

    // Generate filename
    const eventDate = new Date(event.event_date).toISOString().split('T')[0];
    const statusSuffix = status ? `-${status}` : '';
    const filename = `${event.event_code}-GuestList${statusSuffix}-${eventDate}.xlsx`;

    // Write to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);

  } catch (error) {
    console.error('Export guest list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = exports;
