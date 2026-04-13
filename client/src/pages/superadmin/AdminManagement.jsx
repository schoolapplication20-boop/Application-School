import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { superAdminAPI } from '../../services/api';
import { addLog } from '../../services/activityLog';
import { useAuth } from '../../context/AuthContext';

const MODULES = [
  { key: 'students',     label: 'Students',          icon: 'school',                 desc: 'Add, edit, view student records' },
  { key: 'teachers',     label: 'Teachers',           icon: 'person',                 desc: 'Manage teacher records' },
  { key: 'classes',      label: 'Classes',            icon: 'class',                  desc: 'Manage classroom data' },
  { key: 'applications', label: 'Applications',       icon: 'assignment_ind',         desc: 'Review admission applications' },
  { key: 'attendance',   label: 'Attendance',         icon: 'fact_check',             desc: 'View attendance reports' },
  { key: 'fees',         label: 'Fees & Payments',    icon: 'payments',               desc: 'Manage fee records' },
  { key: 'collectFee',   label: 'Collect Fee',        icon: 'point_of_sale',          desc: 'Collect fees at counter' },
  { key: 'salaries',     label: 'Salaries',           icon: 'account_balance_wallet', desc: 'Manage teacher salaries' },
  { key: 'expenses',     label: 'Expenses',           icon: 'receipt_long',           desc: 'Track school expenses' },
  { key: 'transport',    label: 'Transport',          icon: 'directions_bus',         desc: 'Manage transport & routes' },
  { key: 'leave',        label: 'Leave Management',   icon: 'event_busy',             desc: 'Student & teacher leave' },
  { key: 'examination',  label: 'Exam & Certificates', icon: 'verified',               desc: 'Hall tickets, certificates & exam schedules' },
  { key: 'timetable',   label: 'Timetable',           icon: 'schedule',               desc: 'View and manage class timetables' },
];

const DEFAULT_PERMS = Object.fromEntries(MODULES.map(m => [m.key, false]));
const emptyForm = { name: '', email: '', mobile: '', permissions: { ...DEFAULT_PERMS } };

