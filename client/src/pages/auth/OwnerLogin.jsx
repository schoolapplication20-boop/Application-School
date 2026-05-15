import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginWithEmail as apiLoginWithEmail } from '../../services/authService';
import Logo from '../../components/Logo';
import '../../styles/auth.css';

const OwnerLogin = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();

  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate('/superadmin/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim())    { setError('Please enter your email.');    return; }
    if (!password)        { setError('Please enter your password.'); return; }

    setIsLoading(true);
    setError('');

    try {
      const { user, token } = await apiLoginWithEmail(
        email.trim().toLowerCase(),
        password,
        'APPLICATION_OWNER',
      );

      if (user.role !== 'APPLICATION_OWNER') {
        setError('Access denied. This portal is for Application Owner only.');
        return;
      }

      login(user, token);
      navigate('/superadmin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      {/* Left Panel */}
      <div className="auth-left" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
        <div className="auth-brand">
          <Logo size={40} />
          <span className="brand-name">My-Skoolz</span>
        </div>
        <div className="auth-tagline">
          <h2>Platform Administration</h2>
          <p>Manage all schools, super admins, and platform-level settings from one place.</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Schools', 'Super Admins', 'Platform Settings', 'Analytics'].map(tag => (
              <span key={tag} style={{ background: 'rgba(255,255,255,0.15)', padding: '5px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, color: '#fff' }}>{tag}</span>
            ))}
          </div>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <Logo size={90} />
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '15px', textAlign: 'center', marginTop: '14px' }}>
              Restricted — Authorized Personnel Only
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-right-inner">

          {/* Header */}
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <Logo size={36} />
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#1e293b', fontFamily: 'Poppins, sans-serif' }}>
                My-Skoolz
              </span>
            </div>
            <h1>Application Owner Login</h1>
            <p>Platform-level access only</p>
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert-danger" style={{ borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>Email Address</label>
              <div style={{ position: 'relative' }}>
                <span className="material-icons" style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 18, color: '#94a3b8',
                }}>email</span>
                <input
                  type="email"
                  className="form-control"
                  placeholder="Enter your email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  style={{ paddingLeft: 40, borderRadius: 10 }}
                  autoFocus
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: 13, margin: 0 }}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, textDecoration: 'none' }}>
                  Forgot Password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <span className="material-icons" style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 18, color: '#94a3b8',
                }}>lock</span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  style={{ paddingLeft: 40, paddingRight: 40, borderRadius: 10 }}
                />
                <span
                  className="material-icons"
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 18, color: '#94a3b8', cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: isLoading ? '#94a3b8' : 'linear-gradient(135deg, #1e293b, #0f172a)',
                color: '#fff', fontWeight: 700, fontSize: 15,
                fontFamily: 'Poppins, sans-serif', cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <a href="/login" style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'none' }}>
              ← Back to School Login
            </a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
