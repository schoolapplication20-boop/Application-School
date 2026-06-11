import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSchool } from '../context/SchoolContext';
import AccessDenied from '../pages/auth/AccessDenied';

// Shown when a school's App Owner has disabled the requested module
function ModuleDisabled({ module: moduleName }) {
  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 400 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <span className="material-icons" style={{ fontSize: 36, color: '#94a3b8' }}>extension_off</span>
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: '#1a202c' }}>Module Not Enabled</h2>
        <p style={{ margin: '0 0 6px', color: '#718096', fontSize: 14 }}>
          The <strong>{moduleName}</strong> module is not enabled for your school.
        </p>
        <p style={{ margin: 0, color: '#a0aec0', fontSize: 12 }}>
          Contact your Application Owner to enable this module.
        </p>
      </div>
    </div>
  );
}

// Map module key → human-readable name (used in AccessDenied / ModuleDisabled display)
const MODULE_NAMES = {
  students:     'Students',
  teachers:     'Teachers',
  classes:      'Classes',
  applications: 'Applications',
  attendance:   'Attendance',
  fees:         'Fees & Payments',
  collectFee:   'Collect Fee',
  salaries:     'Salaries',
  expenses:     'Expenses',
  transport:    'Transport',
  leave:        'Leave Management',
  examination:  'Exam & Certificates',
  timetable:    'Timetable',
  diary:        'Class Diary',
  messages:     'Messages',
  parents:      'Parents',
};

/**
 * ProtectedRoute
 *
 * Props:
 *   allowedRoles  – array of roles permitted (e.g. ['ADMIN'])
 *   permKey       – (optional) ADMIN permission key; if provided and the
 *                   logged-in ADMIN lacks this permission, shows AccessDenied.
 *   moduleKey     – (optional) school-level feature key; if provided and the
 *                   school has disabled this module, shows ModuleDisabled.
 */
const ProtectedRoute = ({ children, allowedRoles, permKey, moduleKey }) => {
  const { isAuthenticated, isLoading, user, getDashboardPath, hasPermission } = useAuth();
  const { hasFeature, hasRoleModule } = useSchool();
  const location = useLocation();

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="loading-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // ── Not logged in ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // ── First-login password reset gate ───────────────────────────────────────
  if (user?.firstLogin && location.pathname !== '/reset-password') {
    return <Navigate to="/reset-password" replace />;
  }

  // ── Role check ────────────────────────────────────────────────────────────

  // APPLICATION_OWNER: platform-level — only platform routes are accessible.
  // Any attempt to visit a school-level route redirects back to the platform dashboard.
  if (user?.role === 'APPLICATION_OWNER') {
    if (!allowedRoles?.includes('APPLICATION_OWNER')) {
      return <Navigate to="/owner/dashboard" replace />;
    }
    return children;
  }

  // SUPER_ADMIN: school-level owner — must complete school setup before accessing
  // any other route. Once setup is done, block re-entry to the setup page.
  if (user?.role === 'SUPER_ADMIN') {
    const setupRequired = user?.needsSchoolSetup === true;
    const onSetupPage   = location.pathname === '/superadmin/setup-school';
    if (setupRequired && !onSetupPage) {
      return <Navigate to="/superadmin/setup-school" replace />;
    }
    if (!setupRequired && onSetupPage) {
      return <Navigate to="/superadmin/dashboard" replace />;
    }
    if (permKey && !hasPermission(permKey)) {
      return <AccessDenied module={MODULE_NAMES[permKey] || permKey} />;
    }
    // Apply App Owner feature gate to SUPER_ADMIN as well
    const saModuleKey = moduleKey || permKey;
    if (saModuleKey && !hasFeature(saModuleKey)) {
      return <ModuleDisabled module={MODULE_NAMES[saModuleKey] || saModuleKey} />;
    }
    return children;
  }

  // All other roles: check that the route allows this role.
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getDashboardPath()} replace />;
  }

  // ADMIN: enforce module-level permissions (permKey must be explicitly granted).
  if (permKey && user?.role === 'ADMIN') {
    if (!hasPermission(permKey)) {
      return <AccessDenied module={MODULE_NAMES[permKey] || permKey} />;
    }
  }

  // School-level feature gate: check if the App Owner has disabled this module.
  // Applies to all roles (TEACHER, STUDENT, ADMIN, SUPER_ADMIN) when moduleKey is set.
  // For TEACHER/STUDENT, also honour the per-role module overrides set by the
  // App Owner (school.features.teacherModules / .studentModules).
  const effectiveModuleKey = moduleKey || permKey;
  if (effectiveModuleKey) {
    const enabled = (user?.role === 'TEACHER' || user?.role === 'STUDENT')
      ? hasRoleModule(user.role, effectiveModuleKey)
      : hasFeature(effectiveModuleKey);
    if (!enabled) {
      return <ModuleDisabled module={MODULE_NAMES[effectiveModuleKey] || effectiveModuleKey} />;
    }
  }

  return children;
};

export default ProtectedRoute;
