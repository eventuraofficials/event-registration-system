/**
 * COMPREHENSIVE SECURITY & CODE QUALITY FIXES
 * Event Registration System - Auto-Fix Script
 *
 * This script applies all critical, high, and medium priority fixes identified in the security audit.
 * Generated: 2025-11-26
 */

const fs = require('fs');
const path = require('path');

console.log('='.repeat(80));
console.log('  COMPREHENSIVE SECURITY & CODE QUALITY FIXES');
console.log('  Event Registration System');
console.log('='.repeat(80));
console.log('');

// Track all fixes applied
const fixesApplied = [];
const errors = [];

// Helper function to safely read and update files
function updateFile(filePath, searchString, replaceString, description) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    if (!content.includes(searchString)) {
      errors.push(`Pattern not found in ${filePath}: ${searchString.substring(0, 50)}...`);
      return false;
    }

    content = content.replace(searchString, replaceString);
    fs.writeFileSync(fullPath, content, 'utf8');

    fixesApplied.push({ file: filePath, description });
    console.log(`✓ Fixed: ${description}`);
    return true;
  } catch (error) {
    errors.push(`Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

// Helper function to add content at specific position
function insertAfterPattern(filePath, searchPattern, insertContent, description) {
  try {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) {
      errors.push(`File not found: ${filePath}`);
      return false;
    }

    let content = fs.readFileSync(fullPath, 'utf8');

    if (!content.includes(searchPattern)) {
      errors.push(`Pattern not found in ${filePath}`);
      return false;
    }

    content = content.replace(searchPattern, searchPattern + '\n' + insertContent);
    fs.writeFileSync(fullPath, content, 'utf8');

    fixesApplied.push({ file: filePath, description });
    console.log(`✓ Fixed: ${description}`);
    return true;
  } catch (error) {
    errors.push(`Error updating ${filePath}: ${error.message}`);
    return false;
  }
}

console.log('\n📋 Applying CRITICAL fixes...\n');

// FIX 1: Add authentication to check-in endpoint
console.log('1. Adding authentication to check-in endpoint...');
updateFile(
  'backend/routes/guestRoutes.js',
  "router.post('/checkin', guestController.checkIn);",
  "router.post('/checkin', authenticateToken, guestController.checkIn);",
  'Add authentication to check-in endpoint (CRITICAL)'
);

// FIX 2: Add input sanitization function to guestController
console.log('\n2. Adding input sanitization to guestController...');
insertAfterPattern(
  'backend/controllers/guestController.js',
  "const ExcelJS = require('exceljs');",
  `
// Security: Input sanitization function
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  if (!input) return input;
  // Remove HTML tags and trim
  return input.replace(/<[^>]*>/g, '').trim();
};`,
  'Add sanitization function to guestController (CRITICAL)'
);

// FIX 3: Add sanitization to guest registration
console.log('\n3. Applying input sanitization to guest registration...');
updateFile(
  'backend/controllers/guestController.js',
  `  const { event_id, full_name, email, contact_number, home_address, company_name, guest_category } = req.body;`,
  `  let { event_id, full_name, email, contact_number, home_address, company_name, guest_category } = req.body;

  // Sanitize all text inputs
  full_name = sanitizeInput(full_name);
  email = sanitizeInput(email);
  contact_number = sanitizeInput(contact_number);
  home_address = sanitizeInput(home_address);
  company_name = sanitizeInput(company_name);
  guest_category = sanitizeInput(guest_category);`,
  'Sanitize guest registration inputs (CRITICAL)'
);

// FIX 4: Add email validation to guest registration
console.log('\n4. Adding email validation...');
insertAfterPattern(
  'backend/controllers/guestController.js',
  `  if (!event_id || !full_name || !email || !contact_number) {
    return res.status(400).json({
      success: false,
      message: 'Event ID, full name, email, and contact number are required'
    });
  }`,
  `
  // Validate email format
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
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
  const phoneRegex = /^[+]?[0-9\\s\\-()]{7,20}$/;
  if (!phoneRegex.test(contact_number)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid contact number'
    });
  }`,
  'Add email and input validation to guest registration (HIGH)'
);

// FIX 5: Fix CORS configuration
console.log('\n5. Fixing CORS configuration...');
updateFile(
  'backend/server.js',
  `app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));`,
  `app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));`,
  'Fix CORS configuration - remove wildcard (HIGH)'
);

// FIX 6: Add JWT secret validation
console.log('\n6. Adding JWT secret validation...');
insertAfterPattern(
  'backend/server.js',
  `require('dotenv').config();`,
  `
// Validate critical environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('❌ CRITICAL: JWT_SECRET must be set and at least 32 characters long');
  console.error('Please set a strong JWT_SECRET in your .env file');
  process.exit(1);
}

