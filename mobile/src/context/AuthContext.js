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
      let storedUser = await getStoredUser();

      // One-time migration for sessions saved before the switch to SecureStore.
      if (!storedUser) {
        const [legacyToken, legacyUser] = await AsyncStorage.multiGet(['token', 'user']);
        if (legacyToken[1] && legacyUser[1]) {
          await setStoredToken(legacyToken[1]);
          storedUser = JSON.parse(legacyUser[1]);
          await setStoredUser(storedUser);
        }
        await AsyncStorage.multiRemove(['token', 'user']);
      }

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
