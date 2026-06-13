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
  getWhatsappConfig,
  setupWhatsappConfig,
  updateWhatsappConfig,
};
