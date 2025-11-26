/**
 * Security Utilities - Input Validation and XSS Protection
 * Provides HTML sanitization and input validation functions
 */

/**
 * Escapes HTML special characters to prevent XSS attacks
 * @param {string} unsafe - Potentially unsafe user input
 * @returns {string} - Escaped safe string
 */
function escapeHtml(unsafe) {
  if (typeof unsafe !== 'string') {
    return unsafe;
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validates and sanitizes integer input
 * @param {any} value - Value to validate as integer
 * @param {number} min - Minimum value (optional)
 * @param {number} max - Maximum value (optional)
 * @returns {number|null} - Validated integer or null if invalid
 */
function validateInteger(value, min = null, max = null) {
  const num = parseInt(value, 10);

  if (isNaN(num)) {
    return null;
  }

  if (min !== null && num < min) {
    return null;
  }

  if (max !== null && num > max) {
    return null;
  }

  return num;
}

/**
 * Validates email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid email format
 */
function validateEmail(email) {
  // More robust email validation regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return emailRegex.test(String(email).toLowerCase());
}

/**
 * Validates and sanitizes string input
 * @param {string} value - String to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {boolean} allowEmpty - Whether empty strings are allowed
 * @returns {string|null} - Validated string or null if invalid
 */
function validateString(value, maxLength = 255, allowEmpty = false) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  if (!allowEmpty && trimmed.length === 0) {
    return null;
  }

  if (trimmed.length > maxLength) {
    return null;
  }

  return trimmed;
}

/**
 * Validates phone number format
 * @param {string} phone - Phone number to validate
 * @returns {boolean} - True if valid phone format
 */
function validatePhone(phone) {
  // Accepts formats: +1234567890, 123-456-7890, (123) 456-7890, etc.
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(String(phone).replace(/\s/g, ''));
}

/**
 * Sanitizes object properties by escaping HTML in all string values
 * @param {object} obj - Object to sanitize
 * @returns {object} - Sanitized object
 */
function sanitizeObject(obj) {
  const sanitized = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        sanitized[key] = escapeHtml(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Creates a safe HTML element with sanitized content
 * @param {string} tag - HTML tag name
 * @param {string} content - Content to insert (will be escaped)
 * @param {object} attributes - Attributes to add to element
 * @returns {HTMLElement} - Created element
 */
function createSafeElement(tag, content, attributes = {}) {
  const element = document.createElement(tag);

  // Set text content (automatically escapes HTML)
  if (content) {
    element.textContent = content;
  }

  // Set attributes
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'class') {
      element.className = value;
    } else if (key === 'style') {
      Object.assign(element.style, value);
    } else {
      element.setAttribute(key, value);
    }
  }

  return element;
}

/**
 * Validates URL to prevent javascript: and data: URIs
 * @param {string} url - URL to validate
 * @returns {boolean} - True if safe URL
 */
function validateUrl(url) {
  if (!url) return false;

  const urlLower = url.toLowerCase().trim();

  // Block javascript: and data: URIs
  if (urlLower.startsWith('javascript:') || urlLower.startsWith('data:')) {
    return false;
  }

  // Allow http, https, and relative URLs
  return urlLower.startsWith('http://') ||
         urlLower.startsWith('https://') ||
         urlLower.startsWith('/') ||
         urlLower.startsWith('./') ||
         urlLower.startsWith('../');
}

// Export functions for use in other files
window.SecurityUtils = {
  escapeHtml,
  validateInteger,
  validateEmail,
  validateString,
  validatePhone,
  sanitizeObject,
  createSafeElement,
  validateUrl
};
