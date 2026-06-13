import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { isValidEmail } from '../../utils/validators';
import { getErrorMessage } from '../../utils/errors';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!isValidEmail(email)) {
      setError('Enter a valid email address');
      return;
    }
    setError('');

    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success('If an account exists for this email, a reset code has been sent.');
      navigate('/reset-password', { state: { email } });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Unable to send reset code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-logo">WhatsApp Ordering Portal</div>
        <h2>Forgot password</h2>
        <p>Enter your account email and we&apos;ll send you a reset code.</p>
        {formError && <div className="form-banner form-banner-error">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <Input
            label="Email"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={error}
            required
          />
          <Button type="submit" block loading={loading}>Send reset code</Button>
        </form>
        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
