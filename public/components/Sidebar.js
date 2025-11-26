/**
 * SIDEBAR COMPONENT
 * =================
 * Navigation sidebar for admin panel
 */

Components.register('Sidebar', function({
    active = 'dashboard'
}) {
    const menuItems = [
        { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard', action: 'showDashboard' },
        { id: 'events', icon: 'fa-calendar-alt', label: 'Events', action: 'showEventsManagement' },
        { id: 'guests', icon: 'fa-users', label: 'Guests', action: 'showGuestsManagement' },
        { id: 'checkin', icon: 'fa-qrcode', label: 'Check-In Scanner', href: 'checkin.html' },
        { id: 'export', icon: 'fa-file-excel', label: 'Export Data', action: 'showExportSection' }
    ];

    return `
        <aside class="sidebar">
            <div class="sidebar-header">
                <i class="fas fa-qrcode sidebar-logo"></i>
                <h2>Admin Panel</h2>
            </div>
            <nav class="sidebar-nav">
                ${menuItems.map(item => `
                    <a
                        href="${item.href || '#'}"
                        class="sidebar-item ${active === item.id ? 'active' : ''}"
                        ${item.action ? `onclick="${item.action}(); return false;"` : ''}
                    >
                        <i class="fas ${item.icon}"></i>
                        <span>${item.label}</span>
                    </a>
                `).join('')}
            </nav>
            <div class="sidebar-footer">
                <a href="#" class="sidebar-item" onclick="logout(); return false;">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </a>
            </div>
        </aside>
    `;
});
