import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const { ENCRYPTION_KEY } = process.env;

if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be set and at least 32 characters long');
}

const deriveKey = () => crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest();

export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

export const verifyPassword = async (password, hash) => bcrypt.compare(password, hash);

export const hashOTP = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');

export const verifyOTPHash = (otp, hash) => {
  const computed = Buffer.from(hashOTP(otp), 'hex');
  const stored   = Buffer.from(hash, 'hex');
  if (computed.length !== stored.length) return false;
  return crypto.timingSafeEqual(computed, stored);
};

export const generateToken = (length = 32) => crypto.randomBytes(length).toString('hex');

export const generateOTP = (length = 6) =>
  Array.from({ length }, () => crypto.randomInt(0, 10)).join('');

export const encrypt = (data) => {
  const iv  = crypto.randomBytes(12);
  const key = deriveKey();
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

export const decrypt = (encryptedData) => {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');

  const [ivHex, authTagHex, encryptedHex] = parts;
  const iv        = Buffer.from(ivHex, 'hex');
  const authTag   = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const key       = deriveKey();

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
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
