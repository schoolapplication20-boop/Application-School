import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import SEOMeta from '../../components/SEOMeta';
import Logo from '../../components/Logo';
import '../../styles/auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const OTP_EXPIRY_SECONDS = 300;

  // OTP popup state
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [timer, setTimer] = useState(OTP_EXPIRY_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!showOtpPopup) return;
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(id);
  }, [showOtpPopup, timer]);

  const formatTime = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
  };

  const isEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const maskIdentifier = (val) => {
    if (!val.includes('@')) return val;
    const [local, domain] = val.split('@');
    return local.slice(0, 2) + '****@' + domain;
  };

  const sendOtp = async () => {
    try {
      await authAPI.forgotPassword({ identifier });
    } catch (err) {
      throw new Error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Not registered. Please contact admin.'
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) { setError('Please enter your email address.'); return; }
    if (!isEmail(identifier)) {
      setError('Please enter a valid email address.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await sendOtp();
      setTimer(OTP_EXPIRY_SECONDS);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setOtpError('');
      setShowOtpPopup(true);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setOtpError('');
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = ['', '', '', '', '', ''];
      pasted.split('').forEach((char, i) => { if (i < 6) newOtp[i] = char; });
      setOtp(newOtp);
      inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  const handleResend = async () => {
    setOtpError('');
    setOtp(['', '', '', '', '', '']);
    try {
      await sendOtp();
      setTimer(OTP_EXPIRY_SECONDS);
      setCanResend(false);
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } catch (err) {
      setOtpError(err.message);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 6) { setOtpError('Please enter the complete 6-digit OTP.'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      await authAPI.verifyOTP({ identifier, otp: otpString });
      setShowOtpPopup(false);
      navigate('/set-new-password', { state: { identifier } });
    } catch (err) {
      setOtpError(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Invalid OTP. Please try again.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <SEOMeta title="Forgot Password" description="Reset your My-Skoolz account password securely." />
      {/* Left Panel */}
      <div className="auth-left" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}>
        <div className="auth-left__grid" />
        <div className="auth-brand">
          <Logo size={42} />
          <span className="brand-name">My-Skoolz</span>
        </div>
        <div className="auth-tagline">
          <h2>Reset Your Password Securely</h2>
          <p>
            Enter your registered email address and we'll send you a one-time password (OTP) to reset your account password.
          </p>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <span className="material-icons">lock_reset</span>
            <p>Forgot Password</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <Link to="/login" className="btn-back">
            <span className="material-icons">arrow_back</span>
            Back to Login
          </Link>

          <div className="auth-icon-box">
            <span className="material-icons">email</span>
          </div>

          <div className="auth-form-header" style={{ textAlign: 'center' }}>
            <h1>Forgot Password</h1>
            <p>Enter your registered email address to receive an OTP</p>
          </div>

          {error && (
            <div className="alert-error">
              <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">email</span>
                <input
                  type="email"
                  className="form-control has-left-icon"
                  placeholder="Enter your email address"
                  value={identifier}
                  onChange={(e) => { setIdentifier(e.target.value); setError(''); }}
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="btn-auth-submit" disabled={isLoading}>
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    display: 'inline-block'
                  }} />
                  Sending OTP...
                </span>
              ) : 'SEND OTP'}
            </button>
          </form>

          <div className="auth-footer">
            &copy; {new Date().getFullYear()} Digital It &amp; Media Solutions Pvt Ltd
          </div>
        </div>
      </div>

      {/* OTP Popup */}
      {showOtpPopup && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }}>
          <div style={{
            background: '#fff', borderRadius: '18px', padding: '32px 24px',
            width: 'calc(100% - 32px)', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            position: 'relative', boxSizing: 'border-box', overflow: 'hidden',
          }}>
            {/* Close */}
            <button
              onClick={() => setShowOtpPopup(false)}
              style={{
                position: 'absolute', top: '14px', right: '16px',
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#a0aec0', fontSize: '22px', lineHeight: 1,
              }}
            >
              <span className="material-icons">close</span>
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #0de1e8, #5aad2e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <span className="material-icons" style={{ color: '#fff', fontSize: '28px' }}>dialpad</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748', margin: '0 0 6px' }}>Enter OTP</h2>
              <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>
                OTP sent to <span style={{ fontWeight: 600, color: '#0de1e8' }}>{maskIdentifier(identifier)}</span>
              </p>
            </div>

            {otpError && (
              <div className="alert-error" style={{ marginBottom: '14px' }}>
                <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtp}>
              <div className="otp-container" style={{ marginBottom: '16px' }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    className={`otp-input ${digit ? 'filled' : ''}`}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    maxLength={1}
                  />
                ))}
              </div>

              <div className="otp-footer" style={{ marginBottom: '16px' }}>
                <div className="otp-resend">
                  Didn't receive OTP?{' '}
                  {canResend ? (
                    <a onClick={handleResend} style={{ cursor: 'pointer' }}>Resend OTP</a>
                  ) : (
                    <span style={{ color: '#a0aec0' }}>Resend OTP</span>
                  )}
                </div>
                {!canResend && (
                  <div className="otp-timer">
                    <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>timer</span>
                    OTP expires in {formatTime(timer)}
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="btn-auth-submit"
                disabled={otpLoading || otp.join('').length < 6}
              >
                {otpLoading ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <span style={{
                      width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                      display: 'inline-block'
                    }} />
                    Verifying...
                  </span>
                ) : 'VERIFY & CONTINUE'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ForgotPassword;
