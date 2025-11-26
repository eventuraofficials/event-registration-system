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
        document.getElementById('checkInEventCode').value = eventCode;
        selectEventForCheckIn();
    }
});

// Load available events for dropdown
async function loadAvailableEventsForCheckIn() {
    try {
        const response = await fetch(`${API_BASE_URL}/events/checkin-available`);
        const data = await response.json();

        if (data.success && data.events && data.events.length > 0) {
            const select = document.getElementById('eventSelectDropdown');
            select.innerHTML = '<option value="">-- Select an Event --</option>';

            // Show ALL events - staff should be able to check in guests for any event
            data.events.forEach(event => {
                const option = document.createElement('option');
                option.value = event.event_code;
                // Show registration status in dropdown for clarity
                const regStatus = event.registration_open ? '✓ Open' : '✗ Closed';
                option.textContent = `${event.event_name} (${event.event_code}) - ${formatDate(event.event_date)} [${regStatus}]`;
                select.appendChild(option);
            });
        } else {
            const select = document.getElementById('eventSelectDropdown');
            select.innerHTML = '<option value="">-- No Events Available --</option>';
        }
    } catch (error) {
        const select = document.getElementById('eventSelectDropdown');
        select.innerHTML = '<option value="">-- Error Loading Events --</option>';
    }
}

// Load event from dropdown selection
function loadEventFromDropdown() {
    const select = document.getElementById('eventSelectDropdown');
    const eventCode = select.value;

    if (eventCode) {
        document.getElementById('checkInEventCode').value = eventCode;
        selectEventForCheckIn();
    }
}

// Note: formatDate is defined in config.js

// Select event for check-in
async function selectEventForCheckIn() {
    const eventCode = document.getElementById('checkInEventCode').value.trim();

    if (!eventCode) {
        showAlert('Please enter an event code', 'danger');
        return;
    }

    showLoading();

    try {
        const data = await fetchAPI(API.getEventByCode(eventCode));

        if (!data.success) {
            throw new Error(data.message);
        }

        currentCheckInEvent = data.event;

        // Display event name
        document.getElementById('currentEventName').textContent = currentCheckInEvent.event_name;

        // Show scanner section
        document.getElementById('eventSelectSection').classList.remove('active');
        document.getElementById('scannerSection').classList.add('active');

        // Initialize QR scanner
        initializeScanner();

        hideLoading();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to load event', 'danger');
    }
}

// Initialize QR Code Scanner
function initializeScanner() {
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
    ).catch(err => {
        console.error("Scanner initialization error:", err);
        showAlert('Failed to start camera. Please check camera permissions.', 'danger');
    });
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
            showGuestModal(guest, 'already-checked-in');
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

        showGuestModal(guest, 'success');
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

// Show guest modal
function showGuestModal(guest, status) {
    const modal = document.getElementById('guestModal');
    const detailsDiv = document.getElementById('guestDetails');

    const isSuccess = status === 'success';
    const isAlreadyCheckedIn = status === 'already-checked-in';

    detailsDiv.innerHTML = `
        <div class="guest-detail-card">
            <div class="guest-icon ${isSuccess ? 'success' : 'error'}">
                <i class="fas fa-${isSuccess ? 'check-circle' : 'exclamation-circle'}"></i>
            </div>
            <h2>${isSuccess ? 'Check-In Successful!' : isAlreadyCheckedIn ? 'Already Checked In' : 'Error'}</h2>
            <div class="guest-detail-info">
                <p><strong>Name:</strong> <span>${SecurityUtils.escapeHtml(guest.full_name)}</span></p>
                <p><strong>Company:</strong> <span>${SecurityUtils.escapeHtml(guest.company_name || 'N/A')}</span></p>
                <p><strong>Email:</strong> <span>${SecurityUtils.escapeHtml(guest.email || 'N/A')}</span></p>
                <p><strong>Guest Code:</strong> <span>${SecurityUtils.escapeHtml(guest.guest_code)}</span></p>
                ${isAlreadyCheckedIn ? `
                    <p><strong>Previous Check-in:</strong> <span>${formatDateTime(guest.check_in_time)}</span></p>
                ` : ''}
            </div>
            <div class="modal-actions">
                <button onclick="closeModal()" class="btn btn-primary">
                    <i class="fas fa-check"></i> OK
                </button>
            </div>
        </div>
    `;

    modal.classList.add('active');

    // Auto-close after 3 seconds
    setTimeout(() => {
        closeModal();
    }, 3000);
}

// Close modal
function closeModal() {
    document.getElementById('guestModal').classList.remove('active');
}

// Update statistics
function updateStats(type) {
    stats.totalScanned++;

    if (type === 'success') {
        stats.successCount++;
    } else if (type === 'error') {
        stats.errorCount++;
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

// Close modal when clicking outside
document.getElementById('guestModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'guestModal') {
        closeModal();
    }
});
