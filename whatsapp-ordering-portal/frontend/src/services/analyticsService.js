import api from './api';

export const getDashboardStats = async () => {
  const { data } = await api.get('/analytics/dashboard');
  return data.data;
};

export const getSalesData = async (params) => {
  const { data } = await api.get('/analytics/sales', { params });
  return data.data;
};

export const getOrderTrends = async (params) => {
  const { data } = await api.get('/analytics/orders', { params });
  return data.data;
};

export default {
  getDashboardStats,
  getSalesData,
  getOrderTrends,
};
