import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { ENCRYPTION_KEY } = process.env;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.warn('⚠ ENCRYPTION_KEY is not set or too short. Encryption features may not work properly.');
}

/**
 * Hash password using bcrypt
 */
export const hashPassword = async (password) => {
  try {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  } catch (error) {
    throw new Error(`Password hashing failed: ${error.message}`);
  }
};

/**
 * Verify password against hash
 */
export const verifyPassword = async (password, hash) => {
  try {
    return bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error(`Password verification failed: ${error.message}`);
  }
};

/**
 * Hash OTP (for storing in database)
 */
export const hashOTP = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

/**
 * Verify OTP hash
 */
export const verifyOTPHash = (otp, hash) => {
  return crypto.createHash('sha256').update(otp).digest('hex') === hash;
};

/**
 * Generate random token
 */
export const generateToken = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate OTP
 */
export const generateOTP = (length = 6) => {
  let otp = '';
  for (let i = 0; i < length; i += 1) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
};

/**
 * Encrypt sensitive data
 */
export const encrypt = (data) => {
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
};

/**
 * Decrypt sensitive data
 */
export const decrypt = (encryptedData) => {
  try {
    const [ivHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
};

export default {
  hashPassword,
  verifyPassword,
  hashOTP,
  verifyOTPHash,
  generateToken,
  generateOTP,
  encrypt,
  decrypt,
};
