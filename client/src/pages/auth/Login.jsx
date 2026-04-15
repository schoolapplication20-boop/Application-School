import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import { loginWithEmail as apiLoginWithEmail } from '../../services/authService';
import '../../styles/auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, refreshPermissions, isAuthenticated, getDashboardPath } = useAuth();
  const { school } = useSchool();

  const primary   = school?.primaryColor   || '#76C442';
  const secondary = school?.secondaryColor || '#5fa832';

  const [emailForm, setEmailForm]       = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate(getDashboardPath(), { replace: true });
  }, [isAuthenticated, navigate, getDashboardPath]);

  const rolePathMap = {
    APPLICATION_OWNER: '/superadmin/dashboard',
    SUPER_ADMIN: '/superadmin/dashboard',
    ADMIN:       '/admin/dashboard',
    TEACHER:     '/teacher/dashboard',
    PARENT:      '/parent/dashboard',
    STUDENT:     '/student/dashboard',
  };

  const navigateByRole = (registeredUser) => {
    // APPLICATION_OWNER never needs a password reset on first login
    if (registeredUser?.role === 'APPLICATION_OWNER') {
      navigate('/superadmin/dashboard', { replace: true });
      return;
    }

    // Non-SUPER_ADMIN first-login → must set a new password first
    if (registeredUser?.firstLogin && registeredUser?.role !== 'SUPER_ADMIN') {
      navigate('/reset-password', { replace: true });
      return;
    }

    // SUPER_ADMIN with no school set up yet → go to Setup School wizard
    if (registeredUser?.role === 'SUPER_ADMIN' && registeredUser?.needsSchoolSetup) {
      navigate('/superadmin/setup-school', { replace: true });
      return;
    }

    navigate(rolePathMap[registeredUser.role] || '/login', { replace: true });
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!emailForm.email.trim()) { setError('Please enter your email or username.'); return; }
    if (!emailForm.password)    { setError('Please enter your password.'); return; }
    setIsLoading(true);
    setError('');

    // If the user typed a plain username (no @), treat as student username
    const rawInput = emailForm.email.trim();
    const loginEmail = rawInput.includes('@') ? rawInput.toLowerCase() : rawInput.toLowerCase();

    try {
      const { user: loggedInUser, token } = await apiLoginWithEmail(
        loginEmail,
        emailForm.password,
      );
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
            <img
              src={`http://localhost:8080${school.logoUrl}`}
              alt={school.name}
              style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: 'rgba(255,255,255,0.2)', padding: 4 }}
              onError={e => { e.target.style.display='none'; }}
            />
          ) : (
            <span className="brand-icon">🏆</span>
          )}
          <span className="brand-name">{school?.name || 'Schoolers'}</span>
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
              <img src={`http://localhost:8080${school.logoUrl}`} alt={school.name}
                style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 8, borderRadius: 12, background: 'rgba(255,255,255,0.15)', padding: 8 }}
                onError={e => { e.target.replaceWith(Object.assign(document.createElement('span'), { style: 'font-size:80px', textContent: '🎓' })); }}
              />
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
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              {school?.logoUrl ? (
                <img src={`http://localhost:8080${school.logoUrl}`} alt={school.name}
                  style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8 }}
                  onError={e => e.target.style.display = 'none'} />
              ) : (
                <span style={{ fontSize: '28px' }}>🏆</span>
              )}
              <span style={{ fontSize: '22px', fontWeight: 800, color: primary, fontFamily: 'Poppins, sans-serif' }}>
                {school?.name || 'Schoolers'}
              </span>
            </div>
            <h1>Welcome Back!</h1>
            <p>Sign in to your account to continue</p>
          </div>

          {error && (
            <div className="alert-error">
              <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">person</span>
                <input type="text" name="email" className="form-control has-left-icon"
                  placeholder="Enter your email" value={emailForm.email}
                  onChange={e => { setEmailForm({ ...emailForm, email: e.target.value }); setError(''); }}
                  autoComplete="username" autoFocus />
              </div>
            </div>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <Link to="/forgot-password" className="forgot-password-link" style={{ float: 'none' }}>Forgot Password?</Link>
              </div>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">lock</span>
                <input type={showPassword ? 'text' : 'password'} name="password"
                  className="form-control has-left-icon has-icon"
                  placeholder="Enter your password" value={emailForm.password}
                  onChange={e => { setEmailForm({ ...emailForm, password: e.target.value }); setError(''); }}
                  autoComplete="current-password" />
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

          <div className="auth-footer">
            &copy; {new Date().getFullYear()} Digital It &amp; Media Solutions Pvt Ltd
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
