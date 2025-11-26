/**
 * STATS CARD COMPONENT
 * ====================
 * Display statistics with icon and value
 */

Components.register('StatsCard', function({
    value = '0',
    label = 'Stat',
    icon = 'fa-chart-line',
    trend = '',
    color = 'primary'
}) {
    return `
        <div class="stat-card">
            <div class="stat-icon" style="color: var(--${color})">
                <i class="fas ${icon}"></i>
            </div>
            <div class="stat-content">
                <div class="stat-value">${SecurityUtils.escapeHtml(value)}</div>
                <div class="stat-label">${SecurityUtils.escapeHtml(label)}</div>
                ${trend ? `
                    <div class="stat-trend ${trend.startsWith('+') ? 'trend-up' : 'trend-down'}">
                        <i class="fas fa-${trend.startsWith('+') ? 'arrow-up' : 'arrow-down'}"></i>
                        ${SecurityUtils.escapeHtml(trend)}
                    </div>
                ` : ''}
            </div>
        </div>
    `;
});
