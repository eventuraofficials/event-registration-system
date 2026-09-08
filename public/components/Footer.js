/**
 * FOOTER COMPONENT
 * ================
 * Reusable footer with dynamic site name from API
 */
Components.register('Footer', function({
    year = new Date().getFullYear(),
    text = null,
    links = ''
}) {
    const footerId = 'footer-text-' + Math.random().toString(36).slice(2);

    fetch('/api/settings')
        .then(r => r.json())
        .then(data => {
            const s = data.settings || {};
            const siteName = s.site_name || 'Event Registration System';
            const el = document.getElementById(footerId);
            if (el) el.textContent = `© ${year} ${siteName}. All rights reserved.`;
            if (s.font_size) document.documentElement.style.fontSize = s.font_size;
            if (s.font_style) {
                const fonts = {
                    inter: "'Inter', sans-serif",
                    poppins: "'Poppins', sans-serif",
                    roboto: "'Roboto', sans-serif",
                    playfair: "'Playfair Display', serif",
                    montserrat: "'Montserrat', sans-serif"
                };
                document.documentElement.style.fontFamily = fonts[s.font_style] || fonts.inter;
            }
        })
        .catch(() => {});

    return `
        <footer class="footer">
            <p id="${footerId}">© ${year} Event Registration System. All rights reserved.</p>
            ${links ? `<div class="footer-links">${links}</div>` : ''}
        </footer>
    `;
});