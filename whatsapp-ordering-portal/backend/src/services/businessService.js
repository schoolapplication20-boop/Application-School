import { Business, WhatsappConfig, Session } from '../models/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import { generateAccessToken, generateRefreshToken } from '../config/jwt.js';
import { hashOTP, encrypt } from '../utils/crypto.js';
import { ERROR_CODES, HTTP_STATUS } from '../utils/constants.js';

export const formatBusiness = (business) => ({
  business_id: business.businessId,
  user_id: business.userId,
  business_name: business.businessName,
  business_type: business.businessType,
  logo_url: business.logoUrl,
  address: business.address,
  city: business.city,
  postal_code: business.postalCode,
  phone_number: business.phoneNumber,
  whatsapp_number: business.whatsappNumber,
  website_url: business.websiteUrl,
  business_hours_json: business.businessHoursJson,
  settings_json: business.settingsJson,
  onboarding_completed: business.onboardingCompleted,
  is_active: business.isActive,
  subscription_status: business.subscriptionStatus,
  subscription_tier: business.subscriptionTier,
  subscription_expires_at: business.subscriptionExpiresAt,
  created_at: business.createdAt,
  updated_at: business.updatedAt,
});

export const formatWhatsappConfig = (config) => ({
  config_id: config.configId,
  business_id: config.businessId,
  whatsapp_business_account_id: config.whatsappBusinessAccountId,
  phone_number_id: config.phoneNumberId,
  webhook_url: config.webhookUrl,
  is_configured: config.isConfigured,
  is_verified: config.isVerified,
  verified_at: config.verifiedAt,
  created_at: config.createdAt,
  updated_at: config.updatedAt,
});

const BUSINESS_UPDATABLE_FIELDS = {
  business_name: 'businessName',
  business_type: 'businessType',
  logo_url: 'logoUrl',
  address: 'address',
  city: 'city',
  postal_code: 'postalCode',
  phone_number: 'phoneNumber',
  whatsapp_number: 'whatsappNumber',
  website_url: 'websiteUrl',
  business_hours_json: 'businessHoursJson',
};

const applyUpdatableFields = (instance, body, fieldMap) => {
  Object.entries(fieldMap).forEach(([apiField, modelField]) => {
    if (body[apiField] !== undefined) {
      instance[modelField] = body[apiField];
    }
  });
};

export const createBusiness = async (user, body) => {
  const existing = await Business.findOne({ where: { userId: user.userId } });
  if (existing) {
    const accessToken = generateAccessToken(user.userId, user.email, existing.businessId);
    const refreshToken = generateRefreshToken(user.userId);
    await Session.upsert({ userId: user.userId, token: hashOTP(refreshToken) });
    return { business: formatBusiness(existing), access_token: accessToken, refresh_token: refreshToken };
  }

  const business = await Business.create({
    userId: user.userId,
    businessName: body.business_name,
    businessType: body.business_type,
    logoUrl: body.logo_url,
    address: body.address,
    city: body.city,
    postalCode: body.postal_code,
    phoneNumber: body.phone_number,
    whatsappNumber: body.whatsapp_number,
    websiteUrl: body.website_url,
    businessHoursJson: body.business_hours_json,
  });

  // Re-issue tokens carrying the new businessId so the frontend can access
  // business-scoped endpoints without a separate login round-trip.
  const accessToken = generateAccessToken(user.userId, user.email, business.businessId);
  const refreshToken = generateRefreshToken(user.userId);
  await Session.create({ userId: user.userId, token: hashOTP(refreshToken) });

  return {
    business: formatBusiness(business),
    access_token: accessToken,
    refresh_token: refreshToken,
  };
};

export const getBusiness = async (businessId) => {
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Business not found');
  }
  return { business: formatBusiness(business) };
};

export const updateBusiness = async (businessId, body) => {
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Business not found');
  }

  applyUpdatableFields(business, body, BUSINESS_UPDATABLE_FIELDS);
  await business.save();

  return { business: formatBusiness(business) };
};

const getOwnedBusiness = async (businessId) => {
  const business = await Business.findByPk(businessId);
  if (!business) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Business not found');
  }
  return business;
};

const mergeSettings = (business, patch) => {
  business.settingsJson = { ...(business.settingsJson || {}), ...patch };
};

