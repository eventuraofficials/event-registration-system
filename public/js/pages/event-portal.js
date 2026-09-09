let portalContext = null;
let portalIdentifier = null;

function portalToken() {
    return localStorage.getItem('admin_token');
}

function portalHeaders() {
    const token = portalToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

async function portalRequest(path, options = {}) {
    const response = await fetch(path, { ...options, headers: { ...portalHeaders(), ...(options.headers || {}) } });
    const data = await response.json().catch(() => ({ success: false, message: 'Invalid server response' }));
    if (!response.ok || !data.success) throw new Error(data.message || `Request failed (${response.status})`);
    return data;
}

function showPortalNotice(message) {
    const notice = document.getElementById('portalNotice');
    notice.textContent = message;
    notice.classList.remove('hidden');
}

function formatPortalDate(value) {
    if (!value) return 'Date to be announced';
    return new Date(`${String(value).split('T')[0]}T00:00:00`).toLocaleDateString('en-US', { dateStyle: 'long' });
}

function applyPortalBranding(portal) {
    const event = portal.event;
    const branding = event.branding || {};
    const primary = branding.colors?.primary || branding.primary || '#0f766e';
    const secondary = branding.colors?.secondary || branding.secondary || '#0f172a';
    document.documentElement.style.setProperty('--portal-primary', primary);
    document.documentElement.style.setProperty('--portal-secondary', secondary);
    document.documentElement.style.setProperty('--portal-accent', branding.colors?.accent || '#ea6b57');
    document.documentElement.style.setProperty('--portal-bg', branding.background_color || '#f4f7f6');
    document.title = `${event.event_name} | ${branding.brand_name || event.client_slug} Portal`;
    document.getElementById('portalBrandName').textContent = branding.brand_name || event.client_slug || 'Event Portal';
    document.getElementById('eventName').textContent = event.event_name;
    document.getElementById('clientLabel').textContent = branding.tagline || `${branding.brand_name || event.client_slug} Event Portal`;
    document.getElementById('eventMeta').textContent = [formatPortalDate(event.event_date), event.event_time, event.venue].filter(Boolean).join('  •  ');
    const logo = branding.logo_url || '/assets/images/boh-logo-tight.png';
    if (logo) {
        document.getElementById('portalLogo').src = logo;
        document.getElementById('portalLogo').classList.remove('hidden');
        document.getElementById('eventLogo').src = logo;
        document.getElementById('eventLogo').classList.remove('hidden');
    }
    document.getElementById('portalUserName').textContent = `${portal.access.role.replace('_', ' ')} · ${event.event_name}`;
}

function renderStats(stats) {
    document.getElementById('registeredCount').textContent = stats.registered;
    document.getElementById('attendedCount').textContent = stats.attended;
    document.getElementById('remainingCount').textContent = stats.not_attended;
    document.getElementById('reportSummary').textContent = `${stats.attended} of ${stats.registered} registered guests have attended this event.`;
}

function renderAssignments(portal) {
    if (!portal.access.can_manage_assignments) return;
    const panel = document.getElementById('assignmentPanel');
    panel.classList.remove('hidden');
    const render = (target, title, users) => {
        const element = document.getElementById(target);
        element.innerHTML = `<h3>${title}</h3>` + (users.length ? users.map(user => `<div class="assignment"><strong>${SecurityUtils.escapeHtml(user.full_name || user.username)}</strong><span>${SecurityUtils.escapeHtml(user.email || '')}</span></div>`).join('') : '<p>No assigned users.</p>');
    };
    render('facilitatorList', 'Facilitators', portal.facilitators || []);
    render('qcList', 'QC Users', portal.qc_users || []);
}

async function loadGuests() {
    if (!portalContext?.access.can_view_guests) return;
    const params = new URLSearchParams();
    const search = document.getElementById('guestSearch').value.trim();
    const status = document.getElementById('guestStatus').value;
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const data = await portalRequest(`/api/event-portals/${encodeURIComponent(portalIdentifier)}/guests?${params}`);
    const rows = document.getElementById('guestRows');
    rows.innerHTML = data.guests.length ? data.guests.map(guest => `<tr><td>${SecurityUtils.escapeHtml(guest.full_name)}</td><td>${SecurityUtils.escapeHtml(guest.email || '')}</td><td>${SecurityUtils.escapeHtml(guest.company || guest.company_name || '')}</td><td>${guest.attended ? 'Attended' : 'Not attended'}</td><td>${portalContext.access.can_check_in && !guest.attended ? `<button type="button" class="portal-checkin" data-guest-code="${SecurityUtils.escapeHtml(guest.guest_code)}">Check in</button>` : ''}</td></tr>`).join('') : '<tr><td colspan="5">No guests found.</td></tr>';
    rows.querySelectorAll('.portal-checkin').forEach((button) => {
        button.addEventListener('click', async () => {
            button.disabled = true;
            try {
                await portalRequest('/api/guests/checkin', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ event_id: portalContext.event.id, guest_code: button.dataset.guestCode })
                });
                await loadPortal();
            } catch (error) {
                showPortalNotice(error.message);
                button.disabled = false;
            }
        });
    });
}

async function loadPortal() {
    if (!portalToken()) {
        document.getElementById('portalLogin').classList.remove('hidden');
        return;
    }
    const data = await portalRequest(`/api/event-portals/${encodeURIComponent(portalIdentifier)}`);
    portalContext = data.portal;
    document.getElementById('portalLogin').classList.add('hidden');
    document.getElementById('portalContent').classList.remove('hidden');
    applyPortalBranding(portalContext);
    renderStats(portalContext.stats);
    renderAssignments(portalContext);
    if (!portalContext.access.can_view_guests) document.getElementById('guestPanel').classList.add('hidden');
    await loadGuests();
}

document.addEventListener('DOMContentLoaded', () => {
    portalIdentifier = new URLSearchParams(window.location.search).get('event') || window.location.pathname.split('/').filter(Boolean).pop();
    document.getElementById('guestSearch').addEventListener('input', loadGuests);
    document.getElementById('guestStatus').addEventListener('change', loadGuests);
    document.getElementById('refreshButton').addEventListener('click', loadPortal);
    document.getElementById('logoutButton').addEventListener('click', async () => {
        const token = portalToken();
        if (token) await fetch('/api/admin/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
        localStorage.removeItem('admin_token');
        window.location.reload();
    });
    document.getElementById('portalLoginForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const error = document.getElementById('portalLoginError');
        error.classList.add('hidden');
        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('portalUsername').value.trim(),
                    password: document.getElementById('portalPassword').value
                })
            });
            const data = await response.json();
            if (!response.ok || !data.success) throw new Error(data.message || 'Unable to sign in');
            localStorage.setItem('admin_token', data.token);
            await loadPortal();
        } catch (loginError) {
            error.textContent = loginError.message;
            error.classList.remove('hidden');
        }
    });
    loadPortal().catch(error => showPortalNotice(error.message));
});
