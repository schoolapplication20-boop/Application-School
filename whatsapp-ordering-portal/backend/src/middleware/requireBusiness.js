import { ApiError } from './errorHandler.js';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants.js';

/**
 * Ensures the authenticated user has an associated business profile.
 * Must run after `authenticate`.
 */
export const requireBusiness = (req, res, next) => {
  if (!req.user?.businessId) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, ERROR_CODES.NOT_FOUND, 'No business profile associated with this account');
  }
  next();
};

export default requireBusiness;