export const updateBusinessHours = async (businessId, businessHours) => {
  const business = await getOwnedBusiness(businessId);
  business.businessHoursJson = businessHours;
  await business.save();
  return { business: formatBusiness(business) };
};

export const updateDeliverySettings = async (businessId, body) => {
  const business = await getOwnedBusiness(businessId);
  mergeSettings(business, {
    deliveryOptions:   body.deliveryOptions,
    deliveryFee:       body.deliveryFee,
    minOrderAmount:    body.minOrderAmount,
    freeDeliveryAbove: body.freeDeliveryAbove ?? null,
  });
  await business.save();
  return { business: formatBusiness(business) };
};

export const updateTaxSettings = async (businessId, body) => {
  const business = await getOwnedBusiness(businessId);
  mergeSettings(business, {
    taxEnabled:   body.taxEnabled,
    taxName:      body.taxName ?? null,
    taxRate:      body.taxRate,
    taxInclusive: body.taxInclusive,
  });
  await business.save();
  return { business: formatBusiness(business) };
};

export const updatePaymentSettings = async (businessId, body) => {
  const business = await getOwnedBusiness(businessId);
  mergeSettings(business, {
    paymentMethods: body.paymentMethods,
    paymentConfigs: body.paymentConfigs ?? {},
  });
  await business.save();
  return { business: formatBusiness(business) };
};

export const updateLogoUrl = async (businessId, logoUrl) => {
  const business = await getOwnedBusiness(businessId);
  business.logoUrl = logoUrl;
  await business.save();
  return { business: formatBusiness(business) };
};

export const updateThemeSettings = async (businessId, body) => {
  const business = await getOwnedBusiness(businessId);
  mergeSettings(business, {
    theme:          body.theme,
    primaryColor:   body.primaryColor,
    secondaryColor: body.secondaryColor,
  });
  await business.save();
  return { business: formatBusiness(business) };
};

export const completeOnboarding = async (businessId) => {
  const business = await getOwnedBusiness(businessId);
  business.onboardingCompleted = true;
  await business.save();
  return { business: formatBusiness(business) };
};

export const getWhatsappConfig = async (businessId) => {
  const config = await WhatsappConfig.findOne({ where: { businessId } });
  if (!config) {
    return { whatsapp_config: null };
  }
  return { whatsapp_config: formatWhatsappConfig(config) };
};

export const setupWhatsappConfig = async (businessId, body) => {
  const existing = await WhatsappConfig.findOne({ where: { businessId } });
  if (existing) {
    throw new ApiError(HTTP_STATUS.CONFLICT, ERROR_CODES.DUPLICATE_ENTRY, 'WhatsApp is already configured for this business');
  }

  const config = await WhatsappConfig.create({
    businessId,
    whatsappBusinessAccountId: body.whatsapp_business_account_id,
    phoneNumberId: body.phone_number_id,
    accessToken: body.access_token ? encrypt(body.access_token) : null,
    webhookUrl: body.webhook_url,
    webhookVerifyToken: body.webhook_verify_token,
    isConfigured: true,
  });

  return { whatsapp_config: formatWhatsappConfig(config) };
};

export const updateWhatsappConfig = async (businessId, body) => {
  const config = await WhatsappConfig.findOne({ where: { businessId } });
  if (!config) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'WhatsApp configuration not found. Complete setup first');
  }

  if (body.whatsapp_business_account_id !== undefined) config.whatsappBusinessAccountId = body.whatsapp_business_account_id;
  if (body.phone_number_id !== undefined) config.phoneNumberId = body.phone_number_id;
  if (body.access_token) config.accessToken = encrypt(body.access_token);
  if (body.webhook_url !== undefined) config.webhookUrl = body.webhook_url;
  if (body.webhook_verify_token !== undefined) config.webhookVerifyToken = body.webhook_verify_token;
  if (body.is_configured !== undefined) config.isConfigured = body.is_configured;

  await config.save();

  return { whatsapp_config: formatWhatsappConfig(config) };
};

export default {
  formatBusiness,
  formatWhatsappConfig,
  createBusiness,
  getBusiness,
  updateBusiness,
  updateBusinessHours,
  updateDeliverySettings,
  updateTaxSettings,
  updatePaymentSettings,
  updateLogoUrl,
  updateThemeSettings,
  completeOnboarding,
  getWhatsappConfig,
  setupWhatsappConfig,
  updateWhatsappConfig,
};
