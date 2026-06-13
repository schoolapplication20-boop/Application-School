import axios from 'axios';
import {
  getAccessToken, getRefreshToken, setTokens, clearAuthSession,
} from '../utils/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise = null;

const refreshAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, { refresh_token: refreshToken });
  const { access_token: accessToken, refresh_token: newRefreshToken } = response.data.data;
  setTokens({ accessToken, refreshToken: newRefreshToken });
  return accessToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;

    if (!response || response.status !== 401 || config._retry || config.url?.includes('/auth/')) {
      return Promise.reject(error);
    }

    config._retry = true;

    try {
      refreshPromise = refreshPromise || refreshAccessToken();
      const accessToken = await refreshPromise;
      refreshPromise = null;

      config.headers.Authorization = `Bearer ${accessToken}`;
      return api(config);
    } catch (refreshError) {
      refreshPromise = null;
      clearAuthSession();
      window.location.assign('/login');
      return Promise.reject(refreshError);
    }
  },
);

export default api;
