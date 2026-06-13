import { asyncHandler } from '../middleware/errorHandler.js';
import * as authService from '../services/authService.js';

export const signup = asyncHandler(async (req, res) => {
  const { email, password, full_name: fullName } = req.body;
  const result = await authService.signup({ email, password, fullName });
  res.status(201).json({ success: true, data: result, message: 'Account created. Please verify your email to continue' });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { token } = req.body;
  const result = await authService.verifyEmail(token);
  res.status(200).json({ success: true, data: result, message: 'Email verified successfully' });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login({ email, password });
  res.status(200).json({ success: true, data: result, message: 'OTP sent to your email' });
});

export const sendOtp = asyncHandler(async (req, res) => {
  const { email, purpose } = req.body;
  const result = await authService.sendOtp({ email, purpose });
  res.status(200).json({ success: true, data: result, message: 'OTP sent to your email' });
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  const meta = { ip: req.ip, userAgent: req.headers['user-agent'] };
  const result = await authService.verifyOtpAndLogin({ email, otp }, meta);
  res.status(200).json({ success: true, data: result, message: 'Login successful' });
});

export const refreshToken = asyncHandler(async (req, res) => {
  const { refresh_token: refreshTokenValue } = req.body;
  const result = await authService.refreshAccessToken(refreshTokenValue);
  res.status(200).json({ success: true, data: result, message: 'Token refreshed' });
});

export const logout = asyncHandler(async (req, res) => {
  const { refresh_token: refreshTokenValue } = req.body;
  const result = await authService.logout(refreshTokenValue);
  res.status(200).json({ success: true, data: result, message: 'Logged out successfully' });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const result = await authService.forgotPassword(email);
  res.status(200).json({ success: true, data: result, message: 'If an account exists for this email, an OTP has been sent' });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, new_password: newPassword } = req.body;
  const result = await authService.resetPassword({ email, otp, newPassword });
  res.status(200).json({ success: true, data: result, message: 'Password reset successfully' });
});

export default {
  signup,
  verifyEmail,
  login,
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
};
