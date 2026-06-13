const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$/;

export const isValidEmail = (value) => EMAIL_REGEX.test(String(value || '').trim());

export const isValidPassword = (value) => PASSWORD_REGEX.test(String(value || ''));

export const passwordRequirementsMessage = 'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character (@$!%*?&)';

export const isValidPhone = (value) => PHONE_REGEX.test(String(value || '').replace(/[-\s]/g, ''));

export const isValidUrl = (value) => {
  try {
    return Boolean(new URL(value));
  } catch {
    return false;
  }
};

export const isRequired = (value) => value !== undefined && value !== null && String(value).trim().length > 0;
