import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useBusiness } from '../../hooks/useBusiness';
import ReportIssueModal from './ReportIssueModal';

const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/dashboard',            icon: '📊', label: 'Overview',        exact: true },
      { to: '/dashboard/orders',     icon: '📦', label: 'Orders',          badge: 'live' },
      { to: '/dashboard/customers',  icon: '👥', label: 'Customers' },
      { to: '/dashboard/products',   icon: '🍽️', label: 'Products & Menu' },
      { to: '/dashboard/inventory',  icon: '📋', label: 'Inventory' },
    ],
  },
  {
    section: 'Growth',
    items: [
      { to: '/dashboard/analytics',  icon: '📈', label: 'Analytics' },
      { to: '/dashboard/marketing',  icon: '🎯', label: 'Marketing' },
      { to: '/dashboard/qr-codes',   icon: '⬜', label: 'QR Codes' },
    ],
  },
  {
    section: 'WhatsApp',
    items: [
      { to: '/dashboard/automation', icon: '🤖', label: 'Automation' },
    ],
  },
  {
    section: 'Business',
    items: [
      { to: '/dashboard/staff',        icon: '👤', label: 'Staff' },
      { to: '/dashboard/subscription', icon: '⭐', label: 'Subscription' },
      { to: '/dashboard/settings',     icon: '⚙️', label: 'Settings' },
    ],
  },
];

export default function Sidebar() {
  const location = useLocation();
  const { business } = useBusiness();
  const [showReport, setShowReport] = useState(false);

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">💬</div>
        <div className="sidebar-brand-text">
          <div className="sidebar-brand-name">OrderBot</div>
          <div className="sidebar-brand-sub">Ordering Portal</div>
        </div>
      </div>

      {/* Business info */}
      {business && (
        <div className="sidebar-business">
          <div className="sidebar-business-avatar">
            {business.logoUrl
              ? <img src={business.logoUrl} alt={business.businessName} />
              : <span>{(business.businessName || 'B')[0].toUpperCase()}</span>}
          </div>
          <div className="sidebar-business-info">
            <div className="sidebar-business-name">{business.businessName}</div>
            <div className={`sidebar-business-status ${business.isActive ? 'active' : 'inactive'}`}>
              <span className="sidebar-status-dot" />
              {business.isActive ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.section} className="sidebar-section">
            <div className="sidebar-section-label">{group.section}</div>
            {group.items.map((item) => {
              const isActive = item.exact
                ? location.pathname === item.to
                : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={`sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <span className="sidebar-link-icon">{item.icon}</span>
                  <span className="sidebar-link-label">{item.label}</span>
                  {item.badge === 'live' && (
                    <span className="sidebar-live-dot" title="Live orders" />
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <a href="#" className="sidebar-help-link">
          <span>📖</span> Documentation
        </a>
        <button
          type="button"
          className="sidebar-help-link"
          style={{ background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
          onClick={() => setShowReport(true)}
        >
          <span>🐛</span> Report an Issue
        </button>
      </div>

      {showReport && <ReportIssueModal onClose={() => setShowReport(false)} />}
    </aside>
  );
}