export default function AdminManagement() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  // Platform-level SUPER_ADMINs (no school yet) can create other SUPER_ADMINs.
  // School-level SUPER_ADMINs (schoolId != null) manage only their own school.
  const isPlatformAdmin = isSuperAdmin && !user?.schoolId;

  const [admins,       setAdmins]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [showModal,    setShowModal]    = useState(false);
  const [showView,     setShowView]     = useState(false);
  const [editAdmin,    setEditAdmin]    = useState(null);
  const [viewAdmin,    setViewAdmin]    = useState(null);
  const [formData,     setFormData]     = useState(emptyForm);
  const [formErrors,   setFormErrors]   = useState({});
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [toast,        setToast]        = useState(null);
  // Success modal after admin creation (shows generated password)
  const [successModal,  setSuccessModal]  = useState(null); // { name, email, password }
  const [showPassword,  setShowPassword]  = useState(false);
  // Credentials viewer modal (key icon)
  const [credModal,     setCredModal]     = useState(null); // { name, email, tempPassword }
  const [showCredPwd,   setShowCredPwd]   = useState(false);

  // ── Super Admin management (visible only to platform Application Owner) ────
  const [activeTab,      setActiveTab]      = useState('admins'); // 'admins' | 'superadmins'
  const [superAdmins,    setSuperAdmins]    = useState([]);
  const [saLoading,      setSaLoading]      = useState(false);
  const [showSaModal,    setShowSaModal]    = useState(false);
  const [saSaving,       setSaSaving]       = useState(false);
  const [saForm,         setSaForm]         = useState({ name: '', email: '', mobile: '', schoolName: '', schoolCode: '' });
  const [saErrors,       setSaErrors]       = useState({});
  const [saSuccessModal, setSaSuccessModal] = useState(null); // { name, email, password, schoolName, schoolCode }
  const [showSaPassword, setShowSaPassword] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const loadAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await superAdminAPI.getAdmins();
      const data = res.data?.data ?? [];
      setAdmins(Array.isArray(data) ? data : []);
    } catch {
      setAdmins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const loadSuperAdmins = useCallback(async () => {
    if (!isPlatformAdmin) return;
    try {
      setSaLoading(true);
      const res = await superAdminAPI.getSuperAdmins();
      const data = res.data?.data ?? [];
      setSuperAdmins(Array.isArray(data) ? data : []);
    } catch {
      setSuperAdmins([]);
    } finally {
      setSaLoading(false);
    }
  }, [isPlatformAdmin]);

  useEffect(() => { if (isPlatformAdmin) loadSuperAdmins(); }, [isPlatformAdmin, loadSuperAdmins]);

  const filtered = useMemo(() => admins.filter(a => {
    const matchSearch = !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.email.toLowerCase().includes(search.toLowerCase());
    const isActive = a.isActive ?? true;
    const status = isActive ? 'Active' : 'Inactive';
    const matchStatus = !filterStatus || status === filterStatus;
    return matchSearch && matchStatus;
  }), [admins, search, filterStatus]);

  const stats = useMemo(() => ({
    total:    admins.length,
    active:   admins.filter(a => a.isActive ?? true).length,
    inactive: admins.filter(a => !(a.isActive ?? true)).length,
  }), [admins]);

  const togglePerm = (key) => {
    setFormData(fd => ({ ...fd, permissions: { ...fd.permissions, [key]: !fd.permissions[key] } }));
  };

  const toggleAll = (val) => {
    setFormData(fd => ({ ...fd, permissions: Object.fromEntries(MODULES.map(m => [m.key, val])) }));
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Required';
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
      errs.email = 'Valid email required';
    if (!formData.mobile.trim()) errs.mobile = 'Required';
    else if (!/^\d{10}$/.test(formData.mobile)) errs.mobile = 'Must be 10 digits';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (editAdmin) {
        await superAdminAPI.updateAdmin(editAdmin.id, {
          name:        formData.name,
          mobile:      formData.mobile || '',
          permissions: JSON.stringify(formData.permissions),
        });
        addLog('Super Admin', `Updated admin: ${formData.name}`, 'Admin Management');
        showToast('Admin updated successfully');
        setShowModal(false);
        setEditAdmin(null);
        setFormData(emptyForm);
        setFormErrors({});
        loadAdmins();
      } else {
        const res = await superAdminAPI.createAdmin({
          name:        formData.name,
          email:       formData.email,
          mobile:      formData.mobile || '',   // empty string — never send JSON null
          permissions: JSON.stringify(formData.permissions),
        });

        // Guard: only treat as success when the backend explicitly confirms it.
        // A 4xx/5xx throws and goes to catch; this handles an unexpected 2xx with success:false.
        if (!res.data?.success) {
          showToast(res.data?.message || 'Failed to create admin', 'error');
          return;
        }

        const result = res.data?.data;
        if (!result || !result.name || !result.email) {
          showToast('Admin created but server returned incomplete data. Please refresh.', 'error');
          return;
        }

        // Log and show success ONLY after backend confirms the record is persisted.
        addLog('Super Admin', `Created new admin: ${result.name}`, 'Admin Management');
        setShowModal(false);
        setFormData(emptyForm);
        setFormErrors({});
        setShowPassword(false);
        setSuccessModal({
          name:     result.name,
          email:    result.email,
          password: result.generatedPassword || null,
        });
        loadAdmins();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to save admin';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (a) => {
    setEditAdmin(a);
    setFormData({
      name: a.name,
      email: a.email,
      mobile: a.mobile || '',
      permissions: (() => {
        try {
          const p = typeof a.permissions === 'string' ? JSON.parse(a.permissions) : a.permissions;
          return p ? { ...DEFAULT_PERMS, ...p } : { ...DEFAULT_PERMS };
        } catch { return { ...DEFAULT_PERMS }; }
      })(),
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (a) => {
    if (!window.confirm(`Delete admin "${a.name}"? This cannot be undone.`)) return;
    try {
      await superAdminAPI.deleteAdmin(a.id);
      addLog('Super Admin', `Deleted admin: ${a.name}`, 'Admin Management');
      showToast('Admin deleted', 'warning');
      loadAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete admin', 'error');
    }
  };

  const handleToggleStatus = async (a) => {
    const newActive = !(a.isActive ?? true);
    try {
      await superAdminAPI.updateAdmin(a.id, { isActive: newActive });
      addLog('Super Admin', `${newActive ? 'Activated' : 'Deactivated'} admin: ${a.name}`, 'Admin Management');
      showToast(`Admin ${newActive ? 'activated' : 'deactivated'}`);
      loadAdmins();
    } catch (err) {
      showToast('Failed to update status', 'error');
    }
  };

  const getPermCount = (a) => {
    try {
      const p = typeof a.permissions === 'string' ? JSON.parse(a.permissions) : a.permissions;
      return p ? Object.values(p).filter(Boolean).length : MODULES.length;
    } catch { return MODULES.length; }
  };

  const validateSaForm = () => {
    const errs = {};
    if (!saForm.name.trim())        errs.name       = 'Required';
    if (!saForm.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(saForm.email))
      errs.email = 'Valid email required';
    if (!saForm.mobile.trim())      errs.mobile     = 'Required';
    else if (!/^\d{10}$/.test(saForm.mobile)) errs.mobile = 'Must be 10 digits';
    if (!saForm.schoolName.trim())  errs.schoolName = 'School name is required';
    if (!saForm.schoolCode.trim())  errs.schoolCode = 'School code is required';
    else if (!/^[A-Z0-9]{2,10}$/i.test(saForm.schoolCode.trim()))
      errs.schoolCode = 'Code: 2–10 alphanumeric characters';
    setSaErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateSuperAdmin = async () => {
    if (!validateSaForm()) return;
    setSaSaving(true);
    try {
      const res = await superAdminAPI.createSuperAdmin({
        name:       saForm.name.trim(),
        email:      saForm.email.trim().toLowerCase(),
        mobile:     saForm.mobile.trim(),
        schoolName: saForm.schoolName.trim(),
        schoolCode: saForm.schoolCode.trim().toUpperCase(),
      });
      if (!res.data?.success) {
        showToast(res.data?.message || 'Failed to create Super Admin', 'error');
        return;
      }
      const result = res.data?.data;
      setShowSaModal(false);
      setSaForm({ name: '', email: '', mobile: '', schoolName: '', schoolCode: '' });
      setSaErrors({});
      setShowSaPassword(false);
      setSaSuccessModal({
        name:       result.name,
        email:      result.email,
        password:   result.generatedPassword || null,
        schoolName: saForm.schoolName.trim(),
        schoolCode: saForm.schoolCode.trim().toUpperCase(),
      });
      loadSuperAdmins();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create Super Admin', 'error');
    } finally {
      setSaSaving(false);
    }
  };

  const iStyle = (err) => ({
    padding: '10px 12px',
    border: `1.5px solid ${err ? '#e53e3e' : '#e2e8f0'}`,
    borderRadius: '8px',
    fontSize: '13px',
    width: '100%',
    outline: 'none',
    fontFamily: 'Poppins, sans-serif',
    boxSizing: 'border-box',
  });
  const errStyle = { fontSize: '11px', color: '#e53e3e', marginTop: '4px' };

  return (
    <Layout pageTitle="Admin Management">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Admin Management</h1>
          <p>{isPlatformAdmin
            ? 'Manage school admins and create Super Admins for new schools'
            : 'Create and manage admin accounts with role-based permissions'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {activeTab === 'admins' ? (
            <button className="btn-add" onClick={() => { setEditAdmin(null); setFormData(emptyForm); setFormErrors({}); setShowModal(true); }}>
              <span className="material-icons">add</span> Add Admin
            </button>
          ) : (
            <button className="btn-add" style={{ background: 'linear-gradient(135deg,#7c3aed,#553c9a)' }}
              onClick={() => { setSaForm({ name: '', email: '', mobile: '', schoolName: '', schoolCode: '' }); setSaErrors({}); setShowSaModal(true); }}>
              <span className="material-icons">add</span> Add Super Admin
            </button>
          )}
        </div>
      </div>

      {/* Tab bar — only shown to Application Owner (platform admin) */}
      {isPlatformAdmin && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
          {[
            { id: 'admins',      label: 'School Admins',   icon: 'manage_accounts' },
            { id: 'superadmins', label: 'Super Admins',    icon: 'admin_panel_settings' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '10px 20px', border: 'none', cursor: 'pointer', fontWeight: 700,
                fontSize: '13px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', gap: '6px',
                background: activeTab === tab.id ? '#fff' : 'transparent',
                color:      activeTab === tab.id ? '#7c3aed' : '#718096',
                borderBottom: activeTab === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
                marginBottom: '-2px',
              }}>
              <span className="material-icons" style={{ fontSize: '16px' }}>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* ── SUPER ADMINS TAB ─────────────────────────────────────────────────── */}
      {activeTab === 'superadmins' && isPlatformAdmin && (
        <>
          {/* Super Admin Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Super Admins', value: superAdmins.length, color: '#7c3aed', icon: 'admin_panel_settings' },
              { label: 'Setup Complete', value: superAdmins.filter(s => !s.needsSchoolSetup).length, color: '#3182ce', icon: 'check_circle' },
              { label: 'Setup Pending', value: superAdmins.filter(s => s.needsSchoolSetup).length, color: '#d97706', icon: 'pending' },
            ].map(c => (
              <div key={c.label} className="stat-card">
                <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
                  <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
                </div>
                <div className="stat-value">{c.value}</div>
                <div className="stat-label">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Info banner */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 16px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '10px', marginBottom: '20px' }}>
            <span className="material-icons" style={{ color: '#7c3aed', fontSize: '18px', marginTop: '1px', flexShrink: 0 }}>info</span>
            <div style={{ fontSize: '13px', color: '#4c1d95', lineHeight: '1.5' }}>
              <strong>Application Owner</strong> — only you can create Super Admin accounts.
              Each Super Admin is linked to a school (identified by school code) and must complete
              their school setup wizard on first login before accessing the dashboard.
            </div>
          </div>

          {/* Super Admins Table */}
          <div className="data-table-card">
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Super Admin</th>
                    <th>School</th>
                    <th>School Code</th>
                    <th>Setup Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {saLoading ? (
                    <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>Loading...</td></tr>
                  ) : superAdmins.length === 0 ? (
                    <tr><td colSpan={5}>
                      <div className="empty-state" style={{ padding: '40px' }}>
                        <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>admin_panel_settings</span>
                        <h3 style={{ color: '#a0aec0' }}>No Super Admins yet</h3>
                        <p style={{ color: '#cbd5e0' }}>Click "Add Super Admin" to create one.</p>
                      </div>
                    </td></tr>
                  ) : superAdmins.map(sa => (
                    <tr key={sa.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#553c9a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                            {sa.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '13px', color: '#2d3748' }}>{sa.name}</div>
                            <div style={{ fontSize: '11px', color: '#a0aec0' }}>{sa.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: '#2d3748', fontWeight: 600 }}>
                        {sa.schoolName || <span style={{ color: '#a0aec0' }}>—</span>}
                      </td>
                      <td>
                        {sa.schoolCode ? (
                          <span style={{ padding: '2px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700, background: '#ede9fe', color: '#7c3aed', fontFamily: 'monospace', letterSpacing: '0.06em' }}>{sa.schoolCode}</span>
                        ) : <span style={{ color: '#a0aec0', fontSize: '12px' }}>—</span>}
                      </td>
                      <td>
                        <span style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: sa.needsSchoolSetup ? '#fffbeb' : '#f0fff4', color: sa.needsSchoolSetup ? '#d97706' : '#38a169' }}>
                          {sa.needsSchoolSetup ? 'Pending Setup' : 'Setup Complete'}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#718096' }}>
                        {sa.createdAt ? new Date(sa.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SCHOOL ADMINS TAB ────────────────────────────────────────────────── */}
      {activeTab === 'admins' && (
      <>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Admins', value: stats.total,    color: '#76C442', icon: 'manage_accounts' },
          { label: 'Active',       value: stats.active,   color: '#3182ce', icon: 'check_circle' },
          { label: 'Inactive',     value: stats.inactive, color: '#e53e3e', icon: 'cancel' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="data-table-card">
        <div className="search-filter-bar">
          <div className="search-input-wrapper">
            <span className="material-icons">search</span>
            <input type="text" className="search-input" placeholder="Search admins..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Admin</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>Loading admins...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state" style={{ padding: '40px' }}>
                    <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>manage_accounts</span>
                    <h3 style={{ color: '#a0aec0' }}>No admins found</h3>
                    <p style={{ color: '#cbd5e0' }}>Click "Add Admin" to create one.</p>
                  </div>
                </td></tr>
              ) : filtered.map(a => {
                const isActive = a.isActive ?? true;
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>
                          {a.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#2d3748' }}>{a.name}</div>
                          <div style={{ fontSize: '11px', color: '#a0aec0' }}>{a.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '12px', color: '#718096' }}>
                      {a.mobile ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icons" style={{ fontSize: '13px', color: '#a0aec0' }}>phone</span>
                          {a.mobile}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <button onClick={() => handleToggleStatus(a)} style={{ padding: '3px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: 'none', cursor: 'pointer', background: isActive ? '#f0fff4' : '#fff5f5', color: isActive ? '#76C442' : '#e53e3e' }}>
                        {isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ fontSize: '12px', color: '#718096' }}>
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn action-btn-view" title="View" onClick={() => { setViewAdmin(a); setShowView(true); }}>
                          <span className="material-icons">visibility</span>
                        </button>
                        {/* Key icon — only visible to SUPER_ADMIN */}
                        {isSuperAdmin && (
                          <button
                            title={a.tempPassword ? 'View Login Credentials' : 'Password already changed by user'}
                            onClick={() => { setShowCredPwd(false); setCredModal({ name: a.name, email: a.email, tempPassword: a.tempPassword }); }}
                            style={{ padding: '6px', border: '1.5px solid', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', background: a.tempPassword ? '#fffbeb' : '#f7fafc', borderColor: a.tempPassword ? '#f6c93e' : '#e2e8f0' }}>
                            <span className="material-icons" style={{ fontSize: '16px', color: a.tempPassword ? '#d97706' : '#a0aec0' }}>key</span>
                          </button>
                        )}
                        <button className="action-btn action-btn-edit" title="Edit" onClick={() => handleEdit(a)}>
                          <span className="material-icons">edit</span>
                        </button>
                        <button className="action-btn action-btn-delete" title="Delete" onClick={() => handleDelete(a)}>
                          <span className="material-icons">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      </>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <span className="modal-title">{editAdmin ? 'Edit Admin' : 'Add New Admin'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>

              {/* Basic Info */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="material-icons" style={{ color: '#76C442', fontSize: '16px' }}>person</span> Account Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                    <input style={iStyle(formErrors.name)} placeholder="Admin's full name" value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })} />
                    {formErrors.name && <p style={errStyle}>{formErrors.name}</p>}
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>
                      Email Address {editAdmin ? '' : '*'}
                    </label>
                    <input type="email" style={iStyle(formErrors.email)} placeholder="admin@school.com"
                      value={formData.email} disabled={!!editAdmin}
                      onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    {formErrors.email && <p style={errStyle}>{formErrors.email}</p>}
                  </div>
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>
                      Phone Number *
                    </label>
                    <input type="tel" style={iStyle(formErrors.mobile)} placeholder="10-digit mobile" maxLength={10}
                      value={formData.mobile}
                      onChange={e => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                    {formErrors.mobile && <p style={errStyle}>{formErrors.mobile}</p>}
                  </div>
                  {!editAdmin && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', gap: '8px' }}>
                      <span className="material-icons" style={{ fontSize: '18px', color: '#d97706' }}>lock</span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 700, color: '#92400e' }}>Auto-generated password</div>
                        <div style={{ fontSize: '11px', color: '#b45309' }}>A secure password will be shown after creation</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons" style={{ color: '#76C442', fontSize: '16px' }}>lock</span>
                    Module Permissions
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => toggleAll(true)} style={{ padding: '4px 10px', border: '1px solid #76C442', borderRadius: '6px', background: '#f0fff4', color: '#76C442', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Enable All</button>
                    <button type="button" onClick={() => toggleAll(false)} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', color: '#718096', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>Disable All</button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {MODULES.map(m => {
                    const enabled = formData.permissions[m.key];
                    return (
                      <div key={m.key} onClick={() => togglePerm(m.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', border: `1.5px solid ${enabled ? '#76C442' : '#e2e8f0'}`, borderRadius: '10px', cursor: 'pointer', background: enabled ? '#f0fff4' : '#fafafa', transition: 'all 0.15s', userSelect: 'none' }}>
                        <div style={{ width: 32, height: 32, borderRadius: '8px', background: enabled ? '#76C44220' : '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-icons" style={{ fontSize: '16px', color: enabled ? '#76C442' : '#a0aec0' }}>{m.icon}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', fontWeight: 700, color: enabled ? '#276749' : '#4a5568' }}>{m.label}</div>
                          <div style={{ fontSize: '10px', color: '#a0aec0' }}>{m.desc}</div>
                        </div>
                        <div style={{ width: '36px', height: '20px', borderRadius: '10px', background: enabled ? '#76C442' : '#e2e8f0', position: 'relative', flexShrink: 0, transition: 'background 0.2s' }}>
                          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#fff', position: 'absolute', top: '2px', left: enabled ? '18px' : '2px', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowModal(false); setEditAdmin(null); setFormData(emptyForm); setFormErrors({}); }}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '10px 24px', background: saving ? '#a0aec0' : '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Saving...' : (editAdmin ? 'Update Admin' : 'Create Admin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal — shows generated credentials after admin creation */}
      {successModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>

            {/* Header */}
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,#76C442,#5fa832)', borderRadius: '12px 12px 0 0' }}>
              <span className="modal-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons">check_circle</span> Admin Created Successfully
              </span>
              <button className="modal-close" onClick={() => { setSuccessModal(null); setShowPassword(false); }} style={{ color: '#fff' }}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>

              {/* Admin avatar + intro */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', padding: '14px', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '12px' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
                  {successModal.name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#276749' }}>{successModal.name}</div>
                  <div style={{ fontSize: '12px', color: '#48bb78' }}>Admin account created — share credentials below</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                {/* Name */}
                <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Name</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>{successModal.name}</div>
                </div>

                {/* Email */}
                <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email (Login ID)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="material-icons" style={{ fontSize: '17px', color: '#76C442', flexShrink: 0 }}>email</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748', flex: 1, wordBreak: 'break-all' }}>{successModal.email}</span>
                    <button onClick={() => { navigator.clipboard.writeText(successModal.email); showToast('Email copied!'); }} title="Copy email"
                      style={{ padding: '5px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>content_copy</span>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div style={{ background: successModal.password ? '#fffbeb' : '#f7fafc', border: `1px solid ${successModal.password ? '#fcd34d' : '#e2e8f0'}`, borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Generated Password</div>
                  {successModal.password ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="material-icons" style={{ fontSize: '17px', color: '#d97706', flexShrink: 0 }}>lock</span>
                      <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#92400e', fontFamily: 'monospace', letterSpacing: '0.12em', wordBreak: 'break-all' }}>
                        {showPassword ? successModal.password : '•'.repeat(successModal.password.length)}
                      </span>
                      <button onClick={() => setShowPassword(v => !v)} title={showPassword ? 'Hide password' : 'Show password'}
                        style={{ padding: '5px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(successModal.password); showToast('Password copied!'); }} title="Copy password"
                        style={{ padding: '5px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>content_copy</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-icons" style={{ fontSize: '17px', color: '#48bb78' }}>check_circle</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#718096' }}>Password has been changed by the user</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning note — only when password is present */}
              {successModal.password && (
                <div style={{ marginTop: '14px', padding: '10px 12px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', fontSize: '12px', color: '#c53030', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <span className="material-icons" style={{ fontSize: '15px', marginTop: '1px', flexShrink: 0 }}>warning</span>
                  <span>This password will not be shown again. Copy it before closing this dialog.</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => { setSuccessModal(null); setShowPassword(false); }}
                style={{ padding: '10px 32px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showView && viewAdmin && (() => {
        let viewPerms = {};
        try {
          const p = typeof viewAdmin.permissions === 'string' ? JSON.parse(viewAdmin.permissions) : viewAdmin.permissions;
          viewPerms = p ? { ...DEFAULT_PERMS, ...p } : { ...DEFAULT_PERMS };
        } catch { viewPerms = { ...DEFAULT_PERMS }; }
        const enabledCount = Object.values(viewPerms).filter(Boolean).length;
        return (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowView(false)}>
            <div className="modal-container" style={{ maxWidth: 520 }}>
              <div className="modal-header">
                <span className="modal-title">Admin Details</span>
                <button className="modal-close" onClick={() => setShowView(false)}><span className="material-icons">close</span></button>
              </div>
              <div className="modal-body" style={{ padding: '20px 24px', maxHeight: '72vh', overflowY: 'auto' }}>
                {/* Admin info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px', background: '#f7fafc', borderRadius: '12px', marginBottom: '20px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '17px', fontWeight: 700, flexShrink: 0 }}>
                    {viewAdmin.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748' }}>{viewAdmin.name}</div>
                    <div style={{ fontSize: '12px', color: '#a0aec0' }}>{viewAdmin.email}</div>
                    {viewAdmin.mobile && (
                      <div style={{ fontSize: '12px', color: '#718096', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                        <span className="material-icons" style={{ fontSize: '12px' }}>phone</span>
                        {viewAdmin.mobile}
                      </div>
                    )}
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, background: (viewAdmin.isActive ?? true) ? '#f0fff4' : '#fff5f5', color: (viewAdmin.isActive ?? true) ? '#76C442' : '#e53e3e', display: 'inline-block', marginTop: '4px' }}>
                      {(viewAdmin.isActive ?? true) ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>

                {/* Module Permissions */}
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="material-icons" style={{ color: '#76C442', fontSize: '16px' }}>lock</span>
                      Module Permissions
                    </div>
                    <span style={{ padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: '#76C44220', color: '#276749' }}>
                      {enabledCount} / {MODULES.length} enabled
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {MODULES.map(m => {
                      const enabled = viewPerms[m.key];
                      return (
                        <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', border: `1.5px solid ${enabled ? '#76C442' : '#e2e8f0'}`, borderRadius: '10px', background: enabled ? '#f0fff4' : '#fafafa' }}>
                          <div style={{ width: 28, height: 28, borderRadius: '7px', background: enabled ? '#76C44220' : '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-icons" style={{ fontSize: '15px', color: enabled ? '#76C442' : '#cbd5e0' }}>{m.icon}</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: enabled ? '#276749' : '#a0aec0', flex: 1, minWidth: 0 }}>{m.label}</span>
                          <span className="material-icons" style={{ fontSize: '16px', color: enabled ? '#76C442' : '#e2e8f0', flexShrink: 0 }}>
                            {enabled ? 'check_circle' : 'cancel'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowView(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Close</button>
                <button onClick={() => { setShowView(false); handleEdit(viewAdmin); }} style={{ padding: '10px 20px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Edit Admin</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Login Credentials Modal — only rendered for SUPER_ADMIN */}
      {isSuperAdmin && credModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setCredModal(null)}>
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ background: credModal.tempPassword ? 'linear-gradient(135deg,#d97706,#f59e0b)' : 'linear-gradient(135deg,#718096,#a0aec0)', borderRadius: '12px 12px 0 0' }}>
              <span className="modal-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons">key</span> Login Credentials
              </span>
              <button className="modal-close" onClick={() => { setCredModal(null); setShowCredPwd(false); }} style={{ color: '#fff' }}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Admin info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', padding: '12px', background: '#f7fafc', borderRadius: '10px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>
                  {credModal.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#2d3748' }}>{credModal.name}</div>
                  <div style={{ fontSize: '12px', color: '#718096' }}>Admin Account</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Email */}
                <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Email (Login ID)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="material-icons" style={{ fontSize: '18px', color: '#76C442' }}>email</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748', flex: 1 }}>{credModal.email}</span>
                    <button onClick={() => { navigator.clipboard.writeText(credModal.email); showToast('Email copied!'); }}
                      style={{ padding: '4px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                      <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>content_copy</span>
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div style={{ background: credModal.tempPassword ? '#fffbeb' : '#f7fafc', border: `1px solid ${credModal.tempPassword ? '#fcd34d' : '#e2e8f0'}`, borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Generated Password
                  </div>
                  {credModal.tempPassword ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="material-icons" style={{ fontSize: '18px', color: '#d97706' }}>lock</span>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#92400e', fontFamily: 'monospace', letterSpacing: '0.12em', flex: 1 }}>
                        {showCredPwd ? credModal.tempPassword : '•'.repeat(credModal.tempPassword.length)}
                      </span>
                      <button onClick={() => setShowCredPwd(v => !v)} title={showCredPwd ? 'Hide' : 'Show'}
                        style={{ padding: '4px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>
                          {showCredPwd ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(credModal.tempPassword); showToast('Password copied!'); }}
                        style={{ padding: '4px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>content_copy</span>
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#718096' }}>
                      <span className="material-icons" style={{ fontSize: '18px', color: '#48bb78' }}>check_circle</span>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>Password has been changed by the user</span>
                    </div>
                  )}
                </div>
              </div>

              {credModal.tempPassword && (
                <div style={{ marginTop: '14px', padding: '10px 12px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', fontSize: '12px', color: '#c53030', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                  <span className="material-icons" style={{ fontSize: '15px', marginTop: '1px', flexShrink: 0 }}>info</span>
                  This is the system-generated password. It will no longer be visible once the admin changes it.
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => { setCredModal(null); setShowCredPwd(false); }}
                style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Create Super Admin Modal ──────────────────────────────────────────── */}
      {showSaModal && isPlatformAdmin && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSaModal(false)}>
          <div className="modal-container" style={{ maxWidth: 540 }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,#7c3aed,#553c9a)', borderRadius: '12px 12px 0 0' }}>
              <span className="modal-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons">admin_panel_settings</span> Create Super Admin
              </span>
              <button className="modal-close" onClick={() => setShowSaModal(false)} style={{ color: '#fff' }}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>

              {/* Role info */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '10px 14px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '10px', marginBottom: '20px' }}>
                <span className="material-icons" style={{ color: '#7c3aed', fontSize: '17px', marginTop: '1px', flexShrink: 0 }}>info</span>
                <div style={{ fontSize: '12px', color: '#4c1d95', lineHeight: '1.5' }}>
                  A Super Admin account will be created and linked to a new school identified by the school code below.
                  The Super Admin must complete the school setup wizard on first login.
                </div>
              </div>

              {/* Account Details section */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons" style={{ color: '#7c3aed', fontSize: '16px' }}>person</span> Account Details
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Full Name *</label>
                  <input style={iStyle(saErrors.name)} placeholder="Super Admin name" value={saForm.name}
                    onChange={e => { setSaForm(f => ({ ...f, name: e.target.value })); setSaErrors(p => ({ ...p, name: undefined })); }} />
                  {saErrors.name && <p style={errStyle}>{saErrors.name}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Email Address *</label>
                  <input type="email" style={iStyle(saErrors.email)} placeholder="superadmin@school.com" value={saForm.email}
                    onChange={e => { setSaForm(f => ({ ...f, email: e.target.value })); setSaErrors(p => ({ ...p, email: undefined })); }} />
                  {saErrors.email && <p style={errStyle}>{saErrors.email}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Phone Number *</label>
                  <input type="tel" style={iStyle(saErrors.mobile)} placeholder="10-digit mobile" maxLength={10}
                    value={saForm.mobile}
                    onChange={e => { setSaForm(f => ({ ...f, mobile: e.target.value.replace(/\D/g, '').slice(0,10) })); setSaErrors(p => ({ ...p, mobile: undefined })); }} />
                  {saErrors.mobile && <p style={errStyle}>{saErrors.mobile}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '8px', gap: '8px' }}>
                  <span className="material-icons" style={{ fontSize: '18px', color: '#7c3aed' }}>lock</span>
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#4c1d95' }}>Auto-generated password</div>
                    <div style={{ fontSize: '11px', color: '#7c3aed' }}>Shown after creation — share securely</div>
                  </div>
                </div>
              </div>

              {/* School Details section */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons" style={{ color: '#7c3aed', fontSize: '16px' }}>school</span> School Assignment
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>School Name *</label>
                  <input style={iStyle(saErrors.schoolName)} placeholder="e.g. Springfield High School" value={saForm.schoolName}
                    onChange={e => { setSaForm(f => ({ ...f, schoolName: e.target.value })); setSaErrors(p => ({ ...p, schoolName: undefined })); }} />
                  {saErrors.schoolName && <p style={errStyle}>{saErrors.schoolName}</p>}
                </div>
                <div>
                  <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>School Code / ID *</label>
                  <input style={iStyle(saErrors.schoolCode)} placeholder="e.g. SPRHS (2–10 chars)"
                    value={saForm.schoolCode}
                    onChange={e => { setSaForm(f => ({ ...f, schoolCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })); setSaErrors(p => ({ ...p, schoolCode: undefined })); }} />
                  {saErrors.schoolCode && <p style={errStyle}>{saErrors.schoolCode}</p>}
                  <p style={{ fontSize: '11px', color: '#a0aec0', marginTop: '3px' }}>Alphanumeric, unique identifier for this school</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowSaModal(false)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleCreateSuperAdmin} disabled={saSaving}
                style={{ padding: '10px 24px', background: saSaving ? '#a0aec0' : 'linear-gradient(135deg,#7c3aed,#553c9a)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: saSaving ? 'not-allowed' : 'pointer' }}>
                {saSaving ? 'Creating...' : 'Create Super Admin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Super Admin Success Modal ──────────────────────────────────────────── */}
      {saSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,#7c3aed,#553c9a)', borderRadius: '12px 12px 0 0' }}>
              <span className="modal-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-icons">check_circle</span> Super Admin Created
              </span>
              <button className="modal-close" onClick={() => { setSaSuccessModal(null); setShowSaPassword(false); }} style={{ color: '#fff' }}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px', padding: '14px', background: '#ede9fe', border: '1px solid #c4b5fd', borderRadius: '12px' }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#553c9a)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
                  {saSuccessModal.name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: '#4c1d95' }}>{saSuccessModal.name}</div>
                  <div style={{ fontSize: '12px', color: '#7c3aed' }}>
                    Super Admin · School: <strong>{saSuccessModal.schoolCode}</strong>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>School</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>{saSuccessModal.schoolName}</div>
                  <div style={{ fontSize: '12px', color: '#718096', marginTop: '2px' }}>Code: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#7c3aed' }}>{saSuccessModal.schoolCode}</span></div>
                </div>
                <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px 16px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email (Login ID)</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="material-icons" style={{ fontSize: '17px', color: '#7c3aed', flexShrink: 0 }}>email</span>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748', flex: 1, wordBreak: 'break-all' }}>{saSuccessModal.email}</span>
                    <button onClick={() => { navigator.clipboard.writeText(saSuccessModal.email); showToast('Email copied!'); }} title="Copy"
                      style={{ padding: '5px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                      <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>content_copy</span>
                    </button>
                  </div>
                </div>
                {saSuccessModal.password && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '10px', padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#a0aec0', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Generated Password</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="material-icons" style={{ fontSize: '17px', color: '#d97706', flexShrink: 0 }}>lock</span>
                      <span style={{ flex: 1, fontSize: '15px', fontWeight: 700, color: '#92400e', fontFamily: 'monospace', letterSpacing: '0.12em', wordBreak: 'break-all' }}>
                        {showSaPassword ? saSuccessModal.password : '•'.repeat(saSuccessModal.password.length)}
                      </span>
                      <button onClick={() => setShowSaPassword(v => !v)}
                        style={{ padding: '5px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>{showSaPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(saSuccessModal.password); showToast('Password copied!'); }}
                        style={{ padding: '5px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                        <span className="material-icons" style={{ fontSize: '15px', color: '#718096' }}>content_copy</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ marginTop: '14px', padding: '10px 12px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px', fontSize: '12px', color: '#c53030', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span className="material-icons" style={{ fontSize: '15px', marginTop: '1px', flexShrink: 0 }}>warning</span>
                <span>Share these credentials securely. The Super Admin must complete school setup on first login. Password will not be shown again.</span>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setSaSuccessModal(null); setShowSaPassword(false); }}
                style={{ padding: '10px 32px', background: 'linear-gradient(135deg,#7c3aed,#553c9a)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
