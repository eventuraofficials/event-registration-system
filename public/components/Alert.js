/**
 * ALERT COMPONENT
 * ===============
 * Reusable alert messages
 */

Components.register('Alert', function({
    type = 'info',
    message = '',
    icon = '',
    dismissible = 'false'
}) {
    const iconMap = {
        success: 'fa-check-circle',
        info: 'fa-info-circle',
        warning: 'fa-exclamation-triangle',
        danger: 'fa-times-circle'
    };

    const displayIcon = icon || iconMap[type] || iconMap.info;
    const canDismiss = dismissible === 'true';

    return `
        <div class="alert alert-${type}" role="alert">
            <i class="fas ${displayIcon}"></i>
            <span>${SecurityUtils.escapeHtml(message)}</span>
            ${canDismiss ? `
                <button class="alert-close" onclick="this.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            ` : ''}
        </div>
    `;
});
