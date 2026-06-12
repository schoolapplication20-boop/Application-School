import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../../services/api';
import Logo from '../../components/Logo';
import SEOMeta from '../../components/SEOMeta';
import '../../styles/auth.css';

export default function VerifyEmail() {
  const [searchParams]  = useSearchParams();
  const navigate        = useNavigate();
  const emailFromUrl    = searchParams.get('email') || '';

  const [email,    setEmail]    = useState(emailFromUrl);
  const [otp,      setOtp]      = useState(['', '', '', '', '', '']);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);
  const inputRefs = useRef([]);
  const navTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(navTimerRef.current), []);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

  const handleOtpChange = (index, val) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[index] = val;
    setOtp(next);
    if (val && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (!email.trim()) return setError('Email is required');
    if (code.length < 6) return setError('Please enter the full 6-digit code');
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyEmail({ email: email.trim().toLowerCase(), otp: code });
      if (res.data?.success) {
        setSuccess(true);
        navTimerRef.current = setTimeout(() => navigate('/login?role=STUDENT', { replace: true }), 2000);
      } else {
        setError(res.data?.message || 'Verification failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOMeta title="Verify Email" desc="Verify your My-Skoolz account email address." />
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: 420 }}>
          <div className="auth-logo-wrap">
            <Logo size={44} />
            <h1 className="auth-brand">My-Skoolz</h1>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <span className="material-icons" style={{ fontSize: 52, color: '#10b981', display: 'block', marginBottom: 12 }}>verified</span>
              <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>Email Verified!</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Your account is active. Redirecting to login…</p>
            </div>
          ) : (
            <>
              <h2 style={{ textAlign: 'center', marginBottom: 4, fontSize: 20, fontWeight: 800 }}>Verify Your Email</h2>
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                Enter the 6-digit code sent to <strong>{email || 'your email'}</strong>
              </p>

              {error && (
                <div className="auth-error">
                  <span className="material-icons" style={{ fontSize: 17 }}>error_outline</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                {!emailFromUrl && (
                  <div className="auth-field" style={{ marginBottom: 16 }}>
                    <label className="auth-label">Email Address</label>
                    <input className="auth-input" type="email" value={email}
                      onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24 }}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={el => (inputRefs.current[i] = el)}
                      type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleKeyDown(i, e)}
                      onPaste={i === 0 ? handlePaste : undefined}
                      style={{
                        width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
                        border: digit ? '2px solid #4f46e5' : '2px solid var(--border-strong)',
                        borderRadius: 10, outline: 'none', background: digit ? '#eef2ff' : 'var(--surface)',
                        color: 'var(--text-primary)', transition: 'border-color 0.15s',
                      }}
                    />
                  ))}
                </div>

                <button className="auth-btn" type="submit" disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify Email'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
                Already verified?{' '}
                <Link to="/login?role=STUDENT" className="auth-link">Sign in</Link>
              </p>
              <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                Didn't receive the code? Check your spam folder. The code expires in 24 hours.
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
