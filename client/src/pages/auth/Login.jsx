import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { loginWithEmail as apiLoginWithEmail } from '../../services/authService';
import Logo from '../../components/Logo';
import SEOMeta from '../../components/SEOMeta';
import '../../styles/auth.css';

const ROLE_SEO = {
  ADMIN:       { title: 'Admin Login',   desc: 'Admin login for My-Skoolz school management system. School administrators sign in here to manage students, fees, teachers, and attendance.' },
  SUPER_ADMIN: { title: 'Admin Login',   desc: 'Admin login for My-Skoolz school management system.' },
  TEACHER:     { title: 'Teacher Login', desc: 'Teacher login for My-Skoolz. Sign in to mark attendance, upload marks, manage homework, and communicate with parents.' },
  STUDENT:     { title: 'Student Login', desc: 'Student login for My-Skoolz. Access your attendance, timetable, fee receipts, exam results, and homework.' },
};

const ALL_ROLES = [
  { key: 'SUPER_ADMIN', label: 'Super Admin', icon: 'manage_accounts' },
  { key: 'ADMIN',       label: 'Admin',       icon: 'badge'           },
  { key: 'TEACHER',     label: 'Teacher',     icon: 'school'          },
  { key: 'STUDENT',     label: 'Student',     icon: 'person'          },
];

const Login = () => {
  const navigate = useNavigate();
  const [searchParams]  = useSearchParams();
  const { login, refreshPermissions, isAuthenticated, getDashboardPath } = useAuth();
  const { school } = useSchool();

  const primary   = school?.primaryColor   || '#F97316';
  const secondary = school?.secondaryColor || '#EA6C0A';

  const ROLES = ALL_ROLES;

  // Pre-select role from ?role= query param (used by homepage sitelink buttons)
  const paramRole = searchParams.get('role')?.toUpperCase();
  const validRoles = ALL_ROLES.map(r => r.key);
  const initialRole = validRoles.includes(paramRole) ? paramRole : '';

  const [selectedRole, setSelectedRole] = useState(initialRole);
  const [emailForm, setEmailForm]       = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');

  const seo = ROLE_SEO[selectedRole] || {
    title: 'School Login',
    desc:  'Login to My-Skoolz school management system. Select your role — admin, teacher, or student — to access your portal.',
  };

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
    <>
    <SEOMeta
      title={seo.title}
      description={seo.desc}
      keywords="my-skoolz login, school management login, admin login, student login, teacher login, school portal"
      path={selectedRole ? `/login?role=${selectedRole}` : '/login'}
    />
    <div className="auth-wrapper">
      {/* Left Panel */}
      <div className="auth-left" style={{ background: `linear-gradient(160deg, #0f172a 0%, ${primary}e0 55%, ${secondary}cc 100%)` }}>
        <div className="auth-left__grid" />

        {/* Brand */}
        <div className="auth-brand" style={{ marginBottom: 24 }}>
          {school?.logoUrl ? (
            <img src={school.logoUrl} alt={school.name}
              style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 10, background: 'rgba(255,255,255,0.2)', padding: 4 }}
              onError={e => { e.target.style.display = 'none'; }} />
          ) : (
            <Logo size={42} />
          )}
          <span className="brand-name">{school?.name || 'My-Skoolz'}</span>
        </div>

        {/* Tagline */}
        <div className="auth-tagline" style={{ marginBottom: 0 }}>
          <h2 style={{ fontSize: '24px', lineHeight: 1.35 }}>
            Smart School Management,<br />
            <span style={{ opacity: .8, fontWeight: 600, fontSize: '20px' }}>Built for Modern India</span>
          </h2>
          <p style={{ fontSize: '14px', opacity: .82, marginBottom: 0 }}>
            One platform to manage students, fees, attendance, exams, and communication — accessible from any device.
          </p>
        </div>

        {/* School lifecycle mini-flow */}
        <div className="auth-lifecycle">
          {[
            { icon: '📝', label: 'Admissions' },
            { icon: '📅', label: 'Attendance' },
            { icon: '✏️', label: 'Exams' },
            { icon: '💰', label: 'Fees' },
            { icon: '🎓', label: 'Graduation' },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="auth-lifecycle__stage">
                <div className="auth-lifecycle__dot">{s.icon}</div>
                <span>{s.label}</span>
              </div>
              {i < 4 && <span className="auth-lifecycle__arrow">›</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Feature stat cards */}
        <div className="auth-stats-row">
          {[
            { icon: 'people',          title: 'Student Management',  sub: 'Complete profiles & records' },
            { icon: 'event_available', title: 'Attendance Tracking', sub: 'One-click daily mark' },
            { icon: 'payments',        title: 'Fee Collection',      sub: 'Automated receipts & dues' },
          ].map(s => (
            <div key={s.title} className="auth-stat-card">
              <span className="material-icons">{s.icon}</span>
              <div className="auth-stat-card__text">
                <strong>{s.title}</strong>
                <span>{s.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-right-inner">

          {/* Brand header */}
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px' }}>
              {school?.logoUrl ? (
                <img src={school.logoUrl} alt={school.name}
                  style={{ width: 38, height: 38, objectFit: 'contain', borderRadius: 10 }}
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <Logo size={38} />
              )}
              <span style={{ fontSize: '22px', fontWeight: 800, color: primary, fontFamily: 'Poppins, sans-serif', letterSpacing: '-.3px' }}>
                {school?.name || 'My-Skoolz'}
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '6px', color: '#0f172a' }}>Welcome Back!</h1>
            <p style={{ fontSize: '14px', color: '#64748b' }}>Choose your role below to access your portal</p>
          </div>

          {/* Role Selector */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '10px' }}>
              Select Role for Login
            </label>
            <div className="auth-role-grid-4" style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${ROLES.length}, 1fr)`,
              gap: '10px',
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
                      gap: '7px',
                      padding: '14px 6px 12px',
                      borderRadius: '12px',
                      border: isSelected ? `2px solid ${primary}` : '2px solid #e8edf4',
                      background: isSelected
                        ? `linear-gradient(145deg, ${primary}18, ${primary}08)`
                        : '#fafbfc',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: isSelected
                        ? `0 4px 14px ${primary}30`
                        : '0 1px 3px rgba(0,0,0,.06)',
                      transform: isSelected ? 'translateY(-2px)' : 'none',
                    }}
                  >
                    <span className="material-icons" style={{
                      fontSize: '24px',
                      color: isSelected ? primary : '#94a3b8',
                      transition: 'color 0.2s',
                    }}>
                      {role.icon}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? primary : '#64748b',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      letterSpacing: isSelected ? '0.02em' : '0',
                    }}>
                      {role.label}
                    </span>
                    {isSelected && (
                      <span style={{
                        width: '18px', height: '18px',
                        borderRadius: '50%',
                        background: primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: '2px',
                      }}>
                        <span className="material-icons" style={{ fontSize: '12px', color: '#fff' }}>check</span>
                      </span>
                    )}
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
                  {!isStudentRole && (
                    <Link to="/forgot-password" className="forgot-password-link" style={{ float: 'none' }}>Forgot Password?</Link>
                  )}
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
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="input-icon"
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                  >
                    <span className="material-icons">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
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
    </>
  );
};

export default Login;
