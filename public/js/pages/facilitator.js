let accessToken = '';
let portal = null;
let scanner = null;
let scannerRunning = false;

function apiUrl(path) { return `/api/facilitator-portals/${encodeURIComponent(accessToken)}${path}`; }

async function request(path, options = {}) {
    const response = await fetch(apiUrl(path), options);
    const data = await response.json().catch(() => ({ success: false, message: 'Invalid server response' }));
    if (!response.ok || !data.success) {
        const error = new Error(data.message || `Request failed (${response.status})`);
        error.data = data;
        error.status = response.status;
        throw error;
    }
    return data;
}

function showNotice(message) {
    const element = document.getElementById('notice');
    element.textContent = message;
    element.classList.remove('hidden');
}

function clearNotice() { document.getElementById('notice').classList.add('hidden'); }

function renderPortal(data) {
    portal = data.portal;
    const event = portal.event;
    const branding = event.branding || {};
    document.documentElement.style.setProperty('--primary', branding.colors?.primary || branding.primary || '#0f766e');
    document.documentElement.style.setProperty('--ink', branding.colors?.secondary || branding.secondary || '#0f172a');
    document.documentElement.style.setProperty('--bg', branding.background_color || '#f3f7f6');
    document.title = `${event.name} | Facilitator Check-In`;
    document.getElementById('brandName').textContent = branding.brand_name || 'Facilitator Portal';
    document.getElementById('eventName').textContent = event.name;
    document.getElementById('eventDetails').textContent = [event.date, event.time, event.venue].filter(Boolean).join('  •  ');
    const logoUrl = branding.logo_url || '/assets/images/boh-logo-tight.png';
    if (logoUrl) {
        document.getElementById('clientLogo').src = logoUrl;
        document.getElementById('clientLogo').classList.remove('hidden');
        document.getElementById('eventLogo').src = logoUrl;
        document.getElementById('eventLogo').classList.remove('hidden');
    }
    renderStats(data.portal.stats);
    document.getElementById('loginGate').classList.add('hidden');
    document.getElementById('facilitatorApp').classList.remove('hidden');
}

function renderStats(stats) {
    document.getElementById('registered').textContent = stats.registered;
    document.getElementById('checkedIn').textContent = stats.checked_in;
    document.getElementById('remaining').textContent = stats.remaining;
    document.getElementById('rate').textContent = `${stats.attendance_rate}%`;
}

function renderGuestResult(guest, message = '') {
    const result = document.getElementById('scanResult');
    const checkedIn = Boolean(guest.attended || guest.attendance_status === 'ATTENDED');
    result.className = `result${checkedIn ? '' : ''}`;
    result.innerHTML = `<h3>${checkedIn ? 'ALREADY CHECKED IN' : 'Guest verified'}</h3><p><strong>${escapeText(guest.full_name)}</strong></p><p>${escapeText(guest.email || guest.company || guest.company_name || 'Registered guest')}</p><p>Registration: ${escapeText(guest.registration_status || 'CONFIRMED')}</p><p>Attendance: ${checkedIn ? `Checked in ${escapeText(guest.check_in_time || '')}` : 'Not yet checked in'}</p>${guest.checked_in_by_name ? `<p>Checked-in by: ${escapeText(guest.checked_in_by_name)}</p>` : ''}${message ? `<p>${escapeText(message)}</p>` : ''}${!checkedIn ? '<div class="result-actions"><button id="markAttended" type="button">Mark as attended</button></div>' : ''}`;
    if (!checkedIn) document.getElementById('markAttended').addEventListener('click', () => checkInCurrentGuest());
}

function escapeText(value) { const div = document.createElement('div'); div.textContent = String(value || ''); return div.innerHTML; }

