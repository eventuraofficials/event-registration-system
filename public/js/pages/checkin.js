// Global state
let currentCheckInEvent = null;
let html5QrCode = null;
let stats = {
    totalScanned: 0,
    successCount: 0,
    errorCount: 0
};
let recentCheckIns = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Load available events for dropdown
    loadAvailableEventsForCheckIn();

    // Check if there's an event code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const eventCode = urlParams.get('event');

    if (eventCode) {
        selectEventForCheckIn(eventCode);
    }
});

// Load available events for dropdown
async function loadAvailableEventsForCheckIn() {
    console.log('🔄 Loading events for check-in dropdown...');
    try {
        const response = await fetch(`${API_BASE_URL}/events/checkin-available`);
        console.log('📡 Response status:', response.status);

        const data = await response.json();
        console.log('📊 Events data:', data);

        if (data.success && data.events && data.events.length > 0) {
            const select = document.getElementById('eventSelectDropdown');
            select.innerHTML = '<option value="">-- Select an Event --</option>';

            console.log(`✅ Found ${data.events.length} events`);

            // Show ALL events - staff should be able to check in guests for any event
            data.events.forEach(event => {
                try {
                    const option = document.createElement('option');
                    option.value = event.event_code;
                    // Show registration status in dropdown for clarity
                    const regStatus = event.registration_open ? '✓ Open' : '✗ Closed';

                    // Try to format date, fallback to raw date if formatDate is not available
                    let formattedDate = event.event_date;
                    try {
                        if (typeof formatDate === 'function') {
                            formattedDate = formatDate(event.event_date);
                        }
                    } catch (dateError) {
                        console.warn('formatDate error:', dateError);
                    }

                    option.textContent = `${event.event_name} (${event.event_code}) - ${formattedDate} [${regStatus}]`;
                    select.appendChild(option);
                    console.log(`  ➕ Added: ${event.event_name}`);
                } catch (eventError) {
                    console.error(`  ❌ Error adding event ${event.event_name}:`, eventError);
                }
            });
        } else {
            console.warn('⚠️ No events found in response');
            const select = document.getElementById('eventSelectDropdown');
            select.innerHTML = '<option value="">-- No Events Available --</option>';
        }
    } catch (error) {
        console.error('❌ Error loading events:', error);
        const select = document.getElementById('eventSelectDropdown');
        select.innerHTML = '<option value="">-- Error Loading Events --</option>';
    }
}

// Load event from dropdown selection
function loadEventFromDropdown() {
    const select = document.getElementById('eventSelectDropdown');
    const eventCode = select.value;

    if (eventCode) {
        console.log('📋 Event selected from dropdown:', eventCode);
        selectEventForCheckIn(eventCode);
    } else {
        console.log('⚠️ No event selected');
    }
}

// Note: formatDate is defined in config.js

// Select event for check-in
async function selectEventForCheckIn(eventCode) {
    // If no eventCode passed, try to get from old input field (for backwards compatibility)
    if (!eventCode) {
        const inputField = document.getElementById('checkInEventCode');
        if (inputField) {
            eventCode = inputField.value.trim();
        }
    }

    if (!eventCode) {
        console.error('❌ No event code provided');
        showAlert('Please select an event', 'danger');
        return;
    }

    showLoading();

    try {

        const data = await fetchAPI(API.getEventByCode(eventCode));

        if (!data.success) {
            console.error('API returned success=false:', data.message);
            throw new Error(data.message);
        }

        currentCheckInEvent = data.event;

        // Display event name
        const eventNameElement = document.getElementById('currentEventName');
        if (eventNameElement) {
            eventNameElement.textContent = currentCheckInEvent.event_name;

        } else {
            console.error('❌ currentEventName element not found!');
        }

        // Show scanner section
        const eventSelectSection = document.getElementById('eventSelectSection');
        const scannerSection = document.getElementById('scannerSection');

        if (eventSelectSection && scannerSection) {
            eventSelectSection.classList.remove('active');
            scannerSection.classList.add('active');

        } else {
            console.error('❌ Section elements not found!');
        }

        // Initialize QR scanner
        console.log('🎥 Initializing QR scanner...');
        initializeScanner();

        hideLoading();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to load event', 'danger');
    }
}

