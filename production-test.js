/**
 * Production Readiness Test Script
 * Tests all critical features to ensure system is working correctly
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:5000/api';
let authToken = null;
let testEventId = null;
let testGuestCode = null;

console.log('🧪 Starting Production Readiness Tests...\n');

// Test results
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function logTest(name, passed, message = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${name}${message ? ' - ' + message : ''}`);
    results.tests.push({ name, passed, message });
    if (passed) results.passed++;
    else results.failed++;
}

async function runTests() {
    try {
        // Test 1: Database file exists
        const dbPath = path.join(__dirname, 'data', 'event_registration.db');
        logTest('Database file exists', fs.existsSync(dbPath));

        // Test 2: Server health check
        try {
            const health = await axios.get('http://localhost:5000/api/health');
            logTest('Server health check', health.data.success === true);
        } catch (err) {
            logTest('Server health check', false, 'Server not running');
            console.log('\n❌ Server is not running. Start it with: npm start\n');
            process.exit(1);
        }

        // Test 3: Admin login
        try {
            const login = await axios.post(`${API_BASE_URL}/admin/login`, {
                username: 'admin',
                password: 'admin123'
            });
            authToken = login.data.token;
            logTest('Admin login', login.data.success && authToken, login.data.message);
        } catch (err) {
            logTest('Admin login', false, err.response?.data?.message || err.message);
            return;
        }

        // Test 4: Create event
        try {
            const event = await axios.post(`${API_BASE_URL}/events`, {
                event_name: 'Test Event',
                event_code: 'TEST' + Date.now(),
                event_date: '2025-12-31',
                event_time: '10:00:00',
                venue: 'Test Venue',
                description: 'Test Description'
            }, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            testEventId = event.data.event.id;
            logTest('Create event', event.data.success && testEventId, `Event ID: ${testEventId}`);
        } catch (err) {
            logTest('Create event', false, err.response?.data?.message || err.message);
        }

        // Test 5: Get events
        try {
            const events = await axios.get(`${API_BASE_URL}/events`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            logTest('Get events list', events.data.success && events.data.events.length > 0);
        } catch (err) {
            logTest('Get events list', false, err.response?.data?.message || err.message);
        }

        // Test 6: Guest self-registration
        if (testEventId) {
            try {
                const guest = await axios.post(`${API_BASE_URL}/guests/register`, {
                    event_id: testEventId,
                    full_name: 'Test Guest',
                    email: 'test@example.com',
                    contact_number: '09123456789',
                    home_address: '123 Test St',
                    company_name: 'Test Company',
                    guest_category: 'Regular'
                });
                testGuestCode = guest.data.guest.guestCode;
                logTest('Guest registration', guest.data.success && testGuestCode, `Code: ${testGuestCode}`);
            } catch (err) {
                logTest('Guest registration', false, err.response?.data?.message || err.message);
            }
        }

        // Test 7: Verify guest QR code
        if (testGuestCode && testEventId) {
            try {
                const verify = await axios.get(`${API_BASE_URL}/guests/verify`, {
                    params: {
                        guest_code: testGuestCode,
                        event_id: testEventId
                    }
                });
                logTest('Verify guest QR', verify.data.success);
            } catch (err) {
                logTest('Verify guest QR', false, err.response?.data?.message || err.message);
            }
        }

        // Test 8: Guest check-in
        if (testGuestCode && testEventId) {
            try {
                const checkin = await axios.post(`${API_BASE_URL}/guests/checkin`, {
                    guest_code: testGuestCode,
                    event_id: testEventId
                });
                logTest('Guest check-in', checkin.data.success);
            } catch (err) {
                logTest('Guest check-in', false, err.response?.data?.message || err.message);
            }
        }

        // Test 9: Get guest list
        if (testEventId) {
            try {
                const guests = await axios.get(`${API_BASE_URL}/guests/event/${testEventId}`, {
                    headers: { 'Authorization': `Bearer ${authToken}` }
                });
                logTest('Get guest list', guests.data.success && guests.data.guests.length > 0);
            } catch (err) {
                logTest('Get guest list', false, err.response?.data?.message || err.message);
            }
        }

        // Test 10: Export guest list
        if (testEventId) {
            try {
                const exportResponse = await axios.get(`${API_BASE_URL}/guests/event/${testEventId}/export`, {
                    headers: { 'Authorization': `Bearer ${authToken}` },
                    responseType: 'blob'
                });
                logTest('Export guest list', exportResponse.status === 200 && exportResponse.data.size > 0);
            } catch (err) {
                logTest('Export guest list', false, err.response?.data?.message || err.message);
            }
        }

        // Test 11: Token refresh
        try {
            const refresh = await axios.post(`${API_BASE_URL}/admin/refresh-token`, {}, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
            logTest('Token refresh', refresh.data.success && refresh.data.token);
        } catch (err) {
            logTest('Token refresh', false, err.response?.data?.message || err.message);
        }

        // Test 12: Public event endpoint
        try {
            const publicEvent = await axios.get(`${API_BASE_URL}/events/available`);
            logTest('Public events endpoint', publicEvent.data.success);
        } catch (err) {
            logTest('Public events endpoint', false, err.response?.data?.message || err.message);
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('TEST SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Tests: ${results.tests.length}`);
        console.log(`✅ Passed: ${results.passed}`);
        console.log(`❌ Failed: ${results.failed}`);
        console.log(`Success Rate: ${Math.round((results.passed / results.tests.length) * 100)}%`);
        console.log('='.repeat(60));

        if (results.failed === 0) {
            console.log('\n🎉 ALL TESTS PASSED! System is production-ready.\n');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some tests failed. Please fix the issues before deployment.\n');
            process.exit(1);
        }

    } catch (error) {
        console.error('\n❌ Test execution error:', error.message);
        process.exit(1);
    }
}

// Run tests
runTests();
