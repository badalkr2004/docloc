import { Resend } from 'resend';
import { env } from '../config/env';

const resend = new Resend(env.RESEND_API_KEY);

export async function sendShareOtpEmail(recipientEmail: string, otp: string): Promise<void> {
  const response = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: recipientEmail,
    subject: 'DocLocker - Your Secure Access Code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111; margin-bottom: 8px;">Secure Access Code</h2>
        <p style="color: #555; font-size: 14px;">
          Someone shared documents with you on DocLocker. Use the code below to access them.
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 12px;">
          This code expires in 10 minutes. If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  });

  if (response.error) {
    throw new Error(`Resend Email Delivery Failed: ${response.error.message}`);
  }
}

export async function sendTwoFactorOtpEmail(recipientEmail: string, otp: string): Promise<void> {
  const response = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: recipientEmail,
    subject: 'DocLocker - Two-Factor Authentication Code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #111; margin-bottom: 8px;">Two-Factor Authentication</h2>
        <p style="color: #555; font-size: 14px;">
          Enter the code below to complete your sign-in to DocLocker.
        </p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111;">${otp}</span>
        </div>
        <p style="color: #888; font-size: 12px;">
          This code expires shortly. If you did not request this, please secure your account immediately.
        </p>
      </div>
    `,
  });

  if (response.error) {
    throw new Error(`Resend 2FA Email Delivery Failed: ${response.error.message}`);
  }
}
