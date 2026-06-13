import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { isValidEmail, isRequired } from '../../utils/validators';
import { getErrorMessage, getErrorCode } from '../../utils/errors';
import { OTP_PURPOSE } from '../../utils/constants';

const LoginPage = () => {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address';
    if (!isRequired(form.password)) nextErrors.password = 'Password is required';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await login({ email: form.email, password: form.password });
      navigate('/verify-otp', { state: { email: result.email, purpose: OTP_PURPOSE.LOGIN } });
    } catch (error) {
      if (getErrorCode(error) === 'EMAIL_NOT_VERIFIED') {
        toast.info('Please verify your email before logging in. Check your inbox for the verification link.');
        navigate('/verify-email', { state: { email: form.email } });
        return;
      }
      setFormError(getErrorMessage(error, 'Unable to log in. Please check your credentials.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-logo">WhatsApp Ordering Portal</div>
        <h2>Log in</h2>
        {formError && <div className="form-banner form-banner-error">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            required
          />
          <Input
            label="Password"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            required
          />
          <Button type="submit" block loading={loading}>Log in</Button>
        </form>
        <div className="auth-footer">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <div className="auth-footer">
          Don&apos;t have an account?
          {' '}
          <Link to="/signup">Sign up</Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
