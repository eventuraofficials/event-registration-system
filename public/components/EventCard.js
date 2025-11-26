/**
 * EVENT CARD COMPONENT
 * ====================
 * Premium card for displaying event information with status badges
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
    status = 'upcoming', // upcoming, ongoing, completed, cancelled
    showActions = 'false',
    ctaText = 'Manage',
    ctaAction = ''
}) {
    const attendanceRate = totalGuests > 0 ? Math.round((checkedIn / totalGuests) * 100) : 0;
    const hasActions = showActions === 'true';
    const hasDescription = description && description.trim().length > 0;

    // Smart status badge detection
    let statusBadge = '';
    let statusIcon = '';

    switch(status.toLowerCase()) {
        case 'upcoming':
            statusIcon = 'fa-clock';
            statusBadge = `<span class="status-badge status-badge-upcoming"><i class="fas ${statusIcon}"></i> Upcoming</span>`;
            break;
        case 'ongoing':
            statusIcon = 'fa-play-circle';
            statusBadge = `<span class="status-badge status-badge-ongoing"><i class="fas ${statusIcon}"></i> Ongoing</span>`;
            break;
        case 'completed':
            statusIcon = 'fa-check-circle';
            statusBadge = `<span class="status-badge status-badge-completed"><i class="fas ${statusIcon}"></i> Completed</span>`;
            break;
        case 'cancelled':
            statusIcon = 'fa-times-circle';
            statusBadge = `<span class="status-badge status-badge-cancelled"><i class="fas ${statusIcon}"></i> Cancelled</span>`;
            break;
        default:
            // Fallback to registration status
            statusIcon = registrationOpen ? 'fa-check-circle' : 'fa-times-circle';
            const badgeClass = registrationOpen ? 'status-badge-ongoing' : 'status-badge-completed';
            const badgeText = registrationOpen ? 'Open' : 'Closed';
            statusBadge = `<span class="status-badge ${badgeClass}"><i class="fas ${statusIcon}"></i> ${badgeText}</span>`;
    }

    return `
        <div class="premium-event-card">
            <!-- Title Section -->
            <div class="event-card-title">
                <h3>${SecurityUtils.escapeHtml(eventName)}</h3>
                ${statusBadge}
            </div>

            <!-- Date & Time Section -->
            <div class="event-card-datetime">
                ${eventDate ? `
                    <div class="datetime-item">
                        <i class="fas fa-calendar"></i>
                        <span>${SecurityUtils.escapeHtml(eventDate)}</span>
                    </div>
                ` : ''}
                ${eventTime ? `
                    <div class="datetime-item">
                        <i class="fas fa-clock"></i>
                        <span>${SecurityUtils.escapeHtml(eventTime)}</span>
                    </div>
                ` : ''}
            </div>

            ${venue ? `
                <div class="event-card-venue">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${SecurityUtils.escapeHtml(venue)}</span>
                </div>
            ` : ''}

            <!-- Short Description -->
            ${hasDescription ? `
                <p class="event-card-description">${SecurityUtils.escapeHtml(description)}</p>
            ` : ''}

            <!-- Stats Section (if available) -->
            ${totalGuests > 0 ? `
                <div class="event-card-stats">
                    <div class="stat-mini">
                        <i class="fas fa-users"></i>
                        <span><strong>${totalGuests}</strong> Guests</span>
                    </div>
                    <div class="stat-mini">
                        <i class="fas fa-user-check"></i>
                        <span><strong>${checkedIn}</strong> Checked In</span>
                    </div>
                    <div class="stat-mini">
                        <i class="fas fa-chart-line"></i>
                        <span><strong>${attendanceRate}%</strong> Rate</span>
                    </div>
                </div>
            ` : ''}

            <!-- CTA Button / Actions -->
            ${hasActions ? `
                <div class="event-card-cta">
                    <button class="btn btn-primary" onclick="${ctaAction || `manageEvent('${eventCode}')`}">
                        <i class="fas fa-cog"></i> ${SecurityUtils.escapeHtml(ctaText)}
                    </button>
                    <button class="btn btn-outline btn-sm" onclick="shareEvent('${eventCode}')">
                        <i class="fas fa-share"></i> Share
                    </button>
                </div>
            ` : registrationOpen ? `
                <div class="event-card-cta">
                    <button class="btn btn-primary" onclick="${ctaAction || `registerForEvent('${eventCode}')`}">
                        <i class="fas fa-user-plus"></i> Register Now
                    </button>
                </div>
            ` : ''}
        </div>
    `;
});
