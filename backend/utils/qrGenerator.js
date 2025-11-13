const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate unique guest code
 */
function generateGuestCode(prefix = 'GUEST') {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

/**
 * Generate QR code data URL
 * @param {string} guestCode - Unique guest identifier
 * @param {number} eventId - Event ID
 * @returns {Promise<string>} Base64 QR code data URL
 */
async function generateQRCode(guestCode, eventId) {
  try {
    // QR code will contain the verification URL
    const qrData = JSON.stringify({
      guestCode: guestCode,
      eventId: eventId,
      timestamp: new Date().toISOString()
    });

    // Generate QR code as data URL
    const qrCodeDataURL = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrCodeDataURL;
  } catch (error) {
    console.error('QR Code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as buffer (for file saving)
 */
async function generateQRCodeBuffer(guestCode, eventId) {
  try {
    const qrData = JSON.stringify({
      guestCode: guestCode,
      eventId: eventId,
      timestamp: new Date().toISOString()
    });

    const qrCodeBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 300,
      margin: 2
    });

    return qrCodeBuffer;
  } catch (error) {
    console.error('QR Code buffer generation error:', error);
    throw new Error('Failed to generate QR code buffer');
  }
}

module.exports = {
  generateGuestCode,
  generateQRCode,
  generateQRCodeBuffer
};
