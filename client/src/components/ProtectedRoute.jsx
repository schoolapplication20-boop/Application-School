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
  // SUPER_ADMIN has access to all protected routes, BUT must complete school
  // setup first if no school has been created yet.
  if (user?.role === 'SUPER_ADMIN') {
    const setupRequired = user?.needsSchoolSetup === true;
    const onSetupPage   = location.pathname === '/superadmin/setup-school';
    if (setupRequired && !onSetupPage) {
      return <Navigate to="/superadmin/setup-school" replace />;
    }
    return children;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Wrong role → redirect to own dashboard
    return <Navigate to={getDashboardPath()} replace />;
  }

  // ── Module permission check (only for restricted ADMIN accounts) ───────────
  // SUPER_ADMIN always passes. ADMIN without a permissions object = full access.
  // ADMIN with permissions object must have the specific permKey enabled.
  if (permKey && user?.role === 'ADMIN') {
    if (!hasPermission(permKey)) {
      return <AccessDenied module={MODULE_NAMES[permKey] || permKey} />;
    }
  }

  return children;
};

export default ProtectedRoute;