if (process.env.JWT_SECRET === 'your-secret-key-change-this-in-production') {
  console.warn('⚠️  WARNING: Using default JWT_SECRET. Please change it immediately!');
}`,
  'Add JWT secret validation on startup (HIGH)'
);

// FIX 7: Escape SQL LIKE wildcards in search
console.log('\n7. Fixing SQL LIKE injection...');
updateFile(
  'backend/controllers/guestController.js',
  `    const searchParam = \`%\${search}%\`;
    params.push(searchParam, searchParam, searchParam, searchParam);`,
  `    // Escape SQL LIKE wildcards to prevent injection
    const sanitizedSearch = search.replace(/[%_]/g, '\\\\$&');
    const searchParam = \`%\${sanitizedSearch}%\`;
    params.push(searchParam, searchParam, searchParam, searchParam);`,
  'Escape SQL LIKE wildcards in search (MEDIUM)'
);

console.log('\n\n📋 Applying FRONTEND security fixes...\n');

// FIX 8: Fix XSS in admin.js event rendering
console.log('8. Fixing XSS vulnerabilities in admin.js...');
updateFile(
  'public/js/admin.js',
  `        <td>\${event.event_code}</td>
        <td>\${event.event_name}</td>
        <td>\${formatDate(event.event_date)}</td>
        <td>\${event.venue}</td>`,
  `        <td>\${SecurityUtils.escapeHtml(event.event_code)}</td>
        <td>\${SecurityUtils.escapeHtml(event.event_name)}</td>
        <td>\${formatDate(event.event_date)}</td>
        <td>\${SecurityUtils.escapeHtml(event.venue)}</td>`,
  'Fix XSS in event table rendering (CRITICAL)'
);

// FIX 9: Fix XSS in register.js
console.log('\n9. Fixing XSS in register.js...');
updateFile(
  'public/js/register.js',
  `    document.getElementById('eventName').textContent = currentEvent.event_name;
    document.getElementById('eventDate').textContent = formatDate(currentEvent.event_date);
    document.getElementById('eventTime').textContent = formatTime(currentEvent.event_time);
    document.getElementById('eventVenue').textContent = currentEvent.venue;
    document.getElementById('eventDescription').textContent = currentEvent.description || 'No description available';`,
  `    document.getElementById('eventName').textContent = SecurityUtils.escapeHtml(currentEvent.event_name);
    document.getElementById('eventDate').textContent = formatDate(currentEvent.event_date);
    document.getElementById('eventTime').textContent = formatTime(currentEvent.event_time);
    document.getElementById('eventVenue').textContent = SecurityUtils.escapeHtml(currentEvent.venue);
    document.getElementById('eventDescription').textContent = SecurityUtils.escapeHtml(currentEvent.description || 'No description available');`,
  'Fix XSS in event details display (HIGH)'
);

// FIX 10: Remove console.log from production code
console.log('\n10. Removing debug console.log statements...');

const filesToCleanup = [
  'public/js/admin.js',
  'public/js/checkin.js',
  'public/js/register.js'
];

filesToCleanup.forEach(file => {
  try {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      const originalLength = content.length;

      // Remove standalone console.log, console.info, console.warn (but keep console.error)
      content = content.replace(/^\s*console\.(log|info|warn)\([^)]*\);\s*$/gm, '');

      if (content.length < originalLength) {
        fs.writeFileSync(fullPath, content, 'utf8');
        fixesApplied.push({ file, description: 'Remove debug console statements' });
        console.log(`✓ Cleaned console statements from ${file}`);
      }
    }
  } catch (error) {
    errors.push(`Error cleaning ${file}: ${error.message}`);
  }
});

// FIX 11: Add stronger password policy
console.log('\n11. Enforcing stronger password policy...');
updateFile(
  'backend/controllers/adminController.js',
  `  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters long'
    });
  }`,
  `  // Enforce strong password policy
  if (password.length < 12) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 12 characters long'
    });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
      success: false,
      message: 'Password must contain uppercase, lowercase, number, and special character'
    });
  }`,
  'Enforce strong password policy (HIGH)'
);

