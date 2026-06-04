import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { loginWithEmail as apiLoginWithEmail, verifyOwnerOtp as apiVerifyOwnerOtp } from '../../services/authService';
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
  { key: 'SUPER_ADMIN', label: 'Super Admin', icon: 'manage_accounts', color: '#7c3aed', bg: '#ede9fe' },
  { key: 'ADMIN',       label: 'Admin',       icon: 'badge',           color: '#0369a1', bg: '#e0f2fe' },
  { key: 'TEACHER',     label: 'Teacher',     icon: 'school',          color: '#059669', bg: '#d1fae5' },
  { key: 'STUDENT',     label: 'Student',     icon: 'person',          color: '#d97706', bg: '#fef3c7' },
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
  const [isLoading, setIsLoading]         = useState(false);
  const [error, setError]                 = useState('');
  const [accountLocked, setAccountLocked] = useState(false);
  const retryCountRef  = useRef(0);
  const attemptLoginFn = useRef(null);

  // Owner 2FA OTP step
  const [ownerOtpStep,  setOwnerOtpStep]  = useState(false);
  const [ownerEmail,    setOwnerEmail]    = useState('');
  const [ownerOtp,      setOwnerOtp]      = useState('');
  const [otpLoading,    setOtpLoading]    = useState(false);

  const seo = ROLE_SEO[selectedRole] || {
    title: 'School Login',
    desc:  'Login to My-Skoolz school management system. Select your role — admin, teacher, or student — to access your portal.',
  };

  useEffect(() => {
    if (isAuthenticated) navigate(getDashboardPath(), { replace: true });
  }, [isAuthenticated, navigate, getDashboardPath]);

  // Reset form when role changes
  const handleRoleSelect = (roleKey) => {
    retryCountRef.current = 0;
    setSelectedRole(roleKey);
    setEmailForm({ email: '', password: '' });
    setError('');
    setAccountLocked(false);
    setOwnerOtpStep(false);
    setOwnerEmail('');
    setOwnerOtp('');
  };

  const isStudentRole  = selectedRole === 'STUDENT';
  const inputLabel     = isStudentRole ? 'Email or Admission Number' : 'Email';
  const inputPlaceholder = isStudentRole ? 'Enter your email or admission number' : 'Enter your email';

  const rolePathMap = {
    APPLICATION_OWNER: '/owner/dashboard',
    SUPER_ADMIN:       '/superadmin/dashboard',
    ADMIN:             '/admin/dashboard',
    TEACHER:           '/teacher/dashboard',
    STUDENT:           '/student/dashboard',
  };

  const navigateByRole = (registeredUser) => {
    if (registeredUser?.role === 'APPLICATION_OWNER') {
      navigate('/owner/dashboard', { replace: true });
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

  const attemptLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      const result = await apiLoginWithEmail(
        emailForm.email.trim().toLowerCase(),
        emailForm.password,
        selectedRole,
      );

      if (result.otpRequired) {
        setOwnerEmail(result.email);
        setOwnerOtpStep(true);

        retryCountRef.current = 0;
        return;
      }

      const { user: loggedInUser, token } = result;

      if (loggedInUser.role !== selectedRole) {

        retryCountRef.current = 0;
        setError('Access denied. You do not have permission for the selected role.');
        return;
      }

      retryCountRef.current = 0;
      login(loggedInUser, token);

      // Fire permissions refresh in background — do not block navigation.
      // Permissions are already in the login response; this is only a fallback.
      if (loggedInUser.role === 'ADMIN' && loggedInUser.permissions == null) {
        refreshPermissions(); // intentionally not awaited
      }

      navigateByRole(loggedInUser);
    } catch (err) {
      // On transient network errors (502/503/504), silently retry once after 2 s.
      // These are brief during Railway deployments — no countdown UI needed.
      if (err.isColdStart && retryCountRef.current < 1) {
        retryCountRef.current++;
        setIsLoading(true);
        setTimeout(() => attemptLoginFn.current?.(), 2000);
        return;
      }
      retryCountRef.current = 0;
      const msg = err.isColdStart
        ? 'Server is temporarily unavailable. Please try again in a moment.'
        : (err.message || 'Login failed. Please try again.');
      const isLocked = msg.toLowerCase().includes('account locked') || msg.toLowerCase().includes('has been locked');
      setAccountLocked(isLocked);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  attemptLoginFn.current = attemptLogin;

  const handleOwnerOtpSubmit = async (e) => {
    e.preventDefault();
    if (!ownerOtp.trim()) { setError('Please enter the OTP.'); return; }
    setOtpLoading(true);
    setError('');
    try {
      const { user: loggedInUser, token } = await apiVerifyOwnerOtp(ownerEmail, ownerOtp.trim());
      login(loggedInUser, token);
      navigateByRole(loggedInUser);
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedRole) { setError('Please select your role first.'); return; }
    if (!emailForm.email.trim()) {
      setError(isStudentRole ? 'Please enter your admission number.' : 'Please enter your email.');
      return;
    }
    if (!emailForm.password) { setError('Please enter your password.'); return; }

    retryCountRef.current = 0;
    await attemptLogin();
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              {school?.logoUrl ? (
                <img src={school.logoUrl} alt={school.name}
                  style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,.1)' }}
                  onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <Logo size={36} />
              )}
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#1e293b', fontFamily: 'Poppins, sans-serif', letterSpacing: '-.3px' }}>
                {school?.name || 'My-Skoolz'}
              </span>
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 900, marginBottom: '6px', color: '#0f172a', letterSpacing: '-.5px' }}>
              Welcome <span style={{ background: 'linear-gradient(135deg,#6366f1,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Back!</span>
            </h1>
            <p style={{ fontSize: '13.5px', color: '#64748b', lineHeight: 1.6 }}>Select your role below to access your portal</p>
          </div>

          {/* Role Selector — hidden during owner OTP step */}
          {!ownerOtpStep && <div style={{ marginBottom: '22px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', display: 'block', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Select Your Role
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
                      gap: '8px',
                      padding: '16px 6px 13px',
                      borderRadius: '14px',
                      border: isSelected ? `2px solid ${role.color}` : '2px solid #e8edf4',
                      background: isSelected ? role.bg : '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.22s ease',
                      outline: 'none',
                      boxShadow: isSelected
                        ? `0 4px 16px ${role.color}28`
                        : '0 1px 3px rgba(0,0,0,.05)',
                      transform: isSelected ? 'translateY(-3px) scale(1.02)' : 'translateY(0) scale(1)',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: isSelected ? role.color : '#e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all .22s ease',
                      boxShadow: isSelected ? `0 3px 10px ${role.color}40` : 'none',
                    }}>
                      <span className="material-icons" style={{ fontSize: '20px', color: '#fff' }}>
                        {role.icon}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: isSelected ? 800 : 600,
                      color: isSelected ? role.color : '#64748b',
                      textAlign: 'center',
                      lineHeight: 1.2,
                      letterSpacing: '.01em',
                    }}>
                      {role.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>}

          {error && (
            accountLocked ? (
              <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span className="material-icons" style={{ fontSize: 22, color: '#c2410c', flexShrink: 0, marginTop: 1 }}>lock</span>
                  <div>
                    <div style={{ fontWeight: 700, color: '#92400e', fontSize: 13, marginBottom: 4 }}>Account Locked</div>
                    <div style={{ color: '#92400e', fontSize: 12.5, lineHeight: 1.5, marginBottom: 10 }}>
                      Too many failed login attempts. Your account has been locked for security. Reset your password to regain access.
                    </div>
                    <Link to="/forgot-password"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#c2410c', color: '#fff', borderRadius: 7, padding: '7px 14px', fontSize: 12.5, fontWeight: 700, textDecoration: 'none' }}>
                      <span className="material-icons" style={{ fontSize: 15 }}>lock_reset</span>
                      Reset Password
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="alert-error">
                <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
                {error}
              </div>
            )
          )}

          {/* Owner 2FA OTP step */}
          {ownerOtpStep && (
            <form onSubmit={handleOwnerOtpSubmit}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: '#991b1b' }}>
                <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>security</span>
                A 6-digit OTP has been sent to the authorized security email. Enter it below to complete login.
              </div>
              <div className="form-group">
                <label className="form-label">Verification OTP</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">pin</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="form-control has-left-icon"
                    placeholder="Enter 6-digit OTP"
                    value={ownerOtp}
                    onChange={e => { setOwnerOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
              <button type="submit" className="btn-auth-submit" disabled={otpLoading}
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                {otpLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Verifying…
                  </span>
                ) : 'VERIFY OTP'}
              </button>
              <button type="button" onClick={() => { setOwnerOtpStep(false); setOwnerOtp(''); setOwnerEmail(''); setError(''); }}
                style={{ width: '100%', marginTop: 10, background: 'none', border: '1px solid #e2e8f0', borderRadius: 8, padding: '9px 0', fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                ← Back to login
              </button>
            </form>
          )}

          {/* Login Form — shown only after role is selected */}
          {!ownerOtpStep && selectedRole && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">{inputLabel}</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">
                    {isStudentRole ? 'person_search' : 'email'}
                  </span>
                  <input
                    type="text"
                    name="email"
                    className="form-control has-left-icon"
                    placeholder={inputPlaceholder}
                    value={emailForm.email}
                    onChange={e => { setEmailForm({ ...emailForm, email: e.target.value.replace(/\s/g, '') }); setError(''); }}
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', flexWrap: 'wrap', gap: 4 }}>
                  {selectedRole === 'STUDENT' && (
                    <Link to="/student-signup" className="forgot-password-link" style={{ float: 'none' }}>New student? Sign up</Link>
                  )}
                  <Link to="/forgot-password" className="forgot-password-link" style={{ float: 'none', marginLeft: 'auto' }}>Forgot Password?</Link>
                </div>
              </div>

              <button type="submit" className="btn-auth-submit" disabled={isLoading || accountLocked}
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
