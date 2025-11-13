/**
 * 🚀 PRODUCTION READINESS CHECKER
 *
 * Comprehensive validation of all system components before deployment
 * Tests: Security, Performance, Configuration, Database, API, Frontend
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const API_BASE_URL = 'http://localhost:5000/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

const results = {
  passed: [],
  failed: [],
  warnings: [],
  critical: []
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
  results.passed.push(message);
}

function logError(message) {
  log(`❌ ${message}`, 'red');
  results.failed.push(message);
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
  results.warnings.push(message);
}

function logCritical(message) {
  log(`🔴 CRITICAL: ${message}`, 'red');
  results.critical.push(message);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logSection(message) {
  log(`\n${'='.repeat(70)}`, 'magenta');
  log(`  ${message}`, 'bold');
  log('='.repeat(70), 'magenta');
}

// ============================================================================
// 1. ENVIRONMENT CONFIGURATION CHECK
// ============================================================================
async function checkEnvironmentConfig() {
  logSection('1. Environment Configuration');

  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      logCritical('.env file not found!');
      return false;
    }
    logSuccess('.env file exists');

    const envContent = fs.readFileSync(envPath, 'utf8');

    // Check JWT_SECRET
    if (envContent.includes('your-super-secret-jwt-key-change-this-in-production')) {
      logCritical('JWT_SECRET is using default value! MUST be changed for production');
    } else if (envContent.match(/JWT_SECRET=.{32,}/)) {
      logSuccess('JWT_SECRET is properly configured');
    } else {
      logWarning('JWT_SECRET might be too short (recommended 32+ chars)');
    }

    // Check NODE_ENV
    if (envContent.includes('NODE_ENV=production')) {
      logSuccess('NODE_ENV set to production');
    } else {
      logWarning('NODE_ENV not set to production (currently development)');
    }

    // Check CORS
    if (envContent.includes('CORS_ORIGIN=*')) {
      logWarning('CORS_ORIGIN set to * (allows all origins) - restrict in production');
    } else {
      logSuccess('CORS_ORIGIN is restricted');
    }

    // Check APP_URL
    if (envContent.match(/APP_URL=https?:\/\/.+/)) {
      logSuccess('APP_URL is configured');
    } else {
      logWarning('APP_URL not configured properly');
    }

    return true;
  } catch (error) {
    logError(`Environment check error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// 2. DATABASE INTEGRITY CHECK
// ============================================================================
async function checkDatabaseIntegrity() {
  logSection('2. Database Integrity');

  try {
    const dbPath = path.join(__dirname, 'data', 'event_registration.db');
    if (!fs.existsSync(dbPath)) {
      logCritical('Database file not found!');
      return false;
    }
    logSuccess('Database file exists');

    const db = new Database(dbPath);

    // Check required tables
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const requiredTables = ['admin_users', 'events', 'guests', 'activity_logs'];

    for (const tableName of requiredTables) {
      if (tables.some(t => t.name === tableName)) {
        logSuccess(`Table '${tableName}' exists`);
      } else {
        logCritical(`Required table '${tableName}' is missing!`);
      }
    }

    // Check admin users
    const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_users').get();
    if (adminCount.count > 0) {
      logSuccess(`${adminCount.count} admin user(s) found`);
    } else {
      logCritical('No admin users found! System will be unusable');
    }

    // Check for default password
    const defaultAdmins = db.prepare('SELECT username FROM admin_users WHERE username = ?').all('admin');
    if (defaultAdmins.length > 0) {
      logWarning('Default admin account exists - Change password with: npm run change-password');
    }

    // Check foreign key constraints
    const fkCheck = db.pragma('foreign_key_check');
    if (fkCheck.length === 0) {
      logSuccess('All foreign key constraints are valid');
    } else {
      logError(`Foreign key violations found: ${fkCheck.length}`);
    }

    // Check database size
    const stats = fs.statSync(dbPath);
    const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    logInfo(`Database size: ${sizeInMB} MB`);

    db.close();
    return true;
  } catch (error) {
    logError(`Database check error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// 3. FILE STRUCTURE CHECK
// ============================================================================
async function checkFileStructure() {
  logSection('3. File Structure');

  const requiredFiles = [
    'backend/server.js',
    'backend/controllers/adminController.js',
    'backend/controllers/eventController.js',
    'backend/controllers/guestController.js',
    'backend/routes/adminRoutes.js',
    'backend/routes/eventRoutes.js',
    'backend/routes/guestRoutes.js',
    'backend/middleware/auth.js',
    'backend/config/database.js',
    'public/index.html',
    'public/admin.html',
    'public/checkin.html',
    'public/js/admin.js',
    'public/js/register.js',
    'public/js/checkin.js',
    'public/css/style.css',
    'public/css/admin.css',
    'package.json',
    '.env'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`${file}`);
    } else {
      logError(`Missing: ${file}`);
    }
  }

  // Check for sensitive files that shouldn't be committed
  const gitignorePath = path.join(__dirname, '.gitignore');

  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');

    // Check .env
    if (gitignore.includes('.env')) {
      logSuccess('.env is in .gitignore');
    } else {
      logWarning('.env should be in .gitignore');
    }

    // Check database files (check for patterns)
    if (gitignore.includes('*.db') || gitignore.includes('data/*.db') || gitignore.includes('event_registration.db')) {
      logSuccess('Database files are in .gitignore');
    } else {
      logWarning('Database files should be in .gitignore');
    }
  } else {
    logWarning('.gitignore not found');
  }

  return true;
}

// ============================================================================
// 4. SECURITY AUDIT
// ============================================================================
async function checkSecurity() {
  logSection('4. Security Audit');

  try {
    // Check for SQL injection protection (parameterized queries)
    const controllerFiles = [
      'backend/controllers/adminController.js',
      'backend/controllers/eventController.js',
      'backend/controllers/guestController.js'
    ];

    for (const file of controllerFiles) {
      const content = fs.readFileSync(path.join(__dirname, file), 'utf8');

      // Check for dangerous patterns
      if (content.includes('execute(`INSERT') || content.includes('execute("INSERT')) {
        logWarning(`${file}: Possible SQL injection risk - check for parameterized queries`);
      } else {
        logSuccess(`${file}: Using parameterized queries`);
      }

      // Check for input sanitization
      if (content.includes('sanitizeInput') || content.includes('validationResult')) {
        logSuccess(`${file}: Input validation/sanitization found`);
      }
    }

    // Check password hashing
    const adminController = fs.readFileSync(path.join(__dirname, 'backend/controllers/adminController.js'), 'utf8');
    if (adminController.includes('bcrypt') && adminController.includes('.hash(')) {
      logSuccess('Password hashing (bcrypt) implemented');
    } else {
      logCritical('Password hashing not found!');
    }

    // Check for rate limiting
    const serverFile = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');
    if (serverFile.includes('rateLimit') && serverFile.includes('loginLimiter')) {
      logSuccess('Rate limiting configured');
    } else {
      logWarning('Rate limiting not found');
    }

    // Check for helmet (security headers)
    if (serverFile.includes('helmet')) {
      logSuccess('Helmet security headers enabled');
    } else {
      logWarning('Helmet security headers not configured');
    }

    return true;
  } catch (error) {
    logError(`Security check error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// 5. API ENDPOINT VALIDATION
// ============================================================================
async function checkAPIEndpoints() {
  logSection('5. API Endpoints');

  try {
    // Health check
    const health = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    if (health.data.success) {
      logSuccess('Health endpoint working');
    }

    // Test authentication endpoint exists
    try {
      await axios.post(`${API_BASE_URL}/admin/login`, {});
    } catch (error) {
      if (error.response?.status === 400) {
        logSuccess('Login endpoint exists and validates input');
      }
    }

    // Test protected endpoint returns 401
    try {
      await axios.get(`${API_BASE_URL}/admin/profile`);
      logError('Protected endpoint should require authentication');
    } catch (error) {
      if (error.response?.status === 401) {
        logSuccess('Protected endpoints properly secured');
      }
    }

    // Check events endpoint
    try {
      await axios.get(`${API_BASE_URL}/events`);
    } catch (error) {
      if (error.response?.status === 401) {
        logSuccess('Events endpoint exists and is protected');
      }
    }

    return true;
  } catch (error) {
    logError(`API check error: ${error.message}`);
    logWarning('Make sure the server is running: npm start');
    return false;
  }
}

// ============================================================================
// 6. PERFORMANCE CHECK
// ============================================================================
async function checkPerformance() {
  logSection('6. Performance');

  try {
    const serverFile = fs.readFileSync(path.join(__dirname, 'backend/server.js'), 'utf8');

    // Check for compression
    if (serverFile.includes('compression')) {
      logSuccess('Response compression enabled');
    } else {
      logWarning('Response compression not enabled');
    }

    // Check for caching headers
    if (serverFile.includes('Cache-Control')) {
      logSuccess('Cache headers configured');
    }

    // Check database connections
    const dbFile = fs.readFileSync(path.join(__dirname, 'backend/config/database.js'), 'utf8');
    if (dbFile.includes('better-sqlite3')) {
      logSuccess('Using better-sqlite3 (good performance)');
    }

    return true;
  } catch (error) {
    logError(`Performance check error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// 7. DEPENDENCY AUDIT
// ============================================================================
async function checkDependencies() {
  logSection('7. Dependencies');

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));

    const requiredDeps = [
      'express',
      'bcryptjs',
      'jsonwebtoken',
      'better-sqlite3',
      'cors',
      'helmet',
      'express-rate-limit',
      'qrcode',
      'xlsx'
    ];

    for (const dep of requiredDeps) {
      if (packageJson.dependencies[dep]) {
        logSuccess(`${dep} installed`);
      } else {
        logCritical(`Missing dependency: ${dep}`);
      }
    }

    return true;
  } catch (error) {
    logError(`Dependency check error: ${error.message}`);
    return false;
  }
}

// ============================================================================
// GENERATE FINAL REPORT
// ============================================================================
function generateReport() {
  logSection('PRODUCTION READINESS REPORT');

  const total = results.passed.length + results.failed.length;
  const percentage = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

  log(`\n📊 Results:`, 'blue');
  log(`   ✅ Passed: ${results.passed.length}`, 'green');
  log(`   ❌ Failed: ${results.failed.length}`, 'red');
  log(`   ⚠️  Warnings: ${results.warnings.length}`, 'yellow');
  log(`   🔴 Critical: ${results.critical.length}`, 'red');
  log(`\n   Score: ${percentage}%\n`, percentage === '100.0' ? 'green' : 'yellow');

  if (results.critical.length > 0) {
    log('\n🔴 CRITICAL ISSUES (Must fix before production):', 'red');
    results.critical.forEach(msg => log(`   - ${msg}`, 'red'));
  }

  if (results.failed.length > 0) {
    log('\n❌ Failed Checks:', 'red');
    results.failed.forEach(msg => log(`   - ${msg}`, 'red'));
  }

  if (results.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    results.warnings.forEach(msg => log(`   - ${msg}`, 'yellow'));
  }

  log('\n');

  if (results.critical.length === 0 && results.failed.length === 0) {
    if (results.warnings.length === 0) {
      log('🎉 PRODUCTION READY! All checks passed!', 'green');
      log('✅ System is ready for deployment!\n', 'green');
      return 0;
    } else {
      log('✅ PRODUCTION READY with warnings', 'yellow');
      log('⚠️  Review warnings above before deploying\n', 'yellow');
      return 0;
    }
  } else {
    log('❌ NOT PRODUCTION READY', 'red');
    log('🔧 Fix critical issues and failures before deploying\n', 'red');
    return 1;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function runAllChecks() {
  log('\n╔══════════════════════════════════════════════════════════════════╗', 'blue');
  log('║  🚀 PRODUCTION READINESS CHECK                                  ║', 'blue');
  log('║  Comprehensive system validation before deployment              ║', 'blue');
  log('╚══════════════════════════════════════════════════════════════════╝\n', 'blue');

  await checkEnvironmentConfig();
  await checkDatabaseIntegrity();
  await checkFileStructure();
  await checkSecurity();
  await checkAPIEndpoints();
  await checkPerformance();
  await checkDependencies();

  const exitCode = generateReport();
  process.exit(exitCode);
}

// Start checks
runAllChecks().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
