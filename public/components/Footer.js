Components.register('Footer', function({ year = new Date().getFullYear(), links = '' }) {
    const id = 'ft-' + Math.random().toString(36).slice(2);
    window.updateEventFooter = function({ name, text } = {}) {
        const el = document.getElementById(id);
        if (el && (name || text)) el.textContent = String.fromCharCode(169) + ' ' + year + ' ' + (name || 'BOH+ Event Operations and Solution') + '. ' + (text || 'Everything behind the Experience');
    };
    const name = window.OWNER_BRAND_NAME || 'BOH+ Event Operations and Solution';
    return '<footer class="footer"><p id="' + id + '">' + String.fromCharCode(169) + ' ' + year + ' ' + name + '. All rights reserved.</p></footer>';
});