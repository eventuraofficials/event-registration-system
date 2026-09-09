const db = require('../../db/config/database');
const { generateGuestCode, generateQRCode, verifySignedQrPayload } = require('../../utils/qrGenerator');
const { parseExcelFile, validateGuestData, checkDuplicates } = require('../../utils/excelParser');
const { sendTicketEmail, isEmailConfigured } = require('../../utils/emailService');
const { buildEventSummary } = require('../../utils/eventSummary');
const fs = require('fs');
const ExcelJS = require('exceljs');

// Security: Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  if (!input) return input;
  // Remove HTML tags and trim
  return input.replace(/<[^>]*>/g, '').trim();
};

const validateQrForEvent = (qrPayload, guestCode, eventId, eventDate) => {
  if (!qrPayload) return { valid: true };

  const verification = verifySignedQrPayload(qrPayload);
  if (!verification.valid) {
    return { valid: false, status: 400, message: 'Invalid QR code signature' };
  }

  const payload = verification.payload;
  if (String(payload.guestCode) !== String(guestCode)) {
    return { valid: false, status: 400, message: 'QR code does not match the guest code' };
  }

  if (Number(payload.eventId) !== Number(eventId)) {
    return { valid: false, status: 409, message: 'QR code belongs to another event' };
  }

  const eventEnd = new Date(eventDate);
  const createdAt = new Date(payload.timestamp);
  if (Number.isNaN(createdAt.getTime())) {
    return { valid: false, status: 400, message: 'QR code timestamp is invalid' };
  }

  if (!Number.isNaN(eventEnd.getTime())) {
    eventEnd.setHours(23, 59, 59, 999);
    eventEnd.setTime(eventEnd.getTime() + 24 * 60 * 60 * 1000);
    if (Date.now() > eventEnd.getTime()) {
      return { valid: false, status: 410, message: 'QR code has expired' };
    }
  }

  return { valid: true };
};

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

    const [eventRows] = await db.execute(
      'SELECT id, event_name, event_date, event_time, venue FROM events WHERE id = ?',
      [event_id]
    );
    if (eventRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    // Parse Excel file (now async with exceljs)
    const guests = await parseExcelFile(filePath);

    if (guests.length === 0) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'No valid guest data found in the file'
      });
    }

    // Validate data
    const validation = validateGuestData(guests);
    const isPreview = req.query.preview === 'true';

    if (validation.errors.length > 0 && !isPreview) {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.status(400).json({
        success: false,
        message: 'Validation errors found',
        validation
      });
    }

    // Check for duplicates
    const duplicates = checkDuplicates(validation.validGuests);
    const duplicateRows = new Set(duplicates.map(duplicate => duplicate.row));
    const importableGuests = validation.validGuests.filter((guest, index) => {
      return !duplicateRows.has(index + 2);
    });

    // Fetch event details once (needed for ticket emails)
    const eventDetails = eventRows[0];

    // Import guests to database
    const imported = [];
    const failed = [];
    const emailQueue = []; // guests to notify after response

    const existingEmails = new Set();
    const [existingGuests] = await db.execute(
      'SELECT email FROM guests WHERE event_id = ? AND email IS NOT NULL AND email != \'\'',
      [event_id]
    );
    existingGuests.forEach(guest => existingEmails.add(guest.email.trim().toLowerCase()));

    if (isPreview) {
      const previewDuplicates = [...duplicates];
      importableGuests.forEach((guest, index) => {
        const normalizedEmail = guest.email ? guest.email.trim().toLowerCase() : '';
        if (normalizedEmail && existingEmails.has(normalizedEmail)) {
          previewDuplicates.push({
            row: validation.validGuests.indexOf(guest) + 2,
            name: guest.full_name,
            email: guest.email,
            duplicateOf: 'existing guest'
          });
        }
      });

      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return res.json({
        success: true,
        preview: true,
        message: 'File reviewed. Confirm the import to add valid guests.',
        summary: {
          totalRows: validation.totalRows,
          valid: validation.validRows,
          invalid: validation.invalidRows,
          duplicatesFound: previewDuplicates.length,
          importable: Math.max(0, validation.validRows - previewDuplicates.length)
        },
        validationErrors: validation.errors,
        duplicates: previewDuplicates,
        sample: importableGuests.slice(0, 10).map(guest => ({
          name: guest.full_name,
          email: guest.email,
          company: guest.company_name
        }))
      });
    }

    for (const guest of importableGuests) {
      try {
        const normalizedEmail = guest.email ? guest.email.trim().toLowerCase() : '';
        if (normalizedEmail && existingEmails.has(normalizedEmail)) {
          duplicates.push({
            row: validation.validGuests.indexOf(guest) + 2,
            name: guest.full_name,
            email: guest.email,
            duplicateOf: 'existing guest'
          });
          continue;
        }

        const guestCode = generateGuestCode('PRE');
        const qrCode = await generateQRCode(guestCode, event_id);

        const [result] = await db.execute(
          `INSERT INTO guests (
            event_id, guest_code, qr_code, unique_guest_qr_identifier, full_name, email,
            contact_number, home_address, address, company_name, company,
            registration_status, attendance_status, registration_type, registration_source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'NOT_ATTENDED', 'pre_registered', 'excel_upload')`,
          [
            event_id,
            guestCode,
            qrCode,
            guestCode,
            guest.full_name,
            guest.email || null,
            guest.contact_number || null,
            guest.home_address || null,
            guest.home_address || null,
            guest.company_name || null
            ,guest.company_name || null
          ]
        );

        imported.push({
          id: result.insertId,
          name: guest.full_name,
          guestCode: guestCode
        });
        if (normalizedEmail) existingEmails.add(normalizedEmail);

        if (guest.email) {
          emailQueue.push({ guestName: guest.full_name, guestEmail: guest.email, guestCode, qrCodeDataUrl: qrCode });
        }

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
        duplicatesFound: duplicates.length,
        skipped: duplicates.length
      },
      imported,
      failed,
      duplicates
    });

    logActivity(req.user?.id, event_id, null, 'GUESTS_IMPORTED',
      `Bulk imported ${imported.length} guest(s) via Excel${eventDetails ? ` for "${eventDetails.event_name}"` : ''}`, req).catch(() => {});

    // Send ticket emails asynchronously after response (non-blocking)
    // 300ms delay between sends to avoid Gmail rate limiting
    if (emailQueue.length > 0 && eventDetails && isEmailConfigured()) {
      (async () => {
        for (const item of emailQueue) {
          try {
            await sendTicketEmail({
              guestName: item.guestName,
              guestEmail: item.guestEmail,
              guestCode: item.guestCode,
              eventName: eventDetails.event_name,
              eventDate: eventDetails.event_date,
              eventTime: eventDetails.event_time,
              venue: eventDetails.venue,
              qrCodeDataUrl: item.qrCodeDataUrl
            });
          } catch (err) {
            console.error(`Ticket email failed for ${item.guestEmail}:`, err.message);
          }
          await new Promise(r => setTimeout(r, 300));
        }
        console.log(`Bulk import: sent tickets to ${emailQueue.length} guest(s) for event ${event_id}`);
      })();
    }

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
    let { event_id, full_name, email, contact_number, home_address, company_name, guest_category } = req.body;

  // Sanitize all text inputs
  full_name = sanitizeInput(full_name);
  email = sanitizeInput(email);
  contact_number = sanitizeInput(contact_number);
  home_address = sanitizeInput(home_address);
  company_name = sanitizeInput(company_name);
  guest_category = sanitizeInput(guest_category);
    email = email.toLowerCase();

    // Validate required fields
    if (!event_id || !full_name) {
      return res.status(400).json({
        success: false,
        message: 'Event ID and full name are required'
      });
    }

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (email && !emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate name length
    if (full_name.length < 2 || full_name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Name must be between 2 and 100 characters'
      });
    }

    // Validate phone format (basic)
    const phoneRegex = /^[+]?[0-9\s\-()]{7,20}$/;
    if (contact_number && !phoneRegex.test(contact_number)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid contact number'
      });
    }

    // Check if event exists and is open for registration
    const [events] = await db.execute(
      "SELECT id, event_name, event_date, event_time, venue, status, registration_open, max_capacity, registration_form_config FROM events WHERE id = ?",
      [event_id]
    );

    if (events.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    if (events[0].status !== 'active' || !events[0].registration_open) {
      return res.status(400).json({
        success: false,
        message: 'Registration is currently closed for this event'
      });
    }

    let formConfig = {};
    try { formConfig = JSON.parse(events[0].registration_form_config || '{}'); } catch (e) { /* use defaults */ }
    const configuredFields = formConfig.fields || {};
    const requiredValues = {
      full_name,
      email,
      contact_number,
      home_address,
      company_name,
      guest_category
    };
    for (const [field, config] of Object.entries(configuredFields)) {
      if (config?.enabled && config.required && !requiredValues[field]) {
        return res.status(400).json({ success: false, message: `${config.label || field} is required` });
      }
    }

    // Generate guest code and QR code before transaction (async work done outside)
    const guestCode = generateGuestCode('SELF');
    const qrCode = await generateQRCode(guestCode, event_id);

    // Validate guest category
    const validCategories = ['VIP', 'Speaker', 'Sponsor', 'Media', 'Regular'];
    const category = guest_category && validCategories.includes(guest_category) ? guest_category : 'Regular';

    // Atomic transaction: capacity check + duplicate check + insert
    // Prevents race conditions when many guests register simultaneously
    const doRegister = db.db.transaction(() => {
      // Re-check capacity inside transaction (no other insert can slip between check and insert)
      if (Number.isInteger(events[0].max_capacity) && events[0].max_capacity > 0) {
        const countRow = db.db.prepare('SELECT COUNT(*) as total FROM guests WHERE event_id = ?').get(event_id);
        if (countRow.total >= events[0].max_capacity) {
          return { error: 'full' };
        }
      }

      // Check duplicate email inside transaction
      const dup = db.db.prepare('SELECT id FROM guests WHERE event_id = ? AND lower(email) = ?').get(event_id, email);
      if (dup) {
        return { error: 'duplicate' };
      }

      const row = db.db.prepare(`
        INSERT INTO guests (
          event_id, guest_code, qr_code, unique_guest_qr_identifier, full_name, email,
          contact_number, home_address, address, company_name, company, guest_category,
          registration_status, attendance_status, registration_type, registration_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'NOT_ATTENDED', 'self_registered', 'online_form')
      `).run(event_id, guestCode, qrCode, guestCode, full_name, email, contact_number, home_address || null, home_address || null, company_name || null, company_name || null, category);

      return { insertId: row.lastInsertRowid };
    });

    const txResult = doRegister();

    if (txResult.error === 'full') {
      return res.status(400).json({
        success: false,
        message: 'Sorry, this event has reached its maximum capacity'
      });
    }

    if (txResult.error === 'duplicate') {
      const [existingGuests] = await db.execute(
        `SELECT id, guest_code, qr_code, full_name, email, company_name, guest_category, event_id
         FROM guests WHERE event_id = ? AND lower(email) = ? LIMIT 1`,
        [event_id, email]
      );

      const existingGuest = existingGuests[0];

      if (existingGuest) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: 'You are already registered for this event',
          guest: {
            id: existingGuest.id,
            guestCode: existingGuest.guest_code,
            qrCode: existingGuest.qr_code,
            full_name: existingGuest.full_name,
            email: existingGuest.email,
            company_name: existingGuest.company_name,
            guest_category: existingGuest.guest_category,
            event_name: events[0].event_name
          }
        });
      }

      return res.status(400).json({
        success: false,
        message: 'You are already registered for this event'
      });
    }

    const result = { insertId: txResult.insertId };

    let emailStatus = 'not_configured';
    try {
      const emailResult = await Promise.race([
        sendTicketEmail({
          guestName: full_name,
          guestEmail: email,
          guestCode: guestCode,
          eventName: events[0].event_name,
          eventDate: events[0].event_date,
          eventTime: events[0].event_time,
          venue: events[0].venue,
          qrCodeDataUrl: qrCode
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Email delivery timed out')), 8000))
      ]);
      emailStatus = emailResult.sent ? 'sent' : 'not_configured';
    } catch (emailError) {
      emailStatus = 'failed';
      console.error(`Registration ticket email failed for ${email}:`, emailError.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Your QR code has been generated.',
      emailStatus,
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
 * Admin manually adds a guest (protected, registration_source = 'manual')
 */
exports.addGuestManual = async (req, res) => {
  try {
    let { event_id, full_name, email, contact_number, home_address, company_name, guest_category } = req.body;

    full_name = sanitizeInput(full_name);
    email = sanitizeInput(email);
    contact_number = sanitizeInput(contact_number);
    home_address = sanitizeInput(home_address);
    company_name = sanitizeInput(company_name);
    guest_category = sanitizeInput(guest_category);

    if (!event_id || !full_name) {
      return res.status(400).json({ success: false, message: 'Event ID and full name are required' });
    }

    const [events] = await db.execute(
      'SELECT id, event_name, event_date, event_time, venue, max_capacity FROM events WHERE id = ?',
      [event_id]
    );
    if (events.length === 0) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const validCategories = ['VIP', 'Speaker', 'Sponsor', 'Media', 'Regular'];
    const category = guest_category && validCategories.includes(guest_category) ? guest_category : 'Regular';

    const guestCode = generateGuestCode('MNL');
    const qrCode = await generateQRCode(guestCode, event_id);

    const doAdd = db.db.transaction(() => {
      if (events[0].max_capacity) {
        const countRow = db.db.prepare('SELECT COUNT(*) as total FROM guests WHERE event_id = ?').get(event_id);
        if (countRow.total >= events[0].max_capacity) return { error: 'full' };
      }
      if (email) {
        const dup = db.db.prepare('SELECT id FROM guests WHERE event_id = ? AND email = ?').get(event_id, email);
        if (dup) return { error: 'duplicate' };
      }
      const row = db.db.prepare(`
        INSERT INTO guests (
          event_id, guest_code, qr_code, unique_guest_qr_identifier, full_name, email,
          contact_number, home_address, address, company_name, company, guest_category,
          registration_status, attendance_status, registration_type, registration_source
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'NOT_ATTENDED', 'pre_registered', 'manual')
      `).run(event_id, guestCode, qrCode, guestCode, full_name, email || null, contact_number || null,
             home_address || null, home_address || null, company_name || null, company_name || null, category);
      return { insertId: row.lastInsertRowid };
    });

    const txResult = doAdd();
    if (txResult.error === 'full') {
      return res.status(400).json({ success: false, message: 'Event has reached maximum capacity' });
    }
    if (txResult.error === 'duplicate') {
      return res.status(400).json({ success: false, message: 'A guest with this email is already registered' });
    }

    res.status(201).json({
      success: true,
      message: 'Guest added successfully',
      guest: { id: txResult.insertId, guestCode, qrCode, full_name, email, guest_category: category }
    });

    logActivity(req.user?.id, event_id, txResult.insertId, 'GUEST_ADDED',
      `Manually added guest: ${full_name}${email ? ` <${email}>` : ''}`, req).catch(() => {});

    // Send ticket email if guest has an email (non-blocking)
    if (email) {
      sendTicketEmail({
        guestName: full_name,
        guestEmail: email,
        guestCode,
        eventName: events[0].event_name,
        eventDate: events[0].event_date,
        eventTime: events[0].event_time,
        venue: events[0].venue,
        qrCodeDataUrl: qrCode
      }).catch(err => {
        console.error(`Manual add ticket email failed for ${email}:`, err.message);
      });
    }

  } catch (error) {
    console.error('Add guest manual error:', error);
    res.status(500).json({ success: false, message: 'Failed to add guest' });
  }
};

/**
 * Get guest by QR code (for check-in)
 */
exports.getGuestByQR = async (req, res) => {
  try {
    const { guest_code, event_id, qr_payload } = req.query;

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

    const qrValidation = validateQrForEvent(qr_payload, guest_code, event_id, guests[0].event_date);
    if (!qrValidation.valid) {
      return res.status(qrValidation.status).json({
        success: false,
        message: qrValidation.message
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
    const { guest_code, event_id, qr_payload } = req.body;
    const checkedInBy = req.user ? req.user.id : null;

    if (!guest_code || !event_id) {
      return res.status(400).json({
        success: false,
        message: 'Guest code and event ID are required'
      });
    }

    // Check if guest exists
    const [guests] = await db.execute(
      `SELECT g.id, g.full_name, g.attended, e.event_date
       FROM guests g
       JOIN events e ON g.event_id = e.id
       WHERE g.guest_code = ? AND g.event_id = ?`,
      [guest_code, event_id]
    );

    if (guests.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Guest not found'
      });
    }

    const guest = guests[0];

    const qrValidation = validateQrForEvent(qr_payload, guest_code, event_id, guest.event_date);
    if (!qrValidation.valid) {
      return res.status(qrValidation.status).json({
        success: false,
        message: qrValidation.message
      });
    }

    if (guest.attended) {
      return res.status(400).json({
        success: false,
        message: 'Guest has already checked in',
        guest: guest
      });
    }

    // Update only an unchecked guest so concurrent scanners cannot check in the same guest twice.
    const [updateResult] = await db.execute(
      "UPDATE guests SET attended = 1, attendance_status = 'ATTENDED', check_in_time = datetime('now'), checked_in_by = ? WHERE id = ? AND attended = 0",
      [checkedInBy, guest.id]
    );

    if (updateResult.affectedRows === 0) {
      const [currentGuest] = await db.execute(
        'SELECT id, full_name, attended, check_in_time FROM guests WHERE id = ?',
        [guest.id]
      );
      return res.status(400).json({
        success: false,
        message: 'Guest has already checked in',
        guest: currentGuest[0] || guest
      });
    }

    res.json({
      success: true,
      message: 'Check-in successful',
      guest: {
        id: guest.id,
        name: guest.full_name,
        check_in_time: new Date()
      }
    });

    // Log check-in activity
    logActivity(checkedInBy, event_id, guest.id, 'CHECK_IN',
      `Checked in: ${guest.full_name}`, req).catch(() => {});

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
 * ?slim=true       → lightweight fields only, no qr_code, all records (check-in search)
 * ?page=N&limit=N  → paginated full records (admin table)
 * (no params)      → all records, full fields (PDF export, backwards compat)
 */
exports.getGuestsByEvent = async (req, res) => {
  try {
    const { event_id } = req.params;
    const { search, status, slim, page, limit } = req.query;

    // Slim mode: lightweight, no qr_code, all records — for check-in search cache
    if (slim === 'true') {
      let query = `
         SELECT g.id, g.guest_code, g.full_name, g.email, g.contact_number,
           g.company_name, g.attended, g.check_in_time, g.guest_category
        FROM guests g
        WHERE g.event_id = ?
      `;
      const params = [event_id];
      if (status === 'attended') query += ' AND g.attended = 1';
      else if (status === 'not_attended') query += ' AND g.attended = 0';
      query += ' ORDER BY g.full_name ASC';
      const [guests] = await db.execute(query, params);
      return res.json({ success: true, count: guests.length, guests });
    }

    // Build shared WHERE clause
    let whereClause = 'WHERE g.event_id = ?';
    const dataParams = [event_id];
    const countParams = [event_id];

    if (search) {
      const s = `%${search}%`;
      whereClause += ' AND (g.full_name LIKE ? OR g.email LIKE ? OR g.company_name LIKE ? OR g.guest_code LIKE ? OR g.contact_number LIKE ?)';
      dataParams.push(s, s, s, s, s);
      countParams.push(s, s, s, s, s);
    }

    const filterClause = buildGuestStatusFilter(status, 'g');
    if (filterClause.whereClause) {
      whereClause += filterClause.whereClause;
      dataParams.push(...filterClause.params);
      countParams.push(...filterClause.params);
    }

    const baseQuery = `
      SELECT g.*, e.event_name, a.full_name as checked_in_by_name
      FROM guests g
      JOIN events e ON g.event_id = e.id
      LEFT JOIN admin_users a ON g.checked_in_by = a.id
      ${whereClause}
      ORDER BY g.created_at DESC
    `;

    // Paginated mode — when page param is explicitly provided
    if (page !== undefined) {
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(Math.max(1, parseInt(limit) || 50), 200);
      const offset = (pageNum - 1) * limitNum;

      const [[countResult], [guests]] = await Promise.all([
        db.execute(`SELECT COUNT(*) as total FROM guests g ${whereClause}`, countParams),
        db.execute(baseQuery + ' LIMIT ? OFFSET ?', [...dataParams, limitNum, offset])
      ]);

      const total = countResult[0].total;
      return res.json({
        success: true,
        count: guests.length,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
        limit: limitNum,
        guests
      });
    }

    // All-records mode — backwards compatible (PDF export, etc.)
    const [guests] = await db.execute(baseQuery, dataParams);
    res.json({ success: true, count: guests.length, guests });

  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Get guest statistics for an event
 */
exports.getEventStats = async (req, res) => {
  try {
    const { event_id } = req.params;

    const [guests] = await db.execute(
      `SELECT * FROM guests WHERE event_id = ? ORDER BY created_at DESC`,
      [event_id]
    );

    const summary = buildEventSummary(guests);
    const totalRegistered = summary.total_registered;
    const totalAttended = summary.total_attended;
    const preRegistered = guests.filter((guest) => String(guest.registration_type || '').toLowerCase() === 'pre_registered').length;
    const selfRegistered = guests.filter((guest) => String(guest.registration_type || '').toLowerCase() === 'self_registered').length;

    const stats = {
      total_registered: totalRegistered,
      total_attended: totalAttended,
      total_not_attended: Math.max(totalRegistered - totalAttended, 0),
      pre_registered: preRegistered,
      self_registered: selfRegistered,
      attendance_rate: summary.attendance_rate,
      no_shows: summary.no_shows,
      walk_ins: summary.walk_ins,
      peak_check_in_time: summary.peak_check_in_time
    };

    res.json({
      success: true,
      stats,
      summary: stats
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

    const [rows] = await db.execute('SELECT full_name, email, event_id FROM guests WHERE id = ?', [id]);

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

    if (rows.length > 0) {
      const g = rows[0];
      logActivity(req.user?.id, g.event_id, null, 'GUEST_DELETED',
        `Deleted guest: ${g.full_name}${g.email ? ` <${g.email}>` : ''}`, req).catch(() => {});
    }

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

    // Create workbook and worksheet using ExcelJS
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Guest List');

    // Define columns with widths
    worksheet.columns = [
      { header: 'Guest Code', key: 'Guest Code', width: 15 },
      { header: 'Full Name', key: 'Full Name', width: 25 },
      { header: 'Email', key: 'Email', width: 30 },
      { header: 'Contact Number', key: 'Contact Number', width: 18 },
      { header: 'Home Address', key: 'Home Address', width: 35 },
      { header: 'Company Name', key: 'Company Name', width: 25 },
      { header: 'Guest Category', key: 'Guest Category', width: 15 },
      { header: 'Check-in Status', key: 'Check-in Status', width: 18 },
      { header: 'Check-in Time', key: 'Check-in Time', width: 20 },
      { header: 'Check-in Gate', key: 'Check-in Gate', width: 15 },
      { header: 'Registration Date', key: 'Registration Date', width: 20 }
    ];

    // Add rows
    worksheet.addRows(excelData);

    // Style header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Generate filename
    const eventDate = new Date(event.event_date).toISOString().split('T')[0];
    const statusSuffix = status ? `-${status}` : '';
    const filename = `${event.event_code}-GuestList${statusSuffix}-${eventDate}.xlsx`;

    // Write to buffer
    const buffer = await workbook.xlsx.writeBuffer();

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

/**
 * Update guest information
 */
exports.updateGuest = async (req, res) => {
  try {
    const { id } = req.params;
    let { full_name, email, contact_number, home_address, company_name, guest_category } = req.body;

    full_name = sanitizeInput(full_name);
    email = sanitizeInput(email);
    contact_number = sanitizeInput(contact_number);
    home_address = sanitizeInput(home_address);
    company_name = sanitizeInput(company_name);
    guest_category = sanitizeInput(guest_category);

    if (!full_name) {
      return res.status(400).json({ success: false, message: 'Full name is required' });
    }

    const validCategories = ['VIP', 'Speaker', 'Sponsor', 'Media', 'Regular'];
    const category = guest_category && validCategories.includes(guest_category) ? guest_category : 'Regular';

    const [existing] = await db.execute('SELECT event_id FROM guests WHERE id = ?', [id]);

    const [result] = await db.execute(
      `UPDATE guests SET
        full_name = ?, email = ?, contact_number = ?,
        home_address = ?, address = ?, company_name = ?, company = ?, guest_category = ?
      WHERE id = ?`,
      [full_name, email || null, contact_number || null,
       home_address || null, home_address || null, company_name || null, company_name || null, category, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    res.json({ success: true, message: 'Guest updated successfully' });

    const eventId = existing.length > 0 ? existing[0].event_id : null;
    logActivity(req.user?.id, eventId, id, 'GUEST_UPDATED',
      `Updated guest: ${full_name}${email ? ` <${email}>` : ''}`, req).catch(() => {});
  } catch (error) {
    console.error('Update guest error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Resend QR ticket email to guest
 */
exports.resendTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const [guests] = await db.execute(
      `SELECT g.*, e.event_name, e.event_date, e.event_time, e.venue
       FROM guests g JOIN events e ON g.event_id = e.id WHERE g.id = ?`,
      [id]
    );

    if (guests.length === 0) {
      return res.status(404).json({ success: false, message: 'Guest not found' });
    }

    const guest = guests[0];
    if (!guest.email) {
      return res.status(400).json({ success: false, message: 'Guest has no email address' });
    }

    const result = await sendTicketEmail({
      guestName: guest.full_name,
      guestEmail: guest.email,
      guestCode: guest.guest_code,
      eventName: guest.event_name,
      eventDate: guest.event_date,
      eventTime: guest.event_time,
      venue: guest.venue,
      qrCodeDataUrl: guest.qr_code
    });

    if (result && !result.sent) {
      return res.status(503).json({ success: false, message: result.reason || 'Email delivery is not configured on this server' });
    }

    res.json({ success: true, message: `Ticket sent to ${guest.email}` });
  } catch (error) {
    console.error('Resend ticket error:', error);
    res.status(500).json({ success: false, message: `Failed to send email: ${error.message}` });
  }
};

/**
 * Log activity helper
 */
async function logActivity(userId, eventId, guestId, action, description, req) {
  try {
    await db.execute(
      `INSERT INTO activity_logs (user_id, event_id, guest_id, action, description, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId || null,
        eventId || null,
        guestId || null,
        action,
        description,
        req ? (req.ip || req.connection?.remoteAddress || null) : null,
        req ? (req.get('user-agent') || null) : null
      ]
    );
  } catch (e) {
    // Non-fatal
  }
}
exports.logActivity = logActivity;

module.exports = exports;
