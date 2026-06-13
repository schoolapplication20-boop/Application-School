import api from './api';

export const listOrders = async (params) => {
  const { data } = await api.get('/orders', { params });
  return data.data;
};

export const getOrder = async (orderId) => {
  const { data } = await api.get(`/orders/${orderId}`);
  return data.data;
};

export const acceptOrder = async (orderId) => {
  const { data } = await api.post(`/orders/${orderId}/accept`);
  return data.data;
};

export const rejectOrder = async (orderId) => {
  const { data } = await api.post(`/orders/${orderId}/reject`);
  return data.data;
};

export const completeOrder = async (orderId) => {
  const { data } = await api.post(`/orders/${orderId}/complete`);
  return data.data;
};

export const cancelOrder = async (orderId) => {
  const { data } = await api.post(`/orders/${orderId}/cancel`);
  return data.data;
};

export default {
  listOrders,
  getOrder,
  acceptOrder,
  rejectOrder,
  completeOrder,
  cancelOrder,
};
