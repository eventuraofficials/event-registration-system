// Global state
let authToken = localStorage.getItem('admin_token');
let currentAdmin = null;
let currentUser = null;
let allEvents = [];
let currentEventGuests = [];

// Helper function to get fresh auth token
function getAuthToken() {
    authToken = localStorage.getItem('admin_token');
    return authToken;
}

// Helper function to get auth headers
function getAuthHeaders() {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }
    return {
        'Authorization': `Bearer ${token}`
    };
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (authToken) {
        verifyTokenAndLoadDashboard();
    } else {
        showLoginScreen();
    }

    // Setup login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);

    // Setup new event form
    document.getElementById('newEventForm').addEventListener('submit', handleCreateEvent);

    // Setup file upload
    document.getElementById('excelFileInput').addEventListener('change', handleFileUpload);

    // Setup search inputs with debounce
    let searchTimeout;
    document.getElementById('eventSearchInput')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => filterEvents(e.target.value), 300);
    });

    document.getElementById('guestSearchInput')?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => filterGuests(e.target.value), 300);
    });
});

// Verify token and load dashboard
async function verifyTokenAndLoadDashboard() {
    try {
        const data = await fetchAPI(`${API_BASE_URL}/admin/profile`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (data.success) {
            currentAdmin = data.user;
            showDashboard();
            loadDashboardData();

            // Start auto token refresh
            if (typeof startTokenRefresh === 'function') {
                startTokenRefresh();
            }
        } else {
            throw new Error('Invalid token');
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        logout();
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    showLoading();

    // Real login with database
    try {
        const data = await fetchAPI(`${API_BASE_URL}/admin/login`, {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        // Save token
        authToken = data.token;
        localStorage.setItem('admin_token', authToken);
        currentAdmin = data.user;

        hideLoading();
        showDashboard();
        loadDashboardData();

        // Warn if still using default admin credentials
        if (currentAdmin.username === 'admin') {
            setTimeout(() => {
                showAlert('⚠️ Security Warning: You are using the default "admin" account. Please change your password immediately in Settings → Change Password.', 'warning');
            }, 1000);
        }

        // Start auto token refresh
        if (typeof startTokenRefresh === 'function') {
            startTokenRefresh();
        }

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Login failed. Please check your credentials or contact system administrator.', 'danger');
    }
}

// Logout
function logout() {
    authToken = null;
    currentAdmin = null;
    localStorage.removeItem('admin_token');

    // Stop auto token refresh
    if (typeof stopTokenRefresh === 'function') {
        stopTokenRefresh();
    }

    showLoginScreen();
}

// Show login screen
function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('dashboardScreen').classList.remove('active');
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');

    // Update admin info
    const adminName = SecurityUtils.escapeHtml(currentAdmin.full_name || currentAdmin.username);

    // Update old sidebar elements (if they exist)
    const adminNameEl = document.getElementById('adminName');
    if (adminNameEl) {
        adminNameEl.textContent = adminName;
    }

    const adminRoleEl = document.getElementById('adminRole');
    if (adminRoleEl) {
        adminRoleEl.textContent = SecurityUtils.escapeHtml(currentAdmin.role.replace('_', ' ').toUpperCase());
    }

    // Update header admin name (new layout)
    const adminNameHeader = document.getElementById('adminNameHeader');
    if (adminNameHeader) {
        adminNameHeader.textContent = adminName;
    }

    // Show Staff nav only for super_admin
    const staffNavLink = document.getElementById('staffNavLink');
    if (staffNavLink) {
        staffNavLink.style.display = currentAdmin.role === 'super_admin' ? 'flex' : 'none';
    }

    // Store as currentUser for settings
    currentUser = currentAdmin;
}

// Load dashboard data
async function loadDashboardData() {
    await loadEvents();
    updateOverviewStats();
    renderTodaysEvents();
    renderRecentActivity();
}

// Load all events
async function loadEvents() {
    try {

        const data = await fetchAPI(`${API_BASE_URL}/events`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (data.success) {
            allEvents = data.events || [];

            renderEventsTable();
            populateEventSelects();
            renderRecentEvents();
        } else {

            allEvents = [];
            renderEventsTable();
        }
    } catch (error) {
        console.error('Failed to load events:', error);
        allEvents = [];
        renderEventsTable();
    }
}

// Update overview stats
function updateOverviewStats() {
    const totalEvents = allEvents.length;
    const totalGuests = allEvents.reduce((sum, event) => sum + parseInt(event.total_guests || 0), 0);
    const totalAttended = allEvents.reduce((sum, event) => sum + parseInt(event.total_attended || 0), 0);
    const attendanceRate = totalGuests > 0 ? Math.round((totalAttended / totalGuests) * 100) : 0;

    document.getElementById('totalEvents').textContent = totalEvents;
    document.getElementById('totalGuests').textContent = totalGuests;
    document.getElementById('totalAttended').textContent = totalAttended;
    document.getElementById('attendanceRate').textContent = attendanceRate + '%';
}

// Render events table
function renderEventsTable() {
    const tbody = document.getElementById('eventsTableBody');

    if (allEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No events found</td></tr>';
        return;
    }

    tbody.innerHTML = allEvents.map(event => `
        <tr>
            <td><strong>${SecurityUtils.escapeHtml(event.event_code)}</strong></td>
            <td>${SecurityUtils.escapeHtml(event.event_name)}</td>
            <td>${formatDate(event.event_date)}</td>
            <td>${SecurityUtils.escapeHtml(event.venue || 'TBA')}</td>
            <td>${event.total_guests || 0} <small>(${event.total_attended || 0} attended)</small></td>
            <td>
                <span class="badge ${event.registration_open ? 'success' : 'danger'}">
                    ${event.registration_open ? 'Open' : 'Closed'}
                </span>
            </td>
            <td>
                <button onclick="viewEvent(${event.id})" class="action-btn view" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button onclick="shareEvent('${event.event_code}')" class="action-btn success" title="Share Event" style="background: #06d6a0;">
                    <i class="fas fa-share-alt"></i>
                </button>
                <button onclick="toggleRegistration(${event.id})" class="action-btn edit" title="Toggle Registration">
                    <i class="fas fa-toggle-on"></i>
                </button>
                <button onclick="cloneEvent(${event.id})" class="action-btn" title="Clone Event" style="color:#6366f1; background:#ede9fe;">
                    <i class="fas fa-copy"></i>
                </button>
                <button onclick="deleteEvent(${event.id}, '${event.event_name}')" class="action-btn delete" title="Delete Event">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Render recent events
function renderRecentEvents() {
    const container = document.getElementById('recentEventsList');
    const recentEvents = allEvents.slice(0, 5);

    if (recentEvents.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #a0aec0;">
                <i class="fas fa-calendar" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
                <p style="margin: 0; font-size: 0.95rem;">No events found</p>
            </div>
        `;
        return;
    }

    container.innerHTML = recentEvents.map(event => {
        const attendanceRate = event.total_guests > 0
            ? Math.round((event.total_attended / event.total_guests) * 100)
            : 0;

        return `
            <div style="padding: 15px; border-bottom: 1px solid #e2e8f0; transition: all 0.2s ease; cursor: pointer;"
                 onmouseover="this.style.background='#f7fafc'"
                 onmouseout="this.style.background='transparent'"
                 onclick="showSection('events')">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                    <h3 style="margin: 0; font-size: 0.95rem; font-weight: 600; color: #2d3748;">
                        ${SecurityUtils.escapeHtml(event.event_name)}
                    </h3>
                    <span class="badge ${event.registration_open ? 'success' : 'warning'}" style="font-size: 0.75rem;">
                        ${event.registration_open ? 'Open' : 'Closed'}
                    </span>
                </div>
                <div style="display: flex; gap: 15px; font-size: 0.85rem; color: #718096;">
                    <span><i class="fas fa-calendar" style="margin-right: 5px;"></i>${formatDate(event.event_date)}</span>
                    <span><i class="fas fa-users" style="margin-right: 5px;"></i>${event.total_guests || 0} guests</span>
                    <span><i class="fas fa-check-circle" style="margin-right: 5px;"></i>${attendanceRate}% attended</span>
                </div>
            </div>
        `;
    }).join('');
}

// Render today's events
function renderTodaysEvents() {
    const container = document.getElementById('todaysEventsList');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todaysEvents = allEvents.filter(event => {
        const eventDate = new Date(event.event_date);
        eventDate.setHours(0, 0, 0, 0);
        return eventDate.getTime() === today.getTime();
    });

    if (todaysEvents.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #a0aec0;">
                <i class="fas fa-calendar-check" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
                <p style="margin: 0; font-size: 0.95rem;">No events scheduled for today</p>
            </div>
        `;
        return;
    }

    container.innerHTML = todaysEvents.map(event => {
        const attendanceRate = event.total_guests > 0
            ? Math.round((event.total_attended / event.total_guests) * 100)
            : 0;

        return `
            <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
                        padding: 20px;
                        border-radius: 12px;
                        margin-bottom: 15px;
                        border-left: 4px solid #667eea;
                        transition: all 0.3s ease;"
                 onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'; this.style.transform='translateX(5px)'"
                 onmouseout="this.style.boxShadow='none'; this.style.transform='translateX(0)'">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                    <h3 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #2d3748;">
                        ${SecurityUtils.escapeHtml(event.event_name)}
                    </h3>
                    <span class="badge success" style="font-size: 0.75rem;">
                        <i class="fas fa-circle" style="font-size: 0.5rem;"></i> Today
                    </span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                    ${event.event_time ? `
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #4a5568;">
                            <i class="fas fa-clock" style="color: #667eea; width: 16px;"></i>
                            <span>${event.event_time}</span>
                        </div>
                    ` : ''}
                    ${event.venue ? `
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.9rem; color: #4a5568;">
                            <i class="fas fa-map-marker-alt" style="color: #667eea; width: 16px;"></i>
                            <span>${SecurityUtils.escapeHtml(event.venue)}</span>
                        </div>
                    ` : ''}
                </div>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 12px 0; border-top: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; margin-bottom: 12px;">
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">${event.total_guests || 0}</div>
                        <div style="font-size: 0.75rem; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">Registered</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 1.5rem; font-weight: 700; color: #48bb78;">${event.total_attended || 0}</div>
                        <div style="font-size: 0.75rem; color: #718096; text-transform: uppercase; letter-spacing: 0.5px;">Checked-In</div>
                    </div>
                </div>
                <button onclick="event.stopPropagation(); showSection('events')"
                        class="btn btn-primary"
                        style="width: 100%; padding: 10px; font-size: 0.9rem;">
                    <i class="fas fa-cog"></i> Manage Event
                </button>
            </div>
        `;
    }).join('');
}

// Render recent activity feed
function renderRecentActivity() {
    const container = document.getElementById('recentActivityList');

    // Collect all activities from events
    let activities = [];

    allEvents.forEach(event => {
        // Add event creation activity
        if (event.created_at) {
            activities.push({
                type: 'event_created',
                icon: 'fa-calendar-plus',
                color: '#667eea',
                title: 'Event Created',
                description: event.event_name,
                timestamp: new Date(event.created_at),
                event: event
            });
        }

        // Add guest registration activities (simulated - you can enhance this with real data)
        if (event.total_guests > 0) {
            activities.push({
                type: 'guests_registered',
                icon: 'fa-user-plus',
                color: '#48bb78',
                title: `${event.total_guests} Guest${event.total_guests > 1 ? 's' : ''} Registered`,
                description: event.event_name,
                timestamp: new Date(event.updated_at || event.created_at),
                event: event
            });
        }

        // Add check-in activities
        if (event.total_attended > 0) {
            activities.push({
                type: 'guests_checkedin',
                icon: 'fa-check-circle',
                color: '#9f7aea',
                title: `${event.total_attended} Guest${event.total_attended > 1 ? 's' : ''} Checked-In`,
                description: event.event_name,
                timestamp: new Date(event.updated_at || event.created_at),
                event: event
            });
        }
    });

    // Sort by timestamp (most recent first)
    activities.sort((a, b) => b.timestamp - a.timestamp);

    // Take only the 10 most recent
    activities = activities.slice(0, 10);

    if (activities.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #a0aec0;">
                <i class="fas fa-clock" style="font-size: 3rem; opacity: 0.3; margin-bottom: 15px;"></i>
                <p style="margin: 0; font-size: 0.95rem;">No recent activities</p>
            </div>
        `;
        return;
    }

    container.innerHTML = activities.map((activity, index) => `
        <div style="display: flex; gap: 15px; padding: 15px; border-bottom: ${index === activities.length - 1 ? 'none' : '1px solid #e2e8f0'}; transition: all 0.2s ease;"
             onmouseover="this.style.background='#f7fafc'"
             onmouseout="this.style.background='transparent'">
            <div style="flex-shrink: 0;">
                <div style="width: 40px; height: 40px; border-radius: 10px; background: ${activity.color}15; display: flex; align-items: center; justify-content: center;">
                    <i class="fas ${activity.icon}" style="color: ${activity.color}; font-size: 1.1rem;"></i>
                </div>
            </div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: 600; font-size: 0.9rem; color: #2d3748; margin-bottom: 4px;">
                    ${activity.title}
                </div>
                <div style="font-size: 0.85rem; color: #718096; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${SecurityUtils.escapeHtml(activity.description)}
                </div>
                <div style="font-size: 0.75rem; color: #a0aec0;">
                    <i class="fas fa-clock" style="margin-right: 4px;"></i>${formatTimeAgo(activity.timestamp)}
                </div>
            </div>
        </div>
    `).join('');
}

// Format time ago helper
function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return formatDate(date);
}

// Populate event select dropdowns
function populateEventSelects() {
    const selects = ['guestEventSelect', 'uploadEventSelect', 'reportEventSelect'];

    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (!select) return;

        select.innerHTML = '<option value="">-- Select Event --</option>' +
            allEvents.map(event =>
                `<option value="${event.id}">${event.event_name} (${event.event_code})</option>`
            ).join('');
    });
}

// Filter events
function filterEvents(searchTerm) {
    const filtered = allEvents.filter(event =>
        event.event_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.event_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.venue?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const tbody = document.getElementById('eventsTableBody');
    // Re-render with filtered events (implementation similar to renderEventsTable)
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.classList.remove('active');
    });

    // Show selected section
    const section = document.getElementById(sectionName + 'Section');
    if (section) section.classList.add('active');

    // Update nav
    document.querySelectorAll('.nav-item, .sidebar-nav-link').forEach(item => {
        item.classList.remove('active');
    });
    const activeNavItem = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeNavItem) activeNavItem.classList.add('active');

    // Load data for sections that need it
    if (sectionName === 'staff') loadStaff();
    if (sectionName === 'settings') loadSettingsProfile();
}

