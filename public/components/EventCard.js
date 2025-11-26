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
    showActions = 'false',
    ctaText = 'Manage',
    ctaAction = ''
}) {
    const attendanceRate = totalGuests > 0 ? Math.round((checkedIn / totalGuests) * 100) : 0;
    const hasActions = showActions === 'true';
    const hasDescription = description && description.trim().length > 0;

    // Determine status badge
    const statusBadge = registrationOpen
        ? '<span class="event-status-badge status-open"><i class="fas fa-check-circle"></i> Open</span>'
        : '<span class="event-status-badge status-closed"><i class="fas fa-times-circle"></i> Closed</span>';

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
