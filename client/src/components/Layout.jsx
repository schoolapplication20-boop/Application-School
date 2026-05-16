import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AiChat from './AiChat';
import MaintenanceBanner from './MaintenanceBanner';
import { useAuth } from '../context/AuthContext';
import { schoolAPI } from '../services/api';
import '../styles/sidebar.css';
import '../styles/dashboard.css';

const Layout = ({ children, pageTitle }) => {
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [schoolInactive, setSchoolInactive]       = useState(false);
  const [inactiveSchoolName, setInactiveSchoolName] = useState('');
  const { user } = useAuth();

  const showAi = !!user;

  useEffect(() => {
    if (!user || user.role === 'APPLICATION_OWNER') return;
    schoolAPI.getMyStatus()
      .then(res => {
        const { active, schoolName } = res.data?.data || {};
        if (active === false) {
          setSchoolInactive(true);
          setInactiveSchoolName(schoolName || '');
        }
      })
      .catch(() => {});
  }, [user]);

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
      />
      {mobileSidebarOpen && (
        <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />
      )}
      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar
          pageTitle={pageTitle}
          onMenuToggle={() => {
            if (window.innerWidth <= 1024) {
              setMobileSidebarOpen(!mobileSidebarOpen);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
        />
        <div className="page-content">
          <MaintenanceBanner />
          {children}
        </div>
      </div>

      {showAi && <AiChat />}

      {/* ── Subscription Ended Overlay ──────────────────────────────────────── */}
      {schoolInactive && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(15, 23, 42, 0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(6px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 20, padding: '40px 36px',
            textAlign: 'center', maxWidth: 460, width: '90%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <span className="material-icons" style={{ fontSize: 40, color: '#dc2626' }}>block</span>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#1a202c' }}>
              Subscription Ended
            </h2>
            {inactiveSchoolName && (
              <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>
                {inactiveSchoolName}
              </p>
            )}
            <p style={{ margin: '0 0 28px', color: '#718096', fontSize: 14, lineHeight: 1.7 }}>
              Your school's subscription has ended and access has been suspended.
              Please reach out to the <strong>My-Skoolz team</strong> to reactivate your school.
            </p>
            <a
              href="mailto:support@my-skoolz.com"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '12px 28px', borderRadius: 10, textDecoration: 'none',
                background: 'linear-gradient(135deg,#dc2626,#991b1b)',
                color: '#fff', fontWeight: 700, fontSize: 14,
                boxShadow: '0 4px 14px rgba(220,38,38,0.35)',
              }}
            >
              <span className="material-icons" style={{ fontSize: 18 }}>mail</span>
              Contact My-Skoolz Team
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;
