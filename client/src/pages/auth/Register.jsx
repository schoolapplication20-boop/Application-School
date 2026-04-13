import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';
import '../../styles/auth.css';

const Register = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    adminName: '', schoolName: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const [showPassword, setShowPassword]       = useState(false);
  const [showConfirm,  setShowConfirm]         = useState(false);
  const [isLoading,    setIsLoading]           = useState(false);
  const [error,        setError]               = useState('');
  const [success,      setSuccess]             = useState(false);

  const primary   = '#76C442';
  const secondary = '#5fa832';

  const set = (field) => (e) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setError('');
  };

  const validate = () => {
    if (!form.adminName.trim())   return 'Your name is required.';
    if (!form.schoolName.trim())  return 'School name is required.';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return 'A valid email address is required.';
    if (!form.phone.trim() || !/^\d{10}$/.test(form.phone.trim()))
      return 'Phone number must be 10 digits.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }

    setIsLoading(true);
    setError('');
    try {
      const res = await authAPI.register({
        adminName:  form.adminName.trim(),
        schoolName: form.schoolName.trim(),
        email:      form.email.trim().toLowerCase(),
        password:   form.password,
        phone:      form.phone.trim(),
      });
      if (res.data?.success) {
        setSuccess(true);
      } else {
        setError(res.data?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state ─────────────────────────────────────────────────────────
  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', maxWidth: 460, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e6f9ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-icons" style={{ fontSize: 40, color: '#38a169' }}>check_circle</span>
          </div>
          <h2 style={{ fontWeight: 800, color: '#2d3748', marginBottom: 8, fontFamily: 'Poppins, sans-serif' }}>
            School Registered!
          </h2>
          <p style={{ color: '#718096', marginBottom: 8, fontFamily: 'Poppins, sans-serif' }}>
            <strong>{form.schoolName}</strong> has been registered successfully.
          </p>
          <p style={{ color: '#718096', marginBottom: 28, fontSize: 14, fontFamily: 'Poppins, sans-serif' }}>
            Login with your email and password to complete the school setup.
          </p>
          <button
            onClick={() => navigate('/login')}
            style={{ padding: '12px 32px', background: `linear-gradient(135deg, ${primary}, ${secondary})`, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', width: '100%' }}
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <div className="auth-wrapper">
      {/* Left Panel */}
      <div className="auth-left" style={{ background: `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)` }}>
        <div className="auth-brand">
          <span className="brand-icon">🏆</span>
          <span className="brand-name">Schoolers</span>
        </div>
        <div className="auth-tagline">
          <h2>Start Managing Your School Today</h2>
          <p>Register your school in seconds and get access to a complete school management platform.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginTop: 16 }}>
            {['Students', 'Teachers', 'Attendance', 'Fees', 'Exams', 'Transport'].map(tag => (
              <span key={tag} style={{ background: 'rgba(255,255,255,0.2)', padding: '5px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, color: '#fff' }}>{tag}</span>
            ))}
          </div>
        </div>
        <div className="auth-illustration">
          <div className="auth-illustration-placeholder">
            <span style={{ fontSize: 80 }}>🏫</span>
            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, textAlign: 'center', marginTop: 8 }}>
              Smart School Management
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="auth-right">
        <div className="auth-right-inner">
          <div className="auth-form-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 28 }}>🏆</span>
              <span style={{ fontSize: 22, fontWeight: 800, color: primary, fontFamily: 'Poppins, sans-serif' }}>
                Schoolers
              </span>
            </div>
            <h1 style={{ fontSize: 22 }}>Register Your School</h1>
            <p>Create your school account to get started</p>
          </div>

          {error && (
            <div className="alert-error">
              <span className="material-icons" style={{ fontSize: 16 }}>error_outline</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off">
            {/* School Name */}
            <div className="form-group">
              <label className="form-label">School Name</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">school</span>
                <input type="text" className="form-control has-left-icon"
                  placeholder="e.g. Springfield High School"
                  value={form.schoolName} onChange={set('schoolName')} />
              </div>
            </div>

            {/* Admin Name */}
            <div className="form-group">
              <label className="form-label">Your Name</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">person</span>
                <input type="text" className="form-control has-left-icon"
                  placeholder="Full name of the Super Admin"
                  value={form.adminName} onChange={set('adminName')} />
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">email</span>
                <input type="email" className="form-control has-left-icon"
                  placeholder="admin@yourschool.com"
                  value={form.email} onChange={set('email')} autoComplete="off" />
              </div>
            </div>

            {/* Phone */}
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <div className="input-wrapper">
                <span className="material-icons input-icon-left">phone</span>
                <input type="tel" className="form-control has-left-icon"
                  placeholder="10-digit mobile number"
                  value={form.phone} onChange={set('phone')} maxLength={10} />
              </div>
            </div>

            {/* Password row — two columns */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Password</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">lock</span>
                  <input type={showPassword ? 'text' : 'password'}
                    className="form-control has-left-icon has-icon"
                    placeholder="Min 8 characters"
                    value={form.password} onChange={set('password')} autoComplete="new-password" />
                  <span className="material-icons input-icon" style={{ cursor: 'pointer' }}
                    onClick={() => setShowPassword(v => !v)}>
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <div className="input-wrapper">
                  <span className="material-icons input-icon-left">lock_outline</span>
                  <input type={showConfirm ? 'text' : 'password'}
                    className="form-control has-left-icon has-icon"
                    placeholder="Re-enter password"
                    value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
                  <span className="material-icons input-icon" style={{ cursor: 'pointer' }}
                    onClick={() => setShowConfirm(v => !v)}>
                    {showConfirm ? 'visibility_off' : 'visibility'}
                  </span>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-auth-submit" disabled={isLoading}
              style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})`, marginTop: 8 }}>
              {isLoading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                  Registering...
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span className="material-icons" style={{ fontSize: 18 }}>app_registration</span>
                  Register School
                </span>
              )}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: '#718096', fontFamily: 'Poppins, sans-serif' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: primary, fontWeight: 700, textDecoration: 'none' }}>
              Sign In
            </Link>
          </div>

          <div className="auth-footer">
            &copy; {new Date().getFullYear()} Digital It &amp; Media Solutions Pvt Ltd
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
