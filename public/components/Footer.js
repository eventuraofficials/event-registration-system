/**
 * FOOTER COMPONENT
 * ================
 * Reusable footer with copyright and links
 */

Components.register('Footer', function({
    year = new Date().getFullYear(),
    text = 'Event Registration System. All rights reserved.',
    links = ''
}) {
    return `
        <footer class="footer">
            <p>&copy; ${year} ${SecurityUtils.escapeHtml(text)}</p>
            ${links ? `<div class="footer-links">${links}</div>` : ''}
        </footer>
    `;
});
