import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { notificationAPI } from '../services/api';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used within NotificationProvider');
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  // Tracks server IDs currently loaded — prevents re-adding on rapid polls
  const loadedServerIds = useRef(new Set());

  /** Add a local (in-memory only) notification — used for non-leave events. */
  const addNotification = useCallback((notif) => {
    const newNotif = {
      id: Date.now(),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      read: false,
      ...notif,
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
    return newNotif.id;
  }, []);

  /**
   * Fetch persistent notifications from the server for a given userId and
   * merge them into the local list.  Safe to call repeatedly — already-loaded
   * server notifications are updated in place (read status sync) rather than
   * duplicated.
   */
  const loadFromServer = useCallback(async (userId) => {
    if (!userId) return;
    try {
      const res = await notificationAPI.getForUser(userId);
      const serverList = Array.isArray(res.data?.data) ? res.data.data
                       : Array.isArray(res.data)       ? res.data
                       : [];

      setNotifications(prev => {
        // Split existing into server-backed and local-only
        const localOnly = prev.filter(n => !n._serverId);

        // Map every server notification to the local shape
        const mapped = serverList.map(n => ({
          id:        `srv_${n.id}`,   // stable string id distinct from Date.now() ids
          _serverId: n.id,             // kept for API calls on read/delete
          text:      n.message,
          icon:      n.icon  || 'notifications',
          color:     n.color || '#76C442',
          read:      n.isRead,
          time:      new Date(n.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          linkType:  n.linkType,
          linkId:    n.linkId,
        }));

        // Record all server IDs as loaded
        serverList.forEach(n => loadedServerIds.current.add(n.id));

        // Server notifications sorted newest-first, then local-only appended
        return [...mapped, ...localOnly].slice(0, 50);
      });
    } catch (err) {
      // Silently ignore — network may not be available
    }
  }, []);

  /** Mark a notification as read; also persists to server if it originated there. */
  const markRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => {
      if (n.id !== id) return n;
      if (n._serverId) notificationAPI.markRead(n._serverId).catch(() => {});
      return { ...n, read: true };
    }));
  }, []);

  /** Mark all notifications as read; persists to server for server-backed ones. */
  const markAllRead = useCallback((userId) => {
    if (userId) notificationAPI.markAllRead(userId).catch(() => {});
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  /** Remove a notification; also deletes from server if it originated there. */
  const removeNotification = useCallback((id) => {
    setNotifications(prev => {
      const target = prev.find(n => n.id === id);
      if (target?._serverId) notificationAPI.delete(target._serverId).catch(() => {});
      return prev.filter(n => n.id !== id);
    });
  }, []);

  const clearAll = useCallback(() => setNotifications([]), []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const value = {
    notifications,
    unreadCount,
    addNotification,
    loadFromServer,
    markRead,
    markAllRead,
    removeNotification,
    clearAll,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
