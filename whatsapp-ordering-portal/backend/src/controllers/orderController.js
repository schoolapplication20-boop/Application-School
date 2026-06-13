import { asyncHandler } from '../middleware/errorHandler.js';
import * as orderService from '../services/orderService.js';

export const listOrders = asyncHandler(async (req, res) => {
  const result = await orderService.listOrders(req.user.businessId, req.query);
  res.status(200).json({ success: true, data: result, message: 'Orders retrieved' });
});

export const getOrder = asyncHandler(async (req, res) => {
  const result = await orderService.getOrder(req.user.businessId, req.params.orderId);
  res.status(200).json({ success: true, data: result, message: 'Order retrieved' });
});

export const acceptOrder = asyncHandler(async (req, res) => {
  const result = await orderService.updateOrderStatus(req.user.businessId, req.params.orderId, 'accept');
  res.status(200).json({ success: true, data: result, message: 'Order accepted' });
});

export const rejectOrder = asyncHandler(async (req, res) => {
  const result = await orderService.updateOrderStatus(req.user.businessId, req.params.orderId, 'reject');
  res.status(200).json({ success: true, data: result, message: 'Order rejected' });
});

export const completeOrder = asyncHandler(async (req, res) => {
  const result = await orderService.updateOrderStatus(req.user.businessId, req.params.orderId, 'complete');
  res.status(200).json({ success: true, data: result, message: 'Order completed' });
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const result = await orderService.updateOrderStatus(req.user.businessId, req.params.orderId, 'cancel');
  res.status(200).json({ success: true, data: result, message: 'Order canceled' });
});

export default {
  listOrders,
  getOrder,
  acceptOrder,
  rejectOrder,
  completeOrder,
  cancelOrder,
};
