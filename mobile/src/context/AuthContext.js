import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setSessionExpiredHandler } from '../services/api';
import { syncPushToken, clearPushToken } from '../services/pushNotifications';
import { getStoredUser, setStoredUser, setStoredToken, clearAuthStorage } from '../services/secureStorage';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Migrate any legacy AsyncStorage tokens to SecureStore on every startup.
      // This ensures users who never logged out (and therefore never hit the
      // old login-time migration) also get their tokens moved to secure storage.
      try {
        const [legacyToken, legacyUser] = await AsyncStorage.multiGet(['token', 'user']);
        if (legacyToken[1] || legacyUser[1]) {
          // Only overwrite SecureStore if SecureStore doesn't already hold a session,
          // so a valid secure session is never replaced by a stale AsyncStorage value.
          const existingUser = await getStoredUser();
          if (!existingUser) {
            if (legacyToken[1]) await setStoredToken(legacyToken[1]);
            if (legacyUser[1]) await setStoredUser(JSON.parse(legacyUser[1]));
            console.log('[Auth] Migrated session from AsyncStorage to SecureStore');
          }
          await AsyncStorage.multiRemove(['token', 'user']);
        }
      } catch (e) {
        console.warn('[Auth] Migration from AsyncStorage failed silently:', e);
      }

      const storedUser = await getStoredUser();
      if (storedUser) { setUser(storedUser); syncPushToken(); }
      setLoading(false);
    })();
  }, []);

  const login = (userData) => {
    setUser(userData);
    syncPushToken();
  };

  const logout = async () => {
    await clearPushToken();
    await clearAuthStorage();
    setUser(null);
  };

  useEffect(() => {
    setSessionExpiredHandler(logout);
    return () => setSessionExpiredHandler(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
