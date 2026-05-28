import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { loginWithEmail as apiLoginWithEmail, verifyOwnerOtp as apiVerifyOwnerOtp } from '../../services/authService';
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

  const [otpStep,     setOtpStep]     = useState(false);
  const [otpEmail,    setOtpEmail]    = useState('');
  const [otp,         setOtp]         = useState('');
  const [otpLoading,  setOtpLoading]  = useState(false);

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
      const result = await apiLoginWithEmail(
        email.trim().toLowerCase(),
        password,
        'APPLICATION_OWNER',
      );

      if (result.otpRequired) {
        setOtpEmail(result.email);
        setOtpStep(true);
        return;
      }

      const { user, token } = result;
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

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) { setError('Please enter the OTP.'); return; }
    setOtpLoading(true);
    setError('');
    try {
      const { user, token } = await apiVerifyOwnerOtp(otpEmail, otp.trim());
      login(user, token);
      navigate('/superadmin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid OTP. Please try again.');
    } finally {
      setOtpLoading(false);
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

          {/* OTP verification step */}
          {otpStep ? (
            <form onSubmit={handleOtpSubmit}>
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 18, fontSize: 13, color: '#991b1b' }}>
                <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>security</span>
                A 6-digit OTP has been sent to the authorized security email. Enter it below to complete login.
              </div>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: 13 }}>Verification OTP</label>
                <div style={{ position: 'relative' }}>
                  <span className="material-icons" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: '#94a3b8' }}>pin</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    className="form-control"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                    style={{ paddingLeft: 40, borderRadius: 10, letterSpacing: 4, fontSize: 18 }}
                    autoFocus
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
              <button type="submit" disabled={otpLoading}
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: otpLoading ? '#94a3b8' : 'linear-gradient(135deg, #dc2626, #b91c1c)', color: '#fff', fontWeight: 700, fontSize: 15, fontFamily: 'Poppins, sans-serif', cursor: otpLoading ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                {otpLoading ? 'Verifying…' : 'Verify OTP'}
              </button>
              <button type="button" onClick={() => { setOtpStep(false); setOtp(''); setError(''); }}
                style={{ width: '100%', marginTop: 10, background: 'none', border: '1px solid #e2e8f0', borderRadius: 10, padding: '10px 0', fontSize: 13, color: '#64748b', cursor: 'pointer' }}>
                ← Back to login
              </button>
            </form>
          ) : (
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
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(v => !v)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 18, color: '#94a3b8' }}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
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
          )}

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
