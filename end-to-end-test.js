#!/usr/bin/env node
/**
 * END-TO-END FUNCTIONAL TEST
 * ==========================
 *
 * Simulates complete user flows:
 * 1. Admin login
 * 2. Event creation
 * 3. Guest registration
 * 4. QR code generation
 * 5. Guest check-in
 */

const http = require('http');
const https = require('https');

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

const log = {
    info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    test: (msg) => console.log(`${colors.magenta}[TEST]${colors.reset} ${msg}`),
    section: (msg) => console.log(`\n${colors.blue}${'='.repeat(70)}${colors.reset}\n${colors.blue}${msg}${colors.reset}\n${colors.blue}${'='.repeat(70)}${colors.reset}\n`)
};

const API_BASE = 'http://localhost:5000';
let authToken = null;
let testEventCode = null;
let testGuestCode = null;

const testResults = {
    passed: [],
    failed: [],
    skipped: []
};

/**
 * HTTP Request Helper
 */
function makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, API_BASE);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            },
            timeout: 10000
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = JSON.parse(body);
                    resolve({ status: res.statusCode, data: response, headers: res.headers });
                } catch {
                    resolve({ status: res.statusCode, data: body, headers: res.headers });
                }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

/**
 * TEST 1: Admin Login
 */
async function testAdminLogin() {
    log.section('TEST 1: Admin Login');

    try {
        log.test('Attempting admin login...');

        const response = await makeRequest('POST', '/api/admin/login', {
            username: 'admin',
            password: 'admin123'
        });

        if (response.status === 200 && response.data.success && response.data.token) {
            authToken = response.data.token;
            testResults.passed.push('Admin login successful');
            log.success(`Login successful - Token: ${authToken.substring(0, 20)}...`);
            log.info(`Role: ${response.data.role}`);
            return true;
        } else {
            testResults.failed.push(`Admin login failed: ${response.data.message || 'Unknown error'}`);
            log.error(`Login failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        testResults.failed.push(`Admin login error: ${error.message}`);
        log.error(`Login error: ${error.message}`);
        return false;
    }
}

/**
 * TEST 2: Create Event
 */
async function testCreateEvent() {
    log.section('TEST 2: Create Event');

    if (!authToken) {
        testResults.skipped.push('Event creation (no auth token)');
        log.error('Skipped - no auth token');
        return false;
    }

    try {
        log.test('Creating test event...');

        testEventCode = `TEST-E2E-${Date.now()}`;

        const eventData = {
            event_name: 'End-to-End Test Event',
            event_code: testEventCode,
            event_date: '2025-12-31',
            event_time: '18:00',
            venue: 'Test Venue',
            description: 'Automated E2E test event',
            max_capacity: 100,
            registration_open: 1
        };

        const response = await makeRequest('POST', '/api/events', eventData, {
            'Authorization': `Bearer ${authToken}`
        });

        if (response.status === 201 && response.data.success) {
            testResults.passed.push('Event creation successful');
            log.success(`Event created: ${testEventCode}`);
            log.info(`Event ID: ${response.data.event.id}`);
            return true;
        } else {
            testResults.failed.push(`Event creation failed: ${response.data.message || 'Unknown error'}`);
            log.error(`Failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        testResults.failed.push(`Event creation error: ${error.message}`);
        log.error(`Error: ${error.message}`);
        return false;
    }
}

/**
 * TEST 3: Get Available Events
 */
async function testGetAvailableEvents() {
    log.section('TEST 3: Get Available Events');

    try {
        log.test('Fetching available events...');

        const response = await makeRequest('GET', '/api/events/available');

        if (response.status === 200 && response.data.success) {
            const events = response.data.events || [];
            testResults.passed.push(`Available events retrieved (${events.length} found)`);
            log.success(`Found ${events.length} available event(s)`);

            if (events.length > 0) {
                log.info(`Latest event: ${events[0].event_name} (${events[0].event_code})`);
            }
            return true;
        } else {
            testResults.failed.push('Get available events failed');
            log.error('Failed to retrieve events');
            return false;
        }
    } catch (error) {
        testResults.failed.push(`Get available events error: ${error.message}`);
        log.error(`Error: ${error.message}`);
        return false;
    }
}

/**
 * TEST 4: Guest Registration
 */
async function testGuestRegistration() {
    log.section('TEST 4: Guest Registration');

    if (!testEventCode) {
        testResults.skipped.push('Guest registration (no test event)');
        log.error('Skipped - no test event created');
        return false;
    }

    try {
        log.test('Registering test guest...');

        const guestData = {
            name: 'John Doe E2E Test',
            email: `test-${Date.now()}@example.com`,
            phone: '+1234567890',
            address: '123 Test Street',
            company: 'Test Company',
            category: 'Regular',
            event_code: testEventCode
        };

        const response = await makeRequest('POST', '/api/guests/register', guestData);

        if (response.status === 201 && response.data.success) {
            testGuestCode = response.data.guest.guest_code;
            testResults.passed.push('Guest registration successful');
            log.success(`Guest registered: ${guestData.name}`);
            log.info(`Guest code: ${testGuestCode}`);
            log.info(`QR code generated: ${response.data.guest.qr_code ? 'Yes' : 'No'}`);
            return true;
        } else {
            testResults.failed.push(`Guest registration failed: ${response.data.message || 'Unknown error'}`);
            log.error(`Failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        testResults.failed.push(`Guest registration error: ${error.message}`);
        log.error(`Error: ${error.message}`);
        return false;
    }
}

/**
 * TEST 5: Check-in Guest
 */
async function testCheckInGuest() {
    log.section('TEST 5: Check-in Guest');

    if (!authToken || !testGuestCode) {
        testResults.skipped.push('Guest check-in (missing prerequisites)');
        log.error('Skipped - missing auth token or guest code');
        return false;
    }

    try {
        log.test('Checking in guest...');

        const response = await makeRequest('POST', '/api/guests/checkin', {
            guest_code: testGuestCode
        }, {
            'Authorization': `Bearer ${authToken}`
        });

        if (response.status === 200 && response.data.success) {
            testResults.passed.push('Guest check-in successful');
            log.success(`Check-in successful: ${response.data.guest.name}`);
            log.info(`Event: ${response.data.guest.event_name}`);
            log.info(`Checked in at: ${response.data.guest.checked_in_at}`);
            return true;
        } else if (response.status === 400 && response.data.message?.includes('already checked in')) {
            testResults.passed.push('Guest check-in validation (already checked in)');
            log.success('Validation working - guest already checked in');
            return true;
        } else {
            testResults.failed.push(`Guest check-in failed: ${response.data.message || 'Unknown error'}`);
            log.error(`Failed: ${JSON.stringify(response.data)}`);
            return false;
        }
    } catch (error) {
        testResults.failed.push(`Guest check-in error: ${error.message}`);
        log.error(`Error: ${error.message}`);
        return false;
    }
}

/**
 * TEST 6: Get Event Statistics
 */
async function testGetEventStats() {
    log.section('TEST 6: Get Event Statistics');

    if (!authToken) {
        testResults.skipped.push('Event statistics (no auth token)');
        log.error('Skipped - no auth token');
        return false;
    }

    try {
        log.test('Fetching event statistics...');

        const response = await makeRequest('GET', '/api/admin/stats', null, {
            'Authorization': `Bearer ${authToken}`
        });

        if (response.status === 200 && response.data.success) {
            testResults.passed.push('Event statistics retrieved');
            const stats = response.data.stats;
            log.success('Statistics retrieved successfully');
            log.info(`Total events: ${stats.totalEvents}`);
            log.info(`Total guests: ${stats.totalGuests}`);
            log.info(`Checked in: ${stats.totalCheckedIn}`);
            return true;
        } else {
            testResults.failed.push('Event statistics failed');
            log.error('Failed to retrieve statistics');
            return false;
        }
    } catch (error) {
        testResults.failed.push(`Event statistics error: ${error.message}`);
        log.error(`Error: ${error.message}`);
        return false;
    }
}

/**
 * TEST 7: Server Health Check
 */
async function testServerHealth() {
    log.section('TEST 7: Server Health Check');

    try {
        log.test('Checking server health...');

        const response = await makeRequest('GET', '/');

        if (response.status === 200 || response.status === 404) {
            testResults.passed.push('Server is responding');
            log.success(`Server responding with status ${response.status}`);
            return true;
        } else {
            testResults.failed.push(`Server health check failed: ${response.status}`);
            log.error(`Unexpected status: ${response.status}`);
            return false;
        }
    } catch (error) {
        testResults.failed.push(`Server health check error: ${error.message}`);
        log.error(`Error: ${error.message}`);
        return false;
    }
}

/**
 * Generate Report
 */
function generateReport() {
    log.section('TEST RESULTS SUMMARY');

    const total = testResults.passed.length + testResults.failed.length + testResults.skipped.length;

    console.log(`${colors.green}✓ PASSED:${colors.reset} ${testResults.passed.length}/${total}`);
    console.log(`${colors.red}✗ FAILED:${colors.reset} ${testResults.failed.length}/${total}`);
    console.log(`${colors.yellow}⊘ SKIPPED:${colors.reset} ${testResults.skipped.length}/${total}`);

    if (testResults.passed.length > 0) {
        console.log(`\n${colors.green}PASSED TESTS:${colors.reset}`);
        testResults.passed.forEach((test, idx) => {
            console.log(`  ${idx + 1}. ${test}`);
        });
    }

    if (testResults.failed.length > 0) {
        console.log(`\n${colors.red}FAILED TESTS:${colors.reset}`);
        testResults.failed.forEach((test, idx) => {
            console.log(`  ${idx + 1}. ${test}`);
        });
    }

    if (testResults.skipped.length > 0) {
        console.log(`\n${colors.yellow}SKIPPED TESTS:${colors.reset}`);
        testResults.skipped.forEach((test, idx) => {
            console.log(`  ${idx + 1}. ${test}`);
        });
    }

    console.log('\n' + colors.blue + '='.repeat(70) + colors.reset);

    const successRate = total > 0 ? Math.round((testResults.passed.length / total) * 100) : 0;

    if (testResults.failed.length === 0 && testResults.skipped.length === 0) {
        console.log(colors.green + '✅ ALL TESTS PASSED' + colors.reset);
        console.log(`Success rate: ${successRate}% (${testResults.passed.length}/${total})`);
    } else if (testResults.failed.length === 0) {
        console.log(colors.yellow + '⚠ TESTS PASSED WITH SKIPS' + colors.reset);
        console.log(`Success rate: ${successRate}% (${testResults.passed.length}/${total})`);
    } else {
        console.log(colors.red + '❌ SOME TESTS FAILED' + colors.reset);
        console.log(`Success rate: ${successRate}% (${testResults.passed.length}/${total})`);
    }

    console.log(colors.blue + '='.repeat(70) + colors.reset + '\n');
}

/**
 * Main Execution
 */
async function main() {
    console.log(`
${colors.cyan}╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║                    END-TO-END FUNCTIONAL TEST                        ║
║                    Event Registration System                         ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝${colors.reset}
`);

    log.info('Testing complete user flow from admin login to guest check-in...\n');

    await testServerHealth();
    await testAdminLogin();
    await testCreateEvent();
    await testGetAvailableEvents();
    await testGuestRegistration();
    await testCheckInGuest();
    await testGetEventStats();

    generateReport();
}

if (require.main === module) {
    main().catch(error => {
        log.error(`Fatal error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { main };
