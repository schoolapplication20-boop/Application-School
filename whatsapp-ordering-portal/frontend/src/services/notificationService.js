import api from './api';

export const listNotifications = async (params) => {
  const { data } = await api.get('/notifications', { params });
  return data.data;
};

export const markAsRead = async (notificationId) => {
  const { data } = await api.put(`/notifications/${notificationId}/read`);
  return data.data;
};

export const markAllAsRead = async () => {
  const { data } = await api.put('/notifications/read-all');
  return data.data;
};

export default {
  listNotifications,
  markAsRead,
  markAllAsRead,
};
