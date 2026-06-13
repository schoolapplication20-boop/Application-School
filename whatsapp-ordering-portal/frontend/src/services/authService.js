import api from './api';

export const signup = async ({ email, password, fullName }) => {
  const { data } = await api.post('/auth/signup', { email, password, full_name: fullName });
  return data.data;
};

export const verifyEmail = async (token) => {
  const { data } = await api.post('/auth/verify-email', { token });
  return data.data;
};

export const login = async ({ email, password }) => {
  const { data } = await api.post('/auth/login', { email, password });
  return data.data;
};

export const sendOtp = async ({ email, purpose }) => {
  const { data } = await api.post('/auth/send-otp', { email, purpose });
  return data.data;
};

export const verifyOtp = async ({ email, otp }) => {
  const { data } = await api.post('/auth/verify-otp', { email, otp });
  return data.data;
};

export const refreshToken = async (token) => {
  const { data } = await api.post('/auth/refresh-token', { refresh_token: token });
  return data.data;
};

export const logout = async (token) => {
  const { data } = await api.post('/auth/logout', { refresh_token: token });
  return data.data;
};

export const forgotPassword = async (email) => {
  const { data } = await api.post('/auth/forgot-password', { email });
  return data.data;
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  const { data } = await api.post('/auth/reset-password', { email, otp, new_password: newPassword });
  return data.data;
};

export default {
  signup,
  verifyEmail,
  login,
  sendOtp,
  verifyOtp,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
};
