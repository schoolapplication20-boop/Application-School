import { verifyAccessToken } from '../config/jwt.js';
import logger from '../utils/logger.js';

/**
 * Authenticate middleware - verifies JWT token
 */
export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'MISSING_TOKEN',
        message: 'Authorization token is missing',
      });
    }

    const token = authHeader.substring(7);

    try {
      const decoded = verifyAccessToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        businessId: decoded.businessId,
      };
      return next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'AUTH_ERROR',
      message: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if token is missing
 */
export const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        const decoded = verifyAccessToken(token);
        req.user = {
          userId: decoded.userId,
          email: decoded.email,
          businessId: decoded.businessId,
        };
      } catch (error) {
        // Silently fail - token invalid but not required
        logger.warn(`Optional auth failed: ${error.message}`);
      }
    }

    next();
  } catch (error) {
    logger.error(`Optional auth error: ${error.message}`);
    next();
  }
};

/**
 * Verify business ownership
 */
export const verifyBusinessOwnership = (req, res, next) => {
  try {
    const { businessId } = req.params;

    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'NOT_AUTHENTICATED',
        message: 'Not authenticated',
      });
    }

    // User can only access their own business
    if (req.user.businessId !== businessId) {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: 'You do not have permission to access this resource',
      });
    }

    return next();
  } catch (error) {
    logger.error(`Business ownership verification error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'VERIFICATION_ERROR',
      message: 'Failed to verify business ownership',
    });
  }
};

export default {
  authenticate,
  optionalAuth,
  verifyBusinessOwnership,
};
