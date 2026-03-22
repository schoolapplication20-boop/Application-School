import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';

const Navbar = ({ onMenuToggle, pageTitle }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotif, setShowNotif] = useState(false);

  const notifications = [
    { id: 1, text: 'New student enrollment request', time: '5 min ago', icon: 'school', color: '#76C442' },
    { id: 2, text: 'Fee payment received from Rahul', time: '20 min ago', icon: 'payments', color: '#3182ce' },
    { id: 3, text: 'Teacher submitted attendance report', time: '1 hr ago', icon: 'fact_check', color: '#805ad5' },
  ];

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          onClick={onMenuToggle}
          style={{
            width: '40px', height: '40px', border: 'none', background: '#f7fafc',
            borderRadius: '10px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', cursor: 'pointer', color: '#718096',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(118,196,66,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#f7fafc'}
        >
          <span className="material-icons">menu</span>
        </button>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#2d3748', margin: 0 }}>
            {pageTitle || 'Dashboard'}
          </h2>
          <div style={{ fontSize: '12px', color: '#a0aec0' }}>
            Welcome back, {user?.name?.split(' ')[0] || 'User'}!
          </div>
        </div>
      </div>

      <div className="navbar-right">
        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <span className="material-icons" style={{
            position: 'absolute', left: '10px', color: '#a0aec0', fontSize: '18px', pointerEvents: 'none'
          }}>search</span>
          <input
            type="text"
            placeholder="Search..."
            style={{
              padding: '8px 12px 8px 36px', border: '1.5px solid #e2e8f0', borderRadius: '10px',
              fontSize: '13px', color: '#4a5568', background: '#fafafa', outline: 'none',
              width: '200px', transition: 'all 0.2s'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#76C442';
              e.target.style.width = '240px';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e2e8f0';
              e.target.style.width = '200px';
            }}
          />
        </div>

        {/* Notifications */}
        <div style={{ position: 'relative' }}>
          <button
            className="navbar-icon-btn"
            onClick={() => { setShowNotif(!showNotif); setShowDropdown(false); }}
          >
            <span className="material-icons">notifications</span>
            <span className="notification-dot"></span>
          </button>
          {showNotif && (
            <div style={{
              position: 'absolute', right: 0, top: '50px', width: '320px', background: '#fff',
              borderRadius: '14px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1000,
              border: '1px solid #f0f4f8', overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748' }}>Notifications</span>
                <span style={{ fontSize: '11px', color: '#76C442', cursor: 'pointer', fontWeight: 600 }}>Mark all read</span>
              </div>
              {notifications.map(n => (
                <div key={n.id} style={{
                  padding: '14px 20px', borderBottom: '1px solid #f7fafc',
                  display: 'flex', gap: '12px', alignItems: 'flex-start',
                  cursor: 'pointer', transition: 'background 0.2s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px', background: n.color + '20',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    <span className="material-icons" style={{ fontSize: '18px', color: n.color }}>{n.icon}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: '#2d3748', fontWeight: 500, lineHeight: 1.4 }}>{n.text}</div>
                    <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '3px' }}>{n.time}</div>
                  </div>
                </div>
              ))}
              <div style={{ padding: '12px 20px', textAlign: 'center' }}>
                <span style={{ fontSize: '13px', color: '#76C442', cursor: 'pointer', fontWeight: 600 }}>View all notifications</span>
              </div>
            </div>
          )}
        </div>

        {/* User Dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            className="navbar-user"
            onClick={() => { setShowDropdown(!showDropdown); setShowNotif(false); }}
          >
            <div className="user-avatar" style={{
              width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg, #76C442, #5fa832)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
              fontSize: '15px', fontWeight: 700
            }}>
              {getInitials(user?.name)}
            </div>
            <div style={{ lineHeight: 1.3 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: '#a0aec0' }}>{user?.role}</div>
            </div>
            <span className="material-icons" style={{ fontSize: '18px', color: '#a0aec0' }}>expand_more</span>
          </div>

          {showDropdown && (
            <div style={{
              position: 'absolute', right: 0, top: '50px', width: '220px', background: '#fff',
              borderRadius: '14px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 1000,
              border: '1px solid #f0f4f8', overflow: 'hidden'
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#2d3748' }}>{user?.name}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>{user?.email}</div>
              </div>
              {[
                { icon: 'person', label: 'My Profile' },
                { icon: 'settings', label: 'Settings' },
                { icon: 'lock', label: 'Change Password' },
              ].map(item => (
                <div key={item.label} style={{
                  padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', color: '#4a5568', fontSize: '14px',
                  transition: 'background 0.2s'
                }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="material-icons" style={{ fontSize: '18px', color: '#a0aec0' }}>{item.icon}</span>
                  {item.label}
                </div>
              ))}
              <div style={{ borderTop: '1px solid #f0f4f8' }}>
                <div
                  style={{
                    padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                    cursor: 'pointer', color: '#e53e3e', fontSize: '14px',
                    transition: 'background 0.2s'
                  }}
                  onClick={handleLogout}
                  onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span className="material-icons" style={{ fontSize: '18px' }}>logout</span>
                  Logout
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showDropdown || showNotif) && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 999 }}
          onClick={() => { setShowDropdown(false); setShowNotif(false); }}
        />
      )}
    </header>
  );
};

export default Navbar;
