import { useState } from 'react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { useNotification } from '../../hooks/useNotification';
import { useClickOutside } from '../../hooks/useClickOutside';
import { formatRelativeTime } from '../../utils/formatters';
import {
  BellIcon, SunIcon, MoonIcon, LogoutIcon, ChevronDownIcon,
} from './Icons';

const getInitials = (fullName) => {
  if (!fullName) return '?';
  return fullName
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const Navbar = ({ title }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotification();
  const navigate = useNavigate();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const notificationsRef = useClickOutside(() => setIsNotificationsOpen(false));
  const userMenuRef = useClickOutside(() => setIsUserMenuOpen(false));

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      markAsRead(notification.notification_id);
    }
  };

  return (
    <header className="app-navbar">
      <h1 className="navbar-page-title">{title}</h1>
      <div className="navbar-actions">
        <button type="button" className="navbar-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>

        <div className="dropdown" ref={notificationsRef}>
          <button
            type="button"
            className="navbar-icon-btn"
            onClick={() => setIsNotificationsOpen((open) => !open)}
            aria-label="Notifications"
          >
            <BellIcon />
            {unreadCount > 0 && <span className="navbar-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
          </button>
          {isNotificationsOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={markAllAsRead}>
                    Mark all read
                  </button>
                )}
              </div>
              {notifications.length === 0 && <div className="dropdown-empty">No notifications yet</div>}
              {notifications.map((notification) => (
                <button
                  key={notification.notification_id}
                  type="button"
                  className={`dropdown-item ${!notification.is_read ? 'is-unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <strong>{notification.title}</strong>
                  <div className="text-muted">{notification.message}</div>
                  <div className="text-muted">{formatRelativeTime(notification.created_at)}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="dropdown" ref={userMenuRef}>
          <button type="button" className="user-menu-trigger" onClick={() => setIsUserMenuOpen((open) => !open)}>
            <span className="user-avatar">{getInitials(user?.full_name)}</span>
            <ChevronDownIcon />
          </button>
          {isUserMenuOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-header">
                <span>{user?.full_name}</span>
              </div>
              <button type="button" className="dropdown-item flex gap-sm" onClick={handleLogout}>
                <LogoutIcon />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

Navbar.propTypes = {
  title: PropTypes.string.isRequired,
};

export default Navbar;
