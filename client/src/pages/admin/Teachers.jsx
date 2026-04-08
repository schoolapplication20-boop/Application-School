import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import {
  fetchTeachers as apiFetchTeachers,
  createTeacher as apiCreateTeacher,
  updateTeacher as apiUpdateTeacher,
  resetTeacherPassword as apiResetTeacherPassword,
  deleteTeacher as apiDeleteTeacher,
} from '../../services/teacherService';
import { adminAPI } from '../../services/api';
import { generateRandomPassword } from '../../utils/passwordGenerator';

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECTS = ['Mathematics','Science','English','Social Studies','Hindi','Computer Science','Biology','Chemistry','Physics','Accountancy','Economics','Commerce'];

const SUBJECT_COLOR = {
  Mathematics: '#76C442', Science: '#3182ce', English: '#805ad5',
  'Social Studies': '#e53e3e', Hindi: '#ed8936', 'Computer Science': '#38b2ac',
  Biology: '#d69e2e', Chemistry: '#e91e63', Physics: '#667eea',
  Accountancy: '#48bb78', Economics: '#ed64a6', Commerce: '#f6ad55',
};

const EMPTY_FORM = {
  name: '', empId: '', subject: '', department: '', qualification: '',
  experience: '', joining: '', mobile: '', email: '', classes: '', status: 'Active',
  idProof: '', idProofName: '', otherDoc: '', otherDocName: '',
  password: '',
  teacherType: 'SUBJECT_TEACHER',
  primaryClassId: '',
};

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inputStyle = (hasError) => ({
  width: '100%', padding: '9px 12px', fontSize: '13px', fontFamily: 'Poppins, sans-serif',
  border: `1.5px solid ${hasError ? '#e53e3e' : '#e2e8f0'}`, borderRadius: '8px',
  outline: 'none', boxSizing: 'border-box', color: '#2d3748', background: '#fff',
  transition: 'border-color 0.2s',
});
const labelStyle = { fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '5px' };
const errStyle   = { fontSize: '11px', color: '#e53e3e', marginTop: '4px' };

const Col2 = ({ children }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>{children}</div>
);

const Field = ({ label, required, optional, error, children }) => (
  <div>
    <label style={labelStyle}>
      {label}{required && ' *'}
      {optional && <span style={{ fontWeight: 400, color: '#a0aec0', fontSize: '11px' }}> (Optional)</span>}
    </label>
    {children}
    {error && <p style={errStyle}>{error}</p>}
  </div>
);

