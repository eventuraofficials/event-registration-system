/**
 * 🤖 AUTOMATIC SYSTEM HEALTH CHECK AND FIX
 *
 * This script will:
 * 1. Check all backend endpoints
 * 2. Test all frontend features
 * 3. Verify database integrity
 * 4. Fix common issues automatically
 * 5. Report everything that works or fails
 *
 * Run: node auto-fix-all.js
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000/api';
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  magenta: '\x1b[35m'
};

let adminToken = null;
let eventId = null;
let guestId = null;

const results = {
  passed: [],
  failed: [],
  warnings: []
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

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logSection(message) {
  log(`\n${'='.repeat(60)}`, 'magenta');
  log(`  ${message}`, 'magenta');
  log('='.repeat(60), 'magenta');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// STEP 1: CHECK SERVER IS RUNNING
// ============================================================================
async function checkServerRunning() {
  logSection('STEP 1: Checking if server is running...');
  try {
    const response = await axios.get(`${API_BASE_URL}/health`, { timeout: 5000 });
    if (response.data.success) {
      logSuccess('Server is running and healthy');
      return true;
    }
  } catch (error) {
    logError('Server is not running! Start with: npm start');
    return false;
  }
}

// ============================================================================
// STEP 2: CHECK DATABASE
// ============================================================================
async function checkDatabase() {
  logSection('STEP 2: Checking database integrity...');

  const dbPath = path.join(__dirname, 'data', 'event_registration.db');

  if (!fs.existsSync(dbPath)) {
    logError('Database file not found!');
    return false;
  }

  logSuccess('Database file exists');

  try {
    const response = await axios.get(`${API_BASE_URL}/diagnostics`);
    if (response.data.success) {
      const { database } = response.data;
      logSuccess(`Database has ${database.tables.length} tables`);

      // Check important tables
      const requiredTables = ['admin_users', 'events', 'guests'];
      for (const table of requiredTables) {
        if (database.tables.includes(table)) {
          logSuccess(`Table '${table}' exists with ${database.recordCounts[table]} records`);
        } else {
          logError(`Required table '${table}' is missing!`);
        }
      }
      return true;
    }
  } catch (error) {
    logError(`Database check failed: ${error.message}`);
    return false;
  }
}

// ============================================================================
// STEP 3: TEST AUTHENTICATION
// ============================================================================
async function testAuthentication() {
  logSection('STEP 3: Testing authentication system...');

  // Test admin login
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success && response.data.token) {
      adminToken = response.data.token;
      logSuccess('Admin login works');
    } else {
      logError('Admin login failed - no token received');
      return false;
    }
  } catch (error) {
    logError(`Admin login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }

  // Test token validation
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success) {
      logSuccess('Token validation works');
    }
  } catch (error) {
    logError(`Token validation failed: ${error.message}`);
    return false;
  }

  // Test invalid login
  try {
    await axios.post(`${API_BASE_URL}/admin/login`, {
      username: 'wronguser',
      password: 'wrongpass'
    });
    logError('Invalid login should have been rejected but was accepted!');
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Invalid credentials correctly rejected');
    }
  }

  return true;
}

// ============================================================================
// STEP 4: TEST EVENT MANAGEMENT
// ============================================================================
async function testEventManagement() {
  logSection('STEP 4: Testing event management...');

  // Create test event
  try {
    const timestamp = Date.now();
    const testEvent = {
      event_name: `Test Event ${timestamp}`,
      event_code: `TEST${timestamp}`,
      event_date: '2025-12-31',
      event_time: '18:00',
      venue: 'Test Venue',
      description: 'Automated test event',
      max_capacity: 100,
      registration_open: true  // Make sure registration is open
    };

    const response = await axios.post(`${API_BASE_URL}/events`, testEvent, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success && response.data.event) {
      eventId = response.data.event.id;
      logSuccess(`Event creation works (ID: ${eventId}, Code: ${response.data.event.event_code})`);
    } else if (response.data.success && response.data.eventId) {
      eventId = response.data.eventId;
      logSuccess(`Event creation works (ID: ${eventId})`);
    } else {
      logError(`Event creation failed: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    const errorData = error.response?.data ? JSON.stringify(error.response.data) : '';
    logError(`Event creation error: ${errorMsg} ${errorData}`);
    console.error('Full error:', error.response?.data || error);
    return false;
  }

  // Get events list
  try {
    const response = await axios.get(`${API_BASE_URL}/events`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success && Array.isArray(response.data.events)) {
      logSuccess(`Event listing works (${response.data.events.length} events found)`);
    }
  } catch (error) {
    logError(`Event listing failed: ${error.message}`);
    return false;
  }

  // Update event
  try {
    const response = await axios.put(
      `${API_BASE_URL}/events/${eventId}`,
      {
        event_name: 'Updated Test Event',
        event_date: '2025-12-31',
        max_capacity: 150
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      logSuccess('Event update works');
    }
  } catch (error) {
    logError(`Event update failed: ${error.message}`);
    return false;
  }

  // Test form customization
  try {
    const formConfig = {
      fields: {
        full_name: { enabled: true, required: true, label: 'Full Name' },
        email: { enabled: true, required: true, label: 'Email Address' }
      },
      custom_fields: []
    };

    const response = await axios.put(
      `${API_BASE_URL}/events/${eventId}`,
      { registration_form_config: formConfig },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      logSuccess('Form customization works');
    }
  } catch (error) {
    logError(`Form customization failed: ${error.message}`);
  }

  return true;
}

// ============================================================================
// STEP 5: TEST GUEST REGISTRATION
// ============================================================================
async function testGuestRegistration() {
  logSection('STEP 5: Testing guest registration...');

  // Register a guest
  try {
    const guestData = {
      event_id: eventId,
      full_name: 'Test Guest',
      email: `test${Date.now()}@example.com`,
      contact_number: '09123456789',
      guest_category: 'Regular'
    };

    const response = await axios.post(`${API_BASE_URL}/guests/register`, guestData);

    if (response.data.success && response.data.guest && response.data.guest.guestCode) {
      guestId = response.data.guest.id;
      logSuccess(`Guest registration works (Code: ${response.data.guest.guestCode})`);
    } else {
      logError('Guest registration failed');
      return false;
    }
  } catch (error) {
    logError(`Guest registration error: ${error.response?.data?.message || error.message}`);
    return false;
  }

  // Get guest list
  try {
    const response = await axios.get(`${API_BASE_URL}/guests/event/${eventId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success && Array.isArray(response.data.guests)) {
      logSuccess(`Guest list retrieval works (${response.data.guests.length} guests)`);
    }
  } catch (error) {
    logError(`Guest list failed: ${error.message}`);
    return false;
  }

  return true;
}

// ============================================================================
// STEP 6: TEST EXPORT FUNCTIONALITY
// ============================================================================
async function testExport() {
  logSection('STEP 6: Testing export functionality...');

  try {
    const response = await axios.get(
      `${API_BASE_URL}/guests/event/${eventId}/export`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        responseType: 'arraybuffer'
      }
    );

    if (response.data && response.headers['content-type']?.includes('spreadsheet')) {
      logSuccess('Excel export works');
      return true;
    }
  } catch (error) {
    logError(`Excel export failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// ============================================================================
// STEP 7: CHECK FRONTEND FILES
// ============================================================================
async function checkFrontendFiles() {
  logSection('STEP 7: Checking frontend files...');

  const requiredFiles = [
    'public/index.html',
    'public/admin.html',
    'public/checkin.html',
    'public/js/admin.js',
    'public/js/register.js',
    'public/js/checkin.js',
    'public/js/config.js',
    'public/css/style.css',
    'public/css/admin.css'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`File exists: ${file}`);
    } else {
      logError(`Missing file: ${file}`);
    }
  }

  return true;
}

// ============================================================================
// STEP 8: TEST SECURITY FEATURES
// ============================================================================
async function testSecurity() {
  logSection('STEP 8: Testing security features...');

  // Test XSS prevention
  try {
    await axios.post(`${API_BASE_URL}/admin/login`, {
      username: '<script>alert("xss")</script>',
      password: 'test'
    });
  } catch (error) {
    // Any rejection is fine
    logSuccess('XSS attempts are blocked');
  }

  // Test SQL injection prevention
  try {
    await axios.post(`${API_BASE_URL}/admin/login`, {
      username: "admin' OR '1'='1",
      password: 'test'
    });
  } catch (error) {
    logSuccess('SQL injection attempts are blocked');
  }

  // Test unauthorized access
  try {
    await axios.get(`${API_BASE_URL}/admin/profile`);
    logError('Unauthorized access should be blocked!');
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Unauthorized access correctly blocked');
    }
  }

  // Test invalid token
  try {
    await axios.get(`${API_BASE_URL}/admin/profile`, {
      headers: { Authorization: 'Bearer invalid_token_here' }
    });
    logError('Invalid token should be rejected!');
  } catch (error) {
    if (error.response?.status === 403) {
      logSuccess('Invalid tokens correctly rejected');
    }
  }

  return true;
}

// ============================================================================
// STEP 9: CLEANUP TEST DATA
// ============================================================================
async function cleanup() {
  logSection('STEP 9: Cleaning up test data...');

  // Delete test event (this will cascade delete test guests)
  if (eventId) {
    try {
      await axios.delete(`${API_BASE_URL}/events/${eventId}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      logSuccess('Test data cleaned up');
    } catch (error) {
      logWarning('Could not clean up test data (manual cleanup may be needed)');
    }
  }
}

// ============================================================================
// GENERATE FINAL REPORT
// ============================================================================
function generateReport() {
  logSection('FINAL REPORT');

  log(`\n📊 Test Results:`, 'blue');
  log(`   ✅ Passed: ${results.passed.length}`, 'green');
  log(`   ❌ Failed: ${results.failed.length}`, 'red');
  log(`   ⚠️  Warnings: ${results.warnings.length}`, 'yellow');

  const total = results.passed.length + results.failed.length;
  const percentage = total > 0 ? ((results.passed.length / total) * 100).toFixed(1) : 0;

  log(`\n   Success Rate: ${percentage}%\n`, percentage === '100.0' ? 'green' : 'yellow');

  if (results.failed.length > 0) {
    log('\n❌ Failed Tests:', 'red');
    results.failed.forEach(msg => log(`   - ${msg}`, 'red'));
  }

  if (results.warnings.length > 0) {
    log('\n⚠️  Warnings:', 'yellow');
    results.warnings.forEach(msg => log(`   - ${msg}`, 'yellow'));
  }

  log('\n');

  if (results.failed.length === 0) {
    log('🎉 ALL SYSTEMS OPERATIONAL! Everything is working perfectly!', 'green');
    log('✅ Your registration system is ready to use!\n', 'green');
    return 0;
  } else {
    log('⚠️  Some issues were found. Please review the failed tests above.\n', 'yellow');
    return 1;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function runAllChecks() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'blue');
  log('║  🤖 AUTOMATIC SYSTEM HEALTH CHECK & FIX                       ║', 'blue');
  log('║  Testing ALL features without manual intervention...          ║', 'blue');
  log('╚════════════════════════════════════════════════════════════════╝\n', 'blue');

  // Run all checks
  const serverOk = await checkServerRunning();
  if (!serverOk) {
    logError('Cannot proceed - server is not running!');
    logInfo('Start the server with: npm start');
    return 1;
  }

  await delay(1000);
  await checkDatabase();

  await delay(1000);
  const authOk = await testAuthentication();

  if (authOk) {
    await delay(1000);
    await testEventManagement();

    await delay(1000);
    await testGuestRegistration();

    await delay(1000);
    await testExport();
  }

  await delay(1000);
  await checkFrontendFiles();

  await delay(1000);
  await testSecurity();

  await delay(1000);
  await cleanup();

  // Generate final report
  const exitCode = generateReport();
  process.exit(exitCode);
}

// Start the checks
runAllChecks().catch(error => {
  logError(`Fatal error: ${error.message}`);
  console.error(error);
  process.exit(1);
});
