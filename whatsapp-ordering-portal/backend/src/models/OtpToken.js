import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { OTP_PURPOSE } from '../utils/constants.js';

const OtpToken = sequelize.define('OtpToken', {
  otpId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'otp_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  otpCode: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'otp_code',
  },
  purpose: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { isIn: [Object.values(OTP_PURPOSE)] },
  },
  isUsed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_used',
  },
  usedAt: {
    type: DataTypes.DATE,
    field: 'used_at',
  },
  attemptCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'attempt_count',
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
}, {
  tableName: 'wa_otp_tokens',
  updatedAt: false,
});

export default OtpToken;
