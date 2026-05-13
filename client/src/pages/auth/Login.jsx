import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { loginWithEmail as apiLoginWithEmail } from '../../services/authService';
import '../../styles/auth.css';

const ALL_ROLES = [
  { key: 'APPLICATION_OWNER', label: 'App Owner',   icon: 'admin_panel_settings' },
  { key: 'SUPER_ADMIN',       label: 'Super Admin', icon: 'manage_accounts'      },
  { key: 'ADMIN',             label: 'Admin',       icon: 'badge'                },
  { key: 'TEACHER',           label: 'Teacher',     icon: 'school'               },
  { key: 'STUDENT',           label: 'Student',     icon: 'person'               },
];

// School-level roles only — shown when a school tenant context is detected
const SCHOOL_ROLES = ALL_ROLES.filter(r => r.key !== 'APPLICATION_OWNER');

const Login = () => {
  const navigate = useNavigate();
  const { login, refreshPermissions, isAuthenticated, getDashboardPath } = useAuth();
  const { school } = useSchool();

  const primary   = school?.primaryColor   || '#F97316';
  const secondary = school?.secondaryColor || '#EA6C0A';

  // Detect school tenant context:
  // 1. SchoolContext has a school loaded (returning school user session), OR
  // 2. localStorage flag set when a school user previously logged in
  const isSchoolPortal = !!(school?.id || localStorage.getItem('ms_school_tenant'));

  const ROLES = isSchoolPortal ? SCHOOL_ROLES : ALL_ROLES;

  const [selectedRole, setSelectedRole] = useState('');
  const [emailForm, setEmailForm]       = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate(getDashboardPath(), { replace: true });
  }, [isAuthenticated, navigate, getDashboardPath]);

  // Reset form when role changes
  const handleRoleSelect = (roleKey) => {
    setSelectedRole(roleKey);
    setEmailForm({ email: '', password: '' });
    setError('');
  };

  const isStudentRole  = selectedRole === 'STUDENT';
  const inputLabel     = isStudentRole ? 'Admission Number' : 'Email';
  const inputPlaceholder = isStudentRole ? 'Enter your admission number' : 'Enter your email';

  const rolePathMap = {
    APPLICATION_OWNER: '/superadmin/dashboard',
    SUPER_ADMIN:       '/superadmin/dashboard',
    ADMIN:             '/admin/dashboard',
    TEACHER:           '/teacher/dashboard',
    STUDENT:           '/student/dashboard',
  };

  const navigateByRole = (registeredUser) => {
    if (registeredUser?.role === 'APPLICATION_OWNER') {
      navigate('/superadmin/dashboard', { replace: true });
      return;
    }
    if (registeredUser?.firstLogin && registeredUser?.role !== 'SUPER_ADMIN') {
      navigate('/reset-password', { replace: true });
      return;
    }
    if (registeredUser?.role === 'SUPER_ADMIN' && registeredUser?.needsSchoolSetup) {
      navigate('/superadmin/setup-school', { replace: true });
      return;
    }
    navigate(rolePathMap[registeredUser.role] || '/login', { replace: true });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedRole) { setError('Please select your role first.'); return; }
    if (!emailForm.email.trim()) {
      setError(isStudentRole ? 'Please enter your admission number.' : 'Please enter your email.');
      return;
    }
    if (!emailForm.password) { setError('Please enter your password.'); return; }

    setIsLoading(true);
    setError('');

    try {
      const { user: loggedInUser, token } = await apiLoginWithEmail(
        emailForm.email.trim().toLowerCase(),
        emailForm.password,
        selectedRole,  // sent to backend for server-side role validation
      );

      // Frontend guard — ensure backend confirmed the correct role
      if (loggedInUser.role !== selectedRole) {
        setError('Access denied. You do not have permission for the selected role.');
        return;
      }

      // School portal guard — school users must not access App Owner dashboard
      if (isSchoolPortal && loggedInUser.role === 'APPLICATION_OWNER') {
        setError('App Owner access is not available on this portal.');
        return;
      }

      login(loggedInUser, token);

      if (loggedInUser.role === 'ADMIN') {
        const hasPermsInResponse = loggedInUser.permissions != null;
        if (!hasPermsInResponse) await refreshPermissions();
      }

      navigateByRole(loggedInUser);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Left Panel */}
      <div className="auth-left" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
        <div className="auth-brand">
          {school?.logoUrl ? (
            <img src={`${school.logoUrl}`} alt={school.name}
              style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: 'rgba(255,255,255,0.2)', padding: 4 }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <span className="brand-icon">🏆</span>
          )}
          <span className="brand-name">{school?.name || 'My-Skoolz'}</span>
        </div>
        <div className="auth-tagline">
          <h2>Speed Up Your Work Flow With Our Web App</h2>
          <p>Manage students, teachers, attendance, fees and more — all from one powerful dashboard.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Students', 'Teachers', 'Attendance', 'Fees', 'Exams'].map(tag => (
              <span key={tag} style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#fff' }}>{tag}</span>
            ))}
          </div>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            {school?.logoUrl ? (
              <img src={`${school.logoUrl}`} alt={school.name}
                style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 8, borderRadius: 12, background: 'rgba(255,255,255,0.15)', padding: 8 }}
                onError={e => { e.target.replaceWith(Object.assign(document.createElement('span'), { style: 'font-size:80px', textContent: '🎓' })); }} />
            ) : (
              <span style={{ fontSize: '80px' }}>🎓</span>
            )}
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', textAlign: 'center', marginTop: '8px' }}>
              {school?.name ? `${school.name} Portal` : 'Smart School Management'}
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-right-inner">

          {/* Brand header */}
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              {school?.logoUrl ? (
                <img src={`${school.logoUrl}`} alt={school.name}
                  style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }}
                  onError={e => e.target.style.display = 'none'} />
              ) : (
                <span style={{ fontSize: '28px' }}>🏆</span>
              )}
              <span style={{ fontSize: '22px', fontWeight: 800, color: primary, fontFamily: 'Poppins, sans-serif' }}>
                {school?.name || 'My-Skoolz'}
              </span>
            </div>
            <h1>Welcome Back!</h1>
            <p>Select your role to sign in</p>
          </div>

          {/* Role Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '10px' }}>
              Select Role for Login
            </label>
            <div style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${ROLES.length}, 1fr)`,
              gap: '8px',
            }}>
              {ROLES.map(role => {
                const isSelected = selectedRole === role.key;
                return (
                  <button
                    key={role.key}
                    type="button"
                    onClick={() => handleRoleSelect(role.key)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '10px 4px',
                      borderRadius: '10px',
                      border: isSelected ? `2px solid ${primary}` : '2px solid #e2e8f0',
                      background: isSelected ? `${primary}15` : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      outline: 'none',
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: '22px', color: isSelected ? primary : '#a0aec0' }}>
                      {role.icon}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? primary : '#718096',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}>
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="alert-error">
              <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
              {error}
            </div>
          )}

          {/* Login Form — shown only after role is selected */}
          {selectedRole && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">{inputLabel}</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">
                    {isStudentRole ? 'badge' : 'email'}
                  </span>
                  <input
                    type="text"
                    name="email"
                    className="form-control has-left-icon"
                    placeholder={inputPlaceholder}
                    value={emailForm.email}
                    onChange={e => { setEmailForm({ ...emailForm, email: e.target.value }); setError(''); }}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ margin: 0 }}>Password</label>
                  <Link to="/forgot-password" className="forgot-password-link" style={{ float: 'none' }}>Forgot Password?</Link>
                </div>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">lock</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    className="form-control has-left-icon has-icon"
                    placeholder="Enter your password"
                    value={emailForm.password}
                    onChange={e => { setEmailForm({ ...emailForm, password: e.target.value }); setError(''); }}
                    autoComplete="current-password"
                  />
                  <span className="material-icons input-icon" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </div>
              </div>

              <button type="submit" className="btn-auth-submit" disabled={isLoading}
                style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
                {isLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Signing In...
                  </span>
                ) : 'LOGIN'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            &copy; {new Date().getFullYear()} Digital It &amp; Media Solutions Pvt Ltd
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
