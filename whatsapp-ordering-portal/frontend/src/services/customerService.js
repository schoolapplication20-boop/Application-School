import api from './api';

export const listCustomers = async (params) => {
  const { data } = await api.get('/customers', { params });
  return data.data;
};

export const getCustomer = async (customerId) => {
  const { data } = await api.get(`/customers/${customerId}`);
  return data.data;
};

export default {
  listCustomers,
  getCustomer,
};
