import React, { useState, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import { schoolAPI, BASE_URL } from '../services/api';
import '../styles/sidebar.css';

const adminNavItems = [
  { path: '/admin/dashboard',          icon: 'dashboard',              label: 'Dashboard',          permKey: null },
  { path: '/admin/students',           icon: 'school',                  label: 'Students',           permKey: 'students' },
  { path: '/admin/teachers',           icon: 'person',                  label: 'Teachers',           permKey: 'teachers' },
  { path: '/admin/applications',       icon: 'assignment_ind',          label: 'Applications',       permKey: 'applications' },
  { path: '/admin/parents',            icon: 'family_restroom',         label: 'Parents',            permKey: 'parents' },
  { path: '/admin/classes',            icon: 'class',                   label: 'Classes',            permKey: 'classes' },
  { path: '/admin/collect-fee',        icon: 'point_of_sale',           label: 'Collect Fee',        permKey: 'collectFee' },
  { path: '/admin/fees',               icon: 'payments',                label: 'Fees & Payments',    permKey: 'fees' },
  { path: '/admin/salaries',           icon: 'account_balance_wallet',  label: 'Salaries',           permKey: 'salaries' },
  { path: '/admin/expenses',           icon: 'receipt_long',            label: 'Expenses',           permKey: 'expenses' },
  { path: '/admin/leave',              icon: 'event_busy',              label: 'Leave Management',   permKey: 'leave' },
  { path: '/admin/transport',          icon: 'directions_bus',          label: 'Transport',          permKey: 'transport' },
  { path: '/admin/attendance-report',  icon: 'fact_check',              label: 'Attendance Report',  permKey: 'attendance' },
  { path: '/admin/teacher-attendance', icon: 'co_present',              label: 'Teacher Attendance',  permKey: null },
  { path: '/admin/timetable',          icon: 'schedule',                label: 'Timetable',          permKey: 'timetable' },
  { path: '/admin/examination',        icon: 'verified',                label: 'Exam & Certificates', permKey: 'examination' },
  { path: '/admin/messages',            icon: 'campaign',                label: 'Messages',            permKey: null },
  { path: '/admin/settings',            icon: 'settings',                label: 'School Settings',      permKey: null },
];

// SUPER_ADMIN-only items (school management tools)
const superAdminOnlyItems = [
  { path: '/superadmin/admins',            icon: 'manage_accounts',  label: 'Admin Management',     permKey: null },
  // Setup School is only shown while needsSchoolSetup === true (filtered below)
  { path: '/superadmin/setup-school',      icon: 'add_business',     label: 'Setup School',         permKey: null },
  { path: '/superadmin/exam-schedule',     icon: 'event_note',       label: 'Exam Schedule',        permKey: null },
];

// APPLICATION_OWNER portal items — platform dashboard only.
// APPLICATION_OWNER manages schools & SUPER_ADMINs from their platform dashboard;
// they do NOT navigate into school-level admin routes.
const appOwnerNavItems = [
  { path: '/superadmin/dashboard', icon: 'domain', label: 'Platform Dashboard', permKey: null },
];

const teacherNavItems = [
  { path: '/teacher/dashboard',       icon: 'dashboard',      label: 'Dashboard' },
  { path: '/teacher/my-students',     icon: 'group',          label: 'My Students' },
  { path: '/teacher/schedule',        icon: 'calendar_today', label: 'My Schedule' },
  { path: '/teacher/attendance',      icon: 'fact_check',     label: 'Attendance' },
  { path: '/teacher/diary',           icon: 'menu_book',      label: 'Diary' },
  { path: '/teacher/marks',           icon: 'grade',          label: 'Marks' },
  { path: '/teacher/messages',        icon: 'chat',           label: 'Messages' },
  { path: '/teacher/leave-approval',  icon: 'how_to_reg',     label: 'Leave Approval' },
  { path: '/teacher/leave-request',   icon: 'event_busy',     label: 'Leave Request' },
  { path: '/teacher/my-attendance',  icon: 'co_present',     label: 'My Attendance' },
  { path: '/teacher/examination',    icon: 'verified',        label: 'Exam & Certificates' },
];

const studentNavItems = [
  { path: '/student/dashboard',   icon: 'dashboard',      label: 'Dashboard' },
  { path: '/student/attendance',  icon: 'fact_check',     label: 'Attendance' },
  { path: '/student/diary',       icon: 'photo_library',  label: 'Class Diary' },
  { path: '/student/fees',        icon: 'payments',       label: 'Pay Fees' },
  { path: '/student/leave',       icon: 'event_busy',     label: 'Leave Request' },
  { path: '/student/messages',    icon: 'chat',           label: 'Messages' },
  { path: '/student/exams',       icon: 'calendar_view_week', label: 'Schedule & Exams' },
  { path: '/student/marks',       icon: 'grade',              label: 'My Marks' },
];


const Sidebar = ({ collapsed, onToggle, mobileOpen }) => {
  const { user, logout }                    = useAuth();
  const navigate                            = useNavigate();
  const { school, logoVersion, loadSchool } = useSchool();
  const [logoError, setLogoError]           = useState(false);
  const [logoHover, setLogoHover]           = useState(false);
  const [uploading,  setUploading]          = useState(false);
  const logoInputRef                        = useRef(null);

  const canChangeLogo = (user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN') && school?.schoolId != null;

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return;
    if (file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    try {
      await schoolAPI.updateLogo(school.schoolId, file);
      setLogoError(false);
      await loadSchool();
    } catch {
      // silent — logo stays unchanged
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Reset error flag whenever the logo URL or version changes
  React.useEffect(() => { setLogoError(false); }, [school?.logoUrl, logoVersion]);

  // Dynamic accent colour from school branding (fallback to green)
  const primary   = school?.primaryColor   || '#76C442';
  const secondary = school?.secondaryColor || '#5fa832';

  // Build a cache-busted logo URL. Relative paths are prefixed with BASE_URL so
  // the image loads from the backend in both dev and production (Vercel has no
  // /uploads proxy — all paths are rewritten to index.html by the SPA catch-all).
  const resolvedLogoUrl = school?.logoUrl
    ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${BASE_URL}${school.logoUrl}`)
    : null;
  const logoSrc = resolvedLogoUrl ? `${resolvedLogoUrl}?v=${logoVersion}` : null;

  // Initials fallback: first letter of each word (max 2)
  const schoolInitials = (school?.name || 'S')
    .split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);

  /**
   * Returns the nav sections to render.
   * For SUPER_ADMIN: two sections — SA-specific items + full admin panel.
   * For restricted ADMIN: only permitted items.
   * For others: their own items.
   */
  const getNavSections = () => {
    switch (user?.role) {
      // ── APPLICATION_OWNER ────────────────────────────────────────────────
      // Platform-level account: only the platform dashboard is accessible.
      // School-level routes (/admin/*, /teacher/*, etc.) are blocked by ProtectedRoute.
      case 'APPLICATION_OWNER':
        return [{ label: 'Platform Management', items: appOwnerNavItems }];

      // ── SUPER_ADMIN ──────────────────────────────────────────────────────
      // School-level owner: full admin panel + SA-specific tools.
      // "Setup School" is shown only while needsSchoolSetup is true.
      case 'SUPER_ADMIN': {
        let perms = null;
        if (user.permissions) {
          try {
            perms = typeof user.permissions === 'string'
              ? JSON.parse(user.permissions)
              : user.permissions;
          } catch { perms = null; }
        }

        const visibleAdminItems = adminNavItems
          .filter(item => item.path !== '/admin/parents')
          .filter(item => item.permKey === null || !perms || perms[item.permKey] === true);

        // "Setup School" only while school setup is still pending
        const saItems = superAdminOnlyItems.filter(item => {
          if (item.path === '/superadmin/setup-school') return user?.needsSchoolSetup === true;
          return true;
        });

        const [first, ...rest] = visibleAdminItems;
        return [
          { label: 'Navigation', items: [first, ...saItems, ...rest] },
        ];
      }

      case 'ADMIN': {
        // Parse permissions — handles null, object, or JSON string from backend
        let perms = {};
        if (user.permissions) {
          if (typeof user.permissions === 'string') {
            try { perms = JSON.parse(user.permissions); } catch { perms = {}; }
          } else if (typeof user.permissions === 'object') {
            perms = user.permissions;
          }
        }
        // Dashboard & Timetable (permKey: null) always show
        // All other items require explicit true permission
        const visibleItems = adminNavItems.filter(
          item => item.permKey === null || perms[item.permKey] === true
        );
        return [{ label: 'Navigation', items: visibleItems }];
      }

      case 'TEACHER':
        return [{ label: 'Navigation', items: teacherNavItems }];

      case 'STUDENT':
        return [{ label: 'Navigation', items: studentNavItems }];

      default:
        return [];
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const roleBadgeColor = {
    APPLICATION_OWNER: { bg: '#dc262620', text: '#dc2626' },
    SUPER_ADMIN:       { bg: '#7c3aed20', text: '#7c3aed' },
    ADMIN:             { bg: '#76C44220', text: '#276749' },
    TEACHER:           { bg: '#3182ce20', text: '#2c5282' },
  };
  const roleColors = roleBadgeColor[user?.role] || { bg: '#f0f4f8', text: '#4a5568' };

  const sections = getNavSections();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        {/* Logo / Initials avatar */}
        <div
          className="brand-logo"
          title={canChangeLogo ? 'Click to change school logo' : undefined}
          onClick={canChangeLogo ? () => logoInputRef.current?.click() : undefined}
          onMouseEnter={() => canChangeLogo && setLogoHover(true)}
          onMouseLeave={() => setLogoHover(false)}
          style={{
            background: (logoSrc && !logoError)
              ? 'transparent'
              : `linear-gradient(135deg, ${primary}, ${secondary})`,
            cursor: canChangeLogo ? 'pointer' : 'default',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {logoSrc && !logoError ? (
            <img
              src={logoSrc}
              alt={school?.name || 'School logo'}
              className="brand-logo-img"
              onError={() => setLogoError(true)}
              style={{ opacity: (logoHover || uploading) ? 0.55 : 1, transition: 'opacity 0.2s' }}
            />
          ) : (
            <span className="brand-logo-initials">{schoolInitials}</span>
          )}
          {/* Camera overlay for SUPER_ADMIN on hover or while uploading */}
          {canChangeLogo && (logoHover || uploading) && (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.28)', borderRadius: 'inherit',
            }}>
              <span className="material-icons" style={{ fontSize: 18, color: '#fff' }}>
                {uploading ? 'hourglass_top' : 'photo_camera'}
              </span>
            </div>
          )}
        </div>
        {/* Hidden file input for logo upload */}
        {canChangeLogo && (
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleLogoFileChange}
          />
        )}

        {/* School name + tagline */}
        <div className="brand-text">
          <div className="brand-name" style={{ color: primary }}>
            {school?.name || 'My-Skoolz'}
          </div>
          <div className="brand-tagline">Management System</div>
        </div>
      </div>

      {/* Toggle Button */}
      <button className="sidebar-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
        <span className="material-icons" style={{ fontSize: '16px' }}>
          {collapsed ? 'chevron_right' : 'chevron_left'}
        </span>
      </button>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {sections.map((section, si) => (
          <React.Fragment key={section.label}>
            {!collapsed && (
              <div
                className="nav-section-label"
                style={si > 0 ? { marginTop: '12px' } : {}}
              >
                {section.label}
              </div>
            )}

            {section.items.map((item) => (
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
          </React.Fragment>
        ))}

        <div style={{ flex: 1 }} />
      </nav>

      {/* User Info */}
      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <div
            className="user-avatar"
            style={{
              background: user?.role === 'APPLICATION_OWNER'
                ? 'linear-gradient(135deg, #dc2626, #991b1b)'
                : user?.role === 'SUPER_ADMIN'
                ? 'linear-gradient(135deg, #7c3aed, #553c9a)'
                : `linear-gradient(135deg, ${primary}, ${secondary})`,
            }}
          >
            {getInitials(user?.name)}
          </div>
          <div className="user-info">
            <div className="user-name">{user?.name || 'User'}</div>
            <div
              className="user-role"
              style={{
                display: 'inline-block',
                padding: '1px 7px',
                borderRadius: '8px',
                fontSize: '10px',
                fontWeight: 700,
                background: roleColors.bg,
                color: roleColors.text,
                marginTop: '2px',
              }}
            >
              {user?.role === 'APPLICATION_OWNER' ? 'App Owner'
                : user?.role === 'SUPER_ADMIN' ? 'Super Admin'
                : (user?.role || 'Role')}
            </div>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          data-tooltip="Logout"
          style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', marginTop: '8px', padding: '10px 12px',
            background: 'none', border: 'none', borderRadius: '10px',
            cursor: 'pointer', color: '#fc8181', fontSize: '13px',
            fontWeight: 600, transition: 'background 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(252,129,129,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <span className="material-icons" style={{ fontSize: '20px', flexShrink: 0 }}>logout</span>
          <span className="nav-label">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
