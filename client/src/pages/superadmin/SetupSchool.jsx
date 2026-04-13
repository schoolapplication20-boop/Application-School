import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSchool } from '../../context/SchoolContext';
import api from '../../services/api';

// ── Section Step Labels ───────────────────────────────────────────────────────
const STEPS = [
  { id: 'basic',        label: 'Basic Info',      icon: 'school' },
  { id: 'address',      label: 'Address',         icon: 'location_on' },
  { id: 'contact',      label: 'Contact',         icon: 'contacts' },
  { id: 'branding',     label: 'Branding',        icon: 'palette' },
  { id: 'academic',     label: 'Academic',        icon: 'menu_book' },
  { id: 'admin',        label: 'Admin Account',   icon: 'manage_accounts' },
  { id: 'subscription', label: 'Subscription',    icon: 'card_membership' },
  { id: 'features',     label: 'Features',        icon: 'toggle_on' },
];

const INITIAL = {
  // Basic
  name: '', code: '', board: 'CBSE', academicYear: '2024-2025',
  // Address
  address: '', city: '', state: '', pincode: '', country: 'India',
  // Contact
  phone: '', email: '', website: '',
  // Branding
  primaryColor: '#76C442', secondaryColor: '#5fa832',
  // Academic
  totalClasses: '', sections: 'A,B,C,D',
  // Admin account
  adminName: '', adminEmail: '', adminMobile: '',
  // Subscription
  subscriptionPlan: 'STANDARD', subscriptionExpiry: '',
  // Features
  features: {
    attendance: true, transport: true, fees: true,
    salary: true, examination: true, diary: true,
    announcements: true, messages: true,
  },
};

// ── Validation per step ───────────────────────────────────────────────────────
const validate = (step, form) => {
  const errors = {};
  if (step === 'basic') {
    if (!form.name.trim())            errors.name = 'School name is required.';
    if (!form.code.trim())            errors.code = 'School code is required.';
    else if (!/^[A-Z0-9]{3,10}$/i.test(form.code.trim()))
      errors.code = 'Code must be 3–10 alphanumeric characters.';
    if (!form.academicYear.trim())    errors.academicYear = 'Academic year is required.';
  }
  if (step === 'address') {
    if (!form.address.trim()) errors.address = 'Address is required.';
    if (!form.city.trim())    errors.city    = 'City is required.';
    if (!form.state.trim())   errors.state   = 'State is required.';
  }
  if (step === 'contact') {
    if (!form.phone.trim())  errors.phone = 'Phone is required.';
    if (!form.email.trim())  errors.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errors.email = 'Enter a valid email address.';
  }
  if (step === 'admin') {
    // Admin fields are optional but if email provided, it must be valid
    if (form.adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail))
      errors.adminEmail = 'Enter a valid admin email.';
  }
  return errors;
};

