import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { superAdminAPI, adminAPI, schoolAPI } from '../../services/api';
import { getLogs } from '../../services/activityLog';
import { useAuth } from '../../context/AuthContext';

// ─── Module definitions (used for permission toggles) ────────────────────────
const ALL_MODULES = [
  { key: 'students',     label: 'Students',          icon: 'school' },
  { key: 'teachers',     label: 'Teachers',           icon: 'person' },
  { key: 'classes',      label: 'Classes',            icon: 'class' },
  { key: 'applications', label: 'Applications',       icon: 'assignment_ind' },
  { key: 'parents',      label: 'Parents',            icon: 'family_restroom' },
  { key: 'fees',         label: 'Fees & Payments',    icon: 'payments' },
  { key: 'collectFee',   label: 'Collect Fee',        icon: 'point_of_sale' },
  { key: 'salaries',     label: 'Salaries',           icon: 'account_balance_wallet' },
  { key: 'expenses',     label: 'Expenses',           icon: 'receipt_long' },
  { key: 'leave',        label: 'Leave Management',   icon: 'event_busy' },
  { key: 'transport',    label: 'Transport',          icon: 'directions_bus' },
  { key: 'attendance',   label: 'Attendance',         icon: 'fact_check' },
  { key: 'timetable',    label: 'Timetable',          icon: 'schedule' },
  { key: 'examination',  label: 'Exam & Certificates',icon: 'verified' },
];

const DEFAULT_PERMS = ALL_MODULES.reduce((acc, m) => ({ ...acc, [m.key]: true }), {});

// ─── Utility ──────────────────────────────────────────────────────────────────
const initials = (name = '') =>
  name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

