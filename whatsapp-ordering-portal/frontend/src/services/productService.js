import api from './api';

export const listCategories = async () => {
  const { data } = await api.get('/products/categories');
  return data.data;
};

export const createCategory = async (payload) => {
  const { data } = await api.post('/products/categories', payload);
  return data.data;
};

export const updateCategory = async (categoryId, payload) => {
  const { data } = await api.put(`/products/categories/${categoryId}`, payload);
  return data.data;
};

export const deleteCategory = async (categoryId) => {
  const { data } = await api.delete(`/products/categories/${categoryId}`);
  return data.data;
};

export const listProducts = async (params) => {
  const { data } = await api.get('/products', { params });
  return data.data;
};

export const getProduct = async (productId) => {
  const { data } = await api.get(`/products/${productId}`);
  return data.data;
};

export const createProduct = async (payload) => {
  const { data } = await api.post('/products', payload);
  return data.data;
};

export const updateProduct = async (productId, payload) => {
  const { data } = await api.put(`/products/${productId}`, payload);
  return data.data;
};

export const deleteProduct = async (productId) => {
  const { data } = await api.delete(`/products/${productId}`);
  return data.data;
};

export const addAddon = async (productId, payload) => {
  const { data } = await api.post(`/products/${productId}/addons`, payload);
  return data.data;
};

export const updateAddon = async (productId, addonId, payload) => {
  const { data } = await api.put(`/products/${productId}/addons/${addonId}`, payload);
  return data.data;
};

export const deleteAddon = async (productId, addonId) => {
  const { data } = await api.delete(`/products/${productId}/addons/${addonId}`);
  return data.data;
};

export default {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addAddon,
  updateAddon,
  deleteAddon,
};
