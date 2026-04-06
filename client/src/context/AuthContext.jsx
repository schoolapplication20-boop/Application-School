import React, { createContext, useContext, useState, useCallback } from 'react';
import { setAuthToken, clearAuthToken } from '../services/api';
import api from '../services/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/** Parse permissions from any format the backend might return */
const parsePermissions = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]           = useState(null);
  const [token, setToken]         = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const login = useCallback((userData, authToken) => {
    setAuthToken(authToken);

    // Parse permissions immediately if the login response includes them
    const permissions = parsePermissions(userData?.permissions);
    const finalUser   = permissions ? { ...userData, permissions } : userData;

    setUser(finalUser);
    setToken(authToken);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    clearAuthToken();
    window.dispatchEvent(new Event('auth:logout'));
  }, []);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => prev ? { ...prev, ...updatedData } : prev);
  }, []);

  /**
   * Tries several backend endpoints to load the admin's permissions.
   * Called right after login() for ADMIN accounts.
   * Tries endpoints in order and stops at the first that returns permissions.
   */
  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    const candidates = [
      '/api/admin/permissions',   // dedicated permissions endpoint
      '/api/admin/me',            // admin own profile
      '/api/user/profile',        // generic profile
      '/api/user/me',             // alternative profile
    ];

    try {
      for (const url of candidates) {
        try {
          const res  = await api.get(url);
          const data = res.data?.data ?? res.data;

          // Case 1: { permissions: ... } nested inside data
          if (data?.permissions !== undefined) {
            const perms = parsePermissions(data.permissions);
            if (perms && typeof perms === 'object') {
              setUser(prev => prev ? { ...prev, permissions: perms } : prev);
              return;
            }
          }

          // Case 2: data is the permissions object directly (no name/email fields)
          if (data && typeof data === 'object' && !data.name && !data.email && !Array.isArray(data)) {
            const perms = parsePermissions(data);
            if (perms && Object.keys(perms).length > 0) {
              setUser(prev => prev ? { ...prev, permissions: perms } : prev);
              return;
            }
          }
        } catch {
          // try next endpoint
        }
      }
      // If all endpoints fail, permissions remain as set by login()
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isAuthenticated = !!token && !!user;

  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }, [user]);

  const getDashboardPath = useCallback(() => {
    if (!user) return '/login';
    switch (user.role) {
      case 'SUPER_ADMIN': return '/superadmin/dashboard';
      case 'ADMIN':       return '/admin/dashboard';
      case 'TEACHER':     return '/teacher/dashboard';
      case 'PARENT':      return '/parent/dashboard';
      case 'STUDENT':     return '/student/dashboard';
      default:            return '/login';
    }
  }, [user]);

  /**
   * SUPER_ADMIN always has full access.
   * ADMIN must have the specific permKey set to true in permissions.
   * ADMIN with no permissions object gets NO access.
   */
  const hasPermission = useCallback((permKey) => {
    if (!user) return false;
    if (user.role === 'SUPER_ADMIN') return true;
    if (user.role === 'ADMIN') {
      const perms = parsePermissions(user.permissions);
      if (!perms) return false;
      return perms[permKey] === true;
    }
    return false;
  }, [user]);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    refreshPermissions,
    hasRole,
    getDashboardPath,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
