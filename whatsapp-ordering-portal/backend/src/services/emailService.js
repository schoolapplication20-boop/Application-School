/**
 * Email service — uses Resend HTTP API (https://resend.com).
 *
 * Why not nodemailer/SMTP? Cloud providers (Railway, AWS, GCP) commonly
 * block outbound SMTP ports (25 / 465 / 587) to prevent spam.
 * Resend sends over HTTPS (port 443) which is always open.
 *
 * Setup: add RESEND_API_KEY=re_xxxx to Railway environment variables.
 * Free tier: 3,000 emails / month — more than enough to start.
 *
 * Fallback: if RESEND_API_KEY is missing, emails are skipped (logged as warn).
 */

import logger from '../utils/logger.js';

const fromName  = process.env.SMTP_FROM_NAME  || process.env.EMAIL_FROM_NAME  || 'OrderBot';
const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM_EMAIL || 'noreply@orderbot.ai';
const frontendUrl = process.env.FRONTEND_URL  || 'http://localhost:5173';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

const isConfigured = () => Boolean(RESEND_API_KEY);

const sendMail = async ({ to, subject, html, text }) => {
  if (!isConfigured()) {
    logger.warn(`[emailService] RESEND_API_KEY not set — skipping email to ${to} (${subject})`);
    return { sent: false, reason: 'NOT_CONFIGURED' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        subject,
        html,
        text,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      logger.error(`[emailService] Resend error to ${to}: ${JSON.stringify(data)}`);
      return { sent: false, reason: data?.message || 'RESEND_ERROR' };
    }

    logger.info(`[emailService] Email sent to ${to} — id: ${data.id}`);
    return { sent: true, id: data.id };
  } catch (err) {
    logger.error(`[emailService] Failed to send email to ${to}: ${err.message}`);
    return { sent: false, reason: err.message };
  }
};

export const sendVerificationEmail = async (email, fullName, token) => {
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
  return sendMail({
    to: email,
    subject: 'Verify your email — OrderBot',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#25d366">Welcome to OrderBot! 💬</h2>
        <p>Hi ${fullName || 'there'},</p>
        <p>Thanks for signing up. Click the button below to verify your email and activate your account:</p>
        <a href="${verifyUrl}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#25d366;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
          Verify Email
        </a>
        <p style="color:#64748b;font-size:13px">Or copy this link into your browser:<br/>${verifyUrl}</p>
        <p style="color:#64748b;font-size:13px">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
      </div>
    `,
    text: `Hi ${fullName || 'there'},\n\nVerify your email by visiting:\n${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
};

export const sendOtpEmail = async (email, fullName, otp, purpose) => {
  const purposeText = {
    LOGIN:          'log in to your account',
    SIGNUP:         'complete your signup',
    PASSWORD_RESET: 'reset your password',
  }[purpose] || 'verify your request';

  return sendMail({
    to: email,
    subject: `Your verification code: ${otp} — OrderBot`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#25d366">Your verification code 🔐</h2>
        <p>Hi ${fullName || 'there'},</p>
        <p>Use this code to ${purposeText}:</p>
        <div style="font-size:36px;font-weight:900;letter-spacing:8px;color:#0f172a;margin:16px 0">${otp}</div>
        <p style="color:#64748b;font-size:13px">This code expires in ${process.env.OTP_EXPIRE_MINUTES || 5} minutes.</p>
        <p style="color:#64748b;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
    text: `Your verification code is ${otp}. It expires in ${process.env.OTP_EXPIRE_MINUTES || 5} minutes.`,
  });
};

export const sendWelcomeEmail = async (email, fullName) => sendMail({
  to: email,
  subject: 'Welcome to OrderBot — you\'re all set! 🎉',
  html: `
    <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
      <h2 style="color:#25d366">You're in! 🎉</h2>
      <p>Hi ${fullName || 'there'},</p>
      <p>Your email is verified and your OrderBot account is ready. Log in to set up your business and start accepting WhatsApp orders.</p>
      <a href="${frontendUrl}/login" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#25d366;color:#fff;border-radius:8px;text-decoration:none;font-weight:700">
        Go to Dashboard
      </a>
    </div>
  `,
  text: `Hi ${fullName || 'there'},\n\nYour email has been verified. Log in at ${frontendUrl}/login to get started.`,
});

export default { isConfigured, sendVerificationEmail, sendOtpEmail, sendWelcomeEmail };
