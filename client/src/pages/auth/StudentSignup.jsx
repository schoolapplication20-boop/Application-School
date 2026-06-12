import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Logo from '../../components/Logo';
import SEOMeta from '../../components/SEOMeta';
import '../../styles/auth.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export default function StudentSignup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    schoolId: '', admissionNumber: '', email: '', password: '', confirmPassword: '',
  });
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.schoolId.trim())       return setError('School ID is required');
    if (!form.admissionNumber.trim()) return setError('Admission number is required');
    if (!form.email.trim())           return setError('Email is required');
    if (form.password.length < 6)     return setError('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/student-signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId: parseInt(form.schoolId, 10),
          admissionNumber: form.admissionNumber.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.message || 'Signup failed. Please try again.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEOMeta title="Student Sign Up" desc="Create your My-Skoolz student account using your admission number." />
      <div className="auth-container">
        <div className="auth-card" style={{ maxWidth: 420 }}>
          <div className="auth-logo-wrap">
            <Logo size={48} />
            <h1 className="auth-brand">My-Skoolz</h1>
          </div>

          {success ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <span className="material-icons" style={{ fontSize: 56, color: '#10b981' }}>mark_email_read</span>
              <h2 style={{ marginTop: 12, fontSize: 20, fontWeight: 700 }}>Check Your Email</h2>
              <p style={{ color: 'var(--text-secondary)', margin: '8px 0 20px' }}>
                We sent a 6-digit verification code to <strong>{form.email}</strong>.<br />
                Enter the code on the next page to activate your account.
              </p>
              <button
                className="auth-btn"
                onClick={() => navigate(`/verify-email?email=${encodeURIComponent(form.email)}`)}
              >
                Enter Verification Code
              </button>
              <p style={{ marginTop: 16 }}>
                <Link to="/login?role=STUDENT" className="auth-link">Back to Login</Link>
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ textAlign: 'center', marginBottom: 4, fontSize: 20, fontWeight: 700 }}>
                Student Sign Up
              </h2>
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>
                Create your account using your admission number
              </p>

              {error && (
                <div className="auth-error">
                  <span className="material-icons" style={{ fontSize: 18 }}>error_outline</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="auth-field">
                  <label className="auth-label">School ID</label>
                  <input
                    className="auth-input"
                    type="number"
                    min="1"
                    placeholder="e.g. 1001"
                    value={form.schoolId}
                    onChange={e => set('schoolId', e.target.value)}
                    required
                  />
                  <span className="auth-field-hint">Your school's numeric ID (ask your teacher)</span>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Admission Number</label>
                  <input
                    className="auth-input"
                    type="text"
                    placeholder="e.g. ADM2024001"
                    value={form.admissionNumber}
                    onChange={e => set('admissionNumber', e.target.value)}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Email Address</label>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="your@email.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    required
                  />
                </div>

                <div className="auth-field">
                  <label className="auth-label">Password</label>
                  <div className="auth-input-wrap">
                    <input
                      className="auth-input"
                      type={showPass ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={form.password}
                      onChange={e => set('password', e.target.value)}
                      required
                    />
                    <button type="button" className="auth-eye" onClick={() => setShowPass(p => !p)}>
                      <span className="material-icons">{showPass ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                <div className="auth-field">
                  <label className="auth-label">Confirm Password</label>
                  <input
                    className="auth-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    required
                  />
                </div>

                <button className="auth-btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
                  {loading ? 'Creating account…' : 'Create Account'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: 'var(--text-secondary)' }}>
                Already have an account?{' '}
                <Link to="/login?role=STUDENT" className="auth-link">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </>
  );
}
