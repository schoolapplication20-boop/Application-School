import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const OTP_EXPIRY_SECONDS = 300;

  // OTP popup state
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [timer, setTimer] = useState(OTP_EXPIRY_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [devOtp, setDevOtp] = useState('');
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

  const maskMobile = (num) => {
    if (num.length < 4) return num;
    return num.slice(0, 2) + '****' + num.slice(-2);
  };

  const sendOtp = async () => {
    try {
      const res = await authAPI.forgotPassword({ mobile });
      if (res.data?.data) setDevOtp(res.data.data);
    } catch (err) {
      throw new Error(
        err.response?.data?.message ||
        err.response?.data?.error ||
        'Mobile number not registered. Please contact admin.'
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mobile.trim()) { setError('Please enter your mobile number.'); return; }
    if (!/^\d{10}$/.test(mobile)) { setError('Please enter a valid 10-digit mobile number.'); return; }
    setIsLoading(true);
    setError('');
    try {
      await sendOtp();
      setTimer(OTP_EXPIRY_SECONDS);
      setCanResend(false);
      setOtp(['', '', '', '']);
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
    if (value && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < 3) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newOtp = ['', '', '', ''];
      pasted.split('').forEach((char, i) => { if (i < 4) newOtp[i] = char; });
      setOtp(newOtp);
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  const handleResend = async () => {
    setOtpError('');
    setOtp(['', '', '', '']);
    setDevOtp('');
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
    if (otpString.length < 4) { setOtpError('Please enter the complete 4-digit OTP.'); return; }
    setOtpLoading(true);
    setOtpError('');
    try {
      await authAPI.verifyOTP({ mobile, otp: otpString });
      setShowOtpPopup(false);
      navigate('/set-new-password', { state: { mobile } });
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
      {/* Left Panel */}
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">🏆</span>
          <span className="brand-name">Schoolers</span>
        </div>
        <div className="auth-tagline">
          <h2>Reset Your Password Securely</h2>
          <p>
            Don't worry! It happens to the best of us. Enter your mobile number
            and we'll send you an OTP to reset your password.
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
            <span className="material-icons">phone_android</span>
          </div>

          <div className="auth-form-header" style={{ textAlign: 'center' }}>
            <h1>Verify Identity</h1>
            <p>Enter your registered mobile number to receive an OTP</p>
          </div>

          {error && (
            <div className="alert-error">
              <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Mobile Number</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">smartphone</span>
                <input
                  type="tel"
                  className="form-control has-left-icon"
                  placeholder="Enter your 10-digit mobile number"
                  value={mobile}
                  onChange={(e) => { setMobile(e.target.value); setError(''); }}
                  maxLength={10}
                  pattern="[0-9]{10}"
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
            background: '#fff', borderRadius: '18px', padding: '36px 32px',
            width: '100%', maxWidth: '400px', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            position: 'relative',
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
                background: 'linear-gradient(135deg, #76C442, #5aad2e)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px',
              }}>
                <span className="material-icons" style={{ color: '#fff', fontSize: '28px' }}>dialpad</span>
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748', margin: '0 0 6px' }}>Enter OTP</h2>
              <p style={{ fontSize: '13px', color: '#718096', margin: 0 }}>
                OTP sent to <span style={{ fontWeight: 600, color: '#76C442' }}>{maskMobile(mobile)}</span>
              </p>
            </div>

            {/* OTP info — dev mode: show OTP directly */}
            {devOtp && (
              <div style={{
                background: '#f0fff4', border: '1px solid #76C442', borderRadius: '8px',
                padding: '10px 14px', marginBottom: '16px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '12px', color: '#276749', marginBottom: '4px' }}>
                  <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>info</span>
                  Your OTP (dev mode)
                </div>
                <div style={{ fontSize: '28px', fontWeight: 800, letterSpacing: '8px', color: '#276749' }}>
                  {devOtp}
                </div>
              </div>
            )}

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
                disabled={otpLoading || otp.join('').length < 4}
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
