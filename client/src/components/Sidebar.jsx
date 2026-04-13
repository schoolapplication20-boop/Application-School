import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
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
  { path: '/admin/timetable',          icon: 'schedule',                label: 'Timetable',          permKey: 'timetable' },
  { path: '/admin/examination',        icon: 'verified',                label: 'Exam & Certificates', permKey: 'examination' },
];

// Super-Admin-only items (platform management)
const superAdminOnlyItems = [
  { path: '/superadmin/admins',            icon: 'manage_accounts',  label: 'Admin Management',     permKey: null },
  { path: '/superadmin/setup-school',      icon: 'add_business',     label: 'Setup School',         permKey: null },
  { path: '/superadmin/student-transport', icon: 'directions_bus',   label: 'Student Transport',    permKey: null },
  { path: '/superadmin/exam-schedule',     icon: 'event_note',       label: 'Exam Schedule',        permKey: null },
];

const teacherNavItems = [
  { path: '/teacher/dashboard',       icon: 'dashboard',      label: 'Dashboard' },
  { path: '/teacher/schedule',        icon: 'calendar_today', label: 'My Schedule' },
  { path: '/teacher/attendance',      icon: 'fact_check',     label: 'Attendance' },
  { path: '/teacher/homework',        icon: 'menu_book',      label: 'Homework' },
  { path: '/teacher/marks',           icon: 'grade',          label: 'Marks' },
  { path: '/teacher/messages',        icon: 'chat',           label: 'Messages' },
  { path: '/teacher/leave-approval',  icon: 'how_to_reg',     label: 'Leave Approval' },
  { path: '/teacher/leave-request',   icon: 'event_busy',     label: 'Leave Request' },
  { path: '/teacher/examination',     icon: 'verified',       label: 'Exam & Certificates' },
];

const studentNavItems = [
  { path: '/student/dashboard',   icon: 'dashboard',      label: 'Dashboard' },
  { path: '/student/attendance',  icon: 'fact_check',     label: 'Attendance' },
  { path: '/student/assignments', icon: 'assignment',     label: 'Assignments' },
  { path: '/student/diary',       icon: 'photo_library',  label: 'Class Diary' },
  { path: '/student/fees',        icon: 'payments',       label: 'Pay Fees' },
  { path: '/student/leave',       icon: 'event_busy',     label: 'Leave Request' },
  { path: '/student/messages',    icon: 'chat',           label: 'Messages' },
  { path: '/student/examination', icon: 'verified',       label: 'Hall Ticket & Certs' },
];

const parentNavItems = [
  { path: '/parent/dashboard',    icon: 'dashboard',      label: 'Dashboard' },
  { path: '/parent/performance',  icon: 'bar_chart',      label: 'My Child' },
  { path: '/parent/attendance',   icon: 'fact_check',     label: 'Attendance' },
  { path: '/parent/assignments',  icon: 'assignment',     label: 'Assignments' },
  { path: '/parent/diary',        icon: 'photo_library',  label: "Class Diary" },
  { path: '/parent/pay-fees',     icon: 'payments',       label: 'Pay Fees' },
  { path: '/parent/leave',        icon: 'event_busy',     label: 'Leave Request' },
  { path: '/parent/messages',     icon: 'chat',           label: 'Messages', badge: 2 },
  { path: '/parent/examination',  icon: 'verified',       label: 'Hall Ticket & Certs' },
];

const Sidebar = ({ collapsed, onToggle, mobileOpen }) => {
  const { user }   = useAuth();
  const { school } = useSchool();

  // Dynamic accent colour from school branding (fallback to green)
  const primary   = school?.primaryColor   || '#76C442';
  const secondary = school?.secondaryColor || '#5fa832';

  /**
   * Returns the nav sections to render.
   * For SUPER_ADMIN: two sections — SA-specific items + full admin panel.
   * For restricted ADMIN: only permitted items.
   * For others: their own items.
   */
  const getNavSections = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN': {
        const [first, ...rest] = adminNavItems.filter(item => item.path !== '/admin/parents');
        // Show "Setup School" only while school setup is still needed.
        // needsSchoolSetup=true means school doesn't exist yet or isSetupCompleted=false.
        // After setup completes, updateUser({ needsSchoolSetup: false }) clears this flag.
        const saItems = superAdminOnlyItems.filter(item => {
          if (item.path === '/superadmin/setup-school') return user?.needsSchoolSetup === true;
          return true;
        });
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

      case 'PARENT':
        return [{ label: 'Navigation', items: parentNavItems }];

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
    SUPER_ADMIN: { bg: '#7c3aed20', text: '#7c3aed' },
    ADMIN:       { bg: '#76C44220', text: '#276749' },
    TEACHER:     { bg: '#3182ce20', text: '#2c5282' },
    PARENT:      { bg: '#ed893620', text: '#9c4221' },
  };
  const roleColors = roleBadgeColor[user?.role] || { bg: '#f0f4f8', text: '#4a5568' };

  const sections = getNavSections();

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-logo" style={{
          background: school?.logoUrl ? 'transparent' : `linear-gradient(135deg, ${primary}, ${secondary})`,
          borderRadius: school?.logoUrl ? '0' : undefined,
          overflow: 'hidden',
        }}>
          {school?.logoUrl ? (
            <img
              src={`http://localhost:8080${school.logoUrl}`}
              alt={school.name || 'School logo'}
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <span style={{ fontSize: '20px', display: school?.logoUrl ? 'none' : 'flex' }}>🏆</span>
        </div>
        <div className="brand-text">
          <div className="brand-name" style={{ color: primary }}>
            {school?.name || 'Schoolers'}
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
              background: user?.role === 'SUPER_ADMIN'
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
              {user?.role === 'SUPER_ADMIN' ? 'Super Admin' : (user?.role || 'Role')}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
