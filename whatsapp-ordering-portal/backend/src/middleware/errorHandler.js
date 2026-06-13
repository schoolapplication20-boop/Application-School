import logger from '../utils/logger.js';

/**
 * Custom API Error class
 */
export class ApiError extends Error {
  constructor(statusCode, error, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.error = error;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error handler middleware
 */
export const errorHandler = (err, req, res, _next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user?.userId,
  });

  // Default error response
  let statusCode = 500;
  let error = 'INTERNAL_SERVER_ERROR';
  let message = 'Something went wrong';
  let details = null;

  // Handle known error types
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    error = err.error;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    error = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.details || err.message;
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    error = 'VALIDATION_ERROR';
    message = 'Database validation failed';
    details = err.errors.map((e) => e.message);
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    error = 'DUPLICATE_ENTRY';
    message = `${err.errors[0]?.path || 'Field'} already exists`;
    details = err.errors.map((e) => e.path);
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    error = 'INVALID_TOKEN';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    error = 'TOKEN_EXPIRED';
    message = 'Token has expired';
  } else if (err.statusCode) {
    statusCode = err.statusCode;
    error = err.error || error;
    message = err.message || message;
  }

  // Don't expose stack trace in production
  if (process.env.NODE_ENV === 'production') {
    details = null;
  }

  res.status(statusCode).json({
    success: false,
    error,
    message,
    ...(details && { details }),
  });
};

/**
 * Async handler wrapper
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default {
  ApiError,
  errorHandler,
  asyncHandler,
};
