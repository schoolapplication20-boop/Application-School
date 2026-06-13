import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { isValidPassword, passwordRequirementsMessage } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errors';

const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [form, setForm] = useState({ otp: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!email) {
    return <Navigate to="/forgot-password" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!/^\d{6}$/.test(form.otp)) nextErrors.otp = 'Enter the 6-digit code sent to your email';
    if (!isValidPassword(form.newPassword)) nextErrors.newPassword = passwordRequirementsMessage;
    if (form.confirmPassword !== form.newPassword) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      await resetPassword({ email, otp: form.otp, newPassword: form.newPassword });
      toast.success('Your password has been reset. Please log in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to reset password. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-logo">WhatsApp Ordering Portal</div>
        <h2>Reset password</h2>
        <p>
          Enter the code sent to
          <strong>{email}</strong>
          {' '}
          and choose a new password.
        </p>
        {formError && <div className="form-banner form-banner-error">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <Input
            label="Verification code"
            id="otp"
            name="otp"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={form.otp}
            onChange={handleChange}
            error={errors.otp}
            required
          />
          <Input
            label="New password"
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={handleChange}
            error={errors.newPassword}
            hint={passwordRequirementsMessage}
            required
          />
          <Input
            label="Confirm new password"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
          />
          <Button type="submit" block loading={loading}>Reset password</Button>
        </form>
        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
