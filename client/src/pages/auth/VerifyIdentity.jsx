import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

// VerifyIdentity is an alias/redirect page - same as ForgotPassword
const VerifyIdentity = () => {
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
      navigate('/enter-otp', { state: { mobile } });
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        navigate('/enter-otp', { state: { mobile } });
        return;
      }
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">🏆</span>
          <span className="brand-name">Schoolers</span>
        </div>
        <div className="auth-tagline">
          <h2>Verify Your Identity</h2>
          <p>We need to verify your identity before allowing a password reset.</p>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <span className="material-icons">verified_user</span>
            <p>Identity Verification</p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-inner">
          <Link to="/login" className="btn-back">
            <span className="material-icons">arrow_back</span>
            Back to Login
          </Link>

          <div className="auth-icon-box">
            <span className="material-icons">verified_user</span>
          </div>

          <div className="auth-form-header" style={{ textAlign: 'center' }}>
            <h1>Verify Identity</h1>
            <p>Enter your mobile number to receive a verification OTP</p>
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
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'SEND OTP'}
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

export default VerifyIdentity;
