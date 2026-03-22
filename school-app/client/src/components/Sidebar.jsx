import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';

const adminNavItems = [
  { path: '/admin/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/admin/students', icon: 'school', label: 'Students' },
  { path: '/admin/teachers', icon: 'person', label: 'Teachers' },
  { path: '/admin/classes', icon: 'class', label: 'Classes' },
  { path: '/admin/fees', icon: 'payments', label: 'Fees' },
  { path: '/admin/expenses', icon: 'receipt_long', label: 'Expenses' },
];

const teacherNavItems = [
  { path: '/teacher/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/teacher/attendance', icon: 'fact_check', label: 'Attendance' },
  { path: '/teacher/assignments', icon: 'assignment', label: 'Assignments' },
  { path: '/teacher/marks', icon: 'grade', label: 'Marks' },
];

const parentNavItems = [
  { path: '/parent/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { path: '/parent/attendance', icon: 'fact_check', label: 'Attendance' },
  { path: '/parent/assignments', icon: 'assignment', label: 'Assignments' },
  { path: '/parent/performance', icon: 'bar_chart', label: 'Performance' },
  { path: '/parent/fees', icon: 'payments', label: 'Pay Fees' },
  { path: '/parent/messages', icon: 'chat', label: 'Messages', badge: 3 },
];

const Sidebar = ({ collapsed, onToggle, mobileOpen }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const getNavItems = () => {
    switch (user?.role) {
      case 'ADMIN': return adminNavItems;
      case 'TEACHER': return teacherNavItems;
      case 'PARENT': return parentNavItems;
      default: return [];
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const navItems = getNavItems();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <span style={{ fontSize: '22px' }}>🏆</span>
        </div>
        <div className="brand-text">
          <div className="brand-name">Schoolers</div>
          <div className="brand-tagline">Management System</div>
        </div>
      </div>

      {/* Toggle Button */}
      <button
        className="sidebar-toggle"
        onClick={onToggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="material-icons" style={{ fontSize: '16px' }}>
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {!collapsed && (
          <div className="nav-section-label">Navigation</div>
        )}

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            data-tooltip={item.label}
          >
            <span className="material-icons">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
            {item.badge && !collapsed && (
              <span className="nav-badge">{item.badge}</span>
            )}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        {!collapsed && (
          <div className="nav-section-label" style={{ marginTop: '16px' }}>Account</div>
        )}

        <button
          className="nav-item nav-logout"
          onClick={handleLogout}
          data-tooltip="Logout"
          style={{ width: '100%', border: 'none', background: 'none', textAlign: 'left', marginTop: '8px' }}
        >
          <span className="material-icons">logout</span>
          <span className="nav-label">Logout</span>
        </button>
      </nav>

      {/* User Info at Bottom */}
      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div className="user-avatar">
            {getInitials(user?.name)}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div className="user-role">{user?.role || 'Role'}</div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
