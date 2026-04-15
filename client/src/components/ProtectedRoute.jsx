import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccessDenied from '../pages/auth/AccessDenied';

// Map admin route paths → human-readable module names (used in AccessDenied display)
const MODULE_NAMES = {
  students:     'Students',
  teachers:     'Teachers',
  classes:      'Classes',
  applications: 'Applications',
  attendance:   'Attendance Report',
  fees:         'Fees & Payments',
  collectFee:   'Collect Fee',
  salaries:     'Salaries',
  expenses:     'Expenses',
  transport:    'Transport',
  leave:        'Leave Management',
  examination:  'Exam & Certificates',
  timetable:    'Timetable',
  parents:      'Parents',
};

/**
 * ProtectedRoute
 *
 * Props:
 *   allowedRoles  – array of roles permitted (e.g. ['ADMIN'])
 *   permKey       – (optional) module permission key; if provided and the
 *                   logged-in ADMIN lacks this permission, shows AccessDenied.
 */
const ProtectedRoute = ({ children, allowedRoles, permKey }) => {
  const { isAuthenticated, isLoading, user, getDashboardPath, hasPermission } = useAuth();
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
      return <Navigate to="/superadmin/dashboard" replace />;
    }
    return children;
  }

  // SUPER_ADMIN: school-level owner — must complete school setup before accessing
  // any other route. Once setup is done, all routes are open (with optional permKey check).
  if (user?.role === 'SUPER_ADMIN') {
    const setupRequired = user?.needsSchoolSetup === true;
    const onSetupPage   = location.pathname === '/superadmin/setup-school';
    if (setupRequired && !onSetupPage) {
      return <Navigate to="/superadmin/setup-school" replace />;
    }
    if (permKey && !hasPermission(permKey)) {
      return <AccessDenied module={MODULE_NAMES[permKey] || permKey} />;
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

  return children;
};

export default ProtectedRoute;
