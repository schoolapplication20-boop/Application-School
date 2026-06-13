import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';
import { BUSINESS_TYPES, SUBSCRIPTION_STATUS, SUBSCRIPTION_TIERS } from '../utils/constants.js';

const Business = sequelize.define('Business', {
  businessId: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: 'business_id',
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
  },
  businessName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'business_name',
  },
  businessType: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'business_type',
    validate: { isIn: [Object.values(BUSINESS_TYPES)] },
  },
  logoUrl: {
    type: DataTypes.STRING(500),
    field: 'logo_url',
  },
  address: DataTypes.TEXT,
  city: DataTypes.STRING(100),
  postalCode: {
    type: DataTypes.STRING(20),
    field: 'postal_code',
  },
  phoneNumber: {
    type: DataTypes.STRING(20),
    field: 'phone_number',
  },
  whatsappNumber: {
    type: DataTypes.STRING(20),
    unique: true,
    field: 'whatsapp_number',
  },
  websiteUrl: {
    type: DataTypes.STRING(500),
    field: 'website_url',
  },
  businessHoursJson: {
    type: DataTypes.JSONB,
    field: 'business_hours_json',
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'is_active',
  },
  subscriptionStatus: {
    type: DataTypes.STRING(50),
    defaultValue: SUBSCRIPTION_STATUS.TRIAL,
    field: 'subscription_status',
    validate: { isIn: [Object.values(SUBSCRIPTION_STATUS)] },
  },
  subscriptionTier: {
    type: DataTypes.STRING(50),
    defaultValue: SUBSCRIPTION_TIERS.BASIC,
    field: 'subscription_tier',
    validate: { isIn: [Object.values(SUBSCRIPTION_TIERS)] },
  },
  subscriptionExpiresAt: {
    type: DataTypes.DATE,
    field: 'subscription_expires_at',
  },
}, {
  tableName: 'wa_businesses',
  paranoid: true,
});

export default Business;