// ─── Small helper for detail rows in expanded view ────────────────────────────
function InfoRow({ icon, label, value }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
      <span className="material-icons" style={{ fontSize: 14, color: '#a0aec0', marginTop: 1, flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 12, color: '#718096', minWidth: 48, flexShrink: 0 }}>{label}:</span>
      <span style={{ fontSize: 12, color: '#2d3748', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// APPLICATION OWNER — Platform Dashboard
// ═════════════════════════════════════════════════════════════════════════════
function OwnerDashboard() {
  const [superAdmins,  setSuperAdmins]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showWizard,   setShowWizard]   = useState(false);
  const [credentials,  setCredentials]  = useState(null);
  const [search,       setSearch]       = useState('');
  const [expandedRow,  setExpandedRow]  = useState(null); // schoolId of expanded row
  const [deleteTarget, setDeleteTarget] = useState(null); // sa object pending confirmation
  const [deleting,     setDeleting]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await superAdminAPI.getSuperAdmins();
      setSuperAdmins(res.data?.data ?? []);
    } catch { setSuperAdmins([]); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalSchools = superAdmins.length;
  const activeCount  = superAdmins.filter(sa => sa.isActive !== false).length;
  const pendingSetup = superAdmins.filter(sa => sa.needsSchoolSetup).length;
  const setupDone    = superAdmins.filter(sa => !sa.needsSchoolSetup).length;

  const handleCreated = (creds) => {
    setShowWizard(false);
    setCredentials(creds);
    load();
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await superAdminAPI.deleteSuperAdmin(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const filtered = superAdmins.filter(sa => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (sa.schoolName || '').toLowerCase().includes(q)
        || (sa.schoolCode  || '').toLowerCase().includes(q)
        || (sa.name        || '').toLowerCase().includes(q)
        || (sa.email       || '').toLowerCase().includes(q);
  });

  return (
    <Layout pageTitle="Platform Dashboard">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#1a202c' }}>Platform Overview</h1>
          <p style={{ margin: '4px 0 0', color: '#718096', fontSize: 13 }}>Manage all schools and their Super Admins from one place</p>
        </div>
        <button
          onClick={() => setShowWizard(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 2px 8px #dc262640' }}
        >
          <span className="material-icons" style={{ fontSize: 18 }}>add_business</span>
          Create School &amp; Super Admin
        </button>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Schools',       value: totalSchools, icon: 'domain',           color: '#dc2626' },
          { label: 'Setup Complete',       value: setupDone,    icon: 'task_alt',          color: '#16a34a' },
          { label: 'Pending Setup',        value: pendingSetup, icon: 'pending_actions',   color: '#d97706' },
          { label: 'Active Super Admins',  value: activeCount,  icon: 'manage_accounts',   color: '#7c3aed' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value" style={{ color: c.color }}>{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* ── Schools / Super Admins Table ────────────────────────────────────── */}
      <div className="data-table-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#2d3748', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ color: '#dc2626', fontSize: 20 }}>domain</span>
            Schools &amp; Super Admins
            <span style={{ background: '#dc262618', color: '#dc2626', padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{totalSchools} school{totalSchools !== 1 ? 's' : ''}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f8fafc', borderRadius: 8, padding: '6px 12px', border: '1.5px solid #e2e8f0' }}>
            <span className="material-icons" style={{ fontSize: 16, color: '#a0aec0' }}>search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search school, admin, email…"
              style={{ border: 'none', outline: 'none', fontSize: 13, background: 'transparent', width: 200, color: '#2d3748' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
            <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>domain_disabled</span>
            <p style={{ color: '#a0aec0', marginBottom: 16 }}>
              {search ? 'No matching schools found.' : 'No schools created yet.'}
            </p>
            {!search && (
              <button onClick={() => setShowWizard(true)} style={{ padding: '10px 24px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
                Create First School
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>School</th>
                  <th>Super Admin</th>
                  <th>Contact</th>
                  <th>Modules</th>
                  <th>Setup</th>
                  <th>Status</th>
                  <th></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(sa => {
                  const perms = sa.permissions
                    ? (typeof sa.permissions === 'string' ? (() => { try { return JSON.parse(sa.permissions); } catch { return null; } })() : sa.permissions)
                    : null;
                  const enabledCount = perms ? Object.values(perms).filter(Boolean).length : ALL_MODULES.length;
                  const isExpanded   = expandedRow === sa.schoolId;

                  return (
                    <React.Fragment key={sa.id}>
                      <tr style={{ background: isExpanded ? '#fafbff' : undefined }}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#553c9a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                              {initials(sa.schoolName || sa.name)}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{sa.schoolName || '—'}</div>
                              <span style={{ padding: '2px 6px', background: '#7c3aed18', color: '#7c3aed', borderRadius: 5, fontSize: 10, fontWeight: 700, fontFamily: 'monospace' }}>
                                {sa.schoolCode || '—'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{sa.name}</div>
                          <div style={{ fontSize: 11, color: '#a0aec0' }}>{sa.email}</div>
                          {sa.mobile && <div style={{ fontSize: 11, color: '#718096' }}>{sa.mobile}</div>}
                        </td>
                        <td style={{ fontSize: 12, color: '#718096' }}>
                          {sa.createdAt
                            ? <div>Joined {new Date(sa.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                            : '—'}
                          <div style={{ fontSize: 11, color: '#a0aec0' }}>ID #{sa.schoolId}</div>
                        </td>
                        <td>
                          <span style={{ padding: '3px 10px', background: '#3182ce18', color: '#2c5282', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {enabledCount} / {ALL_MODULES.length}
                          </span>
                        </td>
                        <td>
                          {sa.needsSchoolSetup ? (
                            <span style={{ padding: '3px 10px', background: '#fffbeb', color: '#d97706', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              ⏳ Pending
                            </span>
                          ) : (
                            <span style={{ padding: '3px 10px', background: '#f0fff4', color: '#276749', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                              ✓ Complete
                            </span>
                          )}
                        </td>
                        <td>
                          <span style={{ padding: '3px 10px', background: sa.isActive !== false ? '#f0fff4' : '#fff5f5', color: sa.isActive !== false ? '#276749' : '#e53e3e', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {sa.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => setExpandedRow(isExpanded ? null : sa.schoolId)}
                            title={isExpanded ? 'Collapse' : 'View details'}
                            style={{ border: 'none', background: isExpanded ? '#ede9fe' : '#f8fafc', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <span className="material-icons" style={{ fontSize: 16, color: isExpanded ? '#7c3aed' : '#a0aec0' }}>
                              {isExpanded ? 'expand_less' : 'expand_more'}
                            </span>
                          </button>
                        </td>
                        <td>
                          <button
                            onClick={() => setDeleteTarget(sa)}
                            title="Delete Super Admin"
                            style={{ border: 'none', background: '#fff5f5', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <span className="material-icons" style={{ fontSize: 16, color: '#e53e3e' }}>delete</span>
                          </button>
                        </td>
                      </tr>

                      {/* ── Expanded detail row ─────────────────────────────── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, background: '#fafbff', borderTop: '1px dashed #e2e8f0' }}>
                            <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                              {/* School info */}
                              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1.5px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>School Info</div>
                                <InfoRow icon="school"           label="Name"   value={sa.schoolName || '—'} />
                                <InfoRow icon="tag"              label="Code"   value={<span style={{ fontFamily:'monospace', fontWeight:700 }}>{sa.schoolCode || '—'}</span>} />
                                <InfoRow icon="fingerprint"      label="DB ID"  value={`#${sa.schoolId}`} />
                              </div>
                              {/* Super admin */}
                              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1.5px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Super Admin</div>
                                <InfoRow icon="person"   label="Name"   value={sa.name}   />
                                <InfoRow icon="email"    label="Email"  value={sa.email}  />
                                <InfoRow icon="phone"    label="Mobile" value={sa.mobile || '—'} />
                              </div>
                              {/* Enabled modules */}
                              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1.5px solid #e2e8f0' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
                                  Enabled Modules ({enabledCount})
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                  {ALL_MODULES.filter(m => perms ? perms[m.key] : true).map(m => (
                                    <span key={m.key} style={{ padding: '2px 8px', background: '#ede9fe', color: '#5b21b6', borderRadius: 12, fontSize: 10, fontWeight: 600 }}>{m.label}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Super Admin Wizard ───────────────────────────────────────── */}
      {showWizard && (
        <CreateSuperAdminWizard
          onClose={() => setShowWizard(false)}
          onCreated={handleCreated}
        />
      )}

      {/* ── Credentials Modal ───────────────────────────────────────────────── */}
      {credentials && (
        <CredentialsModal creds={credentials} onClose={() => setCredentials(null)} />
      )}

      {/* ── Delete Confirmation Modal ───────────────────────────────────────── */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ color: '#e53e3e', fontSize: 24 }}>delete_forever</span>
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#1a202c' }}>Delete Super Admin</div>
                <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>This action cannot be undone</div>
              </div>
            </div>

            <div style={{ background: '#fff5f5', borderRadius: 10, padding: '12px 14px', marginBottom: 20, border: '1.5px solid #fed7d7' }}>
              <div style={{ fontSize: 13, color: '#2d3748', marginBottom: 4 }}>
                You are about to delete the Super Admin account for:
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#e53e3e' }}>{deleteTarget.schoolName || '—'}</div>
              <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{deleteTarget.name} · {deleteTarget.email}</div>
              <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 8 }}>
                The school record will be preserved. Only the Super Admin login account will be removed.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#4a5568', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#e53e3e', color: '#fff', fontWeight: 700, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                {deleting ? (
                  <>
                    <span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                    Deleting…
                  </>
                ) : (
                  <>
                    <span className="material-icons" style={{ fontSize: 16 }}>delete</span>
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Full 8-Step Create School & Super Admin Wizard (Application Owner)
// ═════════════════════════════════════════════════════════════════════════════
const WIZARD_STEPS = [
  { label: 'School Identity',   icon: 'school' },
  { label: 'Address',           icon: 'location_on' },
  { label: 'Contact & Web',     icon: 'contacts' },
  { label: 'Branding',          icon: 'palette' },
  { label: 'Academic Setup',    icon: 'menu_book' },
  { label: 'Super Admin',       icon: 'manage_accounts' },
  { label: 'Subscription',      icon: 'card_membership' },
  { label: 'Module Permissions',icon: 'toggle_on' },
];

const WIZARD_INIT = {
  name: '', code: '', board: 'CBSE', academicYear: '2025-2026',
  address: '', city: '', state: '', pincode: '', country: 'India',
  phone: '', schoolEmail: '', website: '',
  primaryColor: '#76C442', secondaryColor: '#5fa832',
  totalClasses: '', sections: 'A,B,C,D',
  adminName: '', adminEmail: '', adminMobile: '',
  subscriptionPlan: 'STANDARD', subscriptionExpiry: '',
};

const inp = (err) => ({
  width: '100%', padding: '10px 14px',
  border: `1.5px solid ${err ? '#fc8181' : '#e2e8f0'}`,
  borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#fff',
});
const sel = { ...inp(false), cursor: 'pointer' };

function WizardField({ label, required, hint, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#374151', marginBottom: 5 }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 2 }}>*</span>}
      </label>
      {children}
      {hint  && !error && <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 3 }}>{hint}</div>}
      {error && <div style={{ fontSize: 11, color: '#e53e3e', marginTop: 3 }}>{error}</div>}
    </div>
  );
}

function CreateSuperAdminWizard({ onClose, onCreated }) {
  const [step,      setStep]      = useState(1);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  const [form,      setForm]      = useState({ ...WIZARD_INIT });
  const [perms,     setPerms]     = useState({ ...DEFAULT_PERMS });
  const [logoFile,  setLogoFile]  = useState(null);   // File object
  const [logoPreview, setLogoPreview] = useState(null); // object URL for preview

  const handleLogoChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please select an image file.'); return; }
    if (file.size > 2 * 1024 * 1024)    { setError('Logo must be under 2 MB.'); return; }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError('');
  };
  const removeLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview(null);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const on  = (k)    => (e) => set(k, e.target.value);

  const allEnabled  = ALL_MODULES.every(m => perms[m.key]);
  const noneEnabled = ALL_MODULES.every(m => !perms[m.key]);
  const toggleAll   = (v) => setPerms(ALL_MODULES.reduce((a, m) => ({ ...a, [m.key]: v }), {}));

  const validate = (s) => {
    if (s === 1) {
      if (!form.name.trim())        return 'School name is required';
      if (!form.code.trim())        return 'School code is required';
      if (!/^[A-Z0-9]{3,10}$/i.test(form.code.trim())) return 'Code must be 3–10 alphanumeric characters';
      if (!form.academicYear.trim()) return 'Academic year is required';
    }
    if (s === 2) {
      if (!form.address.trim()) return 'Address is required';
      if (!form.city.trim())    return 'City is required';
      if (!form.state.trim())   return 'State is required';
    }
    if (s === 3) {
      if (!form.phone.trim())      return 'Phone is required';
      if (!form.schoolEmail.trim()) return 'Email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.schoolEmail)) return 'Enter a valid email';
    }
    if (s === 6) {
      if (!form.adminName.trim())  return 'Admin name is required';
      if (!form.adminEmail.trim()) return 'Admin email is required';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.adminEmail)) return 'Enter a valid admin email';
    }
    return null;
  };

  const next = () => {
    const err = validate(step);
    if (err) { setError(err); return; }
    setError('');
    setStep(s => Math.min(s + 1, 8));
  };
  const back = () => { setError(''); setStep(s => Math.max(s - 1, 1)); };

  const submit = async () => {
    const err = validate(6);
    if (err) { setStep(6); setError(err); return; }
    setSaving(true);
    setError('');
    try {
      // Step 1: Create stub school + Super Admin account
      const saRes = await superAdminAPI.createSuperAdmin({
        name:        form.adminName.trim(),
        email:       form.adminEmail.trim(),
        mobile:      form.adminMobile.trim() || undefined,
        schoolName:  form.name.trim(),
        schoolCode:  form.code.trim().toUpperCase(),
        permissions: JSON.stringify(perms),
      });
      const saData = saRes.data;
      if (!saData?.success || !saData?.data) {
        setError(saData?.message || 'Failed to create Super Admin');
        return;
      }

      const schoolId        = saData.data.schoolId;
      const adminEmail      = saData.data.email;
      const adminPassword   = saData.data.generatedPassword;
      const adminName       = saData.data.name;

      // Step 2: Update the stub school with full details
      if (schoolId) {
        try {
          await schoolAPI.updateSchool(schoolId, {
            board:              form.board,
            academicYear:       form.academicYear.trim(),
            address:            form.address.trim(),
            city:               form.city.trim(),
            state:              form.state.trim(),
            pincode:            form.pincode.trim(),
            country:            form.country.trim() || 'India',
            phone:              form.phone.trim(),
            email:              form.schoolEmail.trim(),
            website:            form.website.trim() || null,
            primaryColor:       form.primaryColor,
            secondaryColor:     form.secondaryColor,
            totalClasses:       form.totalClasses ? Number(form.totalClasses) : null,
            sections:           form.sections.trim() || 'A,B,C,D',
            subscriptionPlan:   form.subscriptionPlan,
            subscriptionExpiry: form.subscriptionExpiry || null,
            features:           JSON.stringify({
              attendance: perms.attendance ?? true,
              transport:  perms.transport  ?? true,
              fees:       perms.fees       ?? true,
              salary:     perms.salaries   ?? true,
              examination:perms.examination?? true,
              diary:      perms.diary      ?? true,
              announcements: perms.announcements ?? true,
              messages:   perms.messages   ?? true,
            }),
            isSetupCompleted: true,
          });
        } catch {
          // Non-fatal: Super Admin can finish setup on first login
        }
      }

      onCreated({
        name:       adminName,
        email:      adminEmail,
        password:   adminPassword,
        schoolName: form.name.trim(),
        schoolCode: form.code.trim().toUpperCase(),
        modules:    ALL_MODULES.filter(m => perms[m.key]).map(m => m.label),
      });
    } catch (e) {
      setError(e.response?.data?.message || 'Server error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const pct = Math.round((step / 8) * 100);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 620, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#1a202c' }}>Create School &amp; Super Admin</div>
            <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
              Step {step} of 8 — <span style={{ fontWeight: 600, color: '#dc2626' }}>{WIZARD_STEPS[step - 1].label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f7fafc', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ fontSize: 18, color: '#718096' }}>close</span>
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ height: 4, background: '#f0f4f8', flexShrink: 0 }}>
          <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#dc2626,#7c3aed)', transition: 'width 0.3s ease' }} />
        </div>

        {/* Step pills */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 20px', borderBottom: '1px solid #f0f4f8', flexShrink: 0, overflowX: 'auto' }}>
          {WIZARD_STEPS.map((s, i) => {
            const n = i + 1;
            const done   = step > n;
            const active = step === n;
            return (
              <div key={s.label} onClick={() => done && setStep(n)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700, flexShrink: 0, cursor: done ? 'pointer' : 'default',
                  background: active ? '#dc2626' : done ? '#fef2f2' : '#f8fafc',
                  color:      active ? '#fff'    : done ? '#dc2626' : '#a0aec0',
                  border:     `1.5px solid ${active ? '#dc2626' : done ? '#fca5a5' : '#e2e8f0'}` }}>
                <span className="material-icons" style={{ fontSize: 12 }}>{done ? 'check' : s.icon}</span>
                {s.label}
              </div>
            );
          })}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px' }}>

          {/* ── Step 1: School Identity ────────────────────────────────────────── */}
          {step === 1 && (
            <div>
              <div style={{ padding: '10px 14px', background: '#fef2f2', borderRadius: 8, borderLeft: '4px solid #dc2626', fontSize: 13, color: '#991b1b', marginBottom: 18 }}>
                Each school gets one Super Admin. School code must be unique across the platform.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
                <WizardField label="School Name" required error={error && !form.name.trim() ? error : null}>
                  <input value={form.name} onChange={on('name')} placeholder="e.g. Springfield High School" style={inp(error && !form.name.trim())} />
                </WizardField>
                <WizardField label="School Code" required hint="3–10 alphanumeric, auto-uppercase" error={error && !form.code.trim() ? error : null}>
                  <input value={form.code} onChange={e => set('code', e.target.value.toUpperCase())} placeholder="e.g. SPRHS" style={inp(false)} />
                </WizardField>
                <WizardField label="Board / Curriculum">
                  <select value={form.board} onChange={on('board')} style={sel}>
                    {['CBSE','ICSE','State Board','IB','IGCSE','Other'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </WizardField>
                <WizardField label="Academic Year" required>
                  <input value={form.academicYear} onChange={on('academicYear')} placeholder="e.g. 2025-2026" style={inp(false)} />
                </WizardField>
              </div>
            </div>
          )}

          {/* ── Step 2: Address ───────────────────────────────────────────────── */}
          {step === 2 && (
            <div>
              <WizardField label="Street Address" required>
                <textarea value={form.address} onChange={on('address')} rows={2} placeholder="Building no, street name, area…" style={{ ...inp(false), resize: 'vertical' }} />
              </WizardField>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
                <WizardField label="City" required><input value={form.city}    onChange={on('city')}    placeholder="e.g. Mumbai"     style={inp(false)} /></WizardField>
                <WizardField label="State" required><input value={form.state}  onChange={on('state')}   placeholder="e.g. Maharashtra" style={inp(false)} /></WizardField>
                <WizardField label="Pincode"><input value={form.pincode} onChange={on('pincode')} placeholder="e.g. 400001"      style={inp(false)} /></WizardField>
                <WizardField label="Country">
                  <select value={form.country} onChange={on('country')} style={sel}>
                    {['India','USA','UAE','UK','Canada','Australia','Other'].map(c => <option key={c}>{c}</option>)}
                  </select>
                </WizardField>
              </div>
            </div>
          )}

          {/* ── Step 3: Contact ───────────────────────────────────────────────── */}
          {step === 3 && (
            <div>
              <WizardField label="Phone Number" required>
                <input value={form.phone} onChange={on('phone')} placeholder="e.g. +91 98765 43210" style={inp(false)} />
              </WizardField>
              <WizardField label="School Email" required>
                <input type="email" value={form.schoolEmail} onChange={on('schoolEmail')} placeholder="e.g. info@springfield.edu" style={inp(false)} />
              </WizardField>
              <WizardField label="Website" hint="Optional">
                <input value={form.website} onChange={on('website')} placeholder="e.g. https://springfield.edu" style={inp(false)} />
              </WizardField>
            </div>
          )}

          {/* ── Step 4: Branding ──────────────────────────────────────────────── */}
          {step === 4 && (
            <div>
              <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, borderLeft: '4px solid #16a34a', fontSize: 13, color: '#166534', marginBottom: 18 }}>
                Upload a school logo and choose brand colors. These can be changed later.
              </div>

              {/* Logo upload */}
              <WizardField label="School Logo" hint="PNG, JPG or SVG · max 2 MB">
                {logoPreview ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <img src={logoPreview} alt="logo preview"
                      style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', padding: 4 }} />
                    <div>
                      <div style={{ fontSize: 12, color: '#374151', fontWeight: 600, marginBottom: 6 }}>{logoFile?.name}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <label style={{ padding: '6px 14px', background: '#f0fdf4', color: '#16a34a', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1.5px solid #bbf7d0' }}>
                          Change
                          <input type="file" accept="image/*" onChange={e => handleLogoChange(e.target.files[0])} style={{ display: 'none' }} />
                        </label>
                        <button onClick={removeLogo} style={{ padding: '6px 14px', background: '#fff5f5', color: '#e53e3e', borderRadius: 7, fontSize: 12, fontWeight: 600, border: '1.5px solid #fed7d7', cursor: 'pointer' }}>
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <label
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handleLogoChange(e.dataTransfer.files[0]); }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '24px 16px', border: '2px dashed #e2e8f0', borderRadius: 10, cursor: 'pointer', background: '#fafbfc', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#76C442'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <span className="material-icons" style={{ fontSize: 36, color: '#cbd5e0' }}>add_photo_alternate</span>
                    <div style={{ fontSize: 13, color: '#4a5568', fontWeight: 600 }}>Click to upload or drag &amp; drop</div>
                    <div style={{ fontSize: 11, color: '#a0aec0' }}>PNG, JPG, SVG · max 2 MB</div>
                    <input type="file" accept="image/*" onChange={e => handleLogoChange(e.target.files[0])} style={{ display: 'none' }} />
                  </label>
                )}
              </WizardField>

              {/* Colors */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
                <WizardField label="Primary Color">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" value={form.primaryColor} onChange={on('primaryColor')} style={{ width: 48, height: 40, padding: 2, border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }} />
                    <input value={form.primaryColor} onChange={on('primaryColor')} style={{ ...inp(false), flex: 1, fontFamily: 'monospace' }} />
                  </div>
                </WizardField>
                <WizardField label="Secondary Color">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="color" value={form.secondaryColor} onChange={on('secondaryColor')} style={{ width: 48, height: 40, padding: 2, border: '1.5px solid #e2e8f0', borderRadius: 8, cursor: 'pointer' }} />
                    <input value={form.secondaryColor} onChange={on('secondaryColor')} style={{ ...inp(false), flex: 1, fontFamily: 'monospace' }} />
                  </div>
                </WizardField>
              </div>

              {/* Brand preview */}
              <div style={{ marginTop: 4, padding: '14px 18px', borderRadius: 10, border: '1.5px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 14 }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="logo" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', padding: 3 }} />
                ) : (
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})`, flexShrink: 0 }} />
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: form.primaryColor }}>{form.name || 'School Name'}</div>
                  <div style={{ fontSize: 11, color: '#718096' }}>Brand preview</div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 5: Academic Setup ────────────────────────────────────────── */}
          {step === 5 && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 18px' }}>
                <WizardField label="Total Classes" hint="Number of class grades">
                  <input type="number" min={1} max={20} value={form.totalClasses} onChange={on('totalClasses')} placeholder="e.g. 12" style={inp(false)} />
                </WizardField>
                <WizardField label="Sections" hint="Comma-separated section names">
                  <input value={form.sections} onChange={on('sections')} placeholder="e.g. A,B,C,D" style={inp(false)} />
                </WizardField>
              </div>
            </div>
          )}

          {/* ── Step 6: Super Admin Account ───────────────────────────────────── */}
          {step === 6 && (
            <div>
              <div style={{ padding: '10px 14px', background: '#f5f3ff', borderRadius: 8, borderLeft: '4px solid #7c3aed', fontSize: 13, color: '#5b21b6', marginBottom: 18 }}>
                A temporary password will be generated. The Super Admin must reset it on first login.
              </div>
              <WizardField label="Full Name" required>
                <input value={form.adminName} onChange={on('adminName')} placeholder="e.g. Rajesh Kumar" style={inp(false)} />
              </WizardField>
              <WizardField label="Email Address" required>
                <input type="email" value={form.adminEmail} onChange={on('adminEmail')} placeholder="e.g. rajesh@springfield.edu" style={inp(false)} />
              </WizardField>
              <WizardField label="Mobile Number" hint="Optional">
                <input type="tel" value={form.adminMobile} onChange={on('adminMobile')} placeholder="e.g. 9876543210" style={inp(false)} />
              </WizardField>
            </div>
          )}

          {/* ── Step 7: Subscription ──────────────────────────────────────────── */}
          {step === 7 && (
            <div>
              <WizardField label="Subscription Plan">
                <select value={form.subscriptionPlan} onChange={on('subscriptionPlan')} style={sel}>
                  {['BASIC','STANDARD','PREMIUM','ENTERPRISE'].map(p => <option key={p}>{p}</option>)}
                </select>
              </WizardField>
              <WizardField label="Expiry Date" hint="Leave blank for no expiry">
                <input type="date" value={form.subscriptionExpiry} onChange={on('subscriptionExpiry')} style={inp(false)} />
              </WizardField>
              <div style={{ marginTop: 8, padding: '12px 14px', background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#718096' }}>
                <strong>BASIC</strong> — Core modules · <strong>STANDARD</strong> — All modules · <strong>PREMIUM</strong> — Priority support · <strong>ENTERPRISE</strong> — Custom SLA
              </div>
            </div>
          )}

          {/* ── Step 8: Module Permissions ────────────────────────────────────── */}
          {step === 8 && (
            <div>
              <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, borderLeft: '4px solid #16a34a', fontSize: 13, color: '#166534', marginBottom: 14 }}>
                Select which modules this Super Admin can access in their school portal.
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => toggleAll(true)}  disabled={allEnabled}  style={{ padding: '6px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: allEnabled  ? 'not-allowed' : 'pointer', background: allEnabled  ? '#f0fff4' : '#fff', color: allEnabled  ? '#276749' : '#374151' }}>Select All</button>
                <button onClick={() => toggleAll(false)} disabled={noneEnabled} style={{ padding: '6px 16px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: noneEnabled ? 'not-allowed' : 'pointer', background: noneEnabled ? '#fff5f5' : '#fff', color: noneEnabled ? '#e53e3e' : '#374151' }}>Deselect All</button>
                <span style={{ marginLeft: 'auto', fontSize: 12, color: '#7c3aed', fontWeight: 700, alignSelf: 'center' }}>{Object.values(perms).filter(Boolean).length} / {ALL_MODULES.length} enabled</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {ALL_MODULES.map(m => (
                  <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', border: `1.5px solid ${perms[m.key] ? '#7c3aed' : '#e2e8f0'}`, borderRadius: 10, cursor: 'pointer', background: perms[m.key] ? '#f5f3ff' : '#fafafa' }}>
                    <span className="material-icons" style={{ fontSize: 18, color: perms[m.key] ? '#7c3aed' : '#a0aec0' }}>{m.icon}</span>
                    <span style={{ flex: 1, fontSize: 12, fontWeight: 600, color: perms[m.key] ? '#4c1d95' : '#718096' }}>{m.label}</span>
                    <div style={{ width: 36, height: 20, borderRadius: 10, background: perms[m.key] ? '#7c3aed' : '#e2e8f0', position: 'relative', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 2, left: perms[m.key] ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                    </div>
                    <input type="checkbox" checked={!!perms[m.key]} onChange={() => setPerms(p => ({ ...p, [m.key]: !p[m.key] }))} style={{ display: 'none' }} />
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ marginTop: 14, padding: '10px 14px', background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, color: '#c53030', fontSize: 13 }}>
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f4f8', display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ fontSize: 12, color: '#a0aec0' }}>{pct}% complete</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {step > 1 && (
              <button onClick={back} style={{ padding: '9px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer', color: '#374151' }}>
                ← Back
              </button>
            )}
            {step < 8 ? (
              <button onClick={next} style={{ padding: '9px 22px', background: 'linear-gradient(135deg,#dc2626,#7c3aed)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                Next →
              </button>
            ) : (
              <button onClick={submit} disabled={saving} style={{ padding: '9px 22px', background: saving ? '#a0aec0' : 'linear-gradient(135deg,#16a34a,#047857)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {saving
                  ? <><span className="material-icons" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>autorenew</span> Creating…</>
                  : <><span className="material-icons" style={{ fontSize: 16 }}>check_circle</span> Create School &amp; Super Admin</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Credentials Modal — shown after successful creation
// ═════════════════════════════════════════════════════════════════════════════
function CredentialsModal({ creds, onClose }) {
  const [copied, setCopied] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const copy = (text) => {
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const copyAll = () => {
    const text = `School: ${creds.schoolName} (${creds.schoolCode})\nName: ${creds.name}\nEmail: ${creds.email}\nPassword: ${creds.password}\nModules: ${creds.modules.join(', ')}`;
    copy(text);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}>

        {/* Success Header */}
        <div style={{ padding: '24px', background: 'linear-gradient(135deg,#dcfce7,#f0fdf4)', textAlign: 'center', borderBottom: '1px solid #bbf7d0' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <span className="material-icons" style={{ color: '#fff', fontSize: 28 }}>check_circle</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#166534' }}>School Created Successfully!</div>
          <div style={{ fontSize: 13, color: '#15803d', marginTop: 4 }}>Share the credentials below with the Super Admin</div>
        </div>

        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* School */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>School</div>
            <div style={{ fontWeight: 700, color: '#1a202c' }}>{creds.schoolName}</div>
            <div style={{ fontSize: 12, color: '#718096' }}>Code: <strong style={{ fontFamily: 'monospace' }}>{creds.schoolCode}</strong></div>
          </div>

          {/* Credentials */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1 }}>Login Credentials</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ fontSize: 16, color: '#7c3aed' }}>person</span>
              <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{creds.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ fontSize: 16, color: '#7c3aed' }}>email</span>
              <span style={{ fontSize: 13, color: '#374151', flex: 1 }}>{creds.email}</span>
              <button onClick={() => copy(creds.email)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#7c3aed' }}>
                <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ fontSize: 16, color: '#7c3aed' }}>key</span>
              <span style={{ fontSize: 13, color: '#374151', flex: 1, fontFamily: 'monospace', background: '#fffbeb', padding: '2px 8px', borderRadius: 6 }}>
                {showPwd ? creds.password : '••••••••••'}
              </span>
              <button onClick={() => setShowPwd(v => !v)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#718096' }}>
                <span className="material-icons" style={{ fontSize: 16 }}>{showPwd ? 'visibility_off' : 'visibility'}</span>
              </button>
              <button onClick={() => copy(creds.password)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#7c3aed' }}>
                <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
              </button>
            </div>
          </div>

          {/* Modules */}
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
              Enabled Modules ({creds.modules.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {creds.modules.map(m => (
                <span key={m} style={{ padding: '2px 10px', background: '#ede9fe', color: '#5b21b6', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{m}</span>
              ))}
            </div>
          </div>

          {/* Note */}
          <div style={{ padding: '10px 14px', background: '#fffbeb', borderRadius: 8, borderLeft: '4px solid #d97706', fontSize: 12, color: '#92400e' }}>
            The Super Admin must change their password on first login. Share these credentials securely.
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={copyAll} style={{ flex: 1, padding: '10px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#374151' }}>
              <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
              {copied ? 'Copied!' : 'Copy All'}
            </button>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN — School-level Dashboard (unchanged content)
// ═════════════════════════════════════════════════════════════════════════════
const MODULE_LABELS = {
  students: 'Students', teachers: 'Teachers', classes: 'Classes',
  applications: 'Applications', attendance: 'Attendance', fees: 'Fees',
  collectFee: 'Collect Fee', salaries: 'Salaries', expenses: 'Expenses',
  transport: 'Transport', leave: 'Leave',
};

function SchoolDashboard() {
  const [admins,   setAdmins]   = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);

  useEffect(() => {
    superAdminAPI.getAdmins()
      .then(res => setAdmins((res.data?.data ?? []).filter(u => !u.role || u.role === 'ADMIN')))
      .catch(() => setAdmins([]));
    adminAPI.getTeachers()
      .then(res => setTeachers(res.data?.data ?? []))
      .catch(() => setTeachers([]));
    adminAPI.getStudents()
      .then(res => {
        const page = res.data?.data;
        setStudents(page?.content ?? (Array.isArray(page) ? page : []));
      })
      .catch(() => setStudents([]));
  }, []);

  const [logs] = useState(() => getLogs().slice(0, 10));
  const activeAdmins   = admins.filter(a => a.isActive ?? true).length;
  const activeStudents = students.filter(s => s.status === 'Active').length;
  const getPermCount   = (u) => u.permissions ? Object.values(u.permissions).filter(Boolean).length : 11;
  const moduleColor    = { Students: '#76C442', Teachers: '#3182ce', Fees: '#ed8936', Transport: '#805ad5', Attendance: '#38b2ac', Leave: '#e53e3e', Classes: '#d69e2e', Applications: '#667eea', Salaries: '#48bb78', Expenses: '#fc8181', 'Collect Fee': '#76C442' };

  return (
    <Layout pageTitle="Super Admin Dashboard">
      <div className="page-header">
        <h1>Super Admin Dashboard</h1>
        <p>Overview of your school management platform</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Admins',    value: admins.length,    sub: `${activeAdmins} active`,   icon: 'manage_accounts', color: '#76C442' },
          { label: 'Total Teachers',  value: teachers.length,  sub: 'registered teachers',      icon: 'school',          color: '#3182ce' },
          { label: 'Total Students',  value: students.length,  sub: `${activeStudents} active`, icon: 'person',          color: '#805ad5' },
          { label: 'Active Students', value: activeStudents,   sub: 'currently active',         icon: 'how_to_reg',      color: '#ed8936' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
            <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', marginBottom: '24px' }}>
        <div className="data-table-card">
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>manage_accounts</span>
            Admin Overview
            <span style={{ marginLeft: 'auto', background: '#76C44220', color: '#276749', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{admins.length} admins</span>
          </div>
          {admins.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>manage_accounts</span>
              <p style={{ color: '#a0aec0' }}>No admins created yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>Admin</th><th>Permissions</th><th>Status</th></tr></thead>
                <tbody>
                  {admins.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                            {initials(a.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px' }}>{a.name}</div>
                            <div style={{ fontSize: '11px', color: '#a0aec0' }}>{a.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '200px' }}>
                          {a.permissions ? (
                            Object.entries(a.permissions).filter(([,v]) => v).slice(0,3).map(([k]) => (
                              <span key={k} style={{ padding: '2px 7px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: (moduleColor[MODULE_LABELS[k]] || '#76C442') + '20', color: moduleColor[MODULE_LABELS[k]] || '#76C442' }}>
                                {MODULE_LABELS[k]}
                              </span>
                            ))
                          ) : (
                            <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: '#76C44220', color: '#276749' }}>Full Access</span>
                          )}
                          {a.permissions && getPermCount(a) > 3 && (
                            <span style={{ padding: '2px 7px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, background: '#f7fafc', color: '#718096' }}>+{getPermCount(a) - 3} more</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: !(a.isActive ?? true) ? '#fff5f5' : '#f0fff4', color: !(a.isActive ?? true) ? '#e53e3e' : '#76C442' }}>
                          {(a.isActive ?? true) ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="data-table-card">
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons" style={{ color: '#3182ce', fontSize: '20px' }}>timeline</span>
            Activity Log
          </div>
          {logs.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px' }}>
              <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>timeline</span>
              <p style={{ color: '#a0aec0' }}>No recent activity.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {logs.map((log, i) => (
                <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < logs.length - 1 ? '1px solid #f7fafc' : 'none' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#3182ce18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span className="material-icons" style={{ fontSize: '15px', color: '#3182ce' }}>history</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#2d3748', fontWeight: 500 }}>{log.action}</div>
                    <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '2px' }}>{log.module} · {log.timestamp}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="data-table-card">
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-icons" style={{ color: '#805ad5', fontSize: '20px' }}>bar_chart</span>
          Student Overview
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '12px' }}>
          {[
            { label: 'Total',    value: students.length,                                       color: '#2d3748' },
            { label: 'Active',   value: students.filter(s => s.status === 'Active').length,    color: '#76C442' },
            { label: 'Inactive', value: students.filter(s => s.status === 'Inactive').length,  color: '#e53e3e' },
            { label: 'Male',     value: students.filter(s => s.gender === 'Male').length,      color: '#3182ce' },
            { label: 'Female',   value: students.filter(s => s.gender === 'Female').length,    color: '#ed8936' },
          ].map(item => (
            <div key={item.label} style={{ padding: '16px', background: '#f7fafc', borderRadius: '10px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Root export — routes to the correct dashboard based on role
// ═════════════════════════════════════════════════════════════════════════════
export default function SuperAdminDashboard() {
  const { user } = useAuth();
  return user?.role === 'APPLICATION_OWNER' ? <OwnerDashboard /> : <SchoolDashboard />;
}
