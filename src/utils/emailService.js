const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }

  async sendOTP(to, otp, type = 'verification') {
    try {
      const subject = this.getSubject(type);
      const html = this.getOTPEmailTemplate(otp, type);

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to,
        subject,
        html
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  getSubject(type) {
    switch (type) {
      case 'password_reset':
        return 'Password Reset OTP';
      case 'email_verification':
        return 'Email Verification OTP';
      case 'phone_verification':
        return 'Phone Verification OTP';
      default:
        return 'Verification OTP';
    }
  }

  getOTPEmailTemplate(otp, type) {
    const action = type === 'password_reset' ? 'reset your password' : 'verify your account';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>OTP Verification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #007bff; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .otp-box { background: #007bff; color: white; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>OTP Verification</h1>
          </div>
          <div class="content">
            <p>Hello!</p>
            <p>You have requested to ${action}. Please use the following OTP to complete the process:</p>
            <div class="otp-box">${otp}</div>
            <p><strong>Important:</strong></p>
            <ul>
              <li>This OTP is valid for 5 minutes only</li>
              <li>Do not share this OTP with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            <p>Best regards,<br>Your App Team</p>
          </div>
          <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();