let currentQrPayload = '';
async function verifyQrPayload(payload) {
    currentQrPayload = payload;
    clearNotice();
    try {
        const data = await request('/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qr_payload: payload }) });
        renderGuestResult(data.guest);
    } catch (error) {
        const result = document.getElementById('scanResult');
        result.className = 'result error';
        result.innerHTML = `<h3>QR NOT VALID FOR THIS EVENT</h3><p>${escapeText(error.message)}</p>`;
    }
}

async function checkInCurrentGuest() {
    const button = document.getElementById('markAttended');
    if (button) button.disabled = true;
    try {
        const data = await request('/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ qr_payload: currentQrPayload }) });
        renderGuestResult(data.guest, 'Attendance saved successfully.');
        const refreshed = await request('');
        renderStats(refreshed.portal.stats);
    } catch (error) {
        if (error.data?.already_checked_in && error.data.guest) renderGuestResult(error.data.guest);
        else showNotice(error.message);
        if (button) button.disabled = false;
    }
}

async function searchGuests() {
    const q = document.getElementById('searchInput').value.trim();
    if (!q) return;
    const data = await request(`/guests?q=${encodeURIComponent(q)}`);
    const list = document.getElementById('guestList');
    list.innerHTML = data.guests.length ? data.guests.map(guest => `<article class="guest"><div><strong>${escapeText(guest.full_name)}</strong><small>${escapeText(guest.email || guest.company || guest.company_name || guest.guest_code)}</small><small>${guest.attended ? 'Already checked in' : 'Not checked in'}</small></div>${guest.attended ? '' : `<button type="button" data-code="${escapeText(guest.guest_code)}">Check in</button>`}</article>`).join('') : '<p>No guests found for this event.</p>';
    list.querySelectorAll('button[data-code]').forEach(button => button.addEventListener('click', async () => {
        const code = button.dataset.code;
        try {
            const data = await request('/check-in', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ guest_code: code }) });
            renderGuestResult(data.guest, 'Attendance saved successfully.');
            const refreshed = await request('');
            renderStats(refreshed.portal.stats);
        } catch (error) {
            if (error.data?.already_checked_in && error.data.guest) renderGuestResult(error.data.guest);
            else showNotice(error.message);
        }
    }));
}

async function startScanner() {
    if (scannerRunning || typeof Html5Qrcode === 'undefined') return;
    scanner = new Html5Qrcode('reader');
    try {
        await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 240, height: 240 } }, async (decodedText) => {
            await stopScanner();
            await verifyQrPayload(decodedText);
        }, () => {});
        scannerRunning = true;
    } catch (error) {
        showNotice('Camera access is unavailable. Use guest search or check camera permissions.');
    }
}

async function stopScanner() {
    if (!scanner || !scannerRunning) return;
    try { await scanner.stop(); } catch {}
    scannerRunning = false;
}

function showScanner() { document.getElementById('scannerPanel').classList.remove('hidden'); document.getElementById('searchPanel').classList.add('hidden'); startScanner(); }
function showSearch() { stopScanner(); document.getElementById('scannerPanel').classList.add('hidden'); document.getElementById('searchPanel').classList.remove('hidden'); document.getElementById('searchInput').focus(); }

async function init() {
    const params = new URLSearchParams(window.location.search);
    accessToken = params.get('access') || window.location.pathname.split('/').filter(Boolean).pop();
    if (!accessToken) return showNotice('This facilitator link is missing its access token.');
    try {
        const data = await request('');
        renderPortal(data);
        document.getElementById('scanAction').addEventListener('click', showScanner);
        document.getElementById('searchAction').addEventListener('click', showSearch);
        document.getElementById('listAction').addEventListener('click', showSearch);
        document.getElementById('searchButton').addEventListener('click', searchGuests);
        document.getElementById('searchInput').addEventListener('keydown', event => { if (event.key === 'Enter') searchGuests(); });
        document.getElementById('signOut').addEventListener('click', async () => { await stopScanner(); window.location.href = '/'; });
        await startScanner();
    } catch (error) {
        document.getElementById('loginGate').innerHTML = `<h1>Facilitator access unavailable</h1><p>${escapeText(error.message)}</p>`;
    }
}

document.addEventListener('DOMContentLoaded', init);
