const { Resend } = require('resend');

// Initialize Resend with API key from environment
const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey === 'your_resend_api_key_here') {
    return null;
  }
  return new Resend(apiKey);
};

/**
 * Sends a 6-digit OTP code to the recipient's email address
 * @param {string} toEmail - Recipient email
 * @param {string} otp - 6-digit verification code
 * @param {string} purpose - 'password_reset' or 'login'
 */
async function sendOtpEmail(toEmail, otp, purpose = 'password_reset') {
  const resend = getResendClient();
  const title = purpose === 'login' ? 'Your Login Verification Code' : 'Password Reset Verification Code';
  const subtitle = purpose === 'login' 
    ? 'Use the 6-digit code below to securely sign in to your StockSense account.' 
    : 'We received a request to reset your StockSense password. Use the 6-digit code below:';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
          .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
          .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #4f46e5 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
          .badge { display: inline-block; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 8px; text-transform: uppercase; letter-spacing: 1px; }
          .content { padding: 36px 32px; text-align: center; }
          .title { font-size: 20px; font-weight: 700; color: #0f172a; margin-top: 0; margin-bottom: 8px; }
          .description { font-size: 14px; color: #64748b; line-height: 1.6; margin-bottom: 28px; }
          .otp-box { background: #f0fdf4; border: 2px dashed #22c55e; border-radius: 12px; padding: 20px; margin: 0 auto 28px; display: inline-block; min-width: 260px; }
          .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #15803d; font-family: 'Courier New', Courier, monospace; margin: 0; }
          .expiry { font-size: 12px; color: #94a3b8; margin: 0; }
          .security-note { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.5; text-align: center; }
          .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 class="logo">📦 StockSense</h1>
            <div class="badge">Inventory Security</div>
          </div>
          <div class="content">
            <h2 class="title">${title}</h2>
            <p class="description">${subtitle}</p>
            
            <div class="otp-box">
              <p class="otp-code">${otp}</p>
            </div>
            
            <p class="expiry">⏳ This code will expire in <strong>10 minutes</strong>.</p>
            
            <div class="security-note">
              <p>If you did not request this verification code, please ignore this email or contact your administrator immediately.</p>
            </div>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} StockSense IMS &bull; Next-Gen Inventory Management
          </div>
        </div>
      </body>
    </html>
  `;

  if (!resend) {
    console.log('\n======================================================');
    console.log(`[RESEND NOTICE] No RESEND_API_KEY detected in .env.`);
    console.log(`[DEV OTP CODE] Code for ${toEmail}: >>> ${otp} <<<`);
    console.log(`Add your key to backend/.env: RESEND_API_KEY=re_xxxxxxxxx`);
    console.log('======================================================\n');
    return {
      success: true,
      demo: true,
      otp,
      message: 'Demo mode: Add RESEND_API_KEY in backend/.env to send real emails'
    };
  }

  try {
    const fromAddress = process.env.RESEND_FROM || 'StockSense <onboarding@resend.dev>';
    const result = await resend.emails.send({
      from: fromAddress,
      to: toEmail,
      subject: `[StockSense] Your Verification Code is ${otp}`,
      html: htmlContent
    });

    if (result.error) {
      console.warn(`[RESEND NOTICE]`, result.error.message);
      return {
        success: false,
        error: result.error.message,
        otp // Fallback so user is never locked out if testing with non-registered email
      };
    }

    console.log(`[RESEND SUCCESS] Real email dispatched to ${toEmail}! Message ID:`, result.data?.id);
    return {
      success: true,
      demo: false,
      id: result.data?.id
    };
  } catch (err) {
    console.error(`[RESEND ERROR] Failed to send email to ${toEmail}:`, err);
    return {
      success: false,
      error: err.message,
      otp // Fallback so user is never locked out
    };
  }
}

module.exports = { sendOtpEmail };
