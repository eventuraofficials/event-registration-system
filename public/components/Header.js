/**
 * HEADER COMPONENT
 * ================
 * Reusable header with emerald gradient and icon
 */

Components.register('Header', function({
    title = 'Event Portal',
    subtitle = '',
    icon = 'fa-calendar-check',
    showLogo = 'true'
}) {
    const hasSubtitle = subtitle && subtitle.trim() !== '';
    const displayLogo = showLogo === 'true';

    return `
        <header class="header">
            ${displayLogo ? `
                <div class="header-logo">
                    <i class="fas fa-qrcode"></i>
                </div>
            ` : ''}
            <h1>
                <i class="fas ${icon}"></i> ${SecurityUtils.escapeHtml(title)}
            </h1>
            ${hasSubtitle ? `
                <p class="subtitle">${SecurityUtils.escapeHtml(subtitle)}</p>
            ` : ''}
        </header>
    `;
});
