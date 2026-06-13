import { Notification } from '../models/index.js';
import { ApiError } from '../middleware/errorHandler.js';
import { ERROR_CODES, HTTP_STATUS, PAGINATION } from '../utils/constants.js';

export const formatNotification = (notification) => ({
  notification_id: notification.notificationId,
  business_id: notification.businessId,
  notification_type: notification.notificationType,
  title: notification.title,
  message: notification.message,
  is_read: notification.isRead,
  read_at: notification.readAt,
  created_at: notification.createdAt,
});

export const listNotifications = async (businessId, query) => {
  const page = Math.max(Number(query.page) || PAGINATION.DEFAULT_PAGE, 1);
  const limit = Math.min(Number(query.limit) || PAGINATION.DEFAULT_LIMIT, PAGINATION.MAX_LIMIT);
  const where = { businessId };

  if (query.is_read !== undefined) where.isRead = query.is_read === 'true';

  const { count, rows } = await Notification.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });

  const unreadCount = await Notification.count({ where: { businessId, isRead: false } });

  return {
    notifications: rows.map(formatNotification),
    unread_count: unreadCount,
    pagination: {
      page, limit, total: count, total_pages: Math.ceil(count / limit),
    },
  };
};

export const markAsRead = async (businessId, notificationId) => {
  const notification = await Notification.findOne({ where: { notificationId, businessId } });
  if (!notification) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Notification not found');
  }

  notification.isRead = true;
  notification.readAt = new Date();
  await notification.save();

  return { notification: formatNotification(notification) };
};

export const markAllAsRead = async (businessId) => {
  await Notification.update(
    { isRead: true, readAt: new Date() },
    { where: { businessId, isRead: false } },
  );

  return { updated: true };
};

export default {
  formatNotification,
  listNotifications,
  markAsRead,
  markAllAsRead,
};
