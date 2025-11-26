/**
 * LOADING SPINNER COMPONENT
 * =========================
 * Reusable loading indicator
 */

Components.register('LoadingSpinner', function({
    text = 'Loading...',
    size = 'default'
}) {
    const spinnerClass = size === 'small' ? 'spinner-sm' : size === 'large' ? 'spinner-lg' : '';

    return `
        <div class="loading-container">
            <div class="spinner ${spinnerClass}"></div>
            ${text ? `<p class="loading-text">${SecurityUtils.escapeHtml(text)}</p>` : ''}
        </div>
    `;
});