// Initialize QR Code Scanner
function initializeScanner() {

    // iOS/Android: camera requires HTTPS (except localhost)
    const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (window.location.protocol !== 'https:' && !isLocalhost) {
        showAlert('⚠️ Camera access requires a secure connection (HTTPS). Please use manual entry below.', 'warning');
        document.querySelector('.manual-input').scrollIntoView({ behavior: 'smooth' });
        return;
    }

    // Check if Html5Qrcode library is loaded
    if (typeof Html5Qrcode === 'undefined') {
        console.error('❌ Html5Qrcode library not loaded!');
        showAlert('QR Scanner library failed to load. Please refresh the page.', 'danger');
        return;
    }

    // Check if qr-reader element exists
    const qrReaderElement = document.getElementById('qr-reader');
    if (!qrReaderElement) {
        console.error('❌ qr-reader element not found!');
        showAlert('Scanner element not found. Please refresh the page.', 'danger');
        return;
    }

    try {
        html5QrCode = new Html5Qrcode("qr-reader");

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
        };

        html5QrCode.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
        ).then(() => {

        }).catch(err => {
            console.error("❌ Scanner initialization error:", err);
            const msg = err && err.toString().includes('Permission')
                ? 'Camera permission denied. Please allow camera access in your browser settings, or use manual entry below.'
                : 'Failed to start camera. Please check camera permissions or use manual entry below.';
            showAlert(msg, 'danger');
            document.querySelector('.manual-input').scrollIntoView({ behavior: 'smooth' });
        });
    } catch (error) {
        console.error('❌ Error creating Html5Qrcode instance:', error);
        showAlert('Failed to initialize scanner. Please use manual entry below.', 'danger');
        document.querySelector('.manual-input').scrollIntoView({ behavior: 'smooth' });
    }
}

// Handle successful QR scan
async function onScanSuccess(decodedText, decodedResult) {
    try {
        // Parse QR code data
        const qrData = JSON.parse(decodedText);
        const { guestCode, eventId } = qrData;

        // Verify it's for the current event
        if (eventId !== currentCheckInEvent.id) {
            throw new Error('QR code is for a different event');
        }

        // Perform check-in
        await performCheckIn(guestCode);

    } catch (error) {
        console.error('QR scan error:', error);
        playErrorSound();
        showAlert('Invalid QR code', 'danger');
        updateStats('error');
    }
}

// Handle scan failure (silent - happens frequently)
function onScanFailure(error) {
    // Silent - this fires constantly while scanning
}

// Perform check-in
async function performCheckIn(guestCode) {
    try {
        // First, get guest details
        const guestData = await fetchAPI(
            `${API.verifyGuest}?guest_code=${guestCode}&event_id=${currentCheckInEvent.id}`
        );

        if (!guestData.success) {
            throw new Error('Guest not found');
        }

        const guest = guestData.guest;

        // Check if already checked in
        if (guest.attended) {
            showScanFlash(guest, 'already-checked-in');
            playErrorSound();
            updateStats('error');
            addRecentCheckIn(guest, false, 'Already checked in');
            return;
        }

        // Perform check-in
        const checkInData = await fetchAPI(API.checkIn, {
            method: 'POST',
            body: JSON.stringify({
                guest_code: guestCode,
                event_id: currentCheckInEvent.id
            })
        });

        if (!checkInData.success) {
            throw new Error(checkInData.message);
        }

        // Success!
        guest.attended = true;
        guest.check_in_time = new Date().toISOString();

        showScanFlash(guest, 'success');
        playSuccessSound();
        updateStats('success');
        addRecentCheckIn(guest, true, 'Checked in successfully');

    } catch (error) {
        console.error('Check-in error:', error);
        playErrorSound();
        showAlert(error.message || 'Check-in failed', 'danger');
        updateStats('error');
    }
}

// Manual check-in
async function manualCheckIn() {
    const guestCode = document.getElementById('manualGuestCode').value.trim();

    if (!guestCode) {
        showAlert('Please enter a guest code', 'danger');
        return;
    }

    showLoading();

    try {
        await performCheckIn(guestCode);
        document.getElementById('manualGuestCode').value = '';
        hideLoading();
    } catch (error) {
        hideLoading();
    }
}

