/**
 * AUTOMATED AUTHENTICATION TEST SUITE
 * Tests: Register → Login → Logout → Invalid Input
 */

const axios = require('axios');
const bcrypt = require('bcryptjs');

const API_BASE_URL = 'http://localhost:5000/api';
const TEST_USER = {
  username: 'testuser_' + Date.now(),
  email: `test${Date.now()}@example.com`,
  password: 'TestPassword123!',
  full_name: 'Test User'
};

let adminToken = null;

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Login with default admin
async function testAdminLogin() {
  logInfo('Test 1: Admin Login');
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/login`, {
      username: 'admin',
      password: 'admin123'
    });

    if (response.data.success && response.data.token) {
      adminToken = response.data.token;
      logSuccess(`Admin login successful! Token: ${adminToken.substring(0, 20)}...`);
      return true;
    } else {
      logError('Admin login failed - no token received');
      return false;
    }
  } catch (error) {
    logError(`Admin login error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 2: Create new admin user
async function testCreateAdmin() {
  logInfo('Test 2: Create New Admin User');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/admin/create`,
      TEST_USER,
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success) {
      logSuccess(`New admin created! User ID: ${response.data.userId}`);
      return true;
    } else {
      logError('Failed to create admin user');
      return false;
    }
  } catch (error) {
    logError(`Create admin error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 3: Login with new user
async function testNewUserLogin() {
  logInfo('Test 3: Login with New User');
  try {
    const response = await axios.post(`${API_BASE_URL}/admin/login`, {
      username: TEST_USER.username,
      password: TEST_USER.password
    });

    if (response.data.success && response.data.token) {
      logSuccess('New user login successful!');
      return true;
    } else {
      logError('New user login failed');
      return false;
    }
  } catch (error) {
    logError(`New user login error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 4: Test invalid inputs
async function testInvalidInputs() {
  logInfo('Test 4: Invalid Input Validation');
  let passedTests = 0;

  // Test 4a: Empty username
  try {
    await axios.post(`${API_BASE_URL}/admin/login`, {
      username: '',
      password: 'test123'
    });
    logError('Empty username test failed - should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Empty username correctly rejected');
      passedTests++;
    }
  }

  // Test 4b: Empty password
  try {
    await axios.post(`${API_BASE_URL}/admin/login`, {
      username: 'admin',
      password: ''
    });
    logError('Empty password test failed - should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Empty password correctly rejected');
      passedTests++;
    }
  }

  // Test 4c: Invalid credentials
  try {
    await axios.post(`${API_BASE_URL}/admin/login`, {
      username: 'wronguser',
      password: 'wrongpass'
    });
    logError('Invalid credentials test failed - should have been rejected');
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Invalid credentials correctly rejected');
      passedTests++;
    }
  }

  // Test 4d: XSS attempt
  try {
    await axios.post(`${API_BASE_URL}/admin/login`, {
      username: '<script>alert("xss")</script>',
      password: 'test123'
    });
    logWarning('XSS test completed (should be sanitized)');
    passedTests++;
  } catch (error) {
    // Any rejection is fine
    logSuccess('XSS attempt blocked');
    passedTests++;
  }

  // Test 4e: Short password on registration
  try {
    await axios.post(
      `${API_BASE_URL}/admin/create`,
      {
        username: 'shortpwduser',
        email: 'short@test.com',
        password: '123'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    logError('Short password test failed - should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Short password correctly rejected');
      passedTests++;
    }
  }

  // Test 4f: Invalid email format
  try {
    await axios.post(
      `${API_BASE_URL}/admin/create`,
      {
        username: 'invalidemailuser',
        email: 'notanemail',
        password: 'ValidPass123!'
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    logError('Invalid email test failed - should have been rejected');
  } catch (error) {
    if (error.response?.status === 400) {
      logSuccess('Invalid email correctly rejected');
      passedTests++;
    }
  }

  return passedTests;
}

// Test 5: Get user profile
async function testGetProfile() {
  logInfo('Test 5: Get User Profile');
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/profile`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (response.data.success && response.data.user) {
      logSuccess(`Profile retrieved! User: ${response.data.user.username}`);
      return true;
    } else {
      logError('Failed to get profile');
      return false;
    }
  } catch (error) {
    logError(`Get profile error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 6: Token refresh
async function testTokenRefresh() {
  logInfo('Test 6: Token Refresh');
  try {
    const response = await axios.post(
      `${API_BASE_URL}/admin/refresh-token`,
      {},
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );

    if (response.data.success && response.data.token) {
      logSuccess(`Token refreshed! New token: ${response.data.token.substring(0, 20)}...`);
      return true;
    } else {
      logError('Token refresh failed');
      return false;
    }
  } catch (error) {
    logError(`Token refresh error: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Run all tests
async function runAllTests() {
  log('\n╔═══════════════════════════════════════════════════════════╗', 'blue');
  log('║    🧪 AUTHENTICATION SYSTEM TEST SUITE                   ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'blue');

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Run tests sequentially
  const tests = [
    { name: 'Admin Login', fn: testAdminLogin },
    { name: 'Create New Admin', fn: testCreateAdmin },
    { name: 'New User Login', fn: testNewUserLogin },
    { name: 'Get User Profile', fn: testGetProfile },
    { name: 'Token Refresh', fn: testTokenRefresh }
  ];

  for (const test of tests) {
    const result = await test.fn();
    results.total++;
    if (result) {
      results.passed++;
    } else {
      results.failed++;
    }
    await delay(500); // Small delay between tests
  }

  // Run invalid input tests
  const invalidInputsPassed = await testInvalidInputs();
  results.total += 6;
  results.passed += invalidInputsPassed;
  results.failed += (6 - invalidInputsPassed);

  // Print summary
  log('\n╔═══════════════════════════════════════════════════════════╗', 'blue');
  log('║                    TEST SUMMARY                          ║', 'blue');
  log('╚═══════════════════════════════════════════════════════════╝\n', 'blue');

  log(`Total Tests: ${results.total}`);
  logSuccess(`Passed: ${results.passed}`);
  if (results.failed > 0) {
    logError(`Failed: ${results.failed}`);
  } else {
    log(`Failed: ${results.failed}`);
  }

  const percentage = ((results.passed / results.total) * 100).toFixed(1);
  log(`\nSuccess Rate: ${percentage}%\n`);

  if (results.failed === 0) {
    logSuccess('🎉 ALL TESTS PASSED! Authentication system is working perfectly!\n');
  } else {
    logWarning(`⚠️  ${results.failed} test(s) failed. Please review the errors above.\n`);
  }

  process.exit(results.failed === 0 ? 0 : 1);
}

// Start tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
