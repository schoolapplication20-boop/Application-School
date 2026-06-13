import {
  validationResult, body, param, query,
} from 'express-validator';
import logger from '../utils/logger.js';

/**
 * Validation error handler middleware
 */
export const validationErrorHandler = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn(`Validation error: ${JSON.stringify(errors.array())}`);
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  return next();
};

/**
 * Common validations
 */
export const validators = {
  email: () => body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),

  password: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  otp: () => body('otp')
    .isLength({ min: 6, max: 6 })
    .isNumeric()
    .withMessage('OTP must be 6 digits'),

  otpPurpose: () => body('purpose')
    .optional()
    .isIn(['LOGIN', 'SIGNUP', 'PASSWORD_RESET'])
    .withMessage('Invalid OTP purpose'),

  fullName: () => body('full_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Full name must be between 1 and 255 characters'),

  newPassword: () => body('new_password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  token: () => body('token')
    .notEmpty()
    .withMessage('Token is required'),

  refreshToken: () => body('refresh_token')
    .notEmpty()
    .withMessage('Refresh token is required'),

  businessName: () => body('business_name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),

  businessType: () => body('business_type')
    .isIn(['RESTAURANT', 'CAFE', 'GROCERY', 'RETAIL', 'OTHER'])
    .withMessage('Invalid business type'),

  productName: () => body('product_name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Product name must be between 1 and 100 characters'),

  price: () => body('price')
    .isFloat({ min: 0 })
    .withMessage('Price must be a positive number'),

  uuid: () => param('id')
    .isUUID()
    .withMessage('Invalid ID format'),

  businessIdParam: () => param('businessId')
    .isUUID()
    .withMessage('Invalid business ID'),

  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ],
};

/**
 * Custom validation middleware wrapper
 */
export const validate = (validationRules) => {
  return async (req, res, next) => {
    await Promise.all(validationRules.map((validation) => validation.run(req)));
    validationErrorHandler(req, res, next);
  };
};

export default {
  validationErrorHandler,
  validators,
  validate,
};
