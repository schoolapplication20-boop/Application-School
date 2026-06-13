import {
  User, OtpToken, EmailVerificationToken, Session,
} from '../models/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import {
  hashPassword, verifyPassword, hashOTP, verifyOTPHash, generateToken, generateOTP,
} from '../utils/crypto.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../config/jwt.js';
import { sendVerificationEmail, sendOtpEmail, sendWelcomeEmail } from './emailService.js';
import { OTP_PURPOSE, ERROR_CODES, HTTP_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

const OTP_EXPIRE_MINUTES = Number(process.env.OTP_EXPIRE_MINUTES) || 5;
const OTP_MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS) || 3;
const EMAIL_VERIFICATION_EXPIRE_HOURS = 24;

export const formatUser = (user) => ({
  user_id: user.userId,
  email: user.email,
  full_name: user.fullName,
  is_email_verified: user.isEmailVerified,
});

const issueOtp = async (user, purpose) => {
  const otp = generateOTP(6);
  await OtpToken.create({
    userId: user.userId,
    otpCode: hashOTP(otp),
    purpose,
    expiresAt: new Date(Date.now() + OTP_EXPIRE_MINUTES * 60 * 1000),
  });
  await sendOtpEmail(user.email, user.fullName, otp, purpose);
};

export const signup = async ({ email, password, fullName }) => {
  const existing = await User.findOne({ where: { email } });
  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, ERROR_CODES.USER_EXISTS, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(password);
  const user = await User.create({ email, passwordHash, fullName });

  const token = generateToken(32);
  await EmailVerificationToken.create({
    userId: user.userId,
    token,
    expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRE_HOURS * 60 * 60 * 1000),
  });

  const { sent } = await sendVerificationEmail(user.email, user.fullName, token);

  return { user: formatUser(user), verification_email_sent: sent };
};

export const verifyEmail = async (token) => {
  const record = await EmailVerificationToken.findOne({ where: { token, usedAt: null } });
  if (!record) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TOKEN, 'Invalid or already-used verification token');
  }
  if (record.expiresAt < new Date()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.TOKEN_EXPIRED, 'Verification token has expired');
  }

  const user = await User.findByPk(record.userId);
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 'User not found');
  }

  user.isEmailVerified = true;
  user.emailVerifiedAt = new Date();
  await user.save();

  record.usedAt = new Date();
  await record.save();

  await sendWelcomeEmail(user.email, user.fullName);

  return { user: formatUser(user) };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ where: { email } });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');
  }

  if (!user.isEmailVerified) {
    throw new ApiError(HTTP_STATUS.FORBIDDEN, ERROR_CODES.EMAIL_NOT_VERIFIED, 'Please verify your email before logging in');
  }

  await issueOtp(user, OTP_PURPOSE.LOGIN);

  return { requires_otp: true, otp_delivery_method: 'email', email: user.email };
};

export const sendOtp = async ({ email, purpose = OTP_PURPOSE.LOGIN }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 'No account found for this email');
  }

  await issueOtp(user, purpose);

  return { otp_sent: true, otp_delivery_method: 'email' };
};

const consumeOtp = async (user, otp, purpose) => {
  const record = await OtpToken.findOne({
    where: { userId: user.userId, purpose, isUsed: false },
    order: [['createdAt', 'DESC']],
  });

  if (!record) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_OTP, 'No active OTP found. Please request a new one');
  }

  if (record.expiresAt < new Date()) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_EXPIRED, 'OTP has expired. Please request a new one');
  }

  if (record.attemptCount >= OTP_MAX_ATTEMPTS) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.OTP_LIMIT_EXCEEDED, 'Too many incorrect attempts. Please request a new OTP');
  }

  if (!verifyOTPHash(otp, record.otpCode)) {
    record.attemptCount += 1;
    await record.save();
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_OTP, 'Incorrect OTP');
  }

  record.isUsed = true;
  record.usedAt = new Date();
  await record.save();
};

const createSession = async (user, refreshToken, meta = {}) => {
  await Session.create({
    userId: user.userId,
    token: hashOTP(refreshToken),
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
  });
};

export const verifyOtpAndLogin = async ({ email, otp }, meta) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 'No account found for this email');
  }

  await consumeOtp(user, otp, OTP_PURPOSE.LOGIN);

  const accessToken = generateAccessToken(user.userId, user.email, null);
  const refreshToken = generateRefreshToken(user.userId);
  await createSession(user, refreshToken, meta);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: formatUser(user),
  };
};

export const refreshAccessToken = async (refreshToken) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired refresh token');
  }

  const session = await Session.findOne({
    where: { userId: payload.userId, token: hashOTP(refreshToken), logoutAt: null },
  });
  if (!session) {
    throw new ApiError(HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_TOKEN, 'Session not found or has been revoked');
  }

  const user = await User.findByPk(payload.userId);
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 'User not found');
  }

  const business = await user.getBusinesses?.({ limit: 1 });
  const businessId = business?.[0]?.businessId || null;

  const accessToken = generateAccessToken(user.userId, user.email, businessId);
  const newRefreshToken = generateRefreshToken(user.userId);

  session.token = hashOTP(newRefreshToken);
  session.lastActivityAt = new Date();
  await session.save();

  return { access_token: accessToken, refresh_token: newRefreshToken };
};

export const logout = async (refreshToken) => {
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    return { logged_out: true };
  }

  const session = await Session.findOne({
    where: { userId: payload.userId, token: hashOTP(refreshToken), logoutAt: null },
  });
  if (session) {
    session.logoutAt = new Date();
    await session.save();
  }

  return { logged_out: true };
};

export const forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (user) {
    await issueOtp(user, OTP_PURPOSE.PASSWORD_RESET);
  } else {
    logger.warn(`[authService] Password reset requested for unknown email: ${email}`);
  }

  return { otp_sent: true, otp_delivery_method: 'email' };
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.USER_NOT_FOUND, 'No account found for this email');
  }

  await consumeOtp(user, otp, OTP_PURPOSE.PASSWORD_RESET);

  user.passwordHash = await hashPassword(newPassword);
  await user.save();

  await Session.update(
    { logoutAt: new Date() },
    { where: { userId: user.userId, logoutAt: null } },
  );

  return { password_reset: true };
};

export default {
  signup,
  verifyEmail,
  login,
  sendOtp,
  verifyOtpAndLogin,
  refreshAccessToken,
  logout,
  forgotPassword,
  resetPassword,
};
