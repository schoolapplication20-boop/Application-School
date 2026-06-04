import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AiChat from './AiChat';
import MaintenanceBanner from './MaintenanceBanner';
import BgPicker, { loadSavedBg } from './BgPicker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { schoolAPI } from '../services/api';
import Logo from './Logo';
import '../styles/sidebar.css';
import '../styles/dashboard.css';

// ── Clean top-bar layout for APPLICATION_OWNER (no sidebar) ──────────────────
function OwnerLayout({ children }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = (name = '') => name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'OW';

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top bar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#0f172a',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          {/* Left: Logo + brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={32} />
            <span style={{ fontSize: 17, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>My-Skoolz</span>
            <span style={{ padding: '2px 9px', background: 'rgba(99,102,241,0.25)', color: '#a5b4fc', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', marginLeft: 4 }}>OWNER</span>
          </div>

          {/* Right: user chip + logout */}
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: '7px 14px 7px 8px', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            >
              <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                {initials(user?.name || 'Owner')}
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{user?.name || 'Application Owner'}</div>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>Application Owner</div>
              </div>
              <span className="material-icons" style={{ fontSize: 18, color: '#64748b', marginLeft: 2, transition: 'transform 0.15s', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>expand_more</span>
            </button>

            {menuOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', minWidth: 200, overflow: 'hidden', zIndex: 200 }}>
                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{user?.name || 'Application Owner'}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{user?.email || ''}</div>
                </div>
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 13, fontWeight: 600, textAlign: 'left', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fff5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span className="material-icons" style={{ fontSize: 17 }}>logout</span>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page content ── */}
      <main style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '32px 28px' }}>
        <MaintenanceBanner />
        {children}
      </main>
    </div>
  );
}

const Layout = ({ children, pageTitle }) => {
  const [sidebarCollapsed, setSidebarCollapsed]   = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [schoolInactive, setSchoolInactive]       = useState(false);
  const [inactiveSchoolName, setInactiveSchoolName] = useState('');
  const { isDark } = useTheme();
  const [appBg, setAppBg] = useState(() => loadSavedBg());
  const { user } = useAuth();

  // When dark mode is toggled, auto-switch the page background
  useEffect(() => {
    const savedId = localStorage.getItem('skoolz_bg_v1') || 'default';
    if (isDark && savedId === 'default') {
      setAppBg('#0f172a');
    } else if (!isDark && savedId === 'default') {
      setAppBg('#f8fafc');
    }
  }, [isDark]);

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

  // APPLICATION_OWNER gets a clean full-width layout with no sidebar
  if (user?.role === 'APPLICATION_OWNER') {
    return <OwnerLayout>{children}</OwnerLayout>;
  }

  return (
    <div className="app-layout" style={{ background: appBg }}>
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
      <BgPicker value={appBg} onChange={setAppBg} />


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
