// Global state
let currentCheckInEvent = null;
let currentUser = null;
let html5QrCode = null;
let stats = {
    totalScanned: 0,
    successCount: 0,
    errorCount: 0
};
let recentCheckIns = [];

// Initialize page
document.addEventListener('DOMContentLoaded', () => {
    // Wire up Enter key on login form
    document.getElementById('checkinPassword').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkinLogin();
    });
    document.getElementById('checkinUsername').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') checkinLogin();
    });

    checkAuth();
});

// ── Authentication ────────────────────────────────────────────────────────────

async function checkAuth() {
    const token = localStorage.getItem('admin_token');
    if (!token || !isTokenValid(token)) {
        localStorage.removeItem('admin_token');
        showLoginGate();
        return;
    }

    try {
        const resp = await fetch(`${API_BASE_URL}/admin/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await resp.json();
        if (!data.success) throw new Error('Invalid session');

        currentUser = data.user;
        hideLoginGate();
        loadEventsAfterAuth();
    } catch {
        localStorage.removeItem('admin_token');
        showLoginGate();
    }
}

async function checkinLogin() {
    const username = document.getElementById('checkinUsername').value.trim();
    const password = document.getElementById('checkinPassword').value;
    const errorEl = document.getElementById('loginGateError');

    errorEl.style.display = 'none';

    if (!username || !password) {
        errorEl.textContent = 'Please enter username and password.';
        errorEl.style.display = 'block';
        return;
    }

    try {
        const resp = await fetch(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await resp.json();

        if (!data.success) {
            errorEl.textContent = data.message || 'Invalid username or password.';
            errorEl.style.display = 'block';
            return;
        }

        localStorage.setItem('admin_token', data.token);
        currentUser = data.user;
        hideLoginGate();
        loadEventsAfterAuth();
    } catch {
        errorEl.textContent = 'Connection error. Please try again.';
        errorEl.style.display = 'block';
    }
}

function checkinLogout() {
    localStorage.removeItem('admin_token');
    currentUser = null;
    resetScanner();
    document.getElementById('eventSelectDropdown').innerHTML = '<option value="">-- Select an Event --</option>';
    showLoginGate();
}

function showLoginGate() {
    document.getElementById('loginGate').style.display = 'flex';
    document.getElementById('headerUserArea').style.display = 'none';
}

function hideLoginGate() {
    document.getElementById('loginGate').style.display = 'none';
    document.getElementById('headerUserArea').style.display = 'flex';
    const userEl = document.getElementById('checkinUserDisplay');
    if (userEl && currentUser) {
        userEl.textContent = currentUser.full_name || currentUser.username;
    }
}

function loadEventsAfterAuth() {
    loadAvailableEventsForCheckIn();

    const urlParams = new URLSearchParams(window.location.search);
    const eventCode = urlParams.get('event');
    if (eventCode) selectEventForCheckIn(eventCode);
}

// Load available events for dropdown
async function loadAvailableEventsForCheckIn() {
    try {
        const response = await fetch(`${API_BASE_URL}/events/checkin-available`);
        const data = await response.json();
        const select = document.getElementById('eventSelectDropdown');

        if (data.success && data.events && data.events.length > 0) {
            select.innerHTML = '<option value="">-- Select an Event --</option>';
            data.events.forEach(event => {
                const option = document.createElement('option');
                option.value = event.event_code;
                const regStatus = event.registration_open ? '✓ Open' : '✗ Closed';
                const formattedDate = typeof formatDate === 'function' ? formatDate(event.event_date) : event.event_date;
                option.textContent = `${event.event_name} (${event.event_code}) - ${formattedDate} [${regStatus}]`;
                select.appendChild(option);
            });
        } else {
            select.innerHTML = '<option value="">-- No Events Available --</option>';
        }
    } catch (error) {
        document.getElementById('eventSelectDropdown').innerHTML = '<option value="">-- Error Loading Events --</option>';
    }
}

// Load event from dropdown selection
function loadEventFromDropdown() {
    const select = document.getElementById('eventSelectDropdown');
    const eventCode = select.value;

    if (eventCode) {
        selectEventForCheckIn(eventCode);
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
        showAlert('Please select an event', 'danger');
        return;
    }

    showLoading();

    try {

        const data = await fetchAPI(API.getEventByCode(eventCode));

        if (!data.success) {
            throw new Error(data.message);
        }

        currentCheckInEvent = data.event;

        // Display event logo if available
        const logoEl = document.getElementById('checkinEventLogo');
        if (logoEl) {
            if (currentCheckInEvent.event_logo) {
                logoEl.src = `/uploads/event-logos/${currentCheckInEvent.event_logo}`;
                logoEl.style.display = 'block';
            } else {
                logoEl.style.display = 'none';
            }
        }

        // Display event name
        document.getElementById('currentEventName').textContent = currentCheckInEvent.event_name;

        // Show scanner section
        document.getElementById('eventSelectSection').classList.remove('active');
        document.getElementById('scannerSection').classList.add('active');

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

    if (typeof Html5Qrcode === 'undefined') {
        showAlert('QR Scanner library failed to load. Please refresh the page.', 'danger');
        return;
    }

    if (!document.getElementById('qr-reader')) {
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

        // Invalidate name-search cache so the updated status shows on next search
        if (cachedGuestList) {
            const cached = cachedGuestList.find(g => g.guest_code === guestCode);
            if (cached) cached.attended = 1;
        }

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

// ── Guest Name Search ─────────────────────────────────────────────────────────

let searchDebounce = null;
let cachedGuestList = null;

function onGuestSearchInput(query) {
    clearTimeout(searchDebounce);
    if (!query || query.trim().length < 2) {
        document.getElementById('guestSearchResults').innerHTML = '';
        return;
    }
    searchDebounce = setTimeout(() => searchGuests(query.trim()), 300);
}

async function searchGuests(query) {
    if (!currentCheckInEvent) return;

    const resultsEl = document.getElementById('guestSearchResults');
    resultsEl.innerHTML = '<p class="empty-state">Searching...</p>';

    try {
        // Load guest list once per event session, then filter client-side
        if (!cachedGuestList) {
            const token = localStorage.getItem('admin_token');
            const resp = await fetch(`${API_BASE_URL}/guests/event/${currentCheckInEvent.id}?slim=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            cachedGuestList = data.success ? data.guests : [];
        }

        const q = query.toLowerCase();
        const matches = cachedGuestList.filter(g =>
            (g.full_name && g.full_name.toLowerCase().includes(q)) ||
            (g.email && g.email.toLowerCase().includes(q)) ||
            (g.contact_number && g.contact_number.includes(q)) ||
            (g.guest_code && g.guest_code.toLowerCase().includes(q))
        ).slice(0, 8);

        if (matches.length === 0) {
            resultsEl.innerHTML = '<p class="empty-state">No guests found</p>';
            return;
        }

        resultsEl.innerHTML = matches.map(g => `
            <div class="guest-result-item" id="gr-${g.id}">
                <div class="guest-result-info">
                    <div class="guest-result-name">${SecurityUtils.escapeHtml(g.full_name)}</div>
                    <div class="guest-result-meta">${SecurityUtils.escapeHtml(g.email || '')}${g.company_name ? ' · ' + SecurityUtils.escapeHtml(g.company_name) : ''}</div>
                </div>
                <span class="guest-result-attended ${g.attended ? 'yes' : 'no'}">
                    ${g.attended ? '✓ Checked In' : 'Not In'}
                </span>
                ${!g.attended ? `<button type="button" class="btn btn-primary guest-result-btn" onclick="checkInFromSearch('${SecurityUtils.escapeHtml(g.guest_code)}', ${g.id})">
                    <i class="fas fa-sign-in-alt"></i> Check In
                </button>` : ''}
            </div>
        `).join('');

    } catch {
        resultsEl.innerHTML = '<p class="empty-state">Search failed. Please try again.</p>';
    }
}

async function checkInFromSearch(guestCode, guestId) {
    showLoading();
    try {
        await performCheckIn(guestCode);
        // Update cached list
        if (cachedGuestList) {
            const g = cachedGuestList.find(x => x.id === guestId);
            if (g) g.attended = 1;
        }
        // Update result row UI
        const row = document.getElementById(`gr-${guestId}`);
        if (row) {
            row.querySelector('.guest-result-attended').className = 'guest-result-attended yes';
            row.querySelector('.guest-result-attended').textContent = '✓ Checked In';
            const btn = row.querySelector('.guest-result-btn');
            if (btn) btn.remove();
        }
    } finally {
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
    cachedGuestList = null;
    document.getElementById('guestSearchInput').value = '';
    document.getElementById('guestSearchResults').innerHTML = '';
    stats = {
        totalScanned: 0,
        successCount: 0,
        errorCount: 0
    };
    recentCheckIns = [];

    // Reset UI
    const logoReset = document.getElementById('checkinEventLogo');
    if (logoReset) { logoReset.style.display = 'none'; logoReset.src = ''; }
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

// Format date and time — MM/DD/YYYY, h:mm A
function formatDateTime(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: '2-digit',
        day: '2-digit',
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

