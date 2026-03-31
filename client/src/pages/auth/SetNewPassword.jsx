import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

const SetNewPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mobile = location.state?.mobile || sessionStorage.getItem('reset_mobile');

  // Persist mobile to sessionStorage so it survives a page refresh
  useEffect(() => {
    if (location.state?.mobile) {
      sessionStorage.setItem('reset_mobile', location.state.mobile);
    }
  }, [location.state?.mobile]);

  const [formData, setFormData] = useState({ newPassword: '', confirmPassword: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validatePassword = (pw) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pw);
  };

  const getPasswordStrength = (pw) => {
    if (pw.length === 0) return { level: 0, label: '', color: '#e2e8f0' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[a-z]/.test(pw)) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/\d/.test(pw)) score++;
    if (/[@$!%*?&]/.test(pw)) score++;
    if (score <= 2) return { level: score, label: 'Weak', color: '#e53e3e' };
    if (score <= 3) return { level: score, label: 'Fair', color: '#ed8936' };
    if (score <= 4) return { level: score, label: 'Good', color: '#3182ce' };
    return { level: score, label: 'Strong', color: '#76C442' };
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.newPassword) {
      setError('Please enter a new password.');
      return;
    }
    if (!validatePassword(formData.newPassword)) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number and special character.');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!mobile) {
      setError('Session expired. Please restart the forgot password process.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      await authAPI.resetPassword({ mobile, newPassword: formData.newPassword });
      setSuccess('Password changed successfully! Redirecting to login...');
      sessionStorage.removeItem('reset_mobile');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const strength = getPasswordStrength(formData.newPassword);

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">🏆</span>
          <span className="brand-name">Schoolers</span>
        </div>
        <div className="auth-tagline">
          <h2>Create a Strong New Password</h2>
          <p>Your new password must be at least 8 characters and include uppercase, lowercase, number and special character.</p>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <span className="material-icons">key</span>
            <p>Set New Password</p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-inner">
          <button type="button" className="btn-back" onClick={() => navigate('/forgot-password')}>
            <span className="material-icons">arrow_back</span>
            Back
          </button>

          <div className="auth-icon-box">
            <span className="material-icons">lock</span>
          </div>

          <div className="auth-form-header" style={{ textAlign: 'center' }}>
            <h1>Set New Password</h1>
            <p>Create a strong password for your account</p>
          </div>

          {error && (
            <div className="alert-error">
              <span className="material-icons" style={{ fontSize: '16px' }}>error_outline</span>
              {error}
            </div>
          )}
          {success && (
            <div className="alert-success">
              <span className="material-icons" style={{ fontSize: '16px' }}>check_circle</span>
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">lock</span>
                <input
                  type={showNew ? 'text' : 'password'}
                  name="newPassword"
                  className="form-control has-left-icon has-icon"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  autoFocus
                />
                <span className="material-icons input-icon" onClick={() => setShowNew(!showNew)}>
                  {showNew ? 'visibility_off' : 'visibility'}
                </span>
              </div>
              {formData.newPassword && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} style={{
                        flex: 1, height: '4px', borderRadius: '2px',
                        background: i <= strength.level ? strength.color : '#e2e8f0',
                        transition: 'background 0.3s'
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: '11px', color: strength.color, fontWeight: 600 }}>
                    {strength.label}
                  </span>
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">lock_outline</span>
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  className="form-control has-left-icon has-icon"
                  placeholder="Confirm your new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <span className="material-icons input-icon" onClick={() => setShowConfirm(!showConfirm)}>
                  {showConfirm ? 'visibility_off' : 'visibility'}
                </span>
              </div>
              {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
                <p style={{ fontSize: '11px', color: '#e53e3e', marginTop: '6px' }}>Passwords do not match</p>
              )}
              {formData.confirmPassword && formData.newPassword === formData.confirmPassword && (
                <p style={{ fontSize: '11px', color: '#76C442', marginTop: '6px' }}>
                  <span className="material-icons" style={{ fontSize: '12px', verticalAlign: 'middle' }}>check_circle</span>
                  {' '}Passwords match
                </p>
              )}
            </div>

            <p className="password-hint" style={{ marginBottom: '20px' }}>
              Min 8 chars, include uppercase, lowercase, number and special character (@$!%*?&)
            </p>

            <button type="submit" className="btn-auth-submit" disabled={isLoading}>
              {isLoading ? 'Changing Password...' : 'CHANGE PASSWORD'}
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

export default SetNewPassword;
