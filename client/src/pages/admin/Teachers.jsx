import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { sortClasses } from '../../utils/classOrder';
import {
  fetchTeachers as apiFetchTeachers,
  createTeacher as apiCreateTeacher,
  updateTeacher as apiUpdateTeacher,
  resetTeacherPassword as apiResetTeacherPassword,
  deleteTeacher as apiDeleteTeacher,
} from '../../services/teacherService';
import { adminAPI, onboardingVerifyAPI } from '../../services/api';
import { generateRandomPassword } from '../../utils/passwordGenerator';
import { EMPTY_FORM } from './teachers/constants';
import TeachersTable from './teachers/TeachersTable';
import TeacherFormModal from './teachers/TeacherFormModal';
import CredentialsModal from './teachers/CredentialsModal';
import ViewCredentialsModal from './teachers/ViewCredentialsModal';
import ResetPasswordModal from './teachers/ResetPasswordModal';
import TeacherProfileModal from './teachers/TeacherProfileModal';
import AssignClassesModal from './teachers/AssignClassesModal';
import DeleteTeacherModal from './teachers/DeleteTeacherModal';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Teachers() {
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // ── State ──────────────────────────────────────────────────────────────────
  const [teachers,       setTeachers]       = useState([]);
  const [loading,        setLoading]        = useState(true);
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
  const [deleting,       setDeleting]       = useState(false);

  // form
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [errors,    setErrors]    = useState({});
  const [classList, setClassList] = useState([]);
  const [saving,    setSaving]    = useState(false);

  // email OTP verification
  const [teacherOtp, setTeacherOtp] = useState({ sent: false, verified: false, sending: false, verifying: false, value: '', error: '' });
  const resetTeacherOtp = () => setTeacherOtp({ sent: false, verified: false, sending: false, verifying: false, value: '', error: '' });

  const handleTeacherSendOtp = async () => {
    const email = form.email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setTeacherOtp(s => ({ ...s, error: 'Enter a valid email first' }));
      return;
    }
    setTeacherOtp(s => ({ ...s, sending: true, error: '' }));
    try {
      await onboardingVerifyAPI.sendOtp(email.toLowerCase());
      setTeacherOtp(s => ({ ...s, sending: false, sent: true, verified: false, value: '', error: '' }));
    } catch (err) {
      setTeacherOtp(s => ({ ...s, sending: false, error: err.response?.data?.message || 'Failed to send OTP' }));
    }
  };

  const handleTeacherVerifyOtp = async () => {
    if (!teacherOtp.value || teacherOtp.value.length < 6) {
      setTeacherOtp(s => ({ ...s, error: 'Enter the 6-digit OTP' }));
      return;
    }
    setTeacherOtp(s => ({ ...s, verifying: true, error: '' }));
    try {
      await onboardingVerifyAPI.verifyOtp(form.email.trim().toLowerCase(), teacherOtp.value.trim());
      setTeacherOtp(s => ({ ...s, verifying: false, verified: true, error: '' }));
    } catch (err) {
      setTeacherOtp(s => ({ ...s, verifying: false, error: err.response?.data?.message || 'Incorrect OTP' }));
    }
  };

  const showToast = useToast();

  // ── Load teachers and classes on mount ────────────────────────────────────
  useEffect(() => {
    apiFetchTeachers().then(data => {
      if (data && data.length > 0) setTeachers(data);
    }).finally(() => setLoading(false));
    adminAPI.getClasses().then(res => {
      const list = (res.data?.data ?? []).slice().sort(sortClasses);
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
    const teacherSubjects = (t.subject || '').split(',').map(s => s.trim()).filter(Boolean);
    const matchSubject = !filterSubject || teacherSubjects.some(s => s.toLowerCase().includes(filterSubject.toLowerCase()));
    return matchSearch && matchStatus && matchSubject;
  });

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
    } else if (!editTeacher && !teacherOtp.verified) {
      e.email = 'Please verify the email with OTP before saving';
    }

    if (!form.mobile.trim())
      e.mobile = 'Mobile number is required';
    else if (!/^\d{10}$/.test(form.mobile))
      e.mobile = 'Mobile must be exactly 10 digits';

    if (!editTeacher) {
      if (!form.password.trim()) {
        e.password = 'Password is required';
      } else if (!/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>/?]).{8,}$/.test(form.password)) {
        e.password = 'Password must be 8+ characters with uppercase, number, and special character';
      }
    }

    if ((form.teacherType === 'CLASS_TEACHER' || form.teacherType === 'BOTH') && !form.primaryClassId)
      e.primaryClassId = 'Please select the primary class for this teacher';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Add / Edit ─────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!validate()) return;

    setSaving(true);
    try {
    if (editTeacher) {
      // ── Edit ──────────────────────────────────────────────────────────────
      const result = await apiUpdateTeacher(editTeacher.id, {
        name:           form.name,
        email:          form.email,
        mobile:         form.mobile,
        empId:          form.empId,
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
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      const result = await apiDeleteTeacher(id);
      if (result.success) {
        persist(teachers.filter(x => x.id !== id));
        setDeleteId(null);
        showToast('Teacher removed successfully', 'warning');
      } else {
        showToast(result.message || 'Failed to delete teacher', 'error');
        setDeleteId(null);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Network error — teacher not deleted', 'error');
    } finally {
      setDeleting(false);
    }
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
  const handleSaveAssign = async () => {
    const classesStr = assignClasses.join(', ');
    const result = await apiUpdateTeacher(assignTarget.id, { classes: classesStr });
    if (!result.success) {
      showToast(result.message || 'Failed to assign classes', 'error');
      return;
    }
    const updated = teachers.map(t =>
      t.id === assignTarget.id ? { ...t, classes: classesStr } : t
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
    { label: 'Total Teachers', value: teachers.length,                                        icon: 'people',      color: '#0de1e8' },
    { label: 'Active',         value: teachers.filter(t => t.status === 'Active').length,     icon: 'check_circle',color: '#3182ce' },
    { label: 'On Leave',       value: teachers.filter(t => t.status === 'On Leave').length,   icon: 'event_busy',  color: '#ed8936' },
    { label: 'Subjects',       value: [...new Set(teachers.map(t => t.subject).filter(Boolean))].length, icon: 'book', color: '#805ad5' },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Layout pageTitle="Teachers">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Teacher Management</h1>
          <p>Manage teaching staff and their login credentials ({teachers.length} total)</p>
        </div>
        <Button variant="add" onClick={openAdd}>
          <span className="material-icons">person_add</span> Add Teacher
        </Button>
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

      <TeachersTable
        loading={loading}
        teachers={teachers}
        filtered={filtered}
        search={search}
        setSearch={setSearch}
        filterSubject={filterSubject}
        setFilterSubject={setFilterSubject}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        classList={classList}
        isSuperAdmin={isSuperAdmin}
        onView={(t) => { setViewTeacher(t); setShowView(true); }}
        onViewCred={openViewCred}
        onAssign={(t) => { setAssignTarget(t); setAssignClasses((t.classes || '').split(',').map(s => s.trim()).filter(Boolean)); setShowAssign(true); }}
        onEdit={openEdit}
        onResetPassword={handleOpenReset}
        onDelete={(id) => setDeleteId(id)}
        onAddFirst={openAdd}
      />

      {showModal && (
        <TeacherFormModal
          editTeacher={editTeacher}
          form={form}
          setForm={setForm}
          errors={errors}
          setErrors={setErrors}
          saving={saving}
          classList={classList}
          teacherOtp={teacherOtp}
          setTeacherOtp={setTeacherOtp}
          onSendOtp={handleTeacherSendOtp}
          onVerifyOtp={handleTeacherVerifyOtp}
          onResetOtp={resetTeacherOtp}
          onClose={() => { setShowModal(false); resetTeacherOtp(); }}
          onSubmit={handleSave}
        />
      )}

      {showCred && newCredential && (
        <CredentialsModal newCredential={newCredential} onClose={() => setShowCred(false)} />
      )}

      {showViewCred && viewCredTarget && (
        <ViewCredentialsModal
          viewCredTarget={viewCredTarget}
          onClose={() => setShowViewCred(false)}
          onResetPassword={() => { setShowViewCred(false); handleOpenReset(viewCredTarget); }}
        />
      )}

      {showReset && resetTarget && (
        <ResetPasswordModal
          resetTarget={resetTarget}
          resetPwd={resetPwd}
          setResetPwd={setResetPwd}
          onClose={() => setShowReset(false)}
          onConfirm={handleConfirmReset}
        />
      )}

      {showView && viewTeacher && (
        <TeacherProfileModal
          viewTeacher={viewTeacher}
          classList={classList}
          onClose={() => setShowView(false)}
          onEdit={() => { setShowView(false); openEdit(viewTeacher); }}
        />
      )}

      {showAssign && assignTarget && (
        <AssignClassesModal
          assignTarget={assignTarget}
          classList={classList}
          assignClasses={assignClasses}
          setAssignClasses={setAssignClasses}
          onClose={() => setShowAssign(false)}
          onSave={handleSaveAssign}
        />
      )}

      {deleteId && (
        <DeleteTeacherModal
          deleting={deleting}
          onCancel={() => setDeleteId(null)}
          onConfirm={() => handleDelete(deleteId)}
        />
      )}
    </Layout>
  );
}
