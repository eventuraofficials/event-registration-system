const fetch = require('node-fetch');

async function testRegistration() {
    try {
        const response = await fetch('http://localhost:5000/api/guests/self-register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                event_id: 1,
                full_name: 'Test Guest',
                email: 'test@example.com',
                contact_number: '09123456789',
                home_address: 'Test Address',
                company_name: 'Test Company'
            })
        });

        const data = await response.json();

        console.log('='.repeat(60));
        console.log('REGISTRATION TEST RESULT');
        console.log('='.repeat(60));
        console.log('\nResponse Status:', response.status);
        console.log('\nFull Response:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success && data.guest) {
            console.log('\n' + '='.repeat(60));
            console.log('QR CODE CHECK');
            console.log('='.repeat(60));
            console.log('\nGuest Code:', data.guest.guestCode);
            console.log('\nQR Code exists:', data.guest.qrCode ? 'YES ✅' : 'NO ❌');

            if (data.guest.qrCode) {
                console.log('QR Code type:', typeof data.guest.qrCode);
                console.log('QR Code length:', data.guest.qrCode.length, 'characters');
                console.log('QR Code starts with:', data.guest.qrCode.substring(0, 50) + '...');
            }
        }

        console.log('\n' + '='.repeat(60));

        process.exit(0);
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

testRegistration();
