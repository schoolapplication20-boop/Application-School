import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, getDashboardPath } = useAuth();

  const [loginMode, setLoginMode] = useState('email'); // 'email' or 'mobile'
  const [formData, setFormData] = useState({
    email: '',
    mobile: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath(), { replace: true });
    }
  }, [isAuthenticated, navigate, getDashboardPath]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const validateForm = () => {
    if (loginMode === 'email') {
      if (!formData.email.trim()) {
        setError('Please enter your email address.');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address.');
        return false;
      }
    } else {
      if (!formData.mobile.trim()) {
        setError('Please enter your mobile number.');
        return false;
      }
      if (!/^\d{10}$/.test(formData.mobile)) {
        setError('Please enter a valid 10-digit mobile number.');
        return false;
      }
    }
    if (!formData.password) {
      setError('Please enter your password.');
      return false;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setError('');

    try {
      const payload = {
        loginType: loginMode,
        password: formData.password,
        ...(loginMode === 'email' ? { email: formData.email } : { mobile: formData.mobile }),
      };

      const response = await authAPI.login(payload);
      const { token, user } = response.data;
      login(user, token);
      navigate(getDashboardPath(), { replace: true });
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid credentials. Please check your email/mobile and password.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === 'ERR_NETWORK') {
        // Demo mode - use mock login
        handleMockLogin();
        return;
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Mock login for demo/development
  const handleMockLogin = () => {
    const email = formData.email.toLowerCase();
    let mockUser;

    if (email.includes('admin') || formData.mobile === '9999999999') {
      mockUser = { id: 1, name: 'Admin User', email: formData.email, role: 'ADMIN', mobile: '9999999999' };
    } else if (email.includes('teacher') || formData.mobile === '8888888888') {
      mockUser = { id: 2, name: 'Priya Sharma', email: formData.email, role: 'TEACHER', mobile: '8888888888' };
    } else {
      mockUser = { id: 3, name: 'Rajesh Kumar', email: formData.email, role: 'PARENT', mobile: formData.mobile || '7777777777' };
    }

    const mockToken = 'mock-jwt-token-' + Date.now();
    login(mockUser, mockToken);
    navigate(
      mockUser.role === 'ADMIN' ? '/admin/dashboard' :
      mockUser.role === 'TEACHER' ? '/teacher/dashboard' :
      '/parent/dashboard',
      { replace: true }
    );
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
          <p>
            Manage students, teachers, attendance, fees and more — all from one
            powerful dashboard designed for modern schools.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Students', 'Teachers', 'Attendance', 'Fees'].map(tag => (
              <span key={tag} style={{
                background: 'rgba(255,255,255,0.2)', padding: '6px 16px',
                borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#fff'
              }}>{tag}</span>
            ))}
          </div>
        </div>

        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <span className="material-icons">school</span>
            <p>Place kids-cartoon.png here<br />(see assets/images/README.txt)</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-right-inner">
          {/* Header */}
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
              <span style={{ fontSize: '28px' }}>🏆</span>
              <span style={{ fontSize: '24px', fontWeight: 800, color: '#2d3748', fontFamily: 'Poppins, sans-serif' }}>
                Schoolers
              </span>
            </div>
            <h1>Welcome Back!</h1>
            <p>Sign in to your account to continue</p>
          </div>

          {/* Login Toggle */}
          <div className="login-toggle">
            <button
              type="button"
              className={`login-toggle-btn ${loginMode === 'email' ? 'active' : ''}`}
              onClick={() => { setLoginMode('email'); setError(''); }}
            >
              <span className="material-icons">email</span>
              Login with Email
            </button>
            <button
              type="button"
              className={`login-toggle-btn ${loginMode === 'mobile' ? 'active' : ''}`}
              onClick={() => { setLoginMode('mobile'); setError(''); }}
            >
              <span className="material-icons">smartphone</span>
              Login with Mobile
            </button>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="alert-error">
              <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {loginMode === 'email' ? (
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">email</span>
                  <input
                    type="email"
                    name="email"
                    className="form-control has-left-icon"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Mobile Number</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">smartphone</span>
                  <input
                    type="tel"
                    name="mobile"
                    className="form-control has-left-icon"
                    placeholder="Enter 10-digit mobile number"
                    value={formData.mobile}
                    onChange={handleChange}
                    maxLength={10}
                    pattern="[0-9]{10}"
                    autoComplete="tel"
                  />
                </div>
              </div>
            )}

            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ margin: 0 }}>Password</label>
                <Link to="/forgot-password" className="forgot-password-link" style={{ float: 'none' }}>
                  Forgot Password?
                </Link>
              </div>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  className="form-control has-left-icon has-icon"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
                <span
                  className="material-icons input-icon"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </div>
              <p className="password-hint">
                Min 8 chars, include uppercase, lowercase, number and special character
              </p>
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    display: 'inline-block'
                  }} />
                  Signing In...
                </span>
              ) : 'LOGIN'}
            </button>
          </form>

          {/* Demo credentials hint */}
          <div style={{
            marginTop: '20px', padding: '12px 16px', background: '#f7fafc',
            borderRadius: '10px', border: '1px solid #e2e8f0'
          }}>
            <p style={{ fontSize: '12px', color: '#718096', marginBottom: '6px', fontWeight: 600 }}>Demo Credentials:</p>
            <p style={{ fontSize: '11px', color: '#a0aec0', margin: 0, lineHeight: '1.7' }}>
              Admin: admin@school.com / Password@123<br />
              Teacher: teacher@school.com / Password@123<br />
              Parent: parent@school.com / Password@123
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
