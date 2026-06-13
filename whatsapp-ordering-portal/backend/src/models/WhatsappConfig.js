import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const WhatsappConfig = sequelize.define('WhatsappConfig', {
  configId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'config_id',
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    field: 'business_id',
  },
  whatsappBusinessAccountId: {
    type: DataTypes.STRING(255),
    field: 'whatsapp_business_account_id',
  },
  phoneNumberId: {
    type: DataTypes.STRING(255),
    field: 'phone_number_id',
  },
  accessToken: {
    type: DataTypes.STRING(1000),
    field: 'access_token',
  },
  webhookUrl: {
    type: DataTypes.STRING(500),
    field: 'webhook_url',
  },
  webhookVerifyToken: {
    type: DataTypes.STRING(255),
    field: 'webhook_verify_token',
  },
  isConfigured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_configured',
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_verified',
  },
  verifiedAt: {
    type: DataTypes.DATE,
    field: 'verified_at',
  },
}, {
  tableName: 'wa_whatsapp_config',
});

export default WhatsappConfig;
