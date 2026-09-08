Components.register('Footer', function({ year = new Date().getFullYear(), links = '' }) {
    const id = 'ft-' + Math.random().toString(36).slice(2);
    fetch('/api/settings').then(r => r.json()).then(data => {
        const s = data.settings || {};
        const name = s.site_name || 'Event Registration System';
        const text = s.footer_text || 'All rights reserved.';
        const el = document.getElementById(id);
        if (el) el.textContent = String.fromCharCode(169) + ' ' + year + ' ' + name + '. ' + text;
    }).catch(() => {});
    return '<footer class="footer"><p id="' + id + '">' + String.fromCharCode(169) + ' ' + year + ' Event Registration System. All rights reserved.</p></footer>';
});