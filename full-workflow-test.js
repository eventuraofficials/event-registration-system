/**
 * COMPLETE END-TO-END WORKFLOW TEST
 * Tests entire user journey from event creation to check-in
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
let token = null;
let testEventId = null;
let testEventCode = null;
let testGuestCode = null;

console.log('\n🔬 FULL WORKFLOW TEST - ZERO ERRORS VALIDATION\n');
console.log('='.repeat(70) + '\n');

const tests = [];

async function test(name, fn) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        tests.push({ name, passed: true });
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        tests.push({ name, passed: false, error: error.message });
    }
}

async function runFullWorkflow() {
    // ========================================
    // ADMIN WORKFLOW
    // ========================================
    console.log('📋 ADMIN WORKFLOW\n');

    await test('1. Admin Login', async () => {
        const res = await axios.post(`${API_BASE_URL}/admin/login`, {
            username: 'admin',
            password: 'admin123'
        });
        if (!res.data.success || !res.data.token) throw new Error('Login failed');
        token = res.data.token;
    });

    await test('2. Get Admin Profile', async () => {
        const res = await axios.get(`${API_BASE_URL}/admin/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success) throw new Error('Profile fetch failed');
    });

    await test('3. Create Event with QR Code', async () => {
        const res = await axios.post(`${API_BASE_URL}/events`, {
            event_name: 'Full Test Event ' + Date.now(),
            event_code: 'TEST' + Date.now(),
            event_date: '2025-12-31',
            event_time: '18:00:00',
            venue: 'Test Venue',
            description: 'Complete workflow test event',
            max_capacity: 100
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success || !res.data.event.id) throw new Error('Event creation failed');
        testEventId = res.data.event.id;
        testEventCode = res.data.event.event_code;
        if (!res.data.event.event_qr_code) throw new Error('Event QR code not generated');
    });

    await test('4. Get Event Details', async () => {
        const res = await axios.get(`${API_BASE_URL}/events/${testEventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success) throw new Error('Get event failed');
    });

    await test('5. Update Event', async () => {
        const res = await axios.put(`${API_BASE_URL}/events/${testEventId}`, {
            event_name: 'Updated Test Event',
            event_date: '2025-12-31',
            event_time: '19:00:00',
            venue: 'Updated Venue',
            registration_open: 1
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success) throw new Error('Update event failed');
    });

    await test('6. Verify Registration is Open', async () => {
        const res = await axios.get(`${API_BASE_URL}/events/${testEventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success || res.data.event.registration_open !== 1) {
            throw new Error('Registration not open');
        }
    });

    await test('7. Get All Events', async () => {
        const res = await axios.get(`${API_BASE_URL}/events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success || res.data.events.length === 0) throw new Error('Get events failed');
    });

    // ========================================
    // GUEST REGISTRATION WORKFLOW
    // ========================================
    console.log('\n📝 GUEST REGISTRATION WORKFLOW\n');

    await test('8. Get Public Event Info', async () => {
        const res = await axios.get(`${API_BASE_URL}/events/public/${testEventCode}`);
        if (!res.data.success) throw new Error('Get public event failed');
    });

    await test('9. Guest Self-Registration', async () => {
        const res = await axios.post(`${API_BASE_URL}/guests/register`, {
            event_id: testEventId,
            full_name: 'Test Guest User',
            email: 'testguest@example.com',
            contact_number: '09123456789',
            home_address: '123 Test Street',
            company_name: 'Test Company',
            guest_category: 'VIP'
        });
        if (!res.data.success || !res.data.guest.guestCode) throw new Error('Guest registration failed');
        testGuestCode = res.data.guest.guestCode;
        if (!res.data.guest.qrCode) throw new Error('Guest QR code not generated');
    });

    await test('10. Duplicate Registration Prevention', async () => {
        try {
            await axios.post(`${API_BASE_URL}/guests/register`, {
                event_id: testEventId,
                full_name: 'Test Guest User',
                email: 'testguest@example.com',
                contact_number: '09123456789',
                home_address: '123 Test Street',
                company_name: 'Test Company',
                guest_category: 'VIP'
            });
            throw new Error('Duplicate was allowed');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                // Expected behavior
            } else {
                throw error;
            }
        }
    });

    // ========================================
    // CHECK-IN WORKFLOW
    // ========================================
    console.log('\n✅ CHECK-IN WORKFLOW\n');

    await test('11. Verify Guest QR Code', async () => {
        const res = await axios.get(`${API_BASE_URL}/guests/verify`, {
            params: {
                guest_code: testGuestCode,
                event_id: testEventId
            }
        });
        if (!res.data.success || !res.data.guest) throw new Error('QR verification failed');
    });

    await test('12. Perform Check-In', async () => {
        const res = await axios.post(`${API_BASE_URL}/guests/checkin`, {
            guest_code: testGuestCode,
            event_id: testEventId
        });
        if (!res.data.success) throw new Error('Check-in failed');
    });

    await test('13. Prevent Duplicate Check-In', async () => {
        try {
            await axios.post(`${API_BASE_URL}/guests/checkin`, {
                guest_code: testGuestCode,
                event_id: testEventId
            });
            throw new Error('Duplicate check-in was allowed');
        } catch (error) {
            if (error.response && error.response.status === 400) {
                // Expected behavior
            } else {
                throw error;
            }
        }
    });

    // ========================================
    // ADMIN MANAGEMENT WORKFLOW
    // ========================================
    console.log('\n👥 GUEST MANAGEMENT WORKFLOW\n');

    await test('14. Get Guest List for Event', async () => {
        const res = await axios.get(`${API_BASE_URL}/guests/event/${testEventId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success || res.data.guests.length === 0) throw new Error('Get guest list failed');
    });

    await test('15. Get Event Statistics', async () => {
        const res = await axios.get(`${API_BASE_URL}/guests/event/${testEventId}/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success) throw new Error('Get stats failed');
        if (res.data.stats.total < 1 || res.data.stats.attended < 1) {
            throw new Error(`Stats mismatch: total=${res.data.stats.total}, attended=${res.data.stats.attended}`);
        }
    });

    await test('16. Filter Guests (Attended)', async () => {
        const res = await axios.get(`${API_BASE_URL}/guests/event/${testEventId}?status=attended`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success) throw new Error('Filter failed');
    });

    // ========================================
    // SECURITY & AUTH WORKFLOW
    // ========================================
    console.log('\n🔐 SECURITY WORKFLOW\n');

    await test('17. Token Refresh', async () => {
        const res = await axios.post(`${API_BASE_URL}/admin/refresh-token`, {}, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.data.success || !res.data.token) throw new Error('Token refresh failed');
    });

    await test('18. Unauthorized Access Prevention', async () => {
        try {
            await axios.get(`${API_BASE_URL}/events`);
            throw new Error('Unauthorized access was allowed');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                // Expected behavior
            } else {
                throw error;
            }
        }
    });

    await test('19. Invalid Token Rejection', async () => {
        try {
            await axios.get(`${API_BASE_URL}/events`, {
                headers: { 'Authorization': 'Bearer invalid_token' }
            });
            throw new Error('Invalid token was accepted');
        } catch (error) {
            if (error.response && error.response.status === 403) {
                // Expected behavior
            } else {
                throw error;
            }
        }
    });

    // ========================================
    // PUBLIC ENDPOINTS
    // ========================================
    console.log('\n🌐 PUBLIC ENDPOINTS\n');

    await test('20. Get Available Events', async () => {
        const res = await axios.get(`${API_BASE_URL}/events/available`);
        if (!res.data.success) throw new Error('Get available events failed');
    });

    await test('21. Get Check-In Events', async () => {
        const res = await axios.get(`${API_BASE_URL}/events/checkin-available`);
        if (!res.data.success) throw new Error('Get check-in events failed');
    });

    await test('22. API Health Check', async () => {
        const res = await axios.get(`${API_BASE_URL}/health`);
        if (!res.data.success) throw new Error('Health check failed');
    });

    // ========================================
    // RESULTS
    // ========================================
    console.log('\n' + '='.repeat(70));
    console.log('TEST RESULTS');
    console.log('='.repeat(70));

    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    const total = tests.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);
    console.log('='.repeat(70));

    if (failed > 0) {
        console.log('\nFailed Tests:');
        tests.filter(t => !t.passed).forEach(t => {
            console.log(`  - ${t.name}: ${t.error}`);
        });
    }

    if (failed === 0) {
        console.log('\n🎉 ALL TESTS PASSED! ZERO ERRORS! PRODUCTION READY!\n');
        process.exit(0);
    } else {
        console.log('\n⚠️  Some tests failed. Review errors above.\n');
        process.exit(1);
    }
}

runFullWorkflow().catch(error => {
    console.error('\n❌ Test execution failed:', error.message);
    process.exit(1);
});
