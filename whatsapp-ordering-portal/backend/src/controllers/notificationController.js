import { asyncHandler } from '../middleware/errorHandler.js';
import * as notificationService from '../services/notificationService.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const result = await notificationService.listNotifications(req.user.businessId, req.query);
  res.status(200).json({ success: true, data: result, message: 'Notifications retrieved' });
});

export const markAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAsRead(req.user.businessId, req.params.notificationId);
  res.status(200).json({ success: true, data: result, message: 'Notification marked as read' });
});

export const markAllAsRead = asyncHandler(async (req, res) => {
  const result = await notificationService.markAllAsRead(req.user.businessId);
  res.status(200).json({ success: true, data: result, message: 'All notifications marked as read' });
});

export default {
  listNotifications,
  markAsRead,
  markAllAsRead,
};
