/**
 * Common validation functions
 */

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password) => {
  if (password.length < 8) return false;
  if (!/[A-Z]/.test(password)) return false; // Uppercase
  if (!/[a-z]/.test(password)) return false; // Lowercase
  if (!/\d/.test(password)) return false; // Digit
  if (!/[@$!%*?&]/.test(password)) return false; // Special char
  return true;
};

/**
 * Validate phone number format
 */
export const isValidPhoneNumber = (phone) => {
  // Accept international format with +, numbers, and dashes
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[-\s]/g, ''));
};

/**
 * Validate URL format
 */
export const isValidURL = (url) => {
  try {
    return Boolean(new URL(url));
  } catch (error) {
    return false;
  }
};

/**
 * Validate UUID format
 */
export const isValidUUID = (uuid) => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
};

/**
 * Validate business type
 */
export const isValidBusinessType = (type) => {
  const validTypes = ['RESTAURANT', 'CAFE', 'GROCERY', 'RETAIL', 'OTHER'];
  return validTypes.includes(type);
};

/**
 * Validate order status
 */
export const isValidOrderStatus = (status) => {
  const validStatuses = ['CART', 'PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELED', 'REFUNDED'];
  return validStatuses.includes(status);
};

/**
 * Sanitize string input
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove dangerous characters
    .substring(0, 1000); // Limit length
};

/**
 * Sanitize email
 */
export const sanitizeEmail = (email) => {
  return email.toLowerCase().trim();
};

export default {
  isValidEmail,
  isStrongPassword,
  isValidPhoneNumber,
  isValidURL,
  isValidUUID,
  isValidBusinessType,
  isValidOrderStatus,
  sanitizeString,
  sanitizeEmail,
};