// ── Helper: labelled form field ───────────────────────────────────────────────
const Field = ({ label, error, children, required }) => (
  <div style={{ marginBottom: '18px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '5px' }}>
      {label}{required && <span style={{ color: '#e53e3e', marginLeft: 2 }}>*</span>}
    </label>
    {children}
    {error && <div style={{ fontSize: '11px', color: '#e53e3e', marginTop: '4px' }}>{error}</div>}
  </div>
);

const inputStyle = (hasError) => ({
  width: '100%', padding: '10px 12px', border: `1.5px solid ${hasError ? '#fc8181' : '#e2e8f0'}`,
  borderRadius: '8px', fontSize: '14px', color: '#2d3748', outline: 'none',
  boxSizing: 'border-box', transition: 'border-color 0.2s', background: '#fff',
});

const selectStyle = { ...inputStyle(false), cursor: 'pointer' };

// ── Main Component ────────────────────────────────────────────────────────────
const SetupSchool = () => {
  const navigate           = useNavigate();
  const { user, updateUser } = useAuth();
  const { school, setSchool } = useSchool();

  // Update mode: user registered via /register and already has a schoolId.
  // In this case we PUT to update the existing school instead of POSTing a new one.
  const isUpdateMode = !!user?.schoolId;

  const [currentStep, setCurrentStep] = useState(0);
  const [form,        setForm]        = useState(INITIAL);

  // Pre-fill school name (and code) when in update mode
  React.useEffect(() => {
    if (isUpdateMode && (school?.name || school?.code)) {
      setForm(prev => ({
        ...prev,
        name: school.name  || prev.name,
        code: school.code  || prev.code,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUpdateMode, school?.name, school?.code]);
  const [errors,      setErrors]      = useState({});
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [done,        setDone]        = useState(null); // success result
  const logoInputRef = useRef(null);

  const stepId = STEPS[currentStep].id;

  // ── Field change ──────────────────────────────────────────────────────────
  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const onFeatureToggle = (key) => {
    setForm(prev => ({
      ...prev,
      features: { ...prev.features, [key]: !prev.features[key] },
    }));
  };

  // ── Logo file pick ────────────────────────────────────────────────────────
  const onLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrors(prev => ({ ...prev, logo: 'Please select an image file.' }));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, logo: 'Logo must be smaller than 5 MB.' }));
      return;
    }
    setLogoFile(file);
    setErrors(prev => ({ ...prev, logo: undefined }));
    const reader = new FileReader();
    reader.onload = (ev) => setLogoPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const goNext = () => {
    const errs = validate(stepId, form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
  };

  const goPrev = () => {
    setErrors({});
    setCurrentStep(s => Math.max(s - 1, 0));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validate(stepId, form);
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      const payload = {
        ...form,
        features: JSON.stringify(form.features),
        totalClasses: form.totalClasses ? Number(form.totalClasses) : null,
        // Mark setup as complete so the wizard gate is lifted on next login
        isSetupCompleted: true,
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));
      if (logoFile) formData.append('logo', logoFile);

      let res;
      if (isUpdateMode) {
        // School was pre-created during registration → UPDATE it
        res = await api.put(`/api/schools/${user.schoolId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Legacy platform-admin flow → CREATE a new school
        res = await api.post('/api/schools', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      if (res.data?.success) {
        // Update mode returns the school object directly;
        // create mode returns { school, adminEmail, adminTempPassword }
        const schoolData = isUpdateMode ? res.data.data : res.data.data?.school;
        const result     = isUpdateMode ? { school: schoolData } : res.data.data;

        if (schoolData) setSchool(schoolData);
        updateUser({
          needsSchoolSetup: false,
          schoolId: schoolData?.id ?? user?.schoolId ?? null,
        });
        setDone(result);
      } else {
        setSubmitError(res.data?.message || (isUpdateMode ? 'Failed to update school.' : 'Failed to create school.'));
      }
    } catch (err) {
      setSubmitError(
        err.response?.data?.message || err.message || 'An unexpected error occurred.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '48px 40px', maxWidth: '500px', width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.1)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#e6f9ed', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span className="material-icons" style={{ fontSize: 40, color: '#38a169' }}>check_circle</span>
          </div>
          <h2 style={{ fontWeight: 800, color: '#2d3748', marginBottom: 8 }}>
            {isUpdateMode ? 'School Setup Complete!' : 'School Created!'}
          </h2>
          <p style={{ color: '#718096', marginBottom: 24 }}>
            <strong>{done.school?.name}</strong> has been set up successfully.
          </p>
          {done.adminEmail && (
            <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 10, padding: '14px 18px', marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#276749', marginBottom: 6 }}>ADMIN CREDENTIALS</div>
              <div style={{ fontSize: 13, color: '#2d3748' }}>Email: <strong>{done.adminEmail}</strong></div>
              <div style={{ fontSize: 13, color: '#2d3748' }}>Temp Password: <strong style={{ fontFamily: 'monospace' }}>{done.adminTempPassword}</strong></div>
              <div style={{ fontSize: 11, color: '#718096', marginTop: 6 }}>Share these securely. Admin must change password on first login.</div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {/* "Setup Another" only makes sense in legacy platform-admin flow */}
            {!isUpdateMode && (
              <button onClick={() => { setDone(null); setForm(INITIAL); setCurrentStep(0); }}
                style={{ padding: '10px 24px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Setup Another
              </button>
            )}
            <button onClick={() => navigate('/superadmin/dashboard')}
              style={{ padding: '10px 28px', background: '#76C442', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Stepper layout ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#f7fafc', padding: '32px 16px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#2d3748', margin: 0 }}>Setup New School</h1>
          <p style={{ color: '#718096', marginTop: 6 }}>Configure every detail of your school in one place</p>
        </div>

        {/* Step Indicators */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, overflowX: 'auto', paddingBottom: 4 }}>
          {STEPS.map((s, i) => {
            const done_ = i < currentStep;
            const active = i === currentStep;
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, flex: '0 0 auto',
                  padding: '8px 14px', borderRadius: 30, fontSize: 12, fontWeight: 600,
                  background: active ? '#76C442' : done_ ? '#e6f9ed' : '#fff',
                  color: active ? '#fff' : done_ ? '#276749' : '#a0aec0',
                  border: `1.5px solid ${active ? '#76C442' : done_ ? '#9ae6b4' : '#e2e8f0'}`,
                  cursor: done_ ? 'pointer' : 'default', transition: 'all 0.2s',
                }}
                onClick={() => done_ && setCurrentStep(i)}
              >
                <span className="material-icons" style={{ fontSize: 14 }}>
                  {done_ ? 'check' : s.icon}
                </span>
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.07)', padding: '32px 36px' }}>

          {/* ── STEP: Basic Info ─────────────────────────────────────────── */}
          {stepId === 'basic' && (
            <div>
              <SectionTitle icon="school" title="Basic Information" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="School Name" required error={errors.name}>
                  <input name="name" value={form.name} onChange={onChange}
                    placeholder="e.g. Greenfield International School"
                    style={inputStyle(!!errors.name)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = errors.name ? '#fc8181' : '#e2e8f0'} />
                </Field>
                <Field label="School Code (unique)" required error={errors.code}>
                  <input name="code" value={form.code} onChange={e => onChange({ target: { name: 'code', value: e.target.value.toUpperCase() } })}
                    placeholder="e.g. GIS001"
                    style={inputStyle(!!errors.code)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = errors.code ? '#fc8181' : '#e2e8f0'} />
                </Field>
                <Field label="Board / Curriculum" error={errors.board}>
                  <select name="board" value={form.board} onChange={onChange} style={selectStyle}>
                    {['CBSE','ICSE','State Board','IB','IGCSE','Other'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </Field>
                <Field label="Academic Year" required error={errors.academicYear}>
                  <input name="academicYear" value={form.academicYear} onChange={onChange}
                    placeholder="e.g. 2024-2025"
                    style={inputStyle(!!errors.academicYear)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = errors.academicYear ? '#fc8181' : '#e2e8f0'} />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP: Address ────────────────────────────────────────────── */}
          {stepId === 'address' && (
            <div>
              <SectionTitle icon="location_on" title="School Address" />
              <Field label="Street Address" required error={errors.address}>
                <textarea name="address" value={form.address} onChange={onChange}
                  rows={2} placeholder="Building no, street name, area..."
                  style={{ ...inputStyle(!!errors.address), resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#76C442'}
                  onBlur={e => e.target.style.borderColor = errors.address ? '#fc8181' : '#e2e8f0'} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="City" required error={errors.city}>
                  <input name="city" value={form.city} onChange={onChange} placeholder="City"
                    style={inputStyle(!!errors.city)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = errors.city ? '#fc8181' : '#e2e8f0'} />
                </Field>
                <Field label="State" required error={errors.state}>
                  <input name="state" value={form.state} onChange={onChange} placeholder="State"
                    style={inputStyle(!!errors.state)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = errors.state ? '#fc8181' : '#e2e8f0'} />
                </Field>
                <Field label="PIN Code" error={errors.pincode}>
                  <input name="pincode" value={form.pincode} onChange={onChange} placeholder="e.g. 500001"
                    style={inputStyle(!!errors.pincode)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </Field>
                <Field label="Country" error={errors.country}>
                  <input name="country" value={form.country} onChange={onChange} placeholder="Country"
                    style={inputStyle(false)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP: Contact ────────────────────────────────────────────── */}
          {stepId === 'contact' && (
            <div>
              <SectionTitle icon="contacts" title="Contact Information" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="Phone Number" required error={errors.phone}>
                  <input name="phone" value={form.phone} onChange={onChange} placeholder="+91 9876543210"
                    style={inputStyle(!!errors.phone)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = errors.phone ? '#fc8181' : '#e2e8f0'} />
                </Field>
                <Field label="Official Email" required error={errors.email}>
                  <input name="email" type="email" value={form.email} onChange={onChange}
                    placeholder="principal@school.edu"
                    style={inputStyle(!!errors.email)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = errors.email ? '#fc8181' : '#e2e8f0'} />
                </Field>
                <Field label="Website" error={errors.website} style={{ gridColumn: '1 / -1' }}>
                  <input name="website" value={form.website} onChange={onChange}
                    placeholder="https://www.school.edu"
                    style={inputStyle(false)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP: Branding ───────────────────────────────────────────── */}
          {stepId === 'branding' && (
            <div>
              <SectionTitle icon="palette" title="School Branding" />

              {/* Logo Upload */}
              <Field label="School Logo" error={errors.logo}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    style={{
                      width: 100, height: 100, borderRadius: 12, border: '2px dashed #e2e8f0',
                      display: 'flex', flexDirection: 'column', alignItems: 'center',
                      justifyContent: 'center', cursor: 'pointer', overflow: 'hidden',
                      background: logoPreview ? 'transparent' : '#fafafa', flexShrink: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#76C442'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo preview"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      <>
                        <span className="material-icons" style={{ fontSize: 32, color: '#cbd5e0' }}>add_photo_alternate</span>
                        <span style={{ fontSize: 10, color: '#a0aec0', marginTop: 4 }}>Click to upload</span>
                      </>
                    )}
                  </div>
                  <div>
                    <button type="button" onClick={() => logoInputRef.current?.click()}
                      style={{ padding: '8px 18px', border: '1.5px solid #76C442', borderRadius: 8, background: '#fff', color: '#76C442', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    {logoPreview && (
                      <button type="button" onClick={() => { setLogoFile(null); setLogoPreview(null); }}
                        style={{ marginLeft: 10, padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', color: '#718096', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                        Remove
                      </button>
                    )}
                    <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 8 }}>
                      PNG, JPG or SVG · Max 5 MB
                    </div>
                  </div>
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onLogoChange} />
              </Field>

              {/* Color Pickers */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', marginTop: 8 }}>
                <Field label="Primary Color">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" name="primaryColor" value={form.primaryColor}
                      onChange={onChange}
                      style={{ width: 48, height: 40, padding: 2, border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }} />
                    <input name="primaryColor" value={form.primaryColor} onChange={onChange}
                      placeholder="#76C442" style={{ ...inputStyle(false), flex: 1 }}
                      onFocus={e => e.target.style.borderColor = '#76C442'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                </Field>
                <Field label="Secondary Color">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" name="secondaryColor" value={form.secondaryColor}
                      onChange={onChange}
                      style={{ width: 48, height: 40, padding: 2, border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }} />
                    <input name="secondaryColor" value={form.secondaryColor} onChange={onChange}
                      placeholder="#5fa832" style={{ ...inputStyle(false), flex: 1 }}
                      onFocus={e => e.target.style.borderColor = '#76C442'}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                  </div>
                </Field>
              </div>

              {/* Live preview */}
              <div style={{ marginTop: 20, padding: '16px 20px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#fafafa' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#718096', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Theme Preview</div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: form.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {logoPreview
                      ? <img src={logoPreview} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
                      : <span className="material-icons" style={{ color: '#fff', fontSize: 20 }}>school</span>
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: form.primaryColor }}>{form.name || 'School Name'}</div>
                    <div style={{ fontSize: 11, color: '#a0aec0' }}>Management System</div>
                  </div>
                  <button style={{ marginLeft: 'auto', padding: '7px 16px', background: form.primaryColor, border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'default' }}>
                    Primary Button
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: Academic Config ────────────────────────────────────── */}
          {stepId === 'academic' && (
            <div>
              <SectionTitle icon="menu_book" title="Academic Configuration" />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="Total Classes / Grades" error={errors.totalClasses}>
                  <input name="totalClasses" type="number" value={form.totalClasses} onChange={onChange}
                    placeholder="e.g. 12"
                    style={inputStyle(!!errors.totalClasses)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </Field>
                <Field label="Sections (comma-separated)" error={errors.sections}>
                  <input name="sections" value={form.sections} onChange={onChange}
                    placeholder="e.g. A,B,C,D"
                    style={inputStyle(false)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </Field>
              </div>
              <div style={{ marginTop: 8, padding: '14px 18px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fef3c7', fontSize: 13, color: '#92400e' }}>
                <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>info</span>
                These configure the available class/section combinations throughout the platform.
              </div>
            </div>
          )}

          {/* ── STEP: Admin Account ──────────────────────────────────────── */}
          {stepId === 'admin' && (
            <div>
              <SectionTitle icon="manage_accounts" title="First Admin Account" />
              <div style={{ marginBottom: 18, padding: '12px 16px', background: '#ebf8ff', borderRadius: 10, border: '1px solid #bee3f8', fontSize: 13, color: '#2c5282' }}>
                <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 6 }}>info</span>
                Optional — leave blank to add admins later from Admin Management.
                A temporary password will be auto-generated and shown after creation.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
                <Field label="Admin Full Name" error={errors.adminName}>
                  <input name="adminName" value={form.adminName} onChange={onChange}
                    placeholder="e.g. Ravi Kumar"
                    style={inputStyle(false)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </Field>
                <Field label="Admin Email" error={errors.adminEmail}>
                  <input name="adminEmail" type="email" value={form.adminEmail} onChange={onChange}
                    placeholder="admin@school.edu"
                    style={inputStyle(!!errors.adminEmail)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = errors.adminEmail ? '#fc8181' : '#e2e8f0'} />
                </Field>
                <Field label="Admin Mobile" error={errors.adminMobile}>
                  <input name="adminMobile" value={form.adminMobile} onChange={onChange}
                    placeholder="+91 9876543210"
                    style={inputStyle(false)}
                    onFocus={e => e.target.style.borderColor = '#76C442'}
                    onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
                </Field>
              </div>
            </div>
          )}

          {/* ── STEP: Subscription ──────────────────────────────────────── */}
          {stepId === 'subscription' && (
            <div>
              <SectionTitle icon="card_membership" title="Subscription Plan" />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
                {[
                  { plan: 'BASIC',    icon: 'star_border',   color: '#718096', desc: 'Core features for small schools' },
                  { plan: 'STANDARD', icon: 'star_half',     color: '#d97706', desc: 'All features for growing schools' },
                  { plan: 'PREMIUM',  icon: 'star',          color: '#7c3aed', desc: 'Unlimited access & priority support' },
                ].map(({ plan, icon, color, desc }) => (
                  <div
                    key={plan}
                    onClick={() => setForm(prev => ({ ...prev, subscriptionPlan: plan }))}
                    style={{
                      padding: '20px 16px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      border: `2px solid ${form.subscriptionPlan === plan ? '#76C442' : '#e2e8f0'}`,
                      background: form.subscriptionPlan === plan ? '#f0fff4' : '#fff',
                      transition: 'all 0.2s',
                    }}
                  >
                    <span className="material-icons" style={{ fontSize: 32, color, display: 'block', marginBottom: 8 }}>{icon}</span>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#2d3748', marginBottom: 4 }}>{plan}</div>
                    <div style={{ fontSize: 12, color: '#718096' }}>{desc}</div>
                    {form.subscriptionPlan === plan && (
                      <div style={{ marginTop: 10, fontSize: 11, color: '#76C442', fontWeight: 700 }}>✓ Selected</div>
                    )}
                  </div>
                ))}
              </div>
              <Field label="Subscription Expiry Date" error={errors.subscriptionExpiry}>
                <input name="subscriptionExpiry" type="date" value={form.subscriptionExpiry} onChange={onChange}
                  style={inputStyle(false)}
                  onFocus={e => e.target.style.borderColor = '#76C442'}
                  onBlur={e => e.target.style.borderColor = '#e2e8f0'} />
              </Field>
            </div>
          )}

          {/* ── STEP: Feature Toggles ────────────────────────────────────── */}
          {stepId === 'features' && (
            <div>
              <SectionTitle icon="toggle_on" title="Feature Toggles" />
              <p style={{ color: '#718096', fontSize: 13, marginBottom: 20 }}>
                Enable or disable modules for this school. These can be changed later.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
                {[
                  { key: 'attendance',   label: 'Attendance Tracking', icon: 'fact_check' },
                  { key: 'fees',         label: 'Fees & Payments',     icon: 'payments' },
                  { key: 'transport',    label: 'Transport Management', icon: 'directions_bus' },
                  { key: 'salary',       label: 'Staff Salary',        icon: 'account_balance_wallet' },
                  { key: 'examination',  label: 'Exam & Certificates', icon: 'verified' },
                  { key: 'diary',        label: 'Class Diary',         icon: 'photo_library' },
                  { key: 'announcements',label: 'Announcements',       icon: 'campaign' },
                  { key: 'messages',     label: 'Messaging',           icon: 'chat' },
                ].map(({ key, label, icon }) => (
                  <div
                    key={key}
                    onClick={() => onFeatureToggle(key)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
                      borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s',
                      border: `1.5px solid ${form.features[key] ? '#9ae6b4' : '#e2e8f0'}`,
                      background: form.features[key] ? '#f0fff4' : '#fafafa',
                    }}
                  >
                    <div style={{
                      width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                      background: form.features[key] ? '#76C44220' : '#f0f4f8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-icons" style={{ fontSize: 20, color: form.features[key] ? '#276749' : '#a0aec0' }}>{icon}</span>
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#2d3748' }}>{label}</span>
                    {/* Toggle Switch */}
                    <div style={{
                      width: 40, height: 22, borderRadius: 11, transition: 'background 0.2s',
                      background: form.features[key] ? '#76C442' : '#cbd5e0', position: 'relative', flexShrink: 0,
                    }}>
                      <div style={{
                        position: 'absolute', top: 3, transition: 'left 0.2s',
                        left: form.features[key] ? 20 : 3,
                        width: 16, height: 16, borderRadius: '50%', background: '#fff',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error Banner ─────────────────────────────────────────────── */}
          {submitError && (
            <div style={{ marginTop: 20, padding: '12px 16px', background: '#fff5f5', borderRadius: 8, border: '1px solid #feb2b2', color: '#c53030', fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span className="material-icons" style={{ fontSize: 18 }}>error_outline</span>
              {submitError}
            </div>
          )}

          {/* ── Navigation Buttons ───────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32, paddingTop: 20, borderTop: '1px solid #f0f4f8' }}>
            <button type="button" onClick={goPrev} disabled={currentStep === 0}
              style={{
                padding: '10px 24px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                background: '#fff', color: currentStep === 0 ? '#cbd5e0' : '#4a5568',
                fontWeight: 600, fontSize: 13, cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
              }}>
              ← Previous
            </button>

            <span style={{ fontSize: 12, color: '#a0aec0' }}>
              Step {currentStep + 1} of {STEPS.length}
            </span>

            {currentStep < STEPS.length - 1 ? (
              <button type="button" onClick={goNext}
                style={{ padding: '10px 28px', background: '#76C442', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting}
                style={{
                  padding: '10px 32px', background: submitting ? '#a0aec0' : '#76C442',
                  border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, fontSize: 14, cursor: submitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                {submitting ? (
                  <>
                    <span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Creating...
                  </>
                ) : 'Create School'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Small helper: section title ───────────────────────────────────────────────
const SectionTitle = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 22 }}>
    <div style={{ width: 38, height: 38, borderRadius: 10, background: '#76C44220', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="material-icons" style={{ fontSize: 20, color: '#276749' }}>{icon}</span>
    </div>
    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#2d3748' }}>{title}</h3>
  </div>
);

export default SetupSchool;