// Show create event form
function showCreateEventForm() {
    document.getElementById('eventsListCard').style.display = 'none';
    document.getElementById('createEventForm').style.display = 'block';

    // Add auto-generate listener to event name
    const eventNameInput = document.getElementById('eventName');
    if (!eventNameInput.dataset.listenerAdded) {
        eventNameInput.addEventListener('input', autoGenerateEventCode);
        eventNameInput.dataset.listenerAdded = 'true';
    }
}

// Auto-generate event code from event name
function autoGenerateEventCode() {
    const eventName = document.getElementById('eventName').value.trim();
    if (!eventName) return;

    // Convert to uppercase and remove special characters
    let code = eventName
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, '') // Remove special chars
        .split(' ')
        .filter(word => word.length > 0)
        .map(word => word.charAt(0)) // Take first letter of each word
        .join('');

    // If code is too short, use first word
    if (code.length < 3) {
        code = eventName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '')
            .substring(0, 10);
    }

    // Add year suffix
    const year = new Date().getFullYear();
    code = code + year;

    document.getElementById('eventCodeInput').value = code;
}

// Manual generate event code button
function generateEventCode() {
    const eventName = document.getElementById('eventName').value.trim();

    if (!eventName) {
        showAlert('Please enter event name first', 'warning');
        document.getElementById('eventName').focus();
        return;
    }

    // Generate random code if event name exists
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const namePart = eventName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6);

    const code = namePart + randomPart;
    document.getElementById('eventCodeInput').value = code;

    showAlert('Event code generated!', 'success');
}

