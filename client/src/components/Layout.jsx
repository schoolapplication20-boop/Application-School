import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import AiChat from './AiChat';
import { useAuth } from '../context/AuthContext';
import '../styles/sidebar.css';
import '../styles/dashboard.css';

const Layout = ({ children, pageTitle }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user } = useAuth();

  const showAi = !!user;

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
          {children}
        </div>
      </div>

      {showAi && <AiChat />}
    </div>
  );
};

export default Layout;
