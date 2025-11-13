const XLSX = require('xlsx');
const path = require('path');

/**
 * Parse Excel file and extract guest data
 * @param {string} filePath - Path to Excel file
 * @returns {Array} Array of guest objects
 */
function parseExcelFile(filePath) {
  try {
    // Read the Excel file
    const workbook = XLSX.readFile(filePath);

    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, {
      raw: false,
      defval: ''
    });

    // Validate and transform data
    const guests = data.map((row, index) => {
      // Flexible column name mapping (handles different naming conventions)
      const guest = {
        full_name: row['Full Name'] || row['Name'] || row['full_name'] || row['name'] || '',
        email: row['Email'] || row['email'] || row['Email Address'] || '',
        contact_number: row['Contact Number'] || row['Phone'] || row['contact_number'] || row['phone'] || '',
        home_address: row['Home Address'] || row['Address'] || row['home_address'] || row['address'] || '',
        company_name: row['Company Name'] || row['Company'] || row['company_name'] || row['company'] || ''
      };

      // Trim all values
      Object.keys(guest).forEach(key => {
        if (typeof guest[key] === 'string') {
          guest[key] = guest[key].trim();
        }
      });

      return guest;
    });

    // Filter out empty rows
    const validGuests = guests.filter(guest => guest.full_name && guest.full_name.length > 0);

    return validGuests;
  } catch (error) {
    console.error('Excel parsing error:', error);
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
}

/**
 * Validate guest data
 * @param {Array} guests - Array of guest objects
 * @returns {Object} Validation result with valid guests and errors
 */
function validateGuestData(guests) {
  const validGuests = [];
  const errors = [];

  guests.forEach((guest, index) => {
    const rowNumber = index + 2; // Excel rows start at 1, plus header
    const rowErrors = [];

    // Required field validation
    if (!guest.full_name || guest.full_name.trim() === '') {
      rowErrors.push('Full Name is required');
    }

    // Email validation (if provided)
    if (guest.email && guest.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guest.email)) {
        rowErrors.push('Invalid email format');
      }
    }

    // Phone validation (if provided)
    if (guest.contact_number && guest.contact_number.trim() !== '') {
      // Remove common phone formatting characters
      const cleanPhone = guest.contact_number.replace(/[\s\-\(\)]/g, '');
      if (!/^\+?[\d]{7,15}$/.test(cleanPhone)) {
        rowErrors.push('Invalid phone number format');
      }
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: rowNumber,
        name: guest.full_name || 'Unknown',
        errors: rowErrors
      });
    } else {
      validGuests.push(guest);
    }
  });

  return {
    validGuests,
    errors,
    totalRows: guests.length,
    validRows: validGuests.length,
    invalidRows: errors.length
  };
}

/**
 * Check for duplicate entries within the data
 */
function checkDuplicates(guests) {
  const seen = new Map();
  const duplicates = [];

  guests.forEach((guest, index) => {
    const key = `${guest.full_name.toLowerCase()}-${guest.email.toLowerCase()}`;

    if (seen.has(key)) {
      duplicates.push({
        row: index + 2,
        name: guest.full_name,
        email: guest.email,
        duplicateOf: seen.get(key)
      });
    } else {
      seen.set(key, index + 2);
    }
  });

  return duplicates;
}

module.exports = {
  parseExcelFile,
  validateGuestData,
  checkDuplicates
};
