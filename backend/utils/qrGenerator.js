const QRCode = require('qrcode');
const crypto = require('crypto');

function getQrSecret() {
  return process.env.JWT_SECRET || 'event-registration-system-local-dev-secret';
}

function generateSignedQrPayload(guestCode, eventId) {
  const payload = {
    guestCode,
    eventId,
    timestamp: new Date().toISOString()
  };

  const signature = crypto
    .createHmac('sha256', getQrSecret())
    .update(JSON.stringify(payload))
    .digest('hex');

  return JSON.stringify({ ...payload, signature });
}

function verifySignedQrPayload(rawString) {
  try {
    if (!rawString || typeof rawString !== 'string') {
      return { valid: false, error: 'Missing QR payload' };
    }

    const parsed = JSON.parse(rawString);
    const { guestCode, eventId, timestamp, signature } = parsed || {};

    if (!guestCode || eventId === undefined || !timestamp || !signature) {
      return { valid: false, error: 'Invalid QR payload structure' };
    }

    const expectedSignature = crypto
      .createHmac('sha256', getQrSecret())
      .update(JSON.stringify({ guestCode, eventId, timestamp }))
      .digest('hex');

    if (expectedSignature !== signature) {
      return { valid: false, error: 'Invalid QR signature' };
    }

    return {
      valid: true,
      payload: {
        guestCode,
        eventId: Number(eventId),
        timestamp
      }
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

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
    const qrData = generateSignedQrPayload(guestCode, eventId);

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
    const qrData = generateSignedQrPayload(guestCode, eventId);

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
  generateQRCodeBuffer,
  generateSignedQrPayload,
  verifySignedQrPayload
};
