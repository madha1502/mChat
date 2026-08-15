import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter | null {
    if (!this.transporter) {
      if (config.smtp.user && config.smtp.pass) {
        if (config.smtp.host === 'smtp.gmail.com' || config.smtp.user.includes('@gmail.com')) {
          this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: config.smtp.user,
              pass: config.smtp.pass,
            },
          });
        } else {
          this.transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.port === 465,
            auth: {
              user: config.smtp.user,
              pass: config.smtp.pass,
            },
          });
        }
      }
    }
    return this.transporter;
  }

  /**
   * Sends a styled Love Bubble 6-digit OTP verification email to the user's Gmail
   */
  static async sendOtpEmail({
    email,
    otp,
    name,
    purpose,
  }: {
    email: string;
    otp: string;
    name?: string;
    purpose: 'register' | 'login';
  }): Promise<boolean> {
    const subject =
      purpose === 'register'
        ? `🌸 Welcome to Love Bubble — Your Verification Code is ${otp}`
        : `💖 Love Bubble Login Verification Code: ${otp}`;

    const heading =
      purpose === 'register' ? 'Verify Your Account' : 'Confirm Your Sign In';

    const messageText =
      purpose === 'register'
        ? `Welcome to Love Bubble! Use the 6-digit code below to verify your Gmail address and complete your registration.`
        : `We received a request to sign in to your Love Bubble account. Enter the 6-digit verification code below to continue.`;

    const html = `
      <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; background: #FFF8FA; border-radius: 28px; border: 1px solid #FFE4E9; color: #4A3E3D;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 28px; background: linear-gradient(135deg, #FF758C 0%, #FF7EB3 100%); color: #ffffff; font-size: 28px; box-shadow: 0 8px 20px rgba(255, 117, 140, 0.3);">
            💖
          </div>
          <h2 style="font-size: 24px; font-weight: 800; color: #1E293B; margin: 12px 0 4px 0; letter-spacing: -0.5px;">Love Bubble</h2>
          <p style="font-size: 13px; color: #FF758C; font-weight: 600; margin: 0;">Cute Animated Real-Time Messenger</p>
        </div>

        <div style="background: #ffffff; border-radius: 22px; padding: 24px; box-shadow: 0 4px 15px rgba(244, 114, 182, 0.08); border: 1px solid #FFEBEF; text-align: center;">
          <h3 style="font-size: 18px; font-weight: 700; color: #1E293B; margin-top: 0; margin-bottom: 12px;">${heading}</h3>
          <p style="font-size: 13px; line-height: 1.6; color: #64748B; margin-bottom: 20px;">
            ${name ? `Hi <strong>${name}</strong>,<br/>` : ''}${messageText}
          </p>

          <div style="display: inline-block; background: linear-gradient(135deg, #FFF0F5 0%, #FFE4E9 100%); border: 2px dashed #FF758C; border-radius: 16px; padding: 14px 32px; margin: 10px 0 20px 0;">
            <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #FF5376;">
              ${otp}
            </span>
          </div>

          <p style="font-size: 11px; color: #94A3B8; margin-top: 10px; margin-bottom: 0;">
            ⏳ This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.
          </p>
        </div>

        <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #A89F9E;">
          <p style="margin: 0 0 6px 0;">If you did not request this verification code, you can safely ignore this email.</p>
          <p style="margin: 0; font-weight: 600;">© ${new Date().getFullYear()} Love Bubble Messenger · Real-Time Communication</p>
        </div>
      </div>
    `;

    console.log('\n=======================================================');
    console.log(`📧 [Love Bubble OTP Code] Sending to: ${email}`);
    console.log(`🔑 OTP Code: [ ${otp} ] (Purpose: ${purpose.toUpperCase()})`);
    console.log('=======================================================\n');

    const transporter = this.getTransporter();
    if (transporter) {
      try {
        await transporter.sendMail({
          from: config.smtp.from,
          to: email,
          subject,
          html,
        });
        console.log(`[SMTP] ✅ Successfully delivered OTP email to ${email}`);
        return true;
      } catch (err: any) {
        console.warn(`[SMTP Warning] Could not send via SMTP (${err.message}). Code is logged above for testing.`);
        return true;
      }
    }

    return true;
  }
}
