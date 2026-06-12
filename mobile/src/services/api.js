import axios from 'axios';
import Constants from 'expo-constants';
import { getStoredToken } from './secureStorage';

const FALLBACK_URL = 'https://application-school.onrender.com';

export const BASE_URL = Constants.expoConfig?.extra?.apiUrl || FALLBACK_URL;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Set by AuthContext so the interceptor can force a logout on session expiry
// without importing React context into this module.
let onSessionExpired = null;
export const setSessionExpiredHandler = (handler) => {
  onSessionExpired = handler;
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = error.config?.url?.includes('/api/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint && onSessionExpired) {
      onSessionExpired();
    }
    return Promise.reject(error);
  }
);

export default api;
