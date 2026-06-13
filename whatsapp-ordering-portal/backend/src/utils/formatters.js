/**
 * Common formatting functions
 */

/**
 * Format currency
 */
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
};

/**
 * Format date
 */
export const formatDate = (date, format = 'MM/DD/YYYY') => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    default:
      return d.toISOString();
  }
};

/**
 * Format time
 */
export const formatTime = (date, includeSeconds = false) => {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');

  return includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
};

/**
 * Format phone number
 */
export const formatPhoneNumber = (phone) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11) {
    return `+${cleaned.slice(0, 1)} (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

/**
 * Format business hours
 */
export const formatBusinessHours = (hours) => {
  if (!hours) return 'Not specified';

  if (typeof hours === 'string') {
    return hours;
  }

  if (typeof hours === 'object' && hours.open && hours.close) {
    return `${hours.open} - ${hours.close}`;
  }

  return 'Not specified';
};

/**
 * Truncate string
 */
export const truncateString = (str, length = 50) => {
  if (str.length <= length) return str;
  return `${str.substring(0, length)}...`;
};

/**
 * Capitalize string
 */
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert enum value to display text
 */
export const formatEnumValue = (value) => {
  return value
    .split('_')
    .map((word) => capitalize(word))
    .join(' ');
};

/**
 * Format file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round((bytes / k ** i) * 100) / 100} ${sizes[i]}`;
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Format number with commas
 */
export const formatNumber = (num) => {
  return num.toLocaleString('en-US');
};

export default {
  formatCurrency,
  formatDate,
  formatTime,
  formatPhoneNumber,
  formatBusinessHours,
  truncateString,
  capitalize,
  formatEnumValue,
  formatFileSize,
  formatPercentage,
  formatNumber,
};
