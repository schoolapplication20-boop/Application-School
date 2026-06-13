import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const EmailVerificationToken = sequelize.define('EmailVerificationToken', {
  tokenId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'token_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'user_id',
  },
  token: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'expires_at',
  },
  usedAt: {
    type: DataTypes.DATE,
    field: 'used_at',
  },
}, {
  tableName: 'wa_email_verification_tokens',
  updatedAt: false,
});

export default EmailVerificationToken;
