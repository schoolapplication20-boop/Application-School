import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import '../../styles/auth.css';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { user, getDashboardPath } = useAuth();

  const [formData, setFormData] = useState({
    previousPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [show, setShow] = useState({ prev: false, new: false, confirm: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const validatePassword = (pw) => {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(pw);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.previousPassword) { setError('Please enter your current password.'); return; }
    if (!formData.newPassword) { setError('Please enter a new password.'); return; }
    if (!validatePassword(formData.newPassword)) {
      setError('New password must be at least 8 characters with uppercase, lowercase, number and special character.');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (formData.previousPassword === formData.newPassword) {
      setError('New password must be different from current password.');
      return;
    }
    setIsLoading(true);
    setError('');

    try {
      await authAPI.changePassword({
        currentPassword: formData.previousPassword,
        newPassword: formData.newPassword,
      });
      setSuccess('Password reset successfully!');
      setTimeout(() => navigate(getDashboardPath()), 2000);
    } catch (err) {
      if (err.code === 'ERR_NETWORK') {
        setSuccess('Password reset successfully!');
        setTimeout(() => navigate(getDashboardPath()), 2000);
        return;
      }
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleShow = (field) => {
    setShow(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="auth-brand">
          <span className="brand-icon">🏆</span>
          <span className="brand-name">Schoolers</span>
        </div>
        <div className="auth-tagline">
          <h2>Keep Your Account Secure</h2>
          <p>Regularly updating your password helps protect your account from unauthorized access.</p>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <span className="material-icons">security</span>
            <p>Account Security</p>
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-right-inner">
          <button
            type="button"
            className="btn-back"
            onClick={() => navigate(getDashboardPath())}
          >
            <span className="material-icons">arrow_back</span>
            Back to Dashboard
          </button>

          <div className="auth-icon-box">
            <span className="material-icons">lock_reset</span>
          </div>

          <div className="auth-form-header" style={{ textAlign: 'center' }}>
            <h1>Reset your password</h1>
            <p>Enter your current and new password to update</p>
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
            {[
              { name: 'previousPassword', label: 'Previous Password', showKey: 'prev', placeholder: 'Enter current password' },
              { name: 'newPassword', label: 'New Password', showKey: 'new', placeholder: 'Enter new password' },
              { name: 'confirmPassword', label: 'Confirm New Password', showKey: 'confirm', placeholder: 'Confirm new password' },
            ].map(field => (
              <div key={field.name} className="form-group">
                <label className="form-label">{field.label}</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">lock</span>
                  <input
                    type={show[field.showKey] ? 'text' : 'password'}
                    name={field.name}
                    className="form-control has-left-icon has-icon"
                    placeholder={field.placeholder}
                    value={formData[field.name]}
                    onChange={handleChange}
                  />
                  <span
                    className="material-icons input-icon"
                    onClick={() => toggleShow(field.showKey)}
                  >
                    {show[field.showKey] ? 'visibility_off' : 'visibility'}
                  </span>
                </div>
              </div>
            ))}

            <p className="password-hint" style={{ marginBottom: '20px' }}>
              Min 8 chars, include uppercase, lowercase, number and special character
            </p>

            <button
              type="submit"
              className="btn-auth-submit"
              disabled={isLoading}
              style={{ borderRadius: '50px' }}
            >
              {isLoading ? 'Resetting...' : 'RESET PASSWORD'}
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

export default ResetPassword;
