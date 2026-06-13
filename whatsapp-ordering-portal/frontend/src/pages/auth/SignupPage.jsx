import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import {
  isValidEmail, isValidPassword, passwordRequirementsMessage, isRequired,
} from '../../utils/validators';
import { getErrorMessage } from '../../utils/errors';

const SignupPage = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!isRequired(form.fullName)) nextErrors.fullName = 'Full name is required';
    if (!isValidEmail(form.email)) nextErrors.email = 'Enter a valid email address';
    if (!isValidPassword(form.password)) nextErrors.password = passwordRequirementsMessage;
    if (form.confirmPassword !== form.password) nextErrors.confirmPassword = 'Passwords do not match';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const result = await signup({ email: form.email, password: form.password, fullName: form.fullName });
      navigate('/verify-email', { state: { email: result.user.email } });
    } catch (error) {
      setFormError(getErrorMessage(error, 'Unable to create your account. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-logo">WhatsApp Ordering Portal</div>
        <h2>Create your account</h2>
        {formError && <div className="form-banner form-banner-error">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <Input
            label="Full name"
            id="fullName"
            name="fullName"
            autoComplete="name"
            value={form.fullName}
            onChange={handleChange}
            error={errors.fullName}
            required
          />
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
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange}
            error={errors.password}
            hint={passwordRequirementsMessage}
            required
          />
          <Input
            label="Confirm password"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={form.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            required
          />
          <Button type="submit" block loading={loading}>Sign up</Button>
        </form>
        <div className="auth-footer">
          Already have an account?
          {' '}
          <Link to="/login">Log in</Link>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
