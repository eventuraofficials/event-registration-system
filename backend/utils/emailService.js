const nodemailer = require('nodemailer');

const isEmailEnabled = process.env.EMAIL_ENABLED === 'true';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    });
  }
  return transporter;
}

/**
 * Send QR ticket email to guest after registration
 */
async function sendTicketEmail({ guestName, guestEmail, guestCode, eventName, eventDate, eventTime, venue, qrCodeDataUrl }) {
  if (!isEmailEnabled) return;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) return;

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const formattedTime = eventTime ? eventTime.substring(0, 5) : '';

  // Extract base64 image from data URL
  const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, '');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:30px 0;">
        <tr>
          <td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

              <!-- Header -->
              <tr>
                <td style="background:#4f46e5;padding:28px 32px;text-align:center;">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Registration Confirmed!</h1>
                  <p style="margin:6px 0 0;color:#c7d2fe;font-size:14px;">Your QR ticket is ready</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px;font-size:16px;color:#111;">Hi <strong>${guestName}</strong>,</p>
                  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.6;">
                    You are successfully registered for <strong>${eventName}</strong>. Present the QR code below at the entrance for check-in.
                  </p>

                  <!-- Event Details -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8f8ff;border-radius:8px;padding:16px;margin-bottom:24px;">
                    <tr>
                      <td style="padding:6px 0;">
                        <span style="font-size:13px;color:#888;">Event</span><br>
                        <strong style="font-size:15px;color:#111;">${eventName}</strong>
                      </td>
                    </tr>
                    ${formattedDate ? `<tr><td style="padding:6px 0;border-top:1px solid #e8e8f0;">
                        <span style="font-size:13px;color:#888;">Date</span><br>
                        <strong style="font-size:15px;color:#111;">${formattedDate}${formattedTime ? ' at ' + formattedTime : ''}</strong>
                      </td></tr>` : ''}
                    ${venue ? `<tr><td style="padding:6px 0;border-top:1px solid #e8e8f0;">
                        <span style="font-size:13px;color:#888;">Venue</span><br>
                        <strong style="font-size:15px;color:#111;">${venue}</strong>
                      </td></tr>` : ''}
                    <tr>
                      <td style="padding:6px 0;border-top:1px solid #e8e8f0;">
                        <span style="font-size:13px;color:#888;">Guest Code</span><br>
                        <strong style="font-size:15px;color:#4f46e5;font-family:monospace;">${guestCode}</strong>
                      </td>
                    </tr>
                  </table>

                  <!-- QR Code -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding-bottom:8px;">
                        <img src="cid:qrcode" alt="QR Code" width="200" height="200"
                          style="display:block;border:1px solid #e0e0e0;border-radius:8px;">
                      </td>
                    </tr>
                    <tr>
                      <td align="center">
                        <p style="margin:0;font-size:12px;color:#888;">Screenshot or print this QR code and bring it to the event</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f8f8ff;padding:16px 32px;text-align:center;border-top:1px solid #eee;">
                  <p style="margin:0;font-size:12px;color:#aaa;">This is an automated message. Please do not reply.</p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || `Event Registration <${process.env.EMAIL_USER}>`,
      to: guestEmail,
      subject: `Your Ticket for ${eventName}`,
      html,
      attachments: [{
        filename: 'ticket-qr.png',
        content: base64Data,
        encoding: 'base64',
        cid: 'qrcode'
      }]
    });
    console.log(`✅ Ticket email sent to ${guestEmail}`);
  } catch (err) {
    console.error(`⚠️  Email failed for ${guestEmail}:`, err.message);
    // Non-fatal — registration still succeeds even if email fails
  }
}

module.exports = { sendTicketEmail };