// Show full-screen scan result flash
function showScanFlash(guest, status) {
    const flash = document.getElementById('scanFlash');
    const iconEl = document.getElementById('scanFlashIcon');
    const statusEl = document.getElementById('scanFlashStatus');
    const nameEl = document.getElementById('scanFlashName');
    const subEl = document.getElementById('scanFlashSub');

    flash.className = 'scan-flash active';

    if (status === 'success') {
        flash.classList.add('success');
        iconEl.className = 'fas fa-check-circle';
        statusEl.textContent = 'Check-In Successful!';
        nameEl.textContent = guest.full_name;
        subEl.textContent = guest.company_name || guest.guest_code;
    } else if (status === 'already-checked-in') {
        flash.classList.add('already-in');
        iconEl.className = 'fas fa-user-clock';
        statusEl.textContent = 'Already Checked In';
        nameEl.textContent = guest.full_name;
        subEl.textContent = guest.check_in_time
            ? `Checked in at: ${formatDateTime(guest.check_in_time)}`
            : guest.guest_code;
    } else {
        flash.classList.add('error');
        iconEl.className = 'fas fa-times-circle';
        statusEl.textContent = 'Check-In Failed';
        nameEl.textContent = guest.full_name || '';
        subEl.textContent = 'Invalid QR code or guest not found';
    }

    // Auto-dismiss after 2.5s
    if (flash._timer) clearTimeout(flash._timer);
    flash._timer = setTimeout(hideScanFlash, 2500);
}

// Hide flash overlay
function hideScanFlash() {
    document.getElementById('scanFlash').classList.remove('active');
}

// Update statistics
function updateStats(type) {
    stats.totalScanned++;

    if (type === 'success') {
        stats.successCount++;
        document.getElementById('successStatItem')?.classList.add('stat-success');
    } else if (type === 'error') {
        stats.errorCount++;
        document.getElementById('errorStatItem')?.classList.add('stat-error');
    }

    document.getElementById('totalScanned').textContent = stats.totalScanned;
    document.getElementById('successCount').textContent = stats.successCount;
    document.getElementById('errorCount').textContent = stats.errorCount;
}

// Add to recent check-ins list
function addRecentCheckIn(guest, success, message) {
    const checkIn = {
        guest,
        success,
        message,
        time: new Date()
    };

    recentCheckIns.unshift(checkIn);

    // Keep only last 10
    if (recentCheckIns.length > 10) {
        recentCheckIns.pop();
    }

    renderRecentCheckIns();
}

// Render recent check-ins
function renderRecentCheckIns() {
    const container = document.getElementById('recentCheckIns');

    if (recentCheckIns.length === 0) {
        container.innerHTML = '<p class="empty-state">No check-ins yet</p>';
        return;
    }

    container.innerHTML = recentCheckIns.map(checkIn => `
        <div class="checkin-item ${checkIn.success ? 'success' : 'error'}">
            <div class="checkin-info">
                <div class="checkin-name">${SecurityUtils.escapeHtml(checkIn.guest.full_name)}</div>
                <div class="checkin-details">
                    ${SecurityUtils.escapeHtml(checkIn.guest.company_name || 'No company')} • ${SecurityUtils.escapeHtml(checkIn.guest.guest_code)}
                </div>
            </div>
            <div>
                <div class="checkin-status ${checkIn.success ? 'success' : 'error'}">
                    ${SecurityUtils.escapeHtml(checkIn.message)}
                </div>
                <div class="checkin-time">${formatTime2(checkIn.time)}</div>
            </div>
        </div>
    `).join('');
}

// Reset scanner
function resetScanner() {
    if (html5QrCode) {
        html5QrCode.stop().then(() => {
            html5QrCode = null;
        }).catch(err => {
            console.error('Error stopping scanner:', err);
        });
    }

    // Reset state
    currentCheckInEvent = null;
    stats = {
        totalScanned: 0,
        successCount: 0,
        errorCount: 0
    };
    recentCheckIns = [];

    // Reset UI
    document.getElementById('totalScanned').textContent = '0';
    document.getElementById('successCount').textContent = '0';
    document.getElementById('errorCount').textContent = '0';
    document.getElementById('recentCheckIns').innerHTML = '<p class="empty-state">No check-ins yet</p>';
    document.getElementById('successStatItem')?.classList.remove('stat-success');
    document.getElementById('errorStatItem')?.classList.remove('stat-error');

    // Show event selection
    document.getElementById('scannerSection').classList.remove('active');
    document.getElementById('eventSelectSection').classList.add('active');
}

// Play success sound
function playSuccessSound() {
    const audio = document.getElementById('successSound');
    audio.currentTime = 0;
    audio.play().catch(err => {/* Audio play silently failed */});
}

// Play error sound
function playErrorSound() {
    const audio = document.getElementById('errorSound');
    audio.currentTime = 0;
    audio.play().catch(err => {/* Audio play silently failed */});
}

// Format date and time
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

// Format time only (for recent list)
function formatTime2(date) {
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

