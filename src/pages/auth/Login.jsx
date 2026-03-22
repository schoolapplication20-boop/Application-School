import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginWithEmail as apiLoginWithEmail } from '../../services/authService';
import '../../styles/auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, refreshPermissions, isAuthenticated, getDashboardPath } = useAuth();

  const [emailForm, setEmailForm]       = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate(getDashboardPath(), { replace: true });
  }, [isAuthenticated, navigate, getDashboardPath]);

  const rolePathMap = {
    SUPER_ADMIN: '/superadmin/dashboard',
    ADMIN:       '/admin/dashboard',
    TEACHER:     '/teacher/dashboard',
    PARENT:      '/parent/dashboard',
  };

  const navigateByRole = (registeredUser) => {
    if (registeredUser?.firstLogin && registeredUser?.role !== 'SUPER_ADMIN') {
      navigate('/reset-password', { replace: true });
    } else {
      navigate(rolePathMap[registeredUser.role] || '/login', { replace: true });
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!emailForm.email.trim()) { setError('Please enter your email address.'); return; }
    if (!emailForm.password)    { setError('Please enter your password.'); return; }
    setIsLoading(true);
    setError('');

    try {
      const { user: loggedInUser, token } = await apiLoginWithEmail(
        emailForm.email.trim().toLowerCase(),
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
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">🏆</span>
          <span className="brand-name">Schoolers</span>
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
            <span style={{ fontSize: '80px' }}>🎓</span>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', textAlign: 'center', marginTop: '8px' }}>Smart School Management</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <span style={{ fontSize: '28px' }}>🏆</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#2d3748', fontFamily: 'Poppins, sans-serif' }}>Schoolers</span>
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
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">email</span>
                <input type="email" name="email" className="form-control has-left-icon"
                  placeholder="Enter your email" value={emailForm.email}
                  onChange={e => { setEmailForm({ ...emailForm, email: e.target.value }); setError(''); }}
                  autoComplete="email" autoFocus />
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
            <button type="submit" className="btn-auth-submit" disabled={isLoading}>
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Signing In...
                </span>
              ) : 'LOGIN'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: '20px', padding: '12px 16px', background: '#f7fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <p style={{ fontSize: '12px', color: '#718096', marginBottom: '6px', fontWeight: 600 }}>Demo Credentials:</p>
            <p style={{ fontSize: '11px', color: '#a0aec0', margin: 0, lineHeight: '1.8' }}>
              <span style={{ display: 'inline-block', padding: '1px 7px', background: '#76C44220', color: '#276749', borderRadius: '8px', fontWeight: 700, marginRight: '4px', fontSize: '10px' }}>SUPER ADMIN</span>
              superadmin@schoolers.com / SuperAdmin@123<br />
              <span style={{ display: 'inline-block', padding: '1px 7px', background: '#3182ce20', color: '#2b6cb0', borderRadius: '8px', fontWeight: 700, marginRight: '4px', fontSize: '10px' }}>ADMIN</span>
              admin@schoolers.com / Admin@123<br />
              <span style={{ display: 'inline-block', padding: '1px 7px', background: '#805ad520', color: '#553c9a', borderRadius: '8px', fontWeight: 700, marginRight: '4px', fontSize: '10px' }}>TEACHER</span>
              rajesh@schoolers.com / Teacher@123<br />
              <span style={{ display: 'inline-block', padding: '1px 7px', background: '#805ad520', color: '#553c9a', borderRadius: '8px', fontWeight: 700, marginRight: '4px', fontSize: '10px' }}>TEACHER</span>
              priya@schoolers.com / Teacher@123<br />
              <span style={{ display: 'inline-block', padding: '1px 7px', background: '#ed893620', color: '#c05621', borderRadius: '8px', fontWeight: 700, marginRight: '4px', fontSize: '10px' }}>PARENT</span>
              suresh@schoolers.com / Parent@123
            </p>
          </div>

          <div className="auth-footer">
            &copy; {new Date().getFullYear()} Digital It &amp; Media Solutions Pvt Ltd
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
