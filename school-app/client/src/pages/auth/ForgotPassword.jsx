import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!mobile.trim()) {
      setError('Please enter your mobile number.');
      return;
    }
    if (!/^\d{10}$/.test(mobile)) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      await authAPI.forgotPassword({ mobile });
      localStorage.setItem('schoolers_otp_mobile', mobile);
      navigate('/enter-otp');
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        // Demo mode
        localStorage.setItem('schoolers_otp_mobile', mobile);
        navigate('/enter-otp');
        return;
      }
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
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
          <h2>Reset Your Password Securely</h2>
          <p>
            Don't worry! It happens to the best of us. Enter your mobile number
            and we'll send you an OTP to reset your password.
          </p>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <span className="material-icons">lock_reset</span>
            <p>Forgot Password Illustration</p>
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
    </div>
  );
};

export default ForgotPassword;