// FIX 12: Add database indexes
console.log('\n12. Adding database optimization indexes...');
insertAfterPattern(
  'backend/config/init-sqlite.js',
  `    // Indexes for performance
    db.exec(\`
      CREATE INDEX IF NOT EXISTS idx_guest_event ON guests(event_id);
      CREATE INDEX IF NOT EXISTS idx_guest_email ON guests(email);
      CREATE INDEX IF NOT EXISTS idx_guest_code ON guests(guest_code);
      CREATE INDEX IF NOT EXISTS idx_guest_attended ON guests(attended);
      CREATE INDEX IF NOT EXISTS idx_event_date ON events(event_date);
      CREATE INDEX IF NOT EXISTS idx_event_code ON events(event_code);
      CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_activity_event ON activity_logs(event_id);
      CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);
    \`);`,
  `
      -- Additional composite indexes for complex queries
      CREATE INDEX IF NOT EXISTS idx_guest_event_attended ON guests(event_id, attended);
      CREATE INDEX IF NOT EXISTS idx_guest_event_email ON guests(event_id, email);
      CREATE INDEX IF NOT EXISTS idx_event_created_by ON events(created_by);
      CREATE INDEX IF NOT EXISTS idx_activity_user_event ON activity_logs(user_id, event_id);
      CREATE INDEX IF NOT EXISTS idx_activity_event_created ON activity_logs(event_id, created_at);
    `,
  'Add composite database indexes for performance (MEDIUM)'
);

// FIX 13: Add pagination helper
console.log('\n13. Adding pagination support...');
const paginationHelper = `
/**
 * Pagination helper - Add this to common utilities
 */
function getPaginationParams(req) {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

function formatPaginatedResponse(data, total, page, limit) {
  const totalPages = Math.ceil(total / limit);

  return {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}

module.exports = { getPaginationParams, formatPaginatedResponse };
`;

fs.writeFileSync(
  path.join(__dirname, 'backend/utils/pagination.js'),
  paginationHelper,
  'utf8'
);
fixesApplied.push({ file: 'backend/utils/pagination.js', description: 'Create pagination utility' });
console.log('✓ Created pagination helper utility');

// FIX 14: Create security audit log utility
console.log('\n14. Creating security audit logging...');
const auditLogger = `
const db = require('../config/database');

/**
 * Security Audit Logger
 * Logs all critical security events
 */

async function logSecurityEvent(event) {
  const {
    userId = null,
    action,
    details = null,
    ipAddress = null,
    userAgent = null,
    status = 'success'
  } = event;

  try {
    const [result] = await db.query(
      \`INSERT INTO activity_logs (user_id, action, details, ip_address, user_agent, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))\`,
      [userId, action, JSON.stringify(details), ipAddress, userAgent, status]
    );

    return result;
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

async function logLogin(userId, success, ipAddress, userAgent) {
  return logSecurityEvent({
    userId,
    action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
    details: { timestamp: new Date().toISOString() },
    ipAddress,
    userAgent,
    status: success ? 'success' : 'failed'
  });
}

async function logLogout(userId, ipAddress) {
  return logSecurityEvent({
    userId,
    action: 'LOGOUT',
    ipAddress,
    status: 'success'
  });
}

async function logUnauthorizedAccess(userId, resource, ipAddress) {
  return logSecurityEvent({
    userId,
    action: 'UNAUTHORIZED_ACCESS',
    details: { resource },
    ipAddress,
    status: 'blocked'
  });
}

module.exports = {
  logSecurityEvent,
  logLogin,
  logLogout,
  logUnauthorizedAccess
};
`;

fs.writeFileSync(
  path.join(__dirname, 'backend/utils/securityAudit.js'),
  auditLogger,
  'utf8'
);
fixesApplied.push({ file: 'backend/utils/securityAudit.js', description: 'Create security audit logger' });
console.log('✓ Created security audit logger');

// Generate report
console.log('\n\n' + '='.repeat(80));
console.log('  FIX SUMMARY');
console.log('='.repeat(80));
console.log('');
console.log(`✅ Total fixes applied: ${fixesApplied.length}`);
console.log(`❌ Errors encountered: ${errors.length}`);
console.log('');

if (fixesApplied.length > 0) {
  console.log('📋 Fixes Applied:\n');
  fixesApplied.forEach((fix, index) => {
    console.log(`${index + 1}. [${fix.file}]`);
    console.log(`   ${fix.description}\n`);
  });
}

if (errors.length > 0) {
  console.log('\n⚠️  Errors:\n');
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error}`);
  });
}

// Write detailed report
const report = {
  timestamp: new Date().toISOString(),
  fixesApplied: fixesApplied.length,
  errors: errors.length,
  fixes: fixesApplied,
  errorDetails: errors
};

fs.writeFileSync(
  path.join(__dirname, 'security-fixes-report.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

console.log('\n📄 Detailed report saved to: security-fixes-report.json');
console.log('');
console.log('='.repeat(80));
console.log('  NEXT STEPS');
console.log('='.repeat(80));
console.log('');
console.log('1. Review the changes made by this script');
console.log('2. Test the application thoroughly');
console.log('3. Update your .env file with a strong JWT_SECRET (32+ characters)');
console.log('4. Change default admin password immediately');
console.log('5. Update CORS_ORIGIN in .env for production');
console.log('6. Run npm test to verify all functionality');
console.log('7. Commit the changes to git');
console.log('');
console.log('🔒 Security improvements applied successfully!');
console.log('');
