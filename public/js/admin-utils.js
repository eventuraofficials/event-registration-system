// Copy registration link to clipboard
function copyRegistrationLink() {
    const link = window.location.origin + '/index.html';

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(link).then(() => {
            showAlert('✅ Registration link copied to clipboard!', 'success');
        }).catch(() => {
            showAlert('📋 Registration Link: ' + link, 'info');
        });
    } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = link;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();

        try {
            document.execCommand('copy');
            showAlert('✅ Registration link copied!', 'success');
        } catch (err) {
            showAlert('📋 Link: ' + link, 'info');
        }

        document.body.removeChild(textarea);
    }
}
