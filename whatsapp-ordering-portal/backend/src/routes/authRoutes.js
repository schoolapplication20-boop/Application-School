import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate, validators } from '../middleware/validation.js';
import { authLimiter, otpLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post(
  '/signup',
  authLimiter,
  validate([validators.email(), validators.password(), validators.fullName()]),
  authController.signup,
);

router.post(
  '/verify-email',
  validate([validators.token()]),
  authController.verifyEmail,
);

router.post(
  '/login',
  authLimiter,
  validate([validators.email(), validators.password()]),
  authController.login,
);

router.post(
  '/send-otp',
  otpLimiter,
  validate([validators.email(), validators.otpPurpose()]),
  authController.sendOtp,
);

router.post(
  '/verify-otp',
  authLimiter,
  validate([validators.email(), validators.otp()]),
  authController.verifyOtp,
);

router.post(
  '/refresh-token',
  validate([validators.refreshToken()]),
  authController.refreshToken,
);

router.post(
  '/logout',
  validate([validators.refreshToken()]),
  authController.logout,
);

router.post(
  '/forgot-password',
  passwordResetLimiter,
  validate([validators.email()]),
  authController.forgotPassword,
);

router.post(
  '/reset-password',
  passwordResetLimiter,
  validate([validators.email(), validators.otp(), validators.newPassword()]),
  authController.resetPassword,
);

export default router;