// ─── Section divider ──────────────────────────────────────────────────────────
const Section = ({ icon, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 12px', paddingBottom: 8, borderBottom: '1.5px solid #f0f4f8' }}>
    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#76C44218', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span className="material-icons" style={{ fontSize: 15, color: '#76C442' }}>{icon}</span>
    </div>
    <span style={{ fontWeight: 700, fontSize: 12, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
  </div>
);

// ─── Credential Card ──────────────────────────────────────────────────────────
function CredentialCard({ label, value, mono }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div style={{ background: '#f7fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, marginBottom: 2 }}>{label}</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#2d3748', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
      </div>
      <button onClick={copy} title="Copy" style={{ border: 'none', background: copied ? '#f0fff4' : '#e2e8f0', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: copied ? '#76C442' : '#718096', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: 'Poppins, sans-serif', flexShrink: 0, transition: 'all 0.2s' }}>
        <span className="material-icons" style={{ fontSize: 15 }}>{copied ? 'check' : 'content_copy'}</span>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Teachers() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // ── State ──────────────────────────────────────────────────────────────────
  const [teachers,       setTeachers]       = useState([]);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('All');
  const [filterSubject,  setFilterSubject]  = useState('');

  // modals
  const [showModal,      setShowModal]      = useState(false);
  const [editTeacher,    setEditTeacher]    = useState(null);
  const [showView,       setShowView]       = useState(false);
  const [viewTeacher,    setViewTeacher]    = useState(null);
  const [showAssign,     setShowAssign]     = useState(false);
  const [assignTarget,   setAssignTarget]   = useState(null);
  const [assignClasses,  setAssignClasses]  = useState([]);
  const [showCred,       setShowCred]       = useState(false);   // after-add credentials
  const [newCredential,  setNewCredential]  = useState(null);    // { name, email, password }
  const [showViewCred,   setShowViewCred]   = useState(false);   // view existing creds
  const [viewCredTarget, setViewCredTarget] = useState(null);
  const [showReset,      setShowReset]      = useState(false);   // reset password
  const [resetTarget,    setResetTarget]    = useState(null);
  const [resetPwd,       setResetPwd]       = useState('');
  const [deleteId,       setDeleteId]       = useState(null);

  // form
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});
  const [toast,     setToast]     = useState(null);
  const [classList, setClassList] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Load teachers and classes on mount ────────────────────────────────────
  useEffect(() => {
    apiFetchTeachers().then(data => {
      if (data && data.length > 0) setTeachers(data);
    });
    adminAPI.getClasses().then(res => {
      const list = res.data?.data ?? [];
      setClassList(list);
    }).catch(() => {});
  }, []);

  const persist = (list) => { setTeachers(list); };

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = teachers.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (t.name || '').toLowerCase().includes(q) ||
      (t.email || '').toLowerCase().includes(q) ||
      (t.empId || '').toLowerCase().includes(q) ||
      (t.subject || '').toLowerCase().includes(q);
    const matchStatus  = filterStatus === 'All' || t.status === filterStatus;
    const matchSubject = !filterSubject || t.subject === filterSubject;
    return matchSearch && matchStatus && matchSubject;
  });

  const getInitials = (name) =>
    (name || 'T').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.name.trim())    e.name    = 'Full name is required';
    if (!form.empId.trim())   e.empId   = 'Employee ID is required';
    if (!form.subject.trim()) e.subject = 'Subject is required';

    if (!form.email.trim()) {
      e.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address';
    }

    if (form.mobile && !/^\d{10}$/.test(form.mobile))
      e.mobile = 'Mobile must be exactly 10 digits';

    if (!editTeacher) {
      if (!form.password.trim())        e.password = 'Password is required';
      else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    }

    if ((form.teacherType === 'CLASS_TEACHER' || form.teacherType === 'BOTH') && !form.primaryClassId)
      e.primaryClassId = 'Please select the primary class for this teacher';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (editTeacher) {
      // ── Edit ──────────────────────────────────────────────────────────────
      const result = await apiUpdateTeacher(editTeacher.id, {
        name:           form.name,
        email:          form.email,
        mobile:         form.mobile,
        subject:        form.subject,
        department:     form.department,
        classes:        form.classes,
        qualification:  form.qualification,
        experience:     form.experience,
        joiningDate:    form.joining,
        status:         form.status,
        idProof:        form.idProof,
        idProofName:    form.idProofName,
        otherDoc:       form.otherDoc,
        otherDocName:   form.otherDocName,
        teacherType:    form.teacherType,
        primaryClassId: (form.teacherType === 'CLASS_TEACHER' || form.teacherType === 'BOTH') ? (form.primaryClassId ? Number(form.primaryClassId) : null) : null,
      });
      if (!result.success) { showToast(result.message || 'Failed to update teacher', 'error'); return; }
      const updated = teachers.map(t => t.id === editTeacher.id ? { ...t, ...form } : t);
      persist(updated);
      showToast('Teacher updated successfully');
      setShowModal(false);

    } else {
      // ── Add ───────────────────────────────────────────────────────────────
      const result = await apiCreateTeacher({
        name:           form.name,
        email:          form.email,
        mobile:         form.mobile,
        empId:          form.empId,
        subject:        form.subject,
        department:     form.department,
        qualification:  form.qualification,
        experience:     form.experience,
        joiningDate:    form.joining,
        classes:        form.classes,
        status:         form.status,
        idProof:        form.idProof,
        idProofName:    form.idProofName,
        otherDoc:       form.otherDoc,
        otherDocName:   form.otherDocName,
        password:       form.password,
        teacherType:    form.teacherType,
        primaryClassId: (form.teacherType === 'CLASS_TEACHER' || form.teacherType === 'BOTH') ? (form.primaryClassId ? Number(form.primaryClassId) : null) : null,
      });
      if (!result.success) { showToast(result.message || 'Failed to add teacher', 'error'); return; }

      const backendData = result.data || {};
      const newTeacher = {
        id:          backendData.id  || Date.now(),
        userId:      backendData.userId || null,
        ...form,
        empId:       backendData.empId || form.empId,
        createdAt:   new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
        createdBy:   user?.name || 'Super Admin',
      };

      persist([...teachers, newTeacher]);

      // Show credentials popup with the password the admin set
      setNewCredential({ name: form.name, email: form.email, password: form.password });
      setShowModal(false);
      setShowCred(true);
      showToast('Teacher added successfully. Login credentials generated.');
    }

    setForm(EMPTY_FORM);
    setErrors({});
    setEditTeacher(null);
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await apiDeleteTeacher(id);
    persist(teachers.filter(x => x.id !== id));
    setDeleteId(null);
    showToast('Teacher removed', 'warning');
  };

  // ── Reset Password ────────────────────────────────────────────────────────
  const handleOpenReset = (t) => {
    setResetTarget(t);
    setResetPwd(generateRandomPassword());
    setShowReset(true);
  };

  const handleConfirmReset = async () => {
    if (!resetPwd.trim()) return;
    const result = await apiResetTeacherPassword(resetTarget.id, resetPwd);
    if (!result.success) {
      showToast(result.message || 'Failed to reset password', 'error');
      return;
    }
    // Show the new credentials to the admin in the same credential popup
    setNewCredential({ name: resetTarget.name, email: resetTarget.email, password: result.newPassword });
    setShowReset(false);
    setResetTarget(null);
    setShowCred(true);
    showToast(`Password reset for ${resetTarget.name}. Share new credentials with the teacher.`);
  };

  // ── Assign Classes ────────────────────────────────────────────────────────
  const handleSaveAssign = () => {
    const updated = teachers.map(t =>
      t.id === assignTarget.id ? { ...t, classes: assignClasses.join(', ') } : t
    );
    persist(updated);
    setShowAssign(false);
    showToast('Classes assigned successfully');
  };

  // ── Open modals ───────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditTeacher(null);
    setForm({ ...EMPTY_FORM, password: generateRandomPassword() });
    setErrors({});
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditTeacher(t);
    setForm({
      ...EMPTY_FORM, ...t,
      teacherType:    t.teacherType    || 'SUBJECT_TEACHER',
      primaryClassId: t.primaryClassId ? String(t.primaryClassId) : '',
    });
    setErrors({});
    setShowModal(true);
  };

  const openViewCred = (t) => {
    setViewCredTarget({ ...t, password: '••••••••' });
    setShowViewCred(true);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = [
    { label: 'Total Teachers', value: teachers.length,                                        icon: 'people',      color: '#76C442' },
    { label: 'Active',         value: teachers.filter(t => t.status === 'Active').length,     icon: 'check_circle',color: '#3182ce' },
    { label: 'On Leave',       value: teachers.filter(t => t.status === 'On Leave').length,   icon: 'event_busy',  color: '#ed8936' },
    { label: 'Subjects',       value: [...new Set(teachers.map(t => t.subject).filter(Boolean))].length, icon: 'book', color: '#805ad5' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout pageTitle="Teachers">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Teacher Management</h1>
          <p>Manage teaching staff and their login credentials ({teachers.length} total)</p>
        </div>
        <button className="btn-add" onClick={openAdd}>
          <span className="material-icons">person_add</span> Add Teacher
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {stats.map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '15' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="data-table-card">
        <div className="search-filter-bar">
          <div className="search-input-wrapper">
            <span className="material-icons">search</span>
            <input className="search-input" placeholder="Search by name, email, subject, ID…"
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="filter-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
            <option value="">All Subjects</option>
            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="All">All Status</option>
            <option>Active</option>
            <option>On Leave</option>
            <option>Inactive</option>
          </select>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Teacher</th>
                <th>Emp ID</th>
                <th>Subject / Dept</th>
                <th>Classes</th>
                <th>Assigned Classes</th>
                <th>Experience</th>
                <th>Joining</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9}>
                  <div className="empty-state">
                    <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>search_off</span>
                    <h3 style={{ color: '#a0aec0' }}>No teachers found</h3>
                    <p style={{ color: '#cbd5e0' }}>
                      {search || filterSubject ? 'Try adjusting your search filters.' : 'Click "Add Teacher" to get started.'}
                    </p>
                  </div>
                </td></tr>
              ) : filtered.map(t => {
                const color = SUBJECT_COLOR[t.subject] || '#76C442';
                return (
                  <tr key={t.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg, ${color}, ${color}99)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                          {getInitials(t.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#2d3748' }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: '#a0aec0' }}>{t.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#718096' }}>{t.empId || '—'}</td>
                    <td>
                      <div>
                        {t.subject && (
                          <span style={{ padding: '2px 9px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: color + '18', color, display: 'inline-block', marginBottom: t.department ? 3 : 0 }}>
                            {t.subject}
                          </span>
                        )}
                        {t.department && <div style={{ fontSize: 11, color: '#a0aec0' }}>{t.department}</div>}
                      </div>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
                        background: t.teacherType === 'CLASS_TEACHER' ? '#76C44218' : t.teacherType === 'BOTH' ? '#3182ce18' : '#e2e8f0',
                        color: t.teacherType === 'CLASS_TEACHER' ? '#276749' : t.teacherType === 'BOTH' ? '#2b6cb0' : '#718096',
                      }}>
                        {t.teacherType === 'CLASS_TEACHER' ? 'Class Teacher' : t.teacherType === 'BOTH' ? 'Class + Subject' : 'Subject Teacher'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {t.primaryClassId && classList.length > 0 && (() => {
                          const cls = classList.find(c => Number(c.id) === Number(t.primaryClassId));
                          return cls ? <span style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>{cls.name}{cls.section ? ` - ${cls.section}` : ''}</span> : null;
                        })()}
                        {t.classes && t.classes.split(',').map(s => s.trim()).filter(Boolean).map((cls, i) => (
                          <span key={i} style={{ fontSize: 11, color: '#4a5568', fontWeight: 600 }}>{cls}</span>
                        ))}
                        {!t.primaryClassId && !t.classes && <span style={{ fontSize: 11, color: '#a0aec0' }}>—</span>}
                      </div>
                    </td>
                    <td style={{ fontSize: 12, color: '#718096' }}>{t.experience || '—'}</td>
                    <td style={{ fontSize: 12, color: '#718096' }}>{t.joining || '—'}</td>
                    <td>
                      <span className={`status-badge ${t.status === 'Active' ? 'status-present' : t.status === 'On Leave' ? 'status-pending' : 'status-absent'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn action-btn-view" title="View Details" onClick={() => { setViewTeacher(t); setShowView(true); }}>
                          <span className="material-icons">visibility</span>
                        </button>
                        {isSuperAdmin && (
                          <button className="action-btn" style={{ color: '#7c3aed', background: '#7c3aed12' }} title="View Login Credentials" onClick={() => openViewCred(t)}>
                            <span className="material-icons">key</span>
                          </button>
                        )}
                        <button className="action-btn" style={{ color: '#38b2ac', background: '#e6fffa' }} title="Assign Classes"
                          onClick={() => { setAssignTarget(t); setAssignClasses((t.classes || '').split(',').map(s => s.trim()).filter(Boolean)); setShowAssign(true); }}>
                          <span className="material-icons">assignment</span>
                        </button>
                        <button className="action-btn action-btn-edit" title="Edit" onClick={() => openEdit(t)}>
                          <span className="material-icons">edit</span>
                        </button>
                        {isSuperAdmin && (
                          <button className="action-btn" style={{ color: '#ed8936', background: '#fef3c720' }} title="Reset Password" onClick={() => handleOpenReset(t)}>
                            <span className="material-icons">lock_reset</span>
                          </button>
                        )}
                        <button className="action-btn action-btn-delete" title="Delete" onClick={() => setDeleteId(t.id)}>
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

      {/* ═══════════════════════════════════════════════════════════════════
          ADD / EDIT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <span className="modal-title">{editTeacher ? 'Edit Teacher' : 'Add New Teacher'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>

                {/* Login password — only when adding */}
                {!editTeacher && (
                  <div style={{ marginBottom: 4 }}>
                    <Field label="Initial Login Password" required error={errors.password}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type="text"
                            style={{ ...inputStyle(errors.password) }}
                            placeholder="Set a password the teacher will use"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })}
                          />
                        </div>
                        <button type="button"
                          onClick={() => { const p = generateRandomPassword(); setForm(f => ({ ...f, password: p })); }}
                          title="Generate a secure password"
                          style={{ flexShrink: 0, padding: '8px 12px', background: '#76C44215', border: '1.5px solid #76C44240', borderRadius: 8, cursor: 'pointer', color: '#276749', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
                          <span className="material-icons" style={{ fontSize: 15 }}>autorenew</span>
                          Generate
                        </button>
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#718096' }}>
                        This password is shown in the credentials popup after saving — copy and share it with the teacher.
                      </p>
                    </Field>
                  </div>
                )}

                {/* ── Personal Info ────────────────────────────────────── */}
                <Section icon="person" label="Personal Information" />
                <Col2>
                  <Field label="Full Name" required error={errors.name}>
                    <input style={inputStyle(errors.name)} placeholder="e.g., Priya Sharma" value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })} />
                  </Field>
                  <Field label="Employee ID" required error={errors.empId}>
                    <input style={inputStyle(errors.empId)} placeholder="e.g., T009" value={form.empId}
                      onChange={e => setForm({ ...form, empId: e.target.value })} />
                  </Field>
                  <Field label="Email (Login ID)" required error={errors.email}>
                    <input type="email" style={inputStyle(errors.email)} placeholder="teacher@school.com" value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })} />
                  </Field>
                  <Field label="Mobile Number" error={errors.mobile}>
                    <input type="tel" style={inputStyle(errors.mobile)} placeholder="10-digit mobile" maxLength={10} value={form.mobile}
                      onChange={e => setForm({ ...form, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                  </Field>
                </Col2>

                {/* ── Professional Info ────────────────────────────────── */}
                <Section icon="school" label="Professional Details" />
                <Col2>
                  <Field label="Subject" required error={errors.subject}>
                    <select style={{ ...inputStyle(errors.subject), cursor: 'pointer' }} value={form.subject}
                      onChange={e => setForm({ ...form, subject: e.target.value })}>
                      <option value="">Select subject</option>
                      {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Department" optional>
                    <input style={inputStyle(false)} placeholder="e.g., Science Department" value={form.department}
                      onChange={e => setForm({ ...form, department: e.target.value })} />
                  </Field>
                  <Field label="Qualification" optional>
                    <input style={inputStyle(false)} placeholder="e.g., M.Sc Mathematics" value={form.qualification}
                      onChange={e => setForm({ ...form, qualification: e.target.value })} />
                  </Field>
                  <Field label="Experience" optional>
                    <input style={inputStyle(false)} placeholder="e.g., 5 years" value={form.experience}
                      onChange={e => setForm({ ...form, experience: e.target.value })} />
                  </Field>
                  <Field label="Joining Date" optional>
                    <input type="date" style={inputStyle(false)} value={form.joining}
                      onChange={e => setForm({ ...form, joining: e.target.value })} />
                  </Field>
                  <Field label="Status">
                    <select style={{ ...inputStyle(false), cursor: 'pointer' }} value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}>
                      <option>Active</option>
                      <option>On Leave</option>
                      <option>Inactive</option>
                    </select>
                  </Field>
                </Col2>

                {/* ── Teacher Role & Class Assignment ──────────────────── */}
                <Section icon="class" label="Role & Class Assignment" />
                <Col2>
                  <Field label="Teacher Role" required error={errors.teacherType}>
                    <select
                      style={{ ...inputStyle(false), cursor: 'pointer' }}
                      value={form.teacherType}
                      onChange={e => setForm({ ...form, teacherType: e.target.value, primaryClassId: '' })}
                    >
                      <option value="SUBJECT_TEACHER">Subject Teacher</option>
                      <option value="CLASS_TEACHER">Class Teacher</option>
                    </select>
                  </Field>

                  {(form.teacherType === 'CLASS_TEACHER' || form.teacherType === 'BOTH') ? (
                    <Field label="Primary Class" required error={errors.primaryClassId}>
                      <select
                        style={{ ...inputStyle(!!errors.primaryClassId), cursor: 'pointer' }}
                        value={form.primaryClassId}
                        onChange={e => setForm({ ...form, primaryClassId: e.target.value })}
                      >
                        <option value="">Select class</option>
                        {classList.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name}{c.section ? ` - ${c.section}` : ''}
                          </option>
                        ))}
                      </select>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#a0aec0' }}>
                        This teacher will mark attendance for this class.
                      </p>
                    </Field>
                  ) : (
                    <Field label="Classes Taught" optional>
                      <input
                        style={inputStyle(false)}
                        placeholder="e.g., 9-A, 10-B, 11-C"
                        value={form.classes}
                        onChange={e => setForm({ ...form, classes: e.target.value })}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#a0aec0' }}>
                        Comma-separated list of classes this teacher teaches.
                      </p>
                    </Field>
                  )}
                  {form.teacherType === 'BOTH' && (
                    <Field label="Other Classes Taught" optional>
                      <input
                        style={inputStyle(false)}
                        placeholder="e.g., 9-A, 10-B, 11-C"
                        value={form.classes}
                        onChange={e => setForm({ ...form, classes: e.target.value })}
                      />
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: '#a0aec0' }}>
                        Additional classes this teacher teaches as a subject teacher.
                      </p>
                    </Field>
                  )}
                </Col2>

                {/* ── Documents ────────────────────────────────────────── */}
                <Section icon="upload_file" label="Documents" />
                <Col2>
                  <Field label="Upload ID Proof" optional>
                    <div>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        border: '1.5px dashed #e2e8f0', borderRadius: 8, padding: '9px 12px',
                        background: form.idProof ? '#f0fff4' : '#fafafa', transition: 'all 0.2s',
                      }}>
                        <span className="material-icons" style={{ fontSize: 18, color: form.idProof ? '#76C442' : '#a0aec0' }}>
                          {form.idProof ? 'check_circle' : 'upload_file'}
                        </span>
                        <span style={{ fontSize: 13, color: form.idProof ? '#276749' : '#a0aec0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {form.idProofName || 'Choose file (PDF / JPG / PNG)'}
                        </span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setForm(f => ({ ...f, idProof: ev.target.result, idProofName: file.name }));
                            reader.readAsDataURL(file);
                          }} />
                      </label>
                      {form.idProof && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, idProof: '', idProofName: '' }))}
                          style={{ marginTop: 4, fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Poppins, sans-serif' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </Field>
                  <Field label="Upload Other Documents" optional>
                    <div>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        border: '1.5px dashed #e2e8f0', borderRadius: 8, padding: '9px 12px',
                        background: form.otherDoc ? '#f0fff4' : '#fafafa', transition: 'all 0.2s',
                      }}>
                        <span className="material-icons" style={{ fontSize: 18, color: form.otherDoc ? '#76C442' : '#a0aec0' }}>
                          {form.otherDoc ? 'check_circle' : 'upload_file'}
                        </span>
                        <span style={{ fontSize: 13, color: form.otherDoc ? '#276749' : '#a0aec0', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {form.otherDocName || 'Choose file (PDF / JPG / PNG)'}
                        </span>
                        <input type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }}
                          onChange={e => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = ev => setForm(f => ({ ...f, otherDoc: ev.target.result, otherDocName: file.name }));
                            reader.readAsDataURL(file);
                          }} />
                      </label>
                      {form.otherDoc && (
                        <button type="button" onClick={() => setForm(f => ({ ...f, otherDoc: '', otherDocName: '' }))}
                          style={{ marginTop: 4, fontSize: 11, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'Poppins, sans-serif' }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </Field>
                </Col2>

              </div>

              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
                  Cancel
                </button>
                <button type="submit"
                  style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>{editTeacher ? 'save' : 'person_add'}</span>
                  {editTeacher ? 'Update Teacher' : 'Add Teacher & Generate Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CREDENTIALS GENERATED MODAL  (shown once after adding)
      ═══════════════════════════════════════════════════════════════════ */}
      {showCred && newCredential && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #276749, #38a169)', borderRadius: '16px 16px 0 0' }}>
              <span className="modal-title" style={{ color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 20 }}>verified</span>
                Credentials Generated
              </span>
              <button className="modal-close" onClick={() => setShowCred(false)}
                style={{ color: '#fff', opacity: 0.8 }}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>

              {/* Success banner */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fff4', border: '3px solid #9ae6b4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <span className="material-icons" style={{ fontSize: 32, color: '#38a169' }}>check_circle</span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontWeight: 800, color: '#2d3748', fontSize: 17 }}>
                  Teacher added successfully!
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#718096' }}>
                  Login credentials have been generated for <strong>{newCredential.name}</strong>.
                  Share these securely with the teacher.
                </p>
              </div>

              {/* Credential cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <CredentialCard label="Login Email (Username)" value={newCredential.email} />
                <CredentialCard label="Password" value={newCredential.password} mono />
              </div>

              {/* Warning */}
              <div style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span className="material-icons" style={{ fontSize: 16, color: '#d69e2e', flexShrink: 0, marginTop: 1 }}>warning</span>
                <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                  This password is shown only once here. Store it securely or share it directly with the teacher. The teacher can reset it later from their profile.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowCred(false)}
                style={{ padding: '10px 28px', background: '#76C442', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW CREDENTIALS MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showViewCred && viewCredTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowViewCred(false)}>
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 18, color: '#7c3aed' }}>key</span>
                Login Credentials
              </span>
              <button className="modal-close" onClick={() => setShowViewCred(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              {/* Teacher info */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#f7fafc', borderRadius: 10, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg, ${SUBJECT_COLOR[viewCredTarget.subject] || '#76C442'}, #5fa832)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(viewCredTarget.name)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>{viewCredTarget.name}</div>
                  <div style={{ fontSize: 11, color: '#a0aec0' }}>{viewCredTarget.subject} {viewCredTarget.department ? `· ${viewCredTarget.department}` : ''}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <CredentialCard label="Email (Login ID)" value={viewCredTarget.email} />
                <CredentialCard label="Password" value="Stored securely in database. Use Reset Password to set a new one." />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowViewCred(false)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>Close</button>
              <button onClick={() => { setShowViewCred(false); handleOpenReset(viewCredTarget); }}
                style={{ padding: '10px 20px', background: '#ed8936', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-icons" style={{ fontSize: 16 }}>lock_reset</span>
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RESET PASSWORD MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showReset && resetTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowReset(false)}>
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 18, color: '#ed8936' }}>lock_reset</span>
                Reset Password
              </span>
              <button className="modal-close" onClick={() => setShowReset(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#718096' }}>
                Resetting password for <strong style={{ color: '#2d3748' }}>{resetTarget.name}</strong>.
                A new password has been auto-generated. You can edit it before confirming.
              </p>

              <label style={labelStyle}>New Password</label>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <input
                  type="text"
                  style={{ ...inputStyle(!resetPwd.trim()), paddingRight: 44 }}
                  value={resetPwd}
                  onChange={e => setResetPwd(e.target.value)}
                  placeholder="New password"
                />
                <div style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
                  <button type="button" onClick={() => setResetPwd(generateRandomPassword())}
                    title="Re-generate password"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0', padding: 4, display: 'flex' }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>refresh</span>
                  </button>
                </div>
              </div>

              <div style={{ background: '#fff8f0', border: '1.5px solid #fbd38d', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#92400e', display: 'flex', gap: 7, alignItems: 'flex-start' }}>
                <span className="material-icons" style={{ fontSize: 15, color: '#ed8936', flexShrink: 0 }}>info</span>
                Share the new password securely with the teacher. They will log in with it immediately.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowReset(false)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
                Cancel
              </button>
              <button onClick={handleConfirmReset} disabled={!resetPwd.trim()}
                style={{ padding: '10px 20px', background: '#ed8936', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', opacity: resetPwd.trim() ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-icons" style={{ fontSize: 16 }}>lock_reset</span>
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          VIEW TEACHER DETAILS MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showView && viewTeacher && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowView(false)}>
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">Teacher Profile</span>
              <button className="modal-close" onClick={() => setShowView(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Avatar */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(135deg, ${SUBJECT_COLOR[viewTeacher.subject] || '#76C442'}, #5fa832)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 700, margin: '0 auto 10px' }}>
                  {getInitials(viewTeacher.name)}
                </div>
                <h3 style={{ margin: '0 0 4px', fontWeight: 800, fontSize: 18, color: '#2d3748' }}>{viewTeacher.name}</h3>
                <div style={{ fontSize: 13, color: '#718096' }}>{viewTeacher.empId} {viewTeacher.subject ? `· ${viewTeacher.subject}` : ''}</div>
                <span className={`status-badge ${viewTeacher.status === 'Active' ? 'status-present' : viewTeacher.status === 'On Leave' ? 'status-pending' : 'status-absent'}`} style={{ marginTop: 6, display: 'inline-block' }}>
                  {viewTeacher.status}
                </span>
              </div>

              {/* Details grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { icon: 'email',      label: 'Email',         value: viewTeacher.email },
                  { icon: 'phone',      label: 'Mobile',        value: viewTeacher.mobile || '—' },
                  { icon: 'school',     label: 'Qualification', value: viewTeacher.qualification || '—' },
                  { icon: 'work',       label: 'Experience',    value: viewTeacher.experience || '—' },
                  { icon: 'business',   label: 'Department',    value: viewTeacher.department || '—' },
                  { icon: 'event',      label: 'Joining Date',  value: viewTeacher.joining || '—' },
                  { icon: 'class',      label: 'Classes',       value: (() => { const cls = classList.find(c => Number(c.id) === Number(viewTeacher.primaryClassId)); return cls ? `${cls.name}${cls.section ? ` - ${cls.section}` : ''}` : (viewTeacher.classes || '—'); })(), full: true },
                  { icon: 'calendar_today', label: 'Added On',  value: viewTeacher.createdAt || '—' },
                ].map(row => (
                  <div key={row.label} style={{ gridColumn: row.full ? '1/-1' : 'auto', display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 12px', background: '#f7fafc', borderRadius: 8 }}>
                    <span className="material-icons" style={{ fontSize: 16, color: '#a0aec0', marginTop: 1, flexShrink: 0 }}>{row.icon}</span>
                    <div>
                      <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600 }}>{row.label}</div>
                      <div style={{ fontSize: 13, color: '#2d3748', fontWeight: 600, marginTop: 2, wordBreak: 'break-all' }}>{row.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowView(false)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>Close</button>
              <button onClick={() => { setShowView(false); openEdit(viewTeacher); }}
                style={{ padding: '10px 20px', background: '#76C442', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span className="material-icons" style={{ fontSize: 16 }}>edit</span>
                Edit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          ASSIGN CLASSES MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      {showAssign && assignTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAssign(false)}>
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <span className="modal-title">Assign Classes — {assignTarget.name}</span>
              <button className="modal-close" onClick={() => setShowAssign(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body" style={{ padding: '20px 24px' }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, color: '#718096' }}>
                Select the classes to assign to this teacher:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {classList.length === 0 ? (
                  <p style={{ fontSize: 13, color: '#a0aec0', margin: 0 }}>No classes found. Please create classes first.</p>
                ) : classList.map(c => {
                  const label = `${c.name}${c.section ? ` - ${c.section}` : ''}`;
                  const active = assignClasses.includes(label);
                  return (
                    <button key={c.id} type="button"
                      onClick={() => setAssignClasses(prev => active ? prev.filter(x => x !== label) : [...prev, label])}
                      style={{ padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1.5px solid ${active ? '#76C442' : '#e2e8f0'}`, background: active ? '#76C442' : '#fff', color: active ? '#fff' : '#718096', transition: 'all 0.15s' }}>
                      {label}
                    </button>
                  );
                })}
              </div>
              {assignClasses.length > 0 && (
                <div style={{ background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#276749' }}>
                  <strong>Assigned:</strong> {assignClasses.join(', ')}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowAssign(false)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>Cancel</button>
              <button onClick={handleSaveAssign}
                style={{ padding: '10px 20px', background: '#76C442', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          DELETE CONFIRM
      ═══════════════════════════════════════════════════════════════════ */}
      {deleteId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteId(null)}>
          <div className="modal-container" style={{ maxWidth: 380 }}>
            <div className="modal-body" style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', border: '3px solid #fc8181', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>person_off</span>
              </div>
              <h3 style={{ margin: '0 0 8px', fontWeight: 800, color: '#2d3748' }}>Remove Teacher?</h3>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#718096' }}>
                This will permanently remove the teacher record <strong>and their login credentials</strong>.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: '#e53e3e' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteId(null)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600, fontFamily: 'Poppins, sans-serif' }}>
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)}
                style={{ padding: '10px 20px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