// Hide create event form
function hideCreateEventForm() {
    document.getElementById('eventsListCard').style.display = 'block';
    document.getElementById('createEventForm').style.display = 'none';
    document.getElementById('newEventForm').reset();
}

// Handle create event
async function handleCreateEvent(e) {
    e.preventDefault();

    const maxCapacityValue = document.getElementById('eventMaxCapacity').value;

    const eventData = {
        event_name: document.getElementById('eventName').value,
        event_code: document.getElementById('eventCodeInput').value,
        event_date: document.getElementById('eventDate').value,
        event_time: document.getElementById('eventTime').value || null,
        venue: document.getElementById('eventVenue').value || null,
        description: document.getElementById('eventDescription').value || null,
        max_capacity: maxCapacityValue ? parseInt(maxCapacityValue) : null
    };



    showLoading();

    try {
        const data = await fetchAPI(`${API_BASE_URL}/events`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(eventData)
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        hideLoading();

        // Show Event QR Code modal after successful creation
        if (data.event && data.event.event_qr_code) {
            showEventQRModal(data.event);
        } else {
            showAlert('Event created successfully!', 'success');
        }

        hideCreateEventForm();
        loadEvents();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to create event', 'danger');
    }
}

// Show Event QR Code Modal
function showEventQRModal(event) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'eventDetailsModal';

    // Format date and time for display
    const eventDate = new Date(event.event_date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const eventTime = event.event_time ? formatEventTime(event.event_time) : 'TBA';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px;">
            <div class="modal-header">
                <h2><i class="fas fa-calendar-alt"></i> Event Details - ${SecurityUtils.escapeHtml(event.event_name)}</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body" style="padding: 20px;">
                <!-- Event Details Section -->
                <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                    <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">
                        <i class="fas fa-info-circle"></i> Event Information
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div>
                            <p style="margin: 5px 0;"><strong>Event Name:</strong></p>
                            <p style="margin: 5px 0; color: #555;">${SecurityUtils.escapeHtml(event.event_name)}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Event Code:</strong></p>
                            <p style="margin: 5px 0; color: #555;">${SecurityUtils.escapeHtml(event.event_code)}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Date:</strong></p>
                            <p style="margin: 5px 0; color: #555;">${eventDate}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Time:</strong></p>
                            <p style="margin: 5px 0; color: #555;">${eventTime}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Venue:</strong></p>
                            <p style="margin: 5px 0; color: #555;">${SecurityUtils.escapeHtml(event.venue || 'TBA')}</p>
                        </div>
                        <div>
                            <p style="margin: 5px 0;"><strong>Registration:</strong></p>
                            <p style="margin: 5px 0;">
                                <span class="badge ${event.registration_open === 1 ? 'badge-success' : 'badge-danger'}">
                                    ${event.registration_open === 1 ? 'Open' : 'Closed'}
                                </span>
                            </p>
                        </div>
                    </div>
                    ${event.description ? `
                        <div style="margin-top: 15px;">
                            <p style="margin: 5px 0;"><strong>Description:</strong></p>
                            <p style="margin: 5px 0; color: #555;">${SecurityUtils.escapeHtml(event.description)}</p>
                        </div>
                    ` : ''}
                </div>

                <!-- QR Code Section -->
                <div style="background: white; padding: 30px; border: 2px solid #e3f2fd; border-radius: 8px;">
                    <h3 style="margin: 0 0 20px 0; font-size: 18px; color: #1976d2; text-align: center;">
                        <i class="fas fa-qrcode"></i> Event QR Code
                    </h3>
                    <!-- QR Code Container - Centered -->
                    <div style="display: flex; justify-content: center; margin-bottom: 25px;">
                        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px;">
                            <img src="${event.event_qr_code}" alt="Event QR Code" style="width: 300px; height: 300px; display: block;">
                        </div>
                    </div>
                    <!-- Registration URL - Centered -->
                    <div style="text-align: center;">
                        <p style="margin: 0 0 10px 0; font-weight: 600;">Registration URL</p>
                        <input type="text" value="${event.registration_url || 'http://192.168.1.6:5000/index.html?event=' + event.event_code}"
                               readonly onclick="this.select()"
                               style="width: 100%; max-width: 500px; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px; font-family: monospace; text-align: center;">
                    </div>
                </div>

                <!-- Instructions -->
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin-top: 20px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 16px; color: #1976d2;">
                        <i class="fas fa-lightbulb"></i> How to Use This QR Code
                    </h4>
                    <ol style="margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                        <li>Download or print this QR code</li>
                        <li>Share it with your guests (email, social media, print on flyers)</li>
                        <li>Guests scan the QR code with their phone camera</li>
                        <li>Registration page opens automatically</li>
                        <li>Guests complete registration and receive their entry QR code</li>
                    </ol>
                </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <button onclick="editEventFromModal(${event.id})" class="btn btn-secondary">
                        <i class="fas fa-edit"></i> Edit Event
                    </button>
                </div>
                <div>
                    <button onclick="downloadEventQR('${event.event_name}', '${event.event_qr_code}')" class="btn btn-primary">
                        <i class="fas fa-download"></i> Download QR
                    </button>
                    <button onclick="window.print()" class="btn btn-secondary">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button onclick="this.closest('.modal').remove()" class="btn btn-outline">
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Format time helper
function formatEventTime(timeString) {
    if (!timeString) return 'TBA';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// Edit event from details modal
function editEventFromModal(eventId) {
    // Close the details modal
    const modal = document.getElementById('eventDetailsModal');
    if (modal) modal.remove();

    // Call the existing edit event function
    editEvent(eventId);
}

// Edit event function
async function editEvent(eventId) {
    showLoading();

    try {
        // Fetch event details
        const data = await fetchAPI(`${API_BASE_URL}/events/${eventId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        hideLoading();
        showEditEventModal(data.event);

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to load event details', 'danger');
    }
}

// Show edit event modal
function showEditEventModal(event) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'editEventModal';

    // Format date for input (YYYY-MM-DD)
    const eventDate = event.event_date ? event.event_date.split('T')[0] : '';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h2><i class="fas fa-edit"></i> Edit Event</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="editEventForm">
                    <input type="hidden" id="editEventId" name="editEventId" value="${event.id}">

                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEventName">Event Name *</label>
                            <input type="text" id="editEventName" name="editEventName" value="${event.event_name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEventCode">Event Code</label>
                            <input type="text" id="editEventCode" name="editEventCode" value="${event.event_code}" disabled style="background: #f0f0f0;">
                            <small style="color: #666;">Event code cannot be changed</small>
                        </div>
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label for="editEventDate">Event Date *</label>
                            <input type="date" id="editEventDate" name="editEventDate" value="${eventDate}" required>
                        </div>
                        <div class="form-group">
                            <label for="editEventTime">Event Time</label>
                            <input type="time" id="editEventTime" name="editEventTime" value="${event.event_time || ''}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label for="editEventVenue">Venue</label>
                        <input type="text" id="editEventVenue" name="editEventVenue" value="${event.venue || ''}">
                    </div>

                    <div class="form-group">
                        <label for="editEventDescription">Description</label>
                        <textarea id="editEventDescription" name="editEventDescription" rows="4">${event.description || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label for="editEventMaxCapacity">Maximum Capacity</label>
                        <input type="number" id="editEventMaxCapacity" name="editEventMaxCapacity" min="1" value="${event.max_capacity || ''}" placeholder="Leave empty for unlimited">
                        <small style="color: #666;">Optional: Set maximum number of guests allowed to register</small>
                    </div>

                    <div class="form-group">
                        <label>
                            <input type="checkbox" id="editEventRegistrationOpen" name="editEventRegistrationOpen" ${event.registration_open ? 'checked' : ''}>
                            <span style="margin-left: 8px;">Registration Open</span>
                        </label>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: space-between; align-items: center; margin-top: 20px;">
                        <button type="button" onclick="openFormCustomizer(${event.id})" class="btn btn-secondary">
                            <i class="fas fa-sliders-h"></i> Customize Form
                        </button>
                        <div style="display: flex; gap: 10px;">
                            <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-outline">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-save"></i> Save Changes
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Add event listener after modal is in DOM
    setTimeout(() => {
        const form = document.getElementById('editEventForm');
        if (form) {
            form.addEventListener('submit', handleEditEventSubmit);
        }
    }, 100);
}

// Handle edit event form submission
async function handleEditEventSubmit(e) {
    e.preventDefault();

    // Get form and directly access input elements
    const form = e.target;

    // Direct element access with fallback
    const eventIdInput = form.querySelector('#editEventId') || document.getElementById('editEventId');
    const eventNameInput = form.querySelector('#editEventName') || document.getElementById('editEventName');
    const eventDateInput = form.querySelector('#editEventDate') || document.getElementById('editEventDate');
    const eventTimeInput = form.querySelector('#editEventTime') || document.getElementById('editEventTime');
    const venueInput = form.querySelector('#editEventVenue') || document.getElementById('editEventVenue');
    const descriptionInput = form.querySelector('#editEventDescription') || document.getElementById('editEventDescription');
    const maxCapacityInput = form.querySelector('#editEventMaxCapacity') || document.getElementById('editEventMaxCapacity');
    const registrationOpenInput = form.querySelector('#editEventRegistrationOpen') || document.getElementById('editEventRegistrationOpen');

    const eventId = eventIdInput?.value;

    if (!eventId) {
        showAlert('Event ID not found', 'danger');
        return false;
    }

    const eventData = {
        event_name: eventNameInput?.value,
        event_date: eventDateInput?.value,
        event_time: eventTimeInput?.value || null,
        venue: venueInput?.value || null,
        description: descriptionInput?.value || null,
        max_capacity: maxCapacityInput?.value ? parseInt(maxCapacityInput.value) : null,
        registration_open: registrationOpenInput?.checked ? 1 : 0
    };

    // Validate required fields
    if (!eventData.event_name || !eventData.event_date) {
        showAlert('Event name and date are required', 'danger');
        return false;
    }

    showLoading();

    try {
        const data = await fetchAPI(`${API_BASE_URL}/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(eventData)
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        hideLoading();
        showAlert('Event updated successfully!', 'success');
        document.getElementById('editEventModal')?.remove();
        loadEvents();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to update event', 'danger');
    }

    return false; // Prevent form submission
}

// Open Form Customizer
async function openFormCustomizer(eventId) {
    showLoading();

    try {
        // Fetch event details to get current form config
        const data = await fetchAPI(`${API_BASE_URL}/events/${eventId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        hideLoading();

        // Close edit modal if open
        const editModal = document.getElementById('editEventModal');
        if (editModal) editModal.remove();

        showFormCustomizerModal(data.event);

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to load event details', 'danger');
    }
}

// Show Form Customizer Modal
function showFormCustomizerModal(event) {
    // Parse form config if it's a JSON string
    let formConfig;
    try {
        if (typeof event.registration_form_config === 'string') {
            formConfig = JSON.parse(event.registration_form_config);
        } else {
            formConfig = event.registration_form_config;
        }
    } catch (e) {
        formConfig = null;
    }

    // Use default config if parsing failed or config is null
    formConfig = formConfig || {
        fields: {
            full_name: { enabled: true, required: true, label: 'Full Name' },
            email: { enabled: true, required: true, label: 'Email Address' },
            contact_number: { enabled: true, required: true, label: 'Contact Number' },
            home_address: { enabled: true, required: false, label: 'Home Address' },
            company_name: { enabled: true, required: false, label: 'Company Name' },
            guest_category: { enabled: true, required: false, label: 'Guest Category' }
        },
        custom_fields: []
    };

    // Ensure fields object exists
    if (!formConfig.fields) {
        formConfig.fields = {
            full_name: { enabled: true, required: true, label: 'Full Name' },
            email: { enabled: true, required: true, label: 'Email Address' },
            contact_number: { enabled: true, required: true, label: 'Contact Number' },
            home_address: { enabled: true, required: false, label: 'Home Address' },
            company_name: { enabled: true, required: false, label: 'Company Name' },
            guest_category: { enabled: true, required: false, label: 'Guest Category' }
        };
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'formCustomizerModal';

    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h2><i class="fas fa-sliders-h"></i> Customize Registration Form - ${SecurityUtils.escapeHtml(event.event_name)}</h2>
                <button class="close-btn" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div style="margin-bottom: 20px;">
                    <p style="color: #666; margin-bottom: 15px;">
                        Configure which fields appear on the registration form and whether they are required.
                    </p>

                    <!-- Quick Templates -->
                    <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                        <h3 style="margin: 0 0 10px 0; font-size: 16px;">Quick Templates</h3>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <button type="button" onclick="applyFormTemplate('basic')" class="btn btn-outline btn-sm">
                                <i class="fas fa-user"></i> Basic Info Only
                            </button>
                            <button type="button" onclick="applyFormTemplate('full')" class="btn btn-outline btn-sm">
                                <i class="fas fa-users"></i> Full Details
                            </button>
                            <button type="button" onclick="applyFormTemplate('corporate')" class="btn btn-outline btn-sm">
                                <i class="fas fa-building"></i> Corporate Event
                            </button>
                        </div>
                    </div>

                    <!-- Field Configuration -->
                    <div id="formFieldsConfig">
                        <h3 style="margin: 20px 0 15px 0; font-size: 16px;">Form Fields</h3>
                        <div style="display: grid; gap: 15px;">
                            ${generateFieldConfig('full_name', formConfig.fields.full_name, 'Full Name', true)}
                            ${generateFieldConfig('email', formConfig.fields.email, 'Email Address', true)}
                            ${generateFieldConfig('contact_number', formConfig.fields.contact_number, 'Contact Number', true)}
                            ${generateFieldConfig('home_address', formConfig.fields.home_address, 'Home Address', false)}
                            ${generateFieldConfig('company_name', formConfig.fields.company_name, 'Company Name', false)}
                            ${generateFieldConfig('guest_category', formConfig.fields.guest_category, 'Guest Category', false)}
                        </div>
                    </div>
                </div>

                <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
                    <button type="button" onclick="this.closest('.modal').remove()" class="btn btn-outline">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="button" onclick="saveFormConfiguration(${event.id})" class="btn btn-primary">
                        <i class="fas fa-save"></i> Save Configuration
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

// Generate field configuration HTML
function generateFieldConfig(fieldName, fieldConfig, displayName, isCore) {
    const config = fieldConfig || { enabled: true, required: false, label: displayName };
    const disabledAttr = isCore ? 'disabled title="Core field - cannot be disabled"' : '';
    const checkedEnabled = config.enabled ? 'checked' : '';
    const checkedRequired = config.required ? 'checked' : '';

    return `
        <div style="display: flex; align-items: center; gap: 15px; padding: 15px; background: white; border: 1px solid #ddd; border-radius: 8px;">
            <div style="flex: 1;">
                <label style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                    <input type="checkbox"
                           id="field_enabled_${fieldName}"
                           ${checkedEnabled}
                           ${disabledAttr}
                           onchange="toggleFieldRequired('${fieldName}')">
                    <strong>${displayName}</strong>
                    ${isCore ? '<span style="color: #666; font-size: 12px;">(Core)</span>' : ''}
                </label>
                <input type="text"
                       id="field_label_${fieldName}"
                       value="${config.label}"
                       placeholder="Field Label"
                       style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            </div>
            <div style="min-width: 120px;">
                <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox"
                           id="field_required_${fieldName}"
                           ${checkedRequired}
                           ${!config.enabled ? 'disabled' : ''}>
                    <span>Required</span>
                </label>
            </div>
        </div>
    `;
}

// Toggle field required checkbox
function toggleFieldRequired(fieldName) {
    const enabledCheckbox = document.getElementById(`field_enabled_${fieldName}`);
    const requiredCheckbox = document.getElementById(`field_required_${fieldName}`);

    if (enabledCheckbox && requiredCheckbox) {
        requiredCheckbox.disabled = !enabledCheckbox.checked;
        if (!enabledCheckbox.checked) {
            requiredCheckbox.checked = false;
        }
    }
}

// Apply form template
function applyFormTemplate(templateName) {
    const templates = {
        basic: {
            full_name: { enabled: true, required: true },
            email: { enabled: true, required: true },
            contact_number: { enabled: true, required: true },
            home_address: { enabled: false, required: false },
            company_name: { enabled: false, required: false },
            guest_category: { enabled: false, required: false }
        },
        full: {
            full_name: { enabled: true, required: true },
            email: { enabled: true, required: true },
            contact_number: { enabled: true, required: true },
            home_address: { enabled: true, required: false },
            company_name: { enabled: true, required: false },
            guest_category: { enabled: true, required: false }
        },
        corporate: {
            full_name: { enabled: true, required: true },
            email: { enabled: true, required: true },
            contact_number: { enabled: true, required: true },
            home_address: { enabled: false, required: false },
            company_name: { enabled: true, required: true },
            guest_category: { enabled: false, required: false }
        }
    };

    const template = templates[templateName];
    if (!template) return;

    // Apply template to checkboxes
    Object.keys(template).forEach(fieldName => {
        const enabledCheckbox = document.getElementById(`field_enabled_${fieldName}`);
        const requiredCheckbox = document.getElementById(`field_required_${fieldName}`);

        if (enabledCheckbox && !enabledCheckbox.disabled) {
            enabledCheckbox.checked = template[fieldName].enabled;
        }
        if (requiredCheckbox) {
            requiredCheckbox.disabled = !template[fieldName].enabled;
            requiredCheckbox.checked = template[fieldName].required;
        }
    });

    showAlert(`Applied "${templateName.charAt(0).toUpperCase() + templateName.slice(1)}" template`, 'info');
}

// Save form configuration
async function saveFormConfiguration(eventId) {
    const fields = ['full_name', 'email', 'contact_number', 'home_address', 'company_name', 'guest_category'];

    const formConfig = {
        fields: {},
        custom_fields: []
    };

    fields.forEach(fieldName => {
        const enabledCheckbox = document.getElementById(`field_enabled_${fieldName}`);
        const requiredCheckbox = document.getElementById(`field_required_${fieldName}`);
        const labelInput = document.getElementById(`field_label_${fieldName}`);

        formConfig.fields[fieldName] = {
            enabled: enabledCheckbox ? enabledCheckbox.checked : true,
            required: requiredCheckbox ? requiredCheckbox.checked : false,
            label: labelInput ? labelInput.value : fieldName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
        };
    });

    showLoading();

    try {
        const data = await fetchAPI(`${API_BASE_URL}/events/${eventId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                registration_form_config: formConfig
            })
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        hideLoading();
        showAlert('Form configuration saved successfully!', 'success');
        document.getElementById('formCustomizerModal').remove();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to save form configuration', 'danger');
    }
}

// Download Event QR Code
function downloadEventQR(eventName, qrCodeDataURL) {
    const link = document.createElement('a');
    link.href = qrCodeDataURL;
    link.download = `Event-QR-${eventName.replace(/\s+/g, '-')}.png`;
    link.click();
}

// Toggle registration status
async function toggleRegistration(eventId) {
    showLoading();

    try {
        const data = await fetchAPI(`${API_BASE_URL}/events/${eventId}/toggle-registration`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        hideLoading();
        showAlert('Registration status updated', 'success');
        loadEvents();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to update registration status', 'danger');
    }
}

// View event details with QR code
async function viewEvent(eventId) {
    showLoading();
    try {
        const data = await fetchAPI(`${API_BASE_URL}/events/${eventId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        hideLoading();
        showEventQRModal(data.event);

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to load event details', 'danger');
    }
}

// Share event - opens share page
function shareEvent(eventCode) {
    window.open(`/pages/share-event.html?event=${eventCode}`, '_blank');
}

// Delete event
async function deleteEvent(eventId, eventName) {
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the event "${eventName}"?\n\nThis will also delete all associated guests and registrations.\n\nThis action cannot be undone!`)) {
        return;
    }

    // Double confirmation for safety
    if (!confirm(`FINAL WARNING: Deleting "${eventName}" will permanently remove all data.\n\nClick OK to proceed with deletion.`)) {
        return;
    }

    showLoading();

    try {
        const data = await fetchAPI(`${API_BASE_URL}/events/${eventId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        hideLoading();

        if (data.success) {
            showAlert(`Event "${eventName}" deleted successfully!`, 'success');
            // Reload events list
            await loadDashboardData();
        } else {
            throw new Error(data.message || 'Failed to delete event');
        }
    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to delete event', 'danger');
        console.error('Delete event error:', error);
    }
}

// Load guests for selected event
async function loadGuestsForEvent() {
    const eventId = document.getElementById('guestEventSelect').value;
    const status = document.getElementById('guestStatusFilter').value;

    if (!eventId) {
        document.getElementById('guestsListCard').style.display = 'none';
        return;
    }

    showLoading();

    try {
        let url = `${API_BASE_URL}/guests/event/${eventId}`;
        if (status) {
            url += `?status=${status}`;
        }

        const data = await fetchAPI(url, {
            headers: getAuthHeaders()
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        currentEventGuests = data.guests;
        renderGuestsTable();
        document.getElementById('guestsListCard').style.display = 'block';
        hideLoading();

    } catch (error) {
        hideLoading();
        console.error('Load guests error:', error);
        showAlert(error.message || 'Failed to load guests', 'danger');
    }
}

// Render guests table
function renderGuestsTable() {
    const tbody = document.getElementById('guestsTableBody');

    if (currentEventGuests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No guests found</td></tr>';
        return;
    }

    const categoryColors = { VIP: '#7c3aed', Speaker: '#0284c7', Sponsor: '#d97706', Media: '#dc2626', Regular: '#64748b' };

    tbody.innerHTML = currentEventGuests.map(guest => {
        const cat = guest.guest_category || 'Regular';
        const catColor = categoryColors[cat] || '#64748b';
        return `
        <tr>
            <td><code>${SecurityUtils.escapeHtml(guest.guest_code)}</code></td>
            <td>${SecurityUtils.escapeHtml(guest.full_name)}</td>
            <td>${SecurityUtils.escapeHtml(guest.email || 'N/A')}</td>
            <td>${SecurityUtils.escapeHtml(guest.company_name || 'N/A')}</td>
            <td><span style="background:${catColor}20;color:${catColor};padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:600;">${cat}</span></td>
            <td>
                <span class="badge ${guest.attended ? 'success' : 'warning'}">
                    ${guest.attended ? 'Attended' : 'Pending'}
                </span>
            </td>
            <td>${guest.check_in_time ? formatDateTime(guest.check_in_time) : '—'}</td>
            <td>
                ${guest.email ? `<button onclick="resendTicket(${guest.id})" class="action-btn" title="Resend QR ticket" style="color:#059669;">
                    <i class="fas fa-paper-plane"></i>
                </button>` : ''}
                <button onclick="openEditGuestModal(${guest.id})" class="action-btn" title="Edit" style="color:var(--primary);">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteGuest(${guest.id})" class="action-btn delete" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

// Filter guests
function filterGuests(searchTerm) {
    const tbody = document.getElementById('guestsTableBody');
    if (!tbody) return;

    const term = searchTerm.toLowerCase().trim();
    const filtered = term
        ? currentEventGuests.filter(g =>
            (g.full_name && g.full_name.toLowerCase().includes(term)) ||
            (g.email && g.email.toLowerCase().includes(term)) ||
            (g.contact_number && g.contact_number.includes(term)) ||
            (g.company_name && g.company_name.toLowerCase().includes(term)) ||
            (g.guest_code && g.guest_code.toLowerCase().includes(term))
          )
        : currentEventGuests;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No guests match your search</td></tr>';
        return;
    }

    const categoryColors = { VIP: '#7c3aed', Speaker: '#0284c7', Sponsor: '#d97706', Media: '#dc2626', Regular: '#64748b' };

    tbody.innerHTML = filtered.map(guest => {
        const cat = guest.guest_category || 'Regular';
        const catColor = categoryColors[cat] || '#64748b';
        return `
        <tr>
            <td><code>${SecurityUtils.escapeHtml(guest.guest_code)}</code></td>
            <td>${SecurityUtils.escapeHtml(guest.full_name)}</td>
            <td>${SecurityUtils.escapeHtml(guest.email || 'N/A')}</td>
            <td>${SecurityUtils.escapeHtml(guest.company_name || 'N/A')}</td>
            <td><span style="background:${catColor}20;color:${catColor};padding:2px 8px;border-radius:20px;font-size:0.75rem;font-weight:600;">${cat}</span></td>
            <td>
                <span class="badge ${guest.attended ? 'success' : 'warning'}">
                    ${guest.attended ? 'Attended' : 'Pending'}
                </span>
            </td>
            <td>${guest.check_in_time ? formatDateTime(guest.check_in_time) : '—'}</td>
            <td>
                ${guest.email ? `<button onclick="resendTicket(${guest.id})" class="action-btn" title="Resend QR ticket" style="color:#059669;">
                    <i class="fas fa-paper-plane"></i>
                </button>` : ''}
                <button onclick="openEditGuestModal(${guest.id})" class="action-btn" title="Edit" style="color:var(--primary);">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteGuest(${guest.id})" class="action-btn delete" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

// Delete guest
async function deleteGuest(guestId) {
    if (!confirm('Are you sure you want to delete this guest?')) {
        return;
    }

    showLoading();

    try {
        const data = await fetchAPI(`${API_BASE_URL}/guests/${guestId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!data.success) {
            throw new Error(data.message);
        }

        hideLoading();
        showAlert('Guest deleted successfully', 'success');
        loadGuestsForEvent();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to delete guest', 'danger');
    }
}

// Export guest list to Excel
async function exportGuestList() {
    const eventId = document.getElementById('guestEventSelect').value;
    const status = document.getElementById('guestStatusFilter').value;

    if (!eventId) {
        showAlert('Please select an event first', 'warning');
        return;
    }

    showLoading();

    try {
        // Build URL with status filter if selected
        let url = `${API_BASE_URL}/guests/event/${eventId}/export`;
        if (status) {
            url += `?status=${status}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to export guest list');
        }

        // Get the filename from the response headers or create a default
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'guest-list.xlsx';
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
            if (filenameMatch) {
                filename = filenameMatch[1];
            }
        }

        // Download the file
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(downloadUrl);

        hideLoading();
        showAlert('Guest list exported successfully!', 'success');

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Failed to export guest list', 'danger');
    }
}

// Handle file upload
async function handleFileUpload(e) {
    const file = e.target.files[0];
    const eventId = document.getElementById('uploadEventSelect').value;

    if (!file) return;

    if (!eventId) {
        showAlert('Please select an event first', 'danger');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('event_id', eventId);

    showLoading();
    document.getElementById('uploadProgress').style.display = 'block';
    document.getElementById('progressFill').style.width = '50%';

    try {
        const response = await fetch(`${API_BASE_URL}/guests/upload-excel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });

        const data = await response.json();

        document.getElementById('progressFill').style.width = '100%';

        if (!data.success) {
            throw new Error(data.message);
        }

        // Show results
        document.getElementById('uploadResults').innerHTML = `
            <div class="alert alert-success">
                <h3>Upload Summary</h3>
                <p><strong>Total Rows:</strong> ${data.summary.totalRows}</p>
                <p><strong>Imported:</strong> ${data.summary.imported}</p>
                <p><strong>Failed:</strong> ${data.summary.failed}</p>
                ${data.summary.duplicatesFound > 0 ? `<p><strong>Duplicates Found:</strong> ${data.summary.duplicatesFound}</p>` : ''}
            </div>
        `;
        document.getElementById('uploadResults').style.display = 'block';

        hideLoading();
        setTimeout(() => {
            document.getElementById('uploadProgress').style.display = 'none';
            document.getElementById('progressFill').style.width = '0%';
        }, 2000);

        showAlert('Excel file uploaded successfully!', 'success');
        loadEvents();

    } catch (error) {
        hideLoading();
        document.getElementById('uploadProgress').style.display = 'none';
        showAlert(error.message || 'Upload failed', 'danger');
    }
}

// Download template
function downloadTemplate() {
    const csvContent = "data:text/csv;charset=utf-8,Full Name,Email,Contact Number,Home Address,Company Name\nJohn Doe,john@example.com,09123456789,123 Main St,ABC Corp\nJane Smith,jane@example.com,09987654321,456 Oak Ave,XYZ Inc";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "guest_list_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Export functions
async function exportToExcel() {
    const eventId = document.getElementById('reportEventSelect').value;
    if (!eventId) {
        showAlert('Please select an event', 'danger');
        return;
    }

    showLoading();

    try {
        const response = await fetch(`${API_BASE_URL}/guests/event/${eventId}/export`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to export');
        }

        // Get filename from headers
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'guest-list.xlsx';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="?(.+)"?/);
            if (match) filename = match[1];
        }

        // Download file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        window.URL.revokeObjectURL(url);

        hideLoading();
        showAlert('Excel report exported successfully!', 'success');

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'Export failed', 'danger');
    }
}

async function exportToPDF() {
    const eventId = document.getElementById('reportEventSelect').value;
    if (!eventId) {
        showAlert('Please select an event', 'danger');
        return;
    }

    showLoading();

    try {
        const data = await fetchAPI(`${API_BASE_URL}/guests/event/${eventId}`, {
            headers: getAuthHeaders()
        });

        if (!data.success) throw new Error(data.message);

        const guests = data.guests;
        const event = allEvents.find(e => e.id == eventId);
        const eventName = event ? event.event_name : 'Event';
        const eventDate = event ? formatDate(event.event_date) : '';
        const attended = guests.filter(g => g.attended).length;

        const rows = guests.map((g, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${g.guest_code}</td>
                <td>${g.full_name}</td>
                <td>${g.email || ''}</td>
                <td>${g.contact_number || ''}</td>
                <td>${g.company_name || ''}</td>
                <td style="text-align:center;">${g.attended ? '✓' : ''}</td>
                <td>${g.check_in_time ? formatDateTime(g.check_in_time) : ''}</td>
            </tr>
        `).join('');

        const win = window.open('', '_blank');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${eventName} - Guest List</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #000; }
                    h1 { font-size: 18px; margin-bottom: 4px; }
                    .meta { font-size: 12px; color: #555; margin-bottom: 16px; }
                    .summary { font-size: 13px; margin-bottom: 12px; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th { background: #333; color: #fff; padding: 6px 8px; text-align: left; }
                    td { padding: 5px 8px; border-bottom: 1px solid #ddd; }
                    tr:nth-child(even) { background: #f9f9f9; }
                    @media print { button { display: none; } }
                </style>
            </head>
            <body>
                <h1>${eventName}</h1>
                <div class="meta">${eventDate}${event && event.venue ? ' &bull; ' + event.venue : ''}</div>
                <div class="summary">Total Guests: <strong>${guests.length}</strong> &nbsp;|&nbsp; Attended: <strong>${attended}</strong> &nbsp;|&nbsp; Pending: <strong>${guests.length - attended}</strong></div>
                <table>
                    <thead>
                        <tr>
                            <th>#</th><th>Guest Code</th><th>Full Name</th><th>Email</th>
                            <th>Contact</th><th>Company</th><th>Attended</th><th>Check-in Time</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
                <script>window.onload = function() { window.print(); }<\/script>
            </body>
            </html>
        `);
        win.document.close();
        hideLoading();

    } catch (error) {
        hideLoading();
        showAlert(error.message || 'PDF export failed', 'danger');
    }
}

async function exportToCSV() {
    const eventId = document.getElementById('reportEventSelect').value;
    if (!eventId) {
        showAlert('Please select an event', 'danger');
        return;
    }

    try {
        const data = await fetchAPI(`${API_BASE_URL}/guests/event/${eventId}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!data.success) throw new Error(data.message);

        const guests = data.guests;
        const event = allEvents.find(e => e.id == eventId);

        // Create CSV content
        const csvRows = [
            ['Guest Code', 'Full Name', 'Email', 'Contact Number', 'Company', 'Status', 'Check-in Time'],
            ...guests.map(g => [
                g.guest_code,
                g.full_name,
                g.email || '',
                g.contact_number || '',
                g.company_name || '',
                g.attended ? 'Attended' : 'Not Attended',
                g.check_in_time ? formatDateTime(g.check_in_time) : ''
            ])
        ];

        const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${event.event_code}_attendance_report.csv`;
        link.click();
        window.URL.revokeObjectURL(url);

        showAlert('Report exported successfully!', 'success');

    } catch (error) {
        showAlert(error.message || 'Export failed', 'danger');
    }
}

// Format date time
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

// Note: formatDate is defined in config.js and available globally
// Token validation and cleanup is handled by config.js
// The isTokenValid() and cleanupTokens() functions in config.js handle all token validation

// ===================== CHANGE PASSWORD =====================
async function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPw = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;

    if (!current || !newPw || !confirm) return showAlert('All fields are required', 'danger');
    if (newPw.length < 8) return showAlert('New password must be at least 8 characters', 'danger');
    if (newPw !== confirm) return showAlert('New passwords do not match', 'danger');

    try {
        const data = await fetchAPI(`${API_BASE_URL}/admin/change-password`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ current_password: current, new_password: newPw })
        });
        if (!data.success) throw new Error(data.message);
        showAlert('Password changed successfully!', 'success');
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
    } catch (err) {
        showAlert(err.message || 'Failed to change password', 'danger');
    }
}

// ===================== UPDATE PROFILE =====================
async function updateProfile() {
    const full_name = document.getElementById('profileFullName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    if (!full_name || !email) return showAlert('Name and email are required', 'danger');

    try {
        const data = await fetchAPI(`${API_BASE_URL}/admin/profile`, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name, email })
        });
        if (!data.success) throw new Error(data.message);
        showAlert('Profile updated successfully!', 'success');
        document.querySelector('.app-header-user-name') && (document.querySelector('.app-header-user-name').textContent = full_name);
    } catch (err) {
        showAlert(err.message || 'Failed to update profile', 'danger');
    }
}

function loadSettingsProfile() {
    const nameEl = document.getElementById('profileFullName');
    const emailEl = document.getElementById('profileEmail');
    if (nameEl && currentUser) nameEl.value = currentUser.full_name || '';
    if (emailEl && currentUser) emailEl.value = currentUser.email || '';
}

// ===================== EDIT GUEST =====================
function openEditGuestModal(guestId) {
    const guest = currentEventGuests.find(g => g.id === guestId);
    if (!guest) return;
    document.getElementById('editGuestId').value = guest.id;
    document.getElementById('editGuestName').value = guest.full_name || '';
    document.getElementById('editGuestEmail').value = guest.email || '';
    document.getElementById('editGuestContact').value = guest.contact_number || '';
    document.getElementById('editGuestCompany').value = guest.company_name || '';
    document.getElementById('editGuestCategory').value = guest.guest_category || 'Regular';
    document.getElementById('editGuestModal').style.display = 'flex';
}

function closeEditGuestModal() {
    document.getElementById('editGuestModal').style.display = 'none';
}

async function saveGuestEdit() {
    const id = document.getElementById('editGuestId').value;
    const full_name = document.getElementById('editGuestName').value.trim();
    if (!full_name) return showAlert('Full name is required', 'danger');

    try {
        const data = await fetchAPI(`${API_BASE_URL}/guests/${id}`, {
            method: 'PUT',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({
                full_name,
                email: document.getElementById('editGuestEmail').value.trim(),
                contact_number: document.getElementById('editGuestContact').value.trim(),
                company_name: document.getElementById('editGuestCompany').value.trim(),
                guest_category: document.getElementById('editGuestCategory').value
            })
        });
        if (!data.success) throw new Error(data.message);
        closeEditGuestModal();
        showAlert('Guest updated successfully!', 'success');
        loadGuestsForEvent();
    } catch (err) {
        showAlert(err.message || 'Failed to update guest', 'danger');
    }
}

// ===================== STAFF MANAGEMENT =====================
async function loadStaff() {
    try {
        const data = await fetchAPI(`${API_BASE_URL}/admin/users`, { headers: getAuthHeaders() });
        if (!data.success) throw new Error(data.message);

        const tbody = document.getElementById('staffTableBody');
        if (!tbody) return;

        const roleColors = { super_admin: '#7c3aed', staff: '#0284c7' };
        const roleLabels = { super_admin: 'Super Admin', staff: 'Staff' };

        tbody.innerHTML = data.users.map(u => `
            <tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:12px 16px;">${SecurityUtils.escapeHtml(u.full_name || u.username)}</td>
                <td style="padding:12px 16px; color:#718096;">${SecurityUtils.escapeHtml(u.username)}</td>
                <td style="padding:12px 16px; color:#718096;">${SecurityUtils.escapeHtml(u.email)}</td>
                <td style="padding:12px 16px;">
                    <span style="background:${roleColors[u.role] || '#64748b'}20; color:${roleColors[u.role] || '#64748b'}; padding:3px 10px; border-radius:20px; font-size:0.78rem; font-weight:600;">
                        ${roleLabels[u.role] || u.role}
                    </span>
                </td>
                <td style="padding:12px 16px;">
                    ${u.id !== currentUser.id ? `
                    <button onclick="deleteStaff(${u.id}, '${SecurityUtils.escapeHtml(u.username)}')" class="action-btn delete" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>` : '<span style="font-size:0.8rem; color:#94a3b8;">You</span>'}
                </td>
            </tr>
        `).join('');
    } catch (err) {
        showAlert('Failed to load staff list', 'danger');
    }
}

async function deleteStaff(id, username) {
    if (!confirm(`Delete account "${username}"? This cannot be undone.`)) return;
    try {
        const data = await fetchAPI(`${API_BASE_URL}/admin/users/${id}`, {
            method: 'DELETE', headers: getAuthHeaders()
        });
        if (!data.success) throw new Error(data.message);
        showAlert('Staff account deleted', 'success');
        loadStaff();
    } catch (err) {
        showAlert(err.message || 'Failed to delete staff', 'danger');
    }
}

function openCreateStaffModal() {
    document.getElementById('createStaffModal').style.display = 'flex';
}
function closeCreateStaffModal() {
    document.getElementById('createStaffModal').style.display = 'none';
}

async function createStaffAccount() {
    const full_name = document.getElementById('newStaffName').value.trim();
    const username = document.getElementById('newStaffUsername').value.trim();
    const email = document.getElementById('newStaffEmail').value.trim();
    const password = document.getElementById('newStaffPassword').value;
    const role = document.getElementById('newStaffRole').value;

    if (!username || !email || !password) return showAlert('Username, email and password are required', 'danger');
    if (password.length < 8) return showAlert('Password must be at least 8 characters', 'danger');

    try {
        const data = await fetchAPI(`${API_BASE_URL}/admin/create`, {
            method: 'POST',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password, full_name, role })
        });
        if (!data.success) throw new Error(data.message);
        closeCreateStaffModal();
        showAlert(`Staff account "${username}" created!`, 'success');
        ['newStaffName','newStaffUsername','newStaffEmail','newStaffPassword'].forEach(id => {
            document.getElementById(id).value = '';
        });
        loadStaff();
    } catch (err) {
        showAlert(err.message || 'Failed to create staff account', 'danger');
    }
}

// ===================== RESEND TICKET =====================
async function resendTicket(guestId) {
    if (!confirm('Resend the QR ticket email to this guest?')) return;
    showLoading();
    try {
        const data = await fetchAPI(`${API_BASE_URL}/guests/${guestId}/resend-ticket`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!data.success) throw new Error(data.message);
        hideLoading();
        showAlert('Ticket email sent successfully!', 'success');
    } catch (err) {
        hideLoading();
        showAlert(err.message || 'Failed to resend ticket', 'danger');
    }
}

// ===================== CLONE EVENT =====================
async function cloneEvent(eventId) {
    if (!confirm('Clone this event? A duplicate will be created with "(Copy)" in the name.')) return;
    showLoading();
    try {
        const data = await fetchAPI(`${API_BASE_URL}/events/${eventId}/clone`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        if (!data.success) throw new Error(data.message);
        hideLoading();
        showAlert(`Event cloned: "${data.event.event_name}"`, 'success');
        loadEvents();
    } catch (err) {
        hideLoading();
        showAlert(err.message || 'Failed to clone event', 'danger');
    }
}
