import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',');
const allowCredentials = process.env.ALLOW_CREDENTIALS === 'true';

/**
 * CORS configuration
 */
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('CORS not allowed'));
  },
  credentials: allowCredentials,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours
};

export const corsMiddleware = cors(corsOptions);

/**
 * CORS error handler
 */
export const corsErrorHandler = (err, req, res, next) => {
  if (err.message === 'CORS not allowed') {
    return res.status(403).json({
      success: false,
      error: 'CORS_ERROR',
      message: 'Cross-origin request not allowed',
    });
  }
  return next(err);
};

export default {
  corsMiddleware,
  corsErrorHandler,
};
