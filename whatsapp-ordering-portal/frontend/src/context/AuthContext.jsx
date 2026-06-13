import { createContext, useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import * as authService from '../services/authService';
import {
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setAuthSession,
  setTokens,
  clearAuthSession,
  decodeJwtPayload,
} from '../utils/storage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getStoredUser());
  const [accessToken, setAccessToken] = useState(() => getAccessToken());

  const businessId = useMemo(() => {
    if (!accessToken) return null;
    const payload = decodeJwtPayload(accessToken);
    return payload?.businessId || null;
  }, [accessToken]);

  const signup = useCallback((payload) => authService.signup(payload), []);

  const verifyEmail = useCallback((token) => authService.verifyEmail(token), []);

  const login = useCallback((payload) => authService.login(payload), []);

  const sendOtp = useCallback((payload) => authService.sendOtp(payload), []);

  const verifyOtp = useCallback(async (payload) => {
    const result = await authService.verifyOtp(payload);
    setAuthSession({
      accessToken: result.access_token,
      refreshToken: result.refresh_token,
      user: result.user,
    });
    setUser(result.user);
    setAccessToken(result.access_token);
    return result;
  }, []);

  const applyBusinessTokens = useCallback(({ access_token: newAccessToken, refresh_token: newRefreshToken }) => {
    setTokens({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    setAccessToken(newAccessToken);
  }, []);

  const forgotPassword = useCallback((email) => authService.forgotPassword(email), []);

  const resetPassword = useCallback((payload) => authService.resetPassword(payload), []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    try {
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
    } catch {
      // Local session is cleared regardless of API outcome.
    } finally {
      clearAuthSession();
      setUser(null);
      setAccessToken(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    accessToken,
    businessId,
    isAuthenticated: Boolean(accessToken),
    hasBusiness: Boolean(businessId),
    signup,
    verifyEmail,
    login,
    sendOtp,
    verifyOtp,
    applyBusinessTokens,
    forgotPassword,
    resetPassword,
    logout,
  }), [
    user,
    accessToken,
    businessId,
    signup,
    verifyEmail,
    login,
    sendOtp,
    verifyOtp,
    applyBusinessTokens,
    forgotPassword,
    resetPassword,
    logout,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
