import { useEffect, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getErrorMessage } from '../../utils/errors';

const EmailVerificationPage = () => {
  const { verifyEmail } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const token = searchParams.get('token');
  const email = location.state?.email;

  const [status, setStatus] = useState(token ? 'verifying' : 'pending');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return undefined;

    let isMounted = true;
    verifyEmail(token)
      .then(() => {
        if (isMounted) setStatus('success');
      })
      .catch((err) => {
        if (isMounted) {
          setError(getErrorMessage(err, 'This verification link is invalid or has expired.'));
          setStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <div className="auth-logo">WhatsApp Ordering Portal</div>

        {status === 'verifying' && (
          <>
            <h2>Verifying your email...</h2>
            <div className="flex-center" style={{ padding: '1rem 0' }}>
              <div className="spinner" role="status" aria-label="Verifying" />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <h2>Email verified</h2>
            <div className="form-banner form-banner-success">
              Your email has been verified. You can now log in.
            </div>
            <Link className="btn btn-primary btn-block" to="/login">Go to login</Link>
          </>
        )}

        {status === 'error' && (
          <>
            <h2>Verification failed</h2>
            <div className="form-banner form-banner-error">{error}</div>
            <Link className="btn btn-primary btn-block" to="/signup">Back to sign up</Link>
          </>
        )}

        {status === 'pending' && (
          <>
            <h2>Check your inbox</h2>
            <p>
              We sent a verification link to
              {' '}
              {email ? <strong>{email}</strong> : 'your email address'}
              .
              Click the link in that email to activate your account.
            </p>
            <Link className="btn btn-outline btn-block" to="/login">Back to login</Link>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailVerificationPage;
