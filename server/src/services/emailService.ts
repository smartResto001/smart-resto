import nodemailer from 'nodemailer';

const createTransporter = async () => {
  // If SMTP environment variables are configured, use them
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to test account (Ethereal) for development/demo so email sending never throws errors
  try {
    const testAccount = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (err) {
    console.warn('Failed to create test mail transporter:', err);
    return null;
  }
};

export const isGmailAccount = (email: string): boolean => {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim().toLowerCase();
  const gmailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;
  return gmailRegex.test(trimmed);
};

export const sendWelcomeEmail = async (userEmail: string, userName: string, userRole: string) => {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      console.log(`[Email Notification] Account created email for: ${userEmail}`);
      return;
    }

    const senderEmail = process.env.SMTP_USER || '"SmartResto System" <no-reply@smartresto.com>';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 30px; border-radius: 16px; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 28px;">🍽️ SmartResto</h1>
          <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Smart Restaurant POS & Order Management System</p>
        </div>

        <div style="background-color: #1e293b; padding: 24px; border-radius: 12px; border: 1px solid #334155;">
          <h2 style="color: #38bdf8; margin-top: 0;">Account Created Successfully! 🎉</h2>
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
            Hello <strong>${userName}</strong>,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">
            Welcome to <strong>SmartResto</strong>! Your account has been successfully created with your Gmail address:
          </p>
          
          <div style="background-color: #0f172a; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 4px 0; font-size: 14px;"><strong>Registered Gmail:</strong> <span style="color: #f59e0b;">${userEmail}</span></p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Assigned Role:</strong> <span style="color: #38bdf8;">${userRole}</span></p>
            <p style="margin: 4px 0; font-size: 14px;"><strong>Account Status:</strong> <span style="color: #4ade80;">Active</span></p>
          </div>

          <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">
            You can now log in to SmartResto using your Gmail address and account password.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; color: #64748b; font-size: 12px;">
          <p>© 2026 SmartResto. All rights reserved.</p>
        </div>
      </div>
    `;

    const info = await transporter.sendMail({
      from: senderEmail,
      to: userEmail,
      subject: '🎉 Welcome to SmartResto - Account Created Successfully!',
      html: htmlContent,
    });

    console.log(`✅ Welcome email sent successfully to ${userEmail}. Message ID: ${info.messageId}`);
    if (nodemailer.getTestMessageUrl(info)) {
      console.log(`🔗 Email Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${userEmail}:`, error);
  }
};
