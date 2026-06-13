import { asyncHandler } from '../middleware/errorHandler.js';
import * as analyticsService from '../services/analyticsService.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const result = await analyticsService.getDashboardStats(req.user.businessId);
  res.status(200).json({ success: true, data: result, message: 'Dashboard stats retrieved' });
});

export const getSalesData = asyncHandler(async (req, res) => {
  const result = await analyticsService.getSalesData(req.user.businessId, req.query);
  res.status(200).json({ success: true, data: result, message: 'Sales data retrieved' });
});

export const getOrderTrends = asyncHandler(async (req, res) => {
  const result = await analyticsService.getOrderTrends(req.user.businessId, req.query);
  res.status(200).json({ success: true, data: result, message: 'Order trends retrieved' });
});

export default {
  getDashboardStats,
  getSalesData,
  getOrderTrends,
};
