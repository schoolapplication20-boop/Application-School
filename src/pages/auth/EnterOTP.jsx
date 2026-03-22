import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import '../../styles/auth.css';

const EnterOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [otp, setOtp] = useState(['', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(296); // 4:56 = 296 seconds
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef([]);
  const mobile = location.state?.mobile || '**********';

  // Countdown timer
  useEffect(() => {
    if (timer <= 0) {
      setCanResend(true);
      return;
    }
    const interval = setInterval(() => {
      setTimer(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const maskMobile = (num) => {
    if (num.length < 4) return num;
    return num.slice(0, 2) + '****' + num.slice(-2);
  };

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newOtp = ['', '', '', ''];
      pasted.split('').forEach((char, i) => {
        if (i < 4) newOtp[i] = char;
      });
      setOtp(newOtp);
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
    }
  };

  const handleResend = () => {
    setTimer(296);
    setCanResend(false);
    setOtp(['', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length < 4) {
      setError('Please enter the complete 4-digit OTP.');
      return;
    }
    if (otpString !== '1234') {
      setError('Invalid OTP. Demo OTP is 1234.');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      navigate('/set-new-password', { state: { mobile } });
    }, 600);
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
          <h2>One-Time Password Verification</h2>
          <p>
            We've sent a 4-digit OTP to your registered mobile number.
            Please enter it to continue with your password reset.
          </p>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <span className="material-icons">sms</span>
            <p>OTP Sent to Your Mobile</p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate('/forgot-password')}
          >
            <span className="material-icons">arrow_back</span>
            Back
          </button>

          <div className="auth-icon-box">
            <span className="material-icons">dialpad</span>
          </div>

          <div className="auth-form-header" style={{ textAlign: 'center' }}>
            <h1>Enter OTP</h1>
            <p>
              Please Enter Your OTP To Continue
              <br />
              <span style={{ fontWeight: 600, color: '#76C442' }}>
                OTP sent to {maskMobile(mobile)}
              </span>
            </p>
          </div>

          {error && (
            <div className="alert-error">
              <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="otp-container">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  className={`otp-input ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  maxLength={1}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            <div className="otp-footer">
              <div className="otp-resend">
                Didn't receive OTP?{' '}
                {canResend ? (
                  <a onClick={handleResend}>Resend OTP</a>
                ) : (
                  <span style={{ color: '#a0aec0' }}>Resend OTP</span>
                )}
              </div>
              {!canResend && (
                <div className="otp-timer">
                  <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>
                    timer
                  </span>
                  OTP expires in {formatTime(timer)}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={isLoading || otp.join('').length < 4}
            >
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
                    display: 'inline-block'
                  }} />
                  Verifying...
                </span>
              ) : 'NEXT'}
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

export default EnterOTP;
