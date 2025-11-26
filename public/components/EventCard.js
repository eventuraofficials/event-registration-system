/**
 * EVENT CARD COMPONENT
 * ====================
 * Beautiful card for displaying event information
 */

Components.register('EventCard', function({
    eventName = 'Event Name',
    eventCode = '',
    eventDate = '',
    eventTime = '',
    venue = '',
    description = '',
    totalGuests = 0,
    checkedIn = 0,
    registrationOpen = true,
    showActions = 'false'
}) {
    const attendanceRate = totalGuests > 0 ? Math.round((checkedIn / totalGuests) * 100) : 0;
    const hasActions = showActions === 'true';

    return `
        <div class="card event-card">
            <div class="event-card-header">
                <div>
                    <h3>${SecurityUtils.escapeHtml(eventName)}</h3>
                    ${eventCode ? `<span class="badge badge-info">${SecurityUtils.escapeHtml(eventCode)}</span>` : ''}
                </div>
                <span class="badge ${registrationOpen ? 'badge-success' : 'badge-warning'}">
                    ${registrationOpen ? 'Open' : 'Closed'}
                </span>
            </div>

            <div class="event-card-body">
                ${eventDate ? `
                    <div class="event-detail">
                        <i class="fas fa-calendar"></i>
                        <span>${SecurityUtils.escapeHtml(eventDate)}</span>
                    </div>
                ` : ''}

                ${eventTime ? `
                    <div class="event-detail">
                        <i class="fas fa-clock"></i>
                        <span>${SecurityUtils.escapeHtml(eventTime)}</span>
                    </div>
                ` : ''}

                ${venue ? `
                    <div class="event-detail">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${SecurityUtils.escapeHtml(venue)}</span>
                    </div>
                ` : ''}

                ${description ? `
                    <p class="event-description">${SecurityUtils.escapeHtml(description)}</p>
                ` : ''}

                ${totalGuests > 0 ? `
                    <div class="event-stats">
                        <div class="stat-item">
                            <div class="stat-value">${totalGuests}</div>
                            <div class="stat-label">Total Guests</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${checkedIn}</div>
                            <div class="stat-label">Checked In</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${attendanceRate}%</div>
                            <div class="stat-label">Attendance</div>
                        </div>
                    </div>
                ` : ''}
            </div>

            ${hasActions ? `
                <div class="event-card-actions">
                    <button class="btn btn-sm btn-outline" onclick="editEvent('${eventCode}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-outline" onclick="viewGuests('${eventCode}')">
                        <i class="fas fa-users"></i> Guests
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="shareEvent('${eventCode}')">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
            ` : ''}
        </div>
    `;
});
