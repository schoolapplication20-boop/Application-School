import { asyncHandler } from '../middleware/errorHandler.js';
import * as businessService from '../services/businessService.js';

export const createBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.createBusiness(req.user, req.body);
  res.status(201).json({ success: true, data: result, message: 'Business profile created' });
});

export const getBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.getBusiness(req.params.businessId);
  res.status(200).json({ success: true, data: result, message: 'Business profile retrieved' });
});

export const updateBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.updateBusiness(req.params.businessId, req.body);
  res.status(200).json({ success: true, data: result, message: 'Business profile updated' });
});

export const updateBusinessHours = asyncHandler(async (req, res) => {
  const result = await businessService.updateBusinessHours(req.user.businessId, req.body.businessHours);
  res.status(200).json({ success: true, data: result, message: 'Business hours updated' });
});

export const updateDeliverySettings = asyncHandler(async (req, res) => {
  const result = await businessService.updateDeliverySettings(req.user.businessId, req.body);
  res.status(200).json({ success: true, data: result, message: 'Delivery settings updated' });
});

export const updateTaxSettings = asyncHandler(async (req, res) => {
  const result = await businessService.updateTaxSettings(req.user.businessId, req.body);
  res.status(200).json({ success: true, data: result, message: 'Tax settings updated' });
});

export const updatePaymentSettings = asyncHandler(async (req, res) => {
  const result = await businessService.updatePaymentSettings(req.user.businessId, req.body);
  res.status(200).json({ success: true, data: result, message: 'Payment settings updated' });
});

export const updateLogoUrl = asyncHandler(async (req, res) => {
  const result = await businessService.updateLogoUrl(req.user.businessId, req.body.logoUrl);
  res.status(200).json({ success: true, data: result, message: 'Logo updated' });
});

export const updateThemeSettings = asyncHandler(async (req, res) => {
  const result = await businessService.updateThemeSettings(req.user.businessId, req.body);
  res.status(200).json({ success: true, data: result, message: 'Theme updated' });
});

export const completeOnboarding = asyncHandler(async (req, res) => {
  const result = await businessService.completeOnboarding(req.user.businessId);
  res.status(200).json({ success: true, data: result, message: 'Onboarding completed' });
});

export const getMyBusiness = asyncHandler(async (req, res) => {
  const result = await businessService.getMyBusiness(req.user.userId);
  res.status(200).json({ success: true, data: result, message: 'Business retrieved' });
});

export const listQrCodes = asyncHandler(async (req, res) => {
  const result = await businessService.listQrCodes(req.user.businessId);
  res.status(200).json({ success: true, data: result.qrCodes, message: 'QR codes retrieved' });
});

export const createQrCode = asyncHandler(async (req, res) => {
  const result = await businessService.createQrCode(req.user.businessId, req.body);
  res.status(201).json({ success: true, data: result, message: 'QR code saved' });
});

export const deleteQrCode = asyncHandler(async (req, res) => {
  const result = await businessService.deleteQrCode(req.user.businessId, req.params.qrCodeId);
  res.status(200).json({ success: true, data: result, message: 'QR code deleted' });
});

export const getWhatsappConfig = asyncHandler(async (req, res) => {
  const result = await businessService.getWhatsappConfig(req.user.businessId);
  res.status(200).json({ success: true, data: result, message: 'WhatsApp configuration retrieved' });
});

export const setupWhatsappConfig = asyncHandler(async (req, res) => {
  const result = await businessService.setupWhatsappConfig(req.user.businessId, req.body);
  res.status(201).json({ success: true, data: result, message: 'WhatsApp configuration created' });
});

export const updateWhatsappConfig = asyncHandler(async (req, res) => {
  const result = await businessService.updateWhatsappConfig(req.user.businessId, req.body);
  res.status(200).json({ success: true, data: result, message: 'WhatsApp configuration updated' });
});

export default {
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
