import { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import * as notificationService from '../services/notificationService';
import { useAuth } from '../hooks/useAuth';

export const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 30000;

export const NotificationProvider = ({ children }) => {
  const { businessId, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refreshNotifications = useCallback(async (params) => {
    if (!businessId) {
      setNotifications([]);
      setUnreadCount(0);
      return null;
    }
    const result = await notificationService.listNotifications(params);
    setNotifications(result.notifications);
    setUnreadCount(result.unread_count);
    return result;
  }, [businessId]);

  const markAsRead = useCallback(async (notificationId) => {
    await notificationService.markAsRead(notificationId);
    setNotifications((current) => current.map((notification) => (
      notification.notification_id === notificationId
        ? { ...notification, is_read: true, read_at: new Date().toISOString() }
        : notification
    )));
    setUnreadCount((current) => Math.max(0, current - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    await notificationService.markAllAsRead();
    setNotifications((current) => current.map((notification) => ({ ...notification, is_read: true })));
    setUnreadCount(0);
  }, []);

  useEffect(() => {
    if (!isAuthenticated || !businessId) {
      setNotifications([]);
      setUnreadCount(0);
      return undefined;
    }

    let isMounted = true;

    const load = async () => {
      setLoading(true);
      try {
        await refreshNotifications();
      } catch {
        // Notification polling failures should not disrupt the UI.
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    load();
    const intervalId = setInterval(load, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [isAuthenticated, businessId, refreshNotifications]);

  const value = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
  }), [notifications, unreadCount, loading, refreshNotifications, markAsRead, markAllAsRead]);

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
};

NotificationProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
