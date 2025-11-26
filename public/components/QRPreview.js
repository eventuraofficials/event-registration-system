/**
 * QR PREVIEW COMPONENT
 * ====================
 * Display QR code with download/print options
 */

Components.register('QRPreview', function({
    qrCode = '',
    guestCode = '',
    guestName = '',
    eventName = '',
    showActions = 'true'
}) {
    const hasActions = showActions === 'true';

    return `
        <div class="card success-card qr-preview">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>

            <h2>Registration Successful!</h2>
            <p class="success-message">
                Your QR code has been generated. Save or screenshot this for event entry.
            </p>

            <div class="qr-container">
                ${qrCode ? `
                    <img src="${qrCode}" alt="QR Code" class="qr-code-image">
                ` : `
                    <div class="qr-placeholder">
                        <i class="fas fa-qrcode"></i>
                        <p>QR Code will appear here</p>
                    </div>
                `}
                ${guestCode ? `
                    <p class="guest-code">Code: <strong>${SecurityUtils.escapeHtml(guestCode)}</strong></p>
                ` : ''}
            </div>

            ${(guestName || eventName) ? `
                <div class="guest-info">
                    <h3>Details</h3>
                    ${guestName ? `<p><strong>Name:</strong> ${SecurityUtils.escapeHtml(guestName)}</p>` : ''}
                    ${eventName ? `<p><strong>Event:</strong> ${SecurityUtils.escapeHtml(eventName)}</p>` : ''}
                </div>
            ` : ''}

            ${hasActions ? `
                <div class="action-buttons">
                    <button onclick="downloadQRCode()" class="btn btn-primary">
                        <i class="fas fa-download"></i> Download QR Code
                    </button>
                    <button onclick="printQRCode()" class="btn btn-secondary">
                        <i class="fas fa-print"></i> Print
                    </button>
                    <button onclick="window.location.reload()" class="btn btn-outline">
                        <i class="fas fa-plus"></i> Register Another
                    </button>
                </div>
            ` : ''}
        </div>
    `;
});
