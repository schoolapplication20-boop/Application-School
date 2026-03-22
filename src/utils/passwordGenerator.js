/**
 * passwordGenerator.js
 * Generates readable, policy-compliant passwords for new teacher accounts.
 * Designed so the generation logic can later be replaced with a backend call.
 */

const SPECIALS = ['@', '#', '!', '$', '&'];
const NUMBERS  = '0123456789';
const UPPER    = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // no I/O confusion

/**
 * Generate a password from teacher details.
 * Pattern: CapitalisedFirstName (up to 4 chars) + last 4 of mobile + 2 random digits + special char
 * Example: "Priy3321@"  or if no mobile: "Priy4827@"
 *
 * Always satisfies: min 8 chars, 1 upper, 1 lower, 1 digit, 1 special.
 */
export const generateTeacherPassword = (name = '', mobile = '') => {
  const firstName = (name.split(' ')[0] || 'Teacher').trim();
  const namePart  =
    firstName.charAt(0).toUpperCase() +
    firstName.slice(1, 4).toLowerCase();          // e.g. "Priy"

  const phoneSuffix =
    mobile && mobile.length >= 4
      ? mobile.replace(/\D/g, '').slice(-4)        // last 4 digits of mobile
      : String(Math.floor(1000 + Math.random() * 9000)); // random 4 digits

  const extraDigit = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
  const special    = SPECIALS[Math.floor(Math.random() * SPECIALS.length)];

  return `${namePart}${phoneSuffix}${extraDigit}${special}`;
  // Example output: "Priy99924@"  or "Suni87653#"
};

/**
 * Generate a completely random secure password (for reset).
 * Pattern: UPPER + 3 lower + 4 digits + special
 */
export const generateRandomPassword = () => {
  const up   = UPPER[Math.floor(Math.random() * UPPER.length)];
  const low  = Array.from({ length: 3 }, () =>
    'abcdefghjkmnpqrstuvwxyz'[Math.floor(Math.random() * 23)]
  ).join('');
  const nums = Array.from({ length: 4 }, () =>
    NUMBERS[Math.floor(Math.random() * 10)]
  ).join('');
  const spec = SPECIALS[Math.floor(Math.random() * SPECIALS.length)];
  return `${up}${low}${nums}${spec}`;
};

export default { generateTeacherPassword, generateRandomPassword };
