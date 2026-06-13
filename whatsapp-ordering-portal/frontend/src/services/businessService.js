import api from './api';

export const createBusiness = async (payload) => {
  const { data } = await api.post('/businesses', payload);
  return data.data;
};

export const getBusiness = async (businessId) => {
  const { data } = await api.get(`/businesses/${businessId}`);
  return data.data;
};

export const updateBusiness = async (businessId, payload) => {
  const { data } = await api.put(`/businesses/${businessId}`, payload);
  return data.data;
};

export const getWhatsappConfig = async () => {
  const { data } = await api.get('/businesses/whatsapp/config');
  return data.data;
};

export const setupWhatsappConfig = async (payload) => {
  const { data } = await api.post('/businesses/whatsapp/setup', payload);
  return data.data;
};

export const updateWhatsappConfig = async (payload) => {
  const { data } = await api.put('/businesses/whatsapp/config', payload);
  return data.data;
};

export default {
  createBusiness,
  getBusiness,
  updateBusiness,
  getWhatsappConfig,
  setupWhatsappConfig,
  updateWhatsappConfig,
};
