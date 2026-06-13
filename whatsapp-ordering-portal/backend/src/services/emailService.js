import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

const fromName = process.env.SMTP_FROM_NAME || 'WhatsApp Portal';
const fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@whatsappportal.com';
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

let transporter = null;

const isConfigured = () => Boolean(
  process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD,
);

const getTransporter = () => {
  if (!isConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
};

const sendMail = async ({
  to, subject, html, text,
}) => {
  const client = getTransporter();
  if (!client) {
    logger.warn(`[emailService] SMTP not configured — skipping email to ${to} (${subject})`);
    return { sent: false, reason: 'NOT_CONFIGURED' };
  }

  try {
    await client.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      html,
      text,
    });
    return { sent: true };
  } catch (error) {
    logger.error(`[emailService] Failed to send email to ${to}: ${error.message}`);
    return { sent: false, reason: error.message };
  }
};

export const sendVerificationEmail = async (email, fullName, token) => {
  const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;
  return sendMail({
    to: email,
    subject: 'Verify your email — WhatsApp Ordering Portal',
    html: `
      <p>Hi ${fullName || 'there'},</p>
      <p>Thanks for signing up for the WhatsApp Ordering Portal. Please verify your email address to activate your account:</p>
      <p><a href="${verifyUrl}">Verify Email</a></p>
      <p>If the link doesn't work, copy and paste this URL into your browser:</p>
      <p>${verifyUrl}</p>
      <p>This link expires in 24 hours.</p>
    `,
    text: `Hi ${fullName || 'there'},\n\nVerify your email by visiting: ${verifyUrl}\n\nThis link expires in 24 hours.`,
  });
};

export const sendOtpEmail = async (email, fullName, otp, purpose) => {
  const purposeText = {
    LOGIN: 'log in to your account',
    SIGNUP: 'complete your signup',
    PASSWORD_RESET: 'reset your password',
  }[purpose] || 'verify your request';

  return sendMail({
    to: email,
    subject: `Your verification code: ${otp}`,
    html: `
      <p>Hi ${fullName || 'there'},</p>
      <p>Use the code below to ${purposeText}:</p>
      <h2 style="letter-spacing: 4px;">${otp}</h2>
      <p>This code expires in ${process.env.OTP_EXPIRE_MINUTES || 5} minutes. If you didn't request this, you can ignore this email.</p>
    `,
    text: `Your verification code is ${otp}. It expires in ${process.env.OTP_EXPIRE_MINUTES || 5} minutes.`,
  });
};

export const sendWelcomeEmail = async (email, fullName) => sendMail({
  to: email,
  subject: 'Welcome to WhatsApp Ordering Portal',
  html: `
    <p>Hi ${fullName || 'there'},</p>
    <p>Your email has been verified and your account is ready. Log in to set up your business profile and start taking orders over WhatsApp.</p>
    <p><a href="${frontendUrl}/login">Go to login</a></p>
  `,
  text: `Hi ${fullName || 'there'},\n\nYour email has been verified. Log in at ${frontendUrl}/login to get started.`,
});

export default {
  isConfigured,
  sendVerificationEmail,
  sendOtpEmail,
  sendWelcomeEmail,
};
