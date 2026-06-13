import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { getErrorMessage } from '../../utils/errors';
import { OTP_PURPOSE } from '../../utils/constants';

const RESEND_COOLDOWN_SECONDS = 30;

const OTPVerificationPage = () => {
  const { verifyOtp, sendOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;
  const purpose = location.state?.purpose || OTP_PURPOSE.LOGIN;

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  if (!email) {
    return <Navigate to="/login" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFormError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code sent to your email');
      return;
    }
    setError('');

    setLoading(true);
    try {
      await verifyOtp({ email, otp });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(getErrorMessage(err, 'Invalid or expired code. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await sendOtp({ email, purpose });
      toast.success('A new code has been sent to your email');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Unable to resend the code. Please try again.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-logo">WhatsApp Ordering Portal</div>
        <h2>Enter verification code</h2>
        <p>
          We sent a 6-digit code to
          <strong>{email}</strong>
          .
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
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
            error={error}
            required
          />
          <Button type="submit" block loading={loading}>Verify</Button>
        </form>
        <div className="auth-footer">
          <Button variant="ghost" size="sm" onClick={handleResend} disabled={cooldown > 0} loading={resending}>
            {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
          </Button>
        </div>
        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationPage;
