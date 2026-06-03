import { useState, useEffect, useRef, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import StudentExportModal from '../../components/StudentExportModal';
import BulkImportModal from '../../components/BulkImportModal';
import {
  fetchStudents as apiFetchStudents,
  createStudent as apiCreateStudent,
  updateStudent as apiUpdateStudent,
  deleteStudent as apiDeleteStudent,
} from '../../services/studentService';
import { adminAPI, onboardingVerifyAPI } from '../../services/api';


const EMPTY_FORM = {
  name: '', rollNo: '', admissionNumber: '', class: '', section: '', dob: '', status: 'Active', gender: '', photo: null,
  studentEmail: '',
  fatherName: '', fatherPhone: '',
  motherName: '', motherPhone: '',
  guardianName: '', guardianPhone: '',
  permanentAddress: '', alternateAddress: '',
  idProof: null, idProofName: '',
  tcDocument: null, tcDocumentName: '',
  bonafideDocument: null, bonafideDocumentName: '',
};

const formatDOB = (dob) => {
  if (!dob) return '—';
  if (dob.includes('-') && dob.length === 10) {
    return new Date(dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return dob;
};

const phoneOnly = (v) => v.replace(/\D/g, '').slice(0, 10);

const ITEMS_PER_PAGE = 6;

// ─── Section divider ──────────────────────────────────────────────────────────
function SectionLabel({ icon, text }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 12px',
      paddingBottom: 8, borderBottom: '1.5px solid #f0f4f8',
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#0de1e818', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#0de1e8' }}>{icon}</span>
      </div>
      <span style={{ fontWeight: 700, fontSize: 13, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{text}</span>
    </div>
  );
}

// ─── Document upload box ──────────────────────────────────────────────────────
function DocUpload({ label, required, fileData, fileName, inputRef, onChange, onClear, accept = '.pdf,.jpg,.jpeg,.png' }) {
  return (
    <div>
      <label className="form-label fw-medium small">{label} {required ? '*' : <span className="text-muted">(Optional)</span>}</label>
      {fileName ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#f0fff4', border: '1.5px solid #9ae6b4', borderRadius: 10, padding: '10px 14px',
        }}>
          <span className="material-icons" style={{ color: '#276749', fontSize: 20 }}>description</span>
          <span style={{ flex: 1, fontSize: 13, color: '#276749', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
          <button type="button" onClick={onClear} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: '#e53e3e', display: 'flex' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>cancel</span>
          </button>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.click()}
          style={{
            border: '2px dashed #e2e8f0', borderRadius: 10, padding: '16px 14px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
            cursor: 'pointer', background: '#fafafa', transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#0de1e8'}
          onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}
        >
          <span className="material-icons" style={{ fontSize: 28, color: '#a0aec0' }}>upload_file</span>
          <span style={{ fontSize: 12, color: '#a0aec0', fontWeight: 500 }}>Click to upload</span>
          <span style={{ fontSize: 11, color: '#cbd5e0' }}>PDF, JPG, PNG</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} style={{ display: 'none' }} onChange={onChange} />
    </div>
  );
}

// ─── Credential Card (same pattern as Teachers) ───────────────────────────────
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
      <button onClick={copy} title="Copy" style={{ border: 'none', background: copied ? '#f0fff4' : '#e2e8f0', borderRadius: 7, padding: '6px 8px', cursor: 'pointer', color: copied ? '#0de1e8' : '#718096', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, fontFamily: 'Poppins, sans-serif', flexShrink: 0, transition: 'all 0.2s' }}>
        <span className="material-icons" style={{ fontSize: 15 }}>{copied ? 'check' : 'content_copy'}</span>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Students() {
  const [students, setStudents]         = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterClass, setFilterClass]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [showModal, setShowModal]       = useState(false);
  const [showExportModal, setShowExportModal]   = useState(false);
  const [showBulkImport, setShowBulkImport]     = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editStudent, setEditStudent]   = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [errors, setErrors]             = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null); // full student object
  const [toast, setToast]               = useState(null);
  const [saving, setSaving]             = useState(false);
  const [showCred, setShowCred]         = useState(false);   // after-add credentials
  const [newCredential, setNewCredential] = useState(null);  // { name, email, mobile, password }
  const [viewCredTarget, setViewCredTarget] = useState(null); // { studentName, username, tempPassword, firstLogin }
  const [loadingCred, setLoadingCred]   = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [apiStatus, setApiStatus]       = useState(null); // 'live' | 'offline'
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [availableClasses, setAvailableClasses] = useState([]); // [{name, section}] from DB
  const [capacityInfo, setCapacityInfo] = useState(null);   // { capacity, enrolled, available, isFull }
  const [capacityChecking, setCapacityChecking] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds]     = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting]   = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteForm, setPromoteForm]     = useState({ fromClass: '', fromSection: '', toClass: '', toSection: '' });
  const [promoting, setPromoting]         = useState(false);

  // email OTP verification for new students
  const [studentOtp, setStudentOtp] = useState({ sent: false, verified: false, sending: false, verifying: false, value: '', error: '' });
  const resetStudentOtp = () => setStudentOtp({ sent: false, verified: false, sending: false, verifying: false, value: '', error: '' });

  const handleStudentSendOtp = async () => {
    const email = formData.studentEmail?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStudentOtp(s => ({ ...s, error: 'Enter a valid email first' }));
      return;
    }
    setStudentOtp(s => ({ ...s, sending: true, error: '' }));
    try {
      await onboardingVerifyAPI.sendOtp(email.toLowerCase());
      setStudentOtp(s => ({ ...s, sending: false, sent: true, verified: false, value: '', error: '' }));
    } catch (err) {
      setStudentOtp(s => ({ ...s, sending: false, error: err.response?.data?.message || 'Failed to send OTP' }));
    }
  };

  const handleStudentVerifyOtp = async () => {
    if (!studentOtp.value || studentOtp.value.length < 6) {
      setStudentOtp(s => ({ ...s, error: 'Enter the 6-digit OTP' }));
      return;
    }
    setStudentOtp(s => ({ ...s, verifying: true, error: '' }));
    try {
      await onboardingVerifyAPI.verifyOtp(formData.studentEmail.trim().toLowerCase(), studentOtp.value.trim());
      setStudentOtp(s => ({ ...s, verifying: false, verified: true, error: '' }));
    } catch (err) {
      setStudentOtp(s => ({ ...s, verifying: false, error: err.response?.data?.message || 'Incorrect OTP' }));
    }
  };

  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds(new Set()); };

  // Load from API — called on mount and after every mutation
  const loadStudents = () => {
    setLoadingStudents(true);
    apiFetchStudents().then(data => {
      setStudents(Array.isArray(data) ? data : []);
      setApiStatus('live');
    }).catch(() => {
      setApiStatus('offline');
    }).finally(() => setLoadingStudents(false));
  };

  // Load classes defined by admin in the Classes module
  useEffect(() => {
    adminAPI.getClasses()
      .then(res => {
        const raw = res.data?.data ?? [];
        setAvailableClasses(
          Array.isArray(raw)
            ? raw.filter(c => c.isActive !== false).map(c => ({ name: c.name, section: c.section }))
            : []
        );
      })
      .catch(() => setAvailableClasses([]));
  }, []);

  // Unique class names for the Class dropdown
  const classNames = useMemo(
    () => [...new Set(availableClasses.map(c => c.name))].sort(),
    [availableClasses]
  );

  // Sections for the currently selected class
  const sectionsForClass = useMemo(
    () => availableClasses.filter(c => c.name === formData.class).map(c => c.section).sort(),
    [availableClasses, formData.class]
  );

  useEffect(() => { loadStudents(); }, []);

  // Capacity check — fires whenever class or section changes while form is open
  useEffect(() => {
    const cls = formData.class?.trim();
    const sec = formData.section?.trim() || '';
    if (!showModal || !cls) { setCapacityInfo(null); return; }
    // Skip capacity check when editing and class/section hasn't changed
    if (editStudent && cls === editStudent.class && sec === (editStudent.section || '')) {
      setCapacityInfo(null); return;
    }
    setCapacityChecking(true);
    setCapacityInfo(null);
    adminAPI.getClassCapacityInfo(cls, sec)
      .then(res => setCapacityInfo(res.data?.data ?? null))
      .catch(() => setCapacityInfo(null))
      .finally(() => setCapacityChecking(false));
  }, [formData.class, formData.section, showModal, editStudent]);

  // Roll number is entered manually by the admin — no auto-population.

  const photoRef    = useRef(null);
  const idProofRef  = useRef(null);
  const tcRef       = useRef(null);
  const bonafideRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const persist = (updated) => { setStudents(updated); };

  // ── Search / filter ──────────────────────────────────────────────────────────
  const filtered = students.filter(s => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      s.name.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      (s.fatherName || s.parent || '').toLowerCase().includes(q) ||
      (s.motherName || '').toLowerCase().includes(q);
    const normalise = (v) => String(v || '').replace(/^Class\s+/i, '').trim();
    const matchClass = !filterClass || normalise(s.class) === normalise(filterClass);
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchSearch && matchClass && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getInitials = (name) => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // ── Validation ────────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!formData.name.trim())            e.name        = 'Student name is required';
    if (!formData.rollNo.toString().trim()) {
      e.rollNo = 'Roll number is required';
    } else if (!/^\d+$/.test(formData.rollNo.toString().trim())) {
      e.rollNo = 'Roll number must be a number';
    } else if (capacityInfo?.capacity) {
      const rn = parseInt(formData.rollNo);
      if (rn < 1 || rn > capacityInfo.capacity)
        e.rollNo = `Roll number must be between 1 and ${capacityInfo.capacity}`;
    }
    if (!formData.class.trim())           e.class       = 'Class is required';
    if (!formData.fatherName.trim())      e.fatherName  = "Father's name is required";
    if (!formData.motherName.trim())      e.motherName  = "Mother's name is required";
    if (!formData.fatherPhone.trim())     e.fatherPhone = "Father's phone is required";
    else if (!/^\d{10}$/.test(formData.fatherPhone)) e.fatherPhone = 'Must be exactly 10 digits';
    if (!formData.motherPhone.trim())     e.motherPhone = "Mother's phone is required";
    else if (!/^\d{10}$/.test(formData.motherPhone)) e.motherPhone = 'Must be exactly 10 digits';
    if (formData.guardianPhone && !/^\d{10}$/.test(formData.guardianPhone)) e.guardianPhone = 'Must be exactly 10 digits';
    if (!formData.permanentAddress.trim()) e.permanentAddress = 'Permanent address is required';
    if (!formData.idProofName)            e.idProof     = 'ID proof document is required';
    if (!editStudent) {
      if (!formData.studentEmail?.trim())
        e.studentEmail = 'Student email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.studentEmail.trim()))
        e.studentEmail = 'Enter a valid email address';
      else if (!studentOtp.verified)
        e.studentEmail = 'Please verify the email with OTP before saving';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Modal open helpers ────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditStudent(null);
    setFormData(EMPTY_FORM);
    setPhotoPreview(null);
    setErrors({});
    resetStudentOtp();
    setShowModal(true);
  };

  const openEditModal = (s) => {
    setEditStudent(s);
    setFormData({
      ...EMPTY_FORM,
      ...s,
      // ensure new fields exist even for old records
      fatherName: s.fatherName || s.parent || '',
      fatherPhone: s.fatherPhone || s.mobile || '',
      motherName: s.motherName || '',
      motherPhone: s.motherPhone || '',
      permanentAddress: s.permanentAddress || s.address || '',
    });
    setPhotoPreview(s.photo || null);
    setErrors({});
    setShowModal(true);
  };

  // ── File handlers ─────────────────────────────────────────────────────────────
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 5) {
      setErrors(er => ({ ...er, photo: 'Photo too large. Maximum size is 5 MB.' }));
      return;
    }
    setErrors(er => ({ ...er, photo: '' }));
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPhotoPreview(ev.target.result);
      setFormData(fd => ({ ...fd, photo: ev.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDocChange = (field, nameField) => (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const sizeMB = file.size / (1024 * 1024);
    const errorKey = field === 'idProof' ? 'idProof' : field;
    if (sizeMB > 5) {
      setErrors(er => ({ ...er, [errorKey]: 'File too large. Maximum size is 5 MB.' }));
      return;
    }
    const sizeLabel = sizeMB >= 1 ? `${sizeMB.toFixed(1)} MB` : `${(file.size / 1024).toFixed(0)} KB`;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(fd => ({ ...fd, [field]: ev.target.result, [nameField]: `${file.name} (${sizeLabel})` }));
      if (errors[errorKey]) {
        setErrors(er => ({ ...er, [errorKey]: '' }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const clearDoc = (field, nameField) => () => setFormData(fd => ({ ...fd, [field]: null, [nameField]: '' }));

  // syncClassesStore removed — enrolled counts are now computed from API data at display time

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;
    // Frontend capacity guard (new student only)
    if (!editStudent && capacityInfo?.isFull) {
      showToast('Maximum capacity reached for this class. Cannot add more students.', 'error');
      return;
    }
    if (!validate()) {
      document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    const payload = {
      name:             formData.name,
      rollNo:           formData.rollNo,
      admissionNumber:  formData.admissionNumber,
      class:            formData.class,
      section:          formData.section,
      dob:              formData.dob,
      status:           formData.status,
      gender:           formData.gender,
      photo:            formData.photo,
      fatherName:       formData.fatherName,
      fatherPhone:      formData.fatherPhone,
      motherName:       formData.motherName,
      motherPhone:      formData.motherPhone,
      guardianName:     formData.guardianName,
      guardianPhone:    formData.guardianPhone,
      permanentAddress: formData.permanentAddress,
      alternateAddress: formData.alternateAddress,
      idProof:              formData.idProof,
      idProofName:          formData.idProofName,
      tcDocument:           formData.tcDocument,
      tcDocumentName:       formData.tcDocumentName,
      bonafideDocument:     formData.bonafideDocument,
      bonafideDocumentName: formData.bonafideDocumentName,
      studentEmail:         formData.studentEmail?.trim() || null,
      // backend field aliases
      parent:  formData.fatherName,
      mobile:  formData.fatherPhone,
      address: formData.permanentAddress,
    };
    try {
      if (editStudent) {
        const result = await apiUpdateStudent(editStudent.id, payload);
        if (!result.success) {
          const msg = result.message || 'Failed to update student';
          const isRollError = msg.toLowerCase().includes('roll number') || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('capacity');
          if (isRollError) {
            setErrors(prev => ({ ...prev, rollNo: msg }));
            document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            showToast(msg, 'error');
          }
          return;
        }
        showToast('Student updated successfully');
      } else {
        const result = await apiCreateStudent(payload);
        if (!result.success) {
          const msg = result.message || 'Failed to add student';
          const isRollError = msg.toLowerCase().includes('roll number') || msg.toLowerCase().includes('already exists') || msg.toLowerCase().includes('capacity');
          if (isRollError) {
            setErrors(prev => ({ ...prev, rollNo: msg }));
            document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            showToast(msg, 'error');
          }
          return;
        }
        setShowModal(false);
        resetStudentOtp();
        loadStudents();
        const d = result.data || {};
        setNewCredential({
          studentName:     formData.name,
          studentUsername: d.studentUsername || formData.admissionNumber || null,
          studentEmail:    d.studentEmail || null,
          studentPassword: d.studentTempPassword || null,
          // parent (only if newly created)
          newParentCreated: !!d.newParentCreated,
          parentName:      formData.fatherName || formData.name + "'s Parent",
          parentEmail:     d.parentEmail || null,
          parentMobile:    d.parentMobile || null,
          parentPassword:  d.parentTempPassword || null,
        });
        setShowCred(true);
        showToast('Student added successfully. Login credentials generated.');
        return;
      }
      setShowModal(false);
      loadStudents();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const ok = await apiDeleteStudent(deleteTarget.id);
    setDeleteTarget(null);
    if (ok) {
      showToast('Student removed successfully', 'warning');
      loadStudents();
    } else {
      showToast('Failed to delete student', 'error');
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const isAllPageSelected = paginated.length > 0 && paginated.every(s => selectedIds.has(s.id));
  const toggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(s => n.delete(s.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(s => n.add(s.id)); return n; });
    }
  };

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    setBulkDeleting(true);
    const results = await Promise.all(ids.map(id => apiDeleteStudent(id).catch(() => false)));
    const ok = results.filter(Boolean).length;
    setBulkDeleting(false);
    setBulkDeleteConfirm(false);
    exitSelectionMode();
    showToast(`${ok} student${ok !== 1 ? 's' : ''} deleted`, ok > 0 ? 'warning' : 'error');
    setCurrentPage(1);
    loadStudents();
  };

  const handlePromote = async () => {
    const { fromClass, fromSection, toClass, toSection } = promoteForm;
    if (!fromClass.trim() || !toClass.trim()) {
      showToast('Please select both source and target class', 'error');
      return;
    }
    setPromoting(true);
    try {
      const res = await adminAPI.promoteStudents({ fromClass, fromSection, toClass, toSection });
      const { promoted, toClass: tc } = res.data?.data || {};
      showToast(`${promoted} student${promoted !== 1 ? 's' : ''} promoted to ${tc}`, 'success');
      setShowPromoteModal(false);
      setPromoteForm({ fromClass: '', fromSection: '', toClass: '', toSection: '' });
      loadStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Promotion failed', 'error');
    } finally {
      setPromoting(false);
    }
  };

  const handleViewCredentials = async (student) => {
    setLoadingCred(true);
    try {
      const res = await adminAPI.getStudentCredentials(student.id);
      const d = res.data?.data || {};
      setViewCredTarget({
        studentName: student.name,
        email:        d.email,
        tempPassword: d.tempPassword,
        firstLogin:  d.firstLogin,
        isActive:    d.isActive,
      });
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Could not load credentials';
      showToast(msg, 'error');
    } finally {
      setLoadingCred(false);
    }
  };

  const set = (field) => (e) => setFormData(fd => ({ ...fd, [field]: e.target.value }));
  const setPhone = (field) => (e) => {
    const v = phoneOnly(e.target.value);
    setFormData(fd => ({ ...fd, [field]: v }));
    if (errors[field]) setErrors(er => ({ ...er, [field]: '' }));
  };

  // Class filter options — built from classes added in the Classes module
  const filterClassOptions = useMemo(
    () => [...new Set(availableClasses.map(c => c.name))].sort((a, b) => {
      const na = parseInt(a.replace(/\D/g, '')) || 0;
      const nb = parseInt(b.replace(/\D/g, '')) || 0;
      return na - nb;
    }),
    [availableClasses]
  );

  return (
    <Layout pageTitle="Students">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Student Management</h1>
        <p>Manage and view all enrolled students ({students.length} total)</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Students', value: students.length,                                    icon: 'school',       color: '#0de1e8' },
          { label: 'Active',         value: students.filter(s => s.status === 'Active').length,  icon: 'check_circle', color: '#3182ce' },
          { label: 'Inactive',       value: students.filter(s => s.status === 'Inactive').length,icon: 'cancel',       color: '#e53e3e' },
          { label: 'Classes',        value: new Set(students.map(s => s.class)).size,            icon: 'class',        color: '#805ad5' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '15' }}>
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
            <input type="text" className="search-input" placeholder="Search by name, roll no, father/mother…"
              value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
          </div>
          <select className="filter-select" value={filterClass} onChange={e => { setFilterClass(e.target.value); setCurrentPage(1); }}>
            <option value="">All Classes</option>
            {filterClassOptions.length === 0
              ? <option disabled>No classes added yet</option>
              : filterClassOptions.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))
            }
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}>
            <option value="">All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <button
            onClick={() => setShowBulkImport(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '9px',
              border: '1.5px solid #7c3aed', background: '#faf5ff',
              color: '#7c3aed', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="material-icons" style={{ fontSize: '17px' }}>upload_file</span>
            Bulk Import
          </button>
          <button
            onClick={() => setShowExportModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '9px',
              border: '1.5px solid #276749', background: '#f0fff4',
              color: '#276749', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="material-icons" style={{ fontSize: '17px' }}>table_view</span>
            Export Excel
          </button>
          <button
            onClick={() => { setPromoteForm({ fromClass: '', fromSection: '', toClass: '', toSection: '' }); setShowPromoteModal(true); }}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '9px',
              border: '1.5px solid #d69e2e', background: '#fffff0',
              color: '#b7791f', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            <span className="material-icons" style={{ fontSize: '17px' }}>upgrade</span>
            Promote Class
          </button>
          {!selectionMode ? (
            <>
              <button
                onClick={() => setSelectionMode(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', borderRadius: '9px',
                  border: '1.5px solid #e53e3e', background: '#fff5f5',
                  color: '#e53e3e', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="material-icons" style={{ fontSize: '17px' }}>checklist</span>
                Select to Delete
              </button>
              <button className="btn-add" onClick={openAddModal}>
                <span className="material-icons">person_add</span> Add Student
              </button>
            </>
          ) : (
            <>
              {selectedIds.size > 0 && (
                <button
                  onClick={() => setBulkDeleteConfirm(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '9px 16px', borderRadius: '9px',
                    border: '1.5px solid #e53e3e', background: '#e53e3e',
                    color: '#fff', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span className="material-icons" style={{ fontSize: '17px' }}>delete_sweep</span>
                  Delete ({selectedIds.size})
                </button>
              )}
              <button
                onClick={exitSelectionMode}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', borderRadius: '9px',
                  border: '1.5px solid #cbd5e0', background: '#fff',
                  color: '#4a5568', fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                <span className="material-icons" style={{ fontSize: '17px' }}>close</span>
                Cancel
              </button>
            </>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                {selectionMode && (
                  <th style={{ width: 40, textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectAll}
                      title="Select all on this page"
                      style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#e53e3e' }}
                    />
                  </th>
                )}
                <th>Student</th>
                <th>Roll No</th>
                <th>Class</th>
                <th>Section</th>
                <th>Father's Name</th>
                <th>Father's Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingStudents ? (
                <tr><td colSpan={selectionMode ? 9 : 8}>
                  <div className="empty-state">
                    <span className="material-icons" style={{ animation: 'spin 1s linear infinite', fontSize: 40, color: '#94a3b8' }}>refresh</span>
                    <h3>Loading students…</h3>
                  </div>
                </td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={selectionMode ? 9 : 8}>
                  <div className="empty-state" style={{ padding: '48px 24px', textAlign: 'center' }}>
                    <span className="material-icons" style={{ fontSize: 56, color: '#c7d2fe', display: 'block', marginBottom: 12 }}>
                      {students.length === 0 ? 'school' : 'search_off'}
                    </span>
                    <h3 style={{ color: '#1e293b', fontWeight: 700, margin: '0 0 6px' }}>
                      {students.length === 0 ? 'No students yet' : 'No students match your search'}
                    </h3>
                    <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: 14 }}>
                      {students.length === 0
                        ? 'Add your first student to get started.'
                        : 'Try adjusting your search or filter criteria.'}
                    </p>
                    {students.length === 0 && (
                      <button onClick={() => openAddModal()} className="btn btn-primary" style={{ borderRadius: 8 }}>
                        + Add First Student
                      </button>
                    )}
                  </div>
                </td></tr>
              ) : paginated.map(s => (
                <tr key={s.id} style={{ background: selectionMode && selectedIds.has(s.id) ? '#fff5f5' : undefined }}>
                  {selectionMode && (
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        style={{ cursor: 'pointer', width: 15, height: 15, accentColor: '#e53e3e' }}
                      />
                    </td>
                  )}
                  <td>
                    <div className="student-cell">
                      {s.photo ? (
                        <img src={s.photo} alt={s.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <div className="student-avatar-sm">{getInitials(s.name)}</div>
                      )}
                      <div>
                        <div className="student-name">{s.name}</div>
                        <div className="student-class">DOB: {formatDOB(s.dob)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#718096', fontWeight: 600 }}>{s.rollNo}</td>
                  <td><span style={{ fontSize: '13px', fontWeight: 700 }}>{String(s.class || '—').replace(/^Class\s+/i, '')}</span></td>
                  <td><span style={{ padding: '2px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 700, background: '#3182ce20', color: '#2b6cb0' }}>{s.section || '—'}</span></td>
                  <td style={{ fontSize: '13px' }}>{s.fatherName || s.parent || '—'}</td>
                  <td style={{ fontSize: '12px', color: '#718096' }}>{s.fatherPhone || s.mobile || '—'}</td>
                  <td><span className={`status-badge ${s.status === 'Active' ? 'status-present' : 'status-absent'}`}>{s.status}</span></td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn action-btn-view" title="View" onClick={() => { setSelectedStudent(s); setShowViewModal(true); }}>
                        <span className="material-icons">visibility</span>
                      </button>
                      <button className="action-btn action-btn-edit" onClick={() => openEditModal(s)} title="Edit">
                        <span className="material-icons">edit</span>
                      </button>
                      <button className="action-btn" title="View Login Credentials"
                        onClick={() => handleViewCredentials(s)}
                        style={{ color: '#6d28d9', background: '#f5f3ff', border: '1px solid #ddd6fe' }}>
                        <span className="material-icons" style={{ fontSize: 16 }}>key</span>
                      </button>
                      <button className="action-btn action-btn-delete" onClick={() => setDeleteTarget(s)} title="Delete">
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="pagination-bar">
            <div className="pagination-info">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
            </div>
            <div className="pagination-controls">
              <button className="page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                <span className="material-icons" style={{ fontSize: '16px' }}>chevron_left</span>
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>{p}</button>
              ))}
              <button className="page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                <span className="material-icons" style={{ fontSize: '16px' }}>chevron_right</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════
          Add / Edit Modal
      ══════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl" style={{ maxWidth: 860 }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-icons" style={{ color: '#0de1e8', fontSize: 20 }}>
                    {editStudent ? 'edit' : 'person_add'}
                  </span>
                  {editStudent ? 'Edit Student' : 'Add New Student'}
                </h5>
                <button className="btn-close" onClick={() => { setShowModal(false); resetStudentOtp(); }} />
              </div>

              <form onSubmit={handleSave}>
                <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>

                  {/* ── Photo ─────────────────────────────────────────────── */}
                  <div className="text-center mb-2">
                    <div
                      onClick={() => photoRef.current?.click()}
                      style={{
                        width: 88, height: 88, borderRadius: '50%', margin: '0 auto',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#f0f4f8', border: '2px dashed #e2e8f0', cursor: 'pointer',
                        position: 'relative', overflow: 'hidden',
                      }}>
                      {photoPreview
                        ? <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                        : <span className="material-icons" style={{ fontSize: 38, color: '#a0aec0' }}>person</span>
                      }
                      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 26, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-icons" style={{ fontSize: 14, color: '#fff' }}>camera_alt</span>
                      </div>
                    </div>
                    <p style={{ fontSize: 11, color: '#a0aec0', marginTop: 6 }}>Click to upload student photo</p>
                    <input ref={photoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} />
                  </div>

                  {/* ── Section 1: Basic Information ─────────────────────── */}
                  <SectionLabel icon="badge" text="Basic Information" />
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label fw-medium small">Full Name *</label>
                      <input type="text" className={`form-control form-control-sm ${errors.name ? 'is-invalid' : ''}`}
                        placeholder="Enter student's full name" value={formData.name}
                        onChange={set('name')} />
                      {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium small">
                        Roll Number *
                        {capacityInfo?.capacity && <span style={{ color: '#a0aec0', fontWeight: 400, marginLeft: 4 }}>(1–{capacityInfo.capacity})</span>}
                      </label>
                      <input type="number" className={`form-control form-control-sm ${errors.rollNo ? 'is-invalid' : ''}`}
                        placeholder={capacityInfo?.capacity ? `1 to ${capacityInfo.capacity}` : 'e.g., 1'}
                        value={formData.rollNo}
                        min="1"
                        max={capacityInfo?.capacity || undefined}
                        onChange={set('rollNo')} />
                      {errors.rollNo && <div className="invalid-feedback">{errors.rollNo}</div>}
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium small">Admission Number</label>
                      <input type="text" className="form-control form-control-sm"
                        placeholder="e.g., ADM2024001" value={formData.admissionNumber}
                        onChange={set('admissionNumber')} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium small">Class *</label>
                      <select
                        className={`form-select form-select-sm ${errors.class ? 'is-invalid' : ''}`}
                        value={formData.class}
                        onChange={e => {
                          // Only clear section/rollNo when class actually changes (not on accidental same-class click)
                          if (e.target.value !== formData.class) {
                            setFormData(fd => ({ ...fd, class: e.target.value, section: '', rollNo: '' }));
                          }
                        }}
                      >
                        <option value="">Select Class</option>
                        {classNames.length === 0
                          ? <option disabled>No classes added yet — add in Class Module</option>
                          : classNames.map(n => <option key={n} value={n}>{n}</option>)
                        }
                      </select>
                      {errors.class && <div className="invalid-feedback">{errors.class}</div>}
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium small">Section</label>
                      <select
                        className="form-select form-select-sm"
                        value={formData.section}
                        onChange={set('section')}
                        disabled={!formData.class}
                      >
                        <option value="">Select Section</option>
                        {sectionsForClass.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {/* Capacity indicator */}
                    {formData.class && (
                      <div className="col-12" style={{ paddingTop: 2, paddingBottom: 2 }}>
                        {capacityChecking ? (
                          <div style={{ fontSize: 12, color: '#718096' }}>Checking class capacity…</div>
                        ) : capacityInfo ? (
                          capacityInfo.isFull ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, padding: '8px 12px' }}>
                              <span className="material-icons" style={{ fontSize: 18, color: '#c53030' }}>block</span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: '#c53030' }}>Maximum capacity reached for this class. Cannot add more students.</div>
                                <div style={{ fontSize: 12, color: '#e53e3e' }}>{capacityInfo.enrolled}/{capacityInfo.capacity} seats filled</div>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '8px 12px' }}>
                              <span className="material-icons" style={{ fontSize: 18, color: '#276749' }}>check_circle</span>
                              <div style={{ fontSize: 12, color: '#276749' }}>
                                {capacityInfo.available} seat{capacityInfo.available !== 1 ? 's' : ''} available ({capacityInfo.enrolled}/{capacityInfo.capacity} filled)
                              </div>
                            </div>
                          )
                        ) : null}
                      </div>
                    )}
                    <div className="col-md-4">
                      <label className="form-label fw-medium small">Date of Birth</label>
                      <input type="date" className="form-control form-control-sm"
                        value={formData.dob} max={new Date().toISOString().split('T')[0]}
                        onChange={set('dob')} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium small">Status</label>
                      <select className="form-select form-select-sm" value={formData.status} onChange={set('status')}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label fw-medium small">Gender</label>
                      <select className="form-select form-select-sm" value={formData.gender} onChange={set('gender')}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    {/* Student email — required, OTP-verified */}
                    <div className="col-12">
                      <label className="form-label fw-medium small">
                        Student Email <span style={{ color: '#e53e3e' }}>*</span>
                      </label>
                      {editStudent ? (
                        <input type="email"
                          className={`form-control form-control-sm ${errors.studentEmail ? 'is-invalid' : ''}`}
                          placeholder="student@example.com"
                          value={formData.studentEmail || ''}
                          onChange={e => setFormData(fd => ({ ...fd, studentEmail: e.target.value.replace(/\s/g, '') }))}
                        />
                      ) : (
                        <>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <input type="email"
                              className={`form-control form-control-sm ${errors.studentEmail ? 'is-invalid' : ''}`}
                              placeholder="student@example.com"
                              value={formData.studentEmail || ''}
                              onChange={e => { setFormData(fd => ({ ...fd, studentEmail: e.target.value.replace(/\s/g, '') })); resetStudentOtp(); }}
                            />
                            {!studentOtp.verified && (
                              <button type="button" onClick={handleStudentSendOtp} disabled={studentOtp.sending}
                                style={{ flexShrink: 0, padding: '6px 14px', background: studentOtp.sending ? '#a0aec0' : '#0369a1', border: 'none', borderRadius: 6, cursor: studentOtp.sending ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap' }}>
                                {studentOtp.sending ? 'Sending…' : studentOtp.sent ? 'Resend OTP' : 'Send OTP'}
                              </button>
                            )}
                            {studentOtp.verified && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#276749', fontWeight: 600, fontSize: 13, flexShrink: 0 }}>
                                <span className="material-icons" style={{ fontSize: 18, color: '#38a169' }}>verified</span>
                                Verified
                              </span>
                            )}
                          </div>
                          {studentOtp.sent && !studentOtp.verified && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                              <input type="text" inputMode="numeric" maxLength={6}
                                placeholder="Enter 6-digit OTP"
                                value={studentOtp.value}
                                onChange={e => setStudentOtp(s => ({ ...s, value: e.target.value.replace(/\D/g, '').slice(0, 6), error: '' }))}
                                className="form-control form-control-sm"
                                style={{ letterSpacing: 4, fontWeight: 700, flex: 1 }}
                              />
                              <button type="button" onClick={handleStudentVerifyOtp} disabled={studentOtp.verifying}
                                style={{ flexShrink: 0, padding: '6px 14px', background: '#276749', border: 'none', borderRadius: 6, cursor: studentOtp.verifying ? 'not-allowed' : 'pointer', color: '#fff', fontSize: 12, fontWeight: 600, fontFamily: 'Poppins, sans-serif', whiteSpace: 'nowrap' }}>
                                {studentOtp.verifying ? 'Verifying…' : 'Verify'}
                              </button>
                            </div>
                          )}
                          {(studentOtp.error || errors.studentEmail) && (
                            <div style={{ fontSize: 12, color: '#e53e3e', marginTop: 4 }}>
                              {studentOtp.error || errors.studentEmail}
                            </div>
                          )}
                        </>
                      )}
                      {editStudent && errors.studentEmail && (
                        <div className="invalid-feedback">{errors.studentEmail}</div>
                      )}
                    </div>
                  </div>

                  {/* ── Section 2: Parent & Guardian Information ─────────── */}
                  <SectionLabel icon="family_restroom" text="Parent & Guardian Information" />
                  <div className="row g-3">
                    {/* Father */}
                    <div className="col-12">
                      <div style={{ background: '#f7fafc', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-icons" style={{ fontSize: 16, color: '#3182ce' }}>man</span> Father's Details
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-medium small">Father's Name *</label>
                            <input type="text" className={`form-control form-control-sm ${errors.fatherName ? 'is-invalid' : ''}`}
                              placeholder="Father's full name" value={formData.fatherName}
                              onChange={set('fatherName')} />
                            {errors.fatherName && <div className="invalid-feedback">{errors.fatherName}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium small">Father's Phone *</label>
                            <input type="tel" className={`form-control form-control-sm ${errors.fatherPhone ? 'is-invalid' : ''}`}
                              placeholder="10-digit number" value={formData.fatherPhone}
                              onChange={setPhone('fatherPhone')} maxLength={10} inputMode="numeric" />
                            {errors.fatherPhone && <div className="invalid-feedback">{errors.fatherPhone}</div>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mother */}
                    <div className="col-12">
                      <div style={{ background: '#f7fafc', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-icons" style={{ fontSize: 16, color: '#d63384' }}>woman</span> Mother's Details
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-medium small">Mother's Name *</label>
                            <input type="text" className={`form-control form-control-sm ${errors.motherName ? 'is-invalid' : ''}`}
                              placeholder="Mother's full name" value={formData.motherName}
                              onChange={set('motherName')} />
                            {errors.motherName && <div className="invalid-feedback">{errors.motherName}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium small">Mother's Phone *</label>
                            <input type="tel" className={`form-control form-control-sm ${errors.motherPhone ? 'is-invalid' : ''}`}
                              placeholder="10-digit number" value={formData.motherPhone}
                              onChange={setPhone('motherPhone')} maxLength={10} inputMode="numeric" />
                            {errors.motherPhone && <div className="invalid-feedback">{errors.motherPhone}</div>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Guardian */}
                    <div className="col-12">
                      <div style={{ background: '#f7fafc', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-icons" style={{ fontSize: 16, color: '#805ad5' }}>supervisor_account</span>
                          Guardian's Details <span style={{ fontWeight: 400, color: '#a0aec0', fontSize: 11 }}>(Optional)</span>
                        </div>
                        <div className="row g-3">
                          <div className="col-md-6">
                            <label className="form-label fw-medium small">Guardian Name <span className="text-muted">(Optional)</span></label>
                            <input type="text" className="form-control form-control-sm"
                              placeholder="Guardian's full name" value={formData.guardianName}
                              onChange={set('guardianName')} />
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-medium small">Guardian Phone <span className="text-muted">(Optional)</span></label>
                            <input type="tel" className={`form-control form-control-sm ${errors.guardianPhone ? 'is-invalid' : ''}`}
                              placeholder="10-digit number" value={formData.guardianPhone}
                              onChange={setPhone('guardianPhone')} maxLength={10} inputMode="numeric" />
                            {errors.guardianPhone && <div className="invalid-feedback">{errors.guardianPhone}</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Section 3: Address ───────────────────────────────── */}
                  <SectionLabel icon="home" text="Address Details" />
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label fw-medium small">Permanent Address *</label>
                      <textarea className={`form-control form-control-sm ${errors.permanentAddress ? 'is-invalid' : ''}`}
                        rows={2} placeholder="House No, Street, Area, City, State, PIN"
                        value={formData.permanentAddress} onChange={set('permanentAddress')} />
                      {errors.permanentAddress && <div className="invalid-feedback">{errors.permanentAddress}</div>}
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-medium small">Alternate / Current Address <span className="text-muted">(Optional)</span></label>
                      <textarea className="form-control form-control-sm"
                        rows={2} placeholder="Leave blank if same as permanent address"
                        value={formData.alternateAddress} onChange={set('alternateAddress')} />
                    </div>
                  </div>

                  {/* ── Section 4: Documents ─────────────────────────────── */}
                  <SectionLabel icon="folder_open" text="Documents" />
                  <div className="row g-3">
                    <div className="col-md-4">
                      <DocUpload
                        label="ID Proof" required
                        fileData={formData.idProof}
                        fileName={formData.idProofName}
                        inputRef={idProofRef}
                        onChange={handleDocChange('idProof', 'idProofName')}
                        onClear={clearDoc('idProof', 'idProofName')}
                      />
                      {errors.idProof && (
                        <div style={{ color: '#e53e3e', fontSize: 12, marginTop: 4 }}>{errors.idProof}</div>
                      )}
                    </div>
                    <div className="col-md-4">
                      <DocUpload
                        label="Transfer Certificate (TC)"
                        fileData={formData.tcDocument}
                        fileName={formData.tcDocumentName}
                        inputRef={tcRef}
                        onChange={handleDocChange('tcDocument', 'tcDocumentName')}
                        onClear={clearDoc('tcDocument', 'tcDocumentName')}
                      />
                    </div>
                    <div className="col-md-4">
                      <DocUpload
                        label="Bonafide Certificate"
                        fileData={formData.bonafideDocument}
                        fileName={formData.bonafideDocumentName}
                        inputRef={bonafideRef}
                        onChange={handleDocChange('bonafideDocument', 'bonafideDocumentName')}
                        onClear={clearDoc('bonafideDocument', 'bonafideDocumentName')}
                      />
                    </div>
                  </div>

                </div>{/* end modal-body */}

                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetStudentOtp(); }} disabled={saving}>Cancel</button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ background: (!editStudent && capacityInfo?.isFull) ? '#a0aec0' : '#0de1e8', border: 'none', minWidth: 120 }}
                    disabled={saving || (!editStudent && capacityInfo?.isFull)}
                    title={(!editStudent && capacityInfo?.isFull) ? 'Maximum capacity reached for this class. Cannot add more students.' : undefined}
                  >
                    {saving ? (editStudent ? 'Updating…' : 'Adding…') : (editStudent ? 'Update Student' : 'Add Student')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          View Modal
      ══════════════════════════════════════════════════════════ */}
      {showViewModal && selectedStudent && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg" style={{ maxWidth: 720 }}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Student Profile</h5>
                <button className="btn-close" onClick={() => setShowViewModal(false)} />
              </div>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>

                {/* Profile header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'linear-gradient(135deg,#0de1e8,#0eb5da)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
                  {selectedStudent.photo
                    ? <img src={selectedStudent.photo} alt={selectedStudent.name} style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '3px solid rgba(255,255,255,0.4)' }} />
                    : <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#fff', border: '3px solid rgba(255,255,255,0.4)' }}>{getInitials(selectedStudent.name)}</div>
                  }
                  <div>
                    <h5 style={{ color: '#fff', marginBottom: 4, fontSize: 20, fontWeight: 700 }}>{selectedStudent.name}</h5>
                    <p style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 8, fontSize: 13 }}>
                      {selectedStudent.rollNo} · Class {selectedStudent.class}{selectedStudent.section ? `-${selectedStudent.section}` : ''}
                    </p>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {selectedStudent.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <ViewSection title="Basic Information" icon="badge">
                  <ViewRow label="Date of Birth" value={formatDOB(selectedStudent.dob)} />
                  <ViewRow label="Class / Section" value={`Class ${(selectedStudent.class || '').replace(/^class\s+/i, '')}${selectedStudent.section ? `-${selectedStudent.section}` : ''}`} />
                  <ViewRow label="Roll Number" value={selectedStudent.rollNo} mono />
                  <ViewRow label="Admission Number" value={selectedStudent.admissionNumber} mono />
                  {selectedStudent.gender && <ViewRow label="Gender" value={selectedStudent.gender} />}
                  {selectedStudent.bloodGroup && <ViewRow label="Blood Group" value={selectedStudent.bloodGroup} />}
                </ViewSection>

                {/* Parents */}
                <ViewSection title="Parent & Guardian" icon="family_restroom">
                  <ViewRow label="Father's Name" value={selectedStudent.fatherName || selectedStudent.parent} />
                  <ViewRow label="Father's Phone" value={selectedStudent.fatherPhone || selectedStudent.mobile} mono />
                  <ViewRow label="Mother's Name" value={selectedStudent.motherName} />
                  <ViewRow label="Mother's Phone" value={selectedStudent.motherPhone} mono />
                  {(selectedStudent.guardianName) && <>
                    <ViewRow label="Guardian Name" value={selectedStudent.guardianName} />
                    <ViewRow label="Guardian Phone" value={selectedStudent.guardianPhone} mono />
                  </>}
                </ViewSection>

                {/* Address */}
                <ViewSection title="Address" icon="home">
                  <ViewRow label="Permanent Address" value={selectedStudent.permanentAddress || selectedStudent.address} />
                  {selectedStudent.alternateAddress && (
                    <ViewRow label="Alternate Address" value={selectedStudent.alternateAddress} />
                  )}
                </ViewSection>

                {/* Documents */}
                <ViewSection title="Documents" icon="folder_open">
                  <DocViewRow label="ID Proof" fileName={selectedStudent.idProofName} fileData={selectedStudent.idProof} required />
                  <DocViewRow label="Transfer Certificate (TC)" fileName={selectedStudent.tcDocumentName} fileData={selectedStudent.tcDocument} />
                  <DocViewRow label="Bonafide Certificate" fileName={selectedStudent.bonafideDocumentName} fileData={selectedStudent.bonafideDocument} />
                </ViewSection>

              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
                <button className="btn btn-primary" style={{ background: '#0de1e8', border: 'none' }}
                  onClick={() => { setShowViewModal(false); openEditModal(selectedStudent); }}>
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>person_remove</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: '#1a202c' }}>
                Are you sure you want to delete this student?
              </h3>
              <p style={{ fontSize: 13, color: '#4a5568', margin: '0 0 4px', fontWeight: 600 }}>
                {deleteTarget.name}
              </p>
              <p style={{ fontSize: 12, color: '#718096', margin: '0 0 20px' }}>
                Roll No: {deleteTarget.rollNo || deleteTarget.rollNumber} &nbsp;·&nbsp;
                {deleteTarget.class || deleteTarget.className}
                {deleteTarget.section ? ` – ${deleteTarget.section}` : ''}
              </p>
              <div style={{ padding: '10px 14px', background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, fontSize: 12, color: '#c53030', marginBottom: 20, textAlign: 'left', display: 'flex', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
                <span>This action cannot be undone. If this is the only student in the class, the class will also be removed.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  style={{ padding: '9px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  style={{ padding: '9px 22px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── View Existing Student Credentials Modal ─────────────────────── */}
      {viewCredTarget && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,#6d28d9,#4c1d95)', color: '#fff' }}>
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 18 }}>key</span>
                Student Login Credentials
              </span>
              <button className="modal-close" onClick={() => setViewCredTarget(null)} style={{ color: '#fff', opacity: 0.8 }}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#f5f3ff', border: '3px solid #ddd6fe', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <span className="material-icons" style={{ fontSize: 26, color: '#6d28d9' }}>school</span>
                </div>
                <h3 style={{ margin: '0 0 2px', fontWeight: 800, fontSize: 15, color: '#2d3748' }}>{viewCredTarget.studentName}</h3>
                <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: viewCredTarget.isActive ? '#f0fff4' : '#fff5f5', color: viewCredTarget.isActive ? '#38a169' : '#e53e3e', fontWeight: 700 }}>
                  {viewCredTarget.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <CredentialCard label="Admission Number (Login ID)" value={viewCredTarget.email?.split('@')[0]} mono />
                {viewCredTarget.firstLogin && viewCredTarget.tempPassword ? (
                  <CredentialCard label="Temporary Password" value={viewCredTarget.tempPassword} mono />
                ) : (
                  <div style={{ background: '#f7fafc', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 11, color: '#a0aec0', fontWeight: 600, marginBottom: 4 }}>Password</div>
                    <div style={{ fontSize: 13, color: '#718096', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-icons" style={{ fontSize: 15, color: '#38a169' }}>check_circle</span>
                      Student has already logged in and changed their password.
                    </div>
                  </div>
                )}
              </div>

              {viewCredTarget.firstLogin && (
                <div style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span className="material-icons" style={{ fontSize: 15, color: '#d69e2e', flexShrink: 0, marginTop: 1 }}>warning</span>
                  <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                    Student has <strong>not logged in yet</strong>. This temporary password will disappear after first login.
                  </p>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setViewCredTarget(null)}
                style={{ padding: '10px 28px', background: '#6d28d9', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student + Parent Credentials Modal ──────────────────────────── */}
      {showCred && newCredential && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>

            {/* Header */}
            <div className="modal-header" style={{ background: 'linear-gradient(135deg,#0de1e8,#5aa832)', color: '#fff' }}>
              <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 18 }}>key</span>
                Login Credentials Generated
              </span>
              <button className="modal-close" onClick={() => setShowCred(false)} style={{ color: '#fff', opacity: 0.8 }}>
                <span className="material-icons">close</span>
              </button>
            </div>

            <div className="modal-body" style={{ padding: '24px', maxHeight: '72vh', overflowY: 'auto' }}>

              {/* Success banner */}
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#f0fff4', border: '3px solid #9ae6b4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                  <span className="material-icons" style={{ fontSize: 30, color: '#38a169' }}>check_circle</span>
                </div>
                <h3 style={{ margin: '0 0 4px', fontWeight: 800, color: '#2d3748', fontSize: 16 }}>
                  Student Added Successfully!
                </h3>
                <p style={{ margin: 0, fontSize: 13, color: '#718096' }}>
                  Credentials have been generated for <strong>{newCredential.studentName}</strong>. Share them securely.
                </p>
              </div>

              {/* ── Student Credentials ── */}
              {newCredential.studentPassword && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: '#ebf8ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-icons" style={{ fontSize: 15, color: '#3182ce' }}>school</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: '#2d3748', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Login</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <CredentialCard label="Admission Number (Login ID)" value={newCredential.studentUsername} mono />
                    <CredentialCard label="Password" value={newCredential.studentPassword} mono />
                  </div>
                </div>
              )}

              {/* Copy All */}
              <button
                onClick={() => {
                  const text = `Student Login\nAdmission Number: ${newCredential.studentUsername}\nPassword: ${newCredential.studentPassword}`;
                  navigator.clipboard.writeText(text);
                  showToast('Credentials copied to clipboard');
                }}
                style={{ width: '100%', padding: '9px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#f7fafc', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#4a5568', marginBottom: 14 }}>
                <span className="material-icons" style={{ fontSize: 16 }}>content_copy</span>
                Copy All Credentials
              </button>

              {/* Warning */}
              <div style={{ background: '#fffbeb', border: '1.5px solid #fef3c7', borderRadius: 10, padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span className="material-icons" style={{ fontSize: 16, color: '#d69e2e', flexShrink: 0, marginTop: 1 }}>warning</span>
                <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.5 }}>
                  These passwords are shown <strong>only once</strong>. Passwords are stored securely (bcrypt hashed). Share directly with the student — they can reset after first login.
                </p>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => setShowCred(false)}
                style={{ padding: '10px 32px', background: '#0de1e8', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'Poppins, sans-serif' }}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirm */}
      {bulkDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-body" style={{ textAlign: 'center', padding: '32px 28px' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', margin: '0 auto 16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>delete_sweep</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px', color: '#1a202c' }}>
                Delete {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''}?
              </h3>
              <p style={{ fontSize: 13, color: '#718096', margin: '0 0 16px' }}>
                You have selected <strong style={{ color: '#2d3748' }}>{selectedIds.size}</strong> student{selectedIds.size !== 1 ? 's' : ''} for deletion.
              </p>
              <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#c53030', marginBottom: 20, textAlign: 'left', display: 'flex', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>warning</span>
                <span>This will permanently delete all selected students and cannot be undone.</span>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button
                  onClick={() => setBulkDeleteConfirm(false)}
                  disabled={bulkDeleting}
                  style={{ padding: '9px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={bulkDeleting}
                  style={{ padding: '9px 22px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: bulkDeleting ? 'not-allowed' : 'pointer', opacity: bulkDeleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {bulkDeleting ? (
                    <><span className="material-icons" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>refresh</span> Deleting…</>
                  ) : (
                    <>Delete {selectedIds.size} Student{selectedIds.size !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Export Modal */}
      {showExportModal && (
        <StudentExportModal
          students={students}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onImportDone={() => {
            setShowBulkImport(false);
            loadStudents();
          }}
        />
      )}

      {/* Promote Class Modal */}
      {showPromoteModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div style={{ padding: '24px 28px' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#fffff0', border: '1.5px solid #d69e2e', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-icons" style={{ fontSize: 22, color: '#b7791f' }}>upgrade</span>
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#1a202c' }}>Promote Class</div>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>Move all students from one class to the next. Historical data (marks, fees, attendance) is preserved.</div>
                </div>
              </div>

              <div style={{ background: '#fffbeb', border: '1px solid #f6e05e', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#744210', marginBottom: 20, display: 'flex', gap: 8 }}>
                <span className="material-icons" style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>info</span>
                <span>All students currently in the <strong>source</strong> class/section will be moved to the <strong>target</strong> class/section. This action cannot be undone.</span>
              </div>

              {/* From */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>From (Current Class)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#718096', fontWeight: 600, display: 'block', marginBottom: 4 }}>Class *</label>
                    <select
                      value={promoteForm.fromClass}
                      onChange={e => setPromoteForm(f => ({ ...f, fromClass: e.target.value, fromSection: '' }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                    >
                      <option value="">Select class</option>
                      {classNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#718096', fontWeight: 600, display: 'block', marginBottom: 4 }}>Section</label>
                    <select
                      value={promoteForm.fromSection}
                      onChange={e => setPromoteForm(f => ({ ...f, fromSection: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                    >
                      <option value="">All sections</option>
                      {availableClasses.filter(c => c.name === promoteForm.fromClass).map(c => (
                        <option key={c.section} value={c.section}>{c.section || '—'}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <span className="material-icons" style={{ fontSize: 28, color: '#b7791f' }}>arrow_downward</span>
              </div>

              {/* To */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#4a5568', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>To (Target Class)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#718096', fontWeight: 600, display: 'block', marginBottom: 4 }}>Class *</label>
                    <select
                      value={promoteForm.toClass}
                      onChange={e => setPromoteForm(f => ({ ...f, toClass: e.target.value, toSection: '' }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                    >
                      <option value="">Select class</option>
                      {classNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: '#718096', fontWeight: 600, display: 'block', marginBottom: 4 }}>Section</label>
                    <select
                      value={promoteForm.toSection}
                      onChange={e => setPromoteForm(f => ({ ...f, toSection: e.target.value }))}
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
                    >
                      <option value="">Same / no section</option>
                      {availableClasses.filter(c => c.name === promoteForm.toClass).map(c => (
                        <option key={c.section} value={c.section}>{c.section || '—'}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowPromoteModal(false)}
                  disabled={promoting}
                  style={{ padding: '9px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={handlePromote}
                  disabled={promoting || !promoteForm.fromClass || !promoteForm.toClass}
                  style={{ padding: '9px 22px', background: '#d69e2e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: (promoting || !promoteForm.fromClass || !promoteForm.toClass) ? 'not-allowed' : 'pointer', opacity: (promoting || !promoteForm.fromClass || !promoteForm.toClass) ? 0.65 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {promoting ? (
                    <><span className="material-icons" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>refresh</span> Promoting…</>
                  ) : (
                    <><span className="material-icons" style={{ fontSize: 16 }}>upgrade</span> Promote Students</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// ─── View modal helpers ───────────────────────────────────────────────────────
function ViewSection({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #f0f4f8' }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#0de1e8' }}>{icon}</span>
        <span style={{ fontWeight: 700, fontSize: 12, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</span>
      </div>
      <table className="table table-sm mb-0">
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ViewRow({ label, value, mono }) {
  return (
    <tr>
      <td className="text-muted fw-medium" style={{ width: '36%', fontSize: 13 }}>{label}</td>
      <td style={{ fontSize: 13, fontFamily: mono ? 'monospace' : undefined }}>{value || '—'}</td>
    </tr>
  );
}

function DocViewRow({ label, fileName, fileData, required }) {
  return (
    <tr>
      <td className="text-muted fw-medium" style={{ width: '36%', fontSize: 13 }}>{label}</td>
      <td>
        {fileName && fileData ? (
          <a href={fileData} download={fileName} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '4px 12px', textDecoration: 'none', color: '#276749', fontSize: 12, fontWeight: 600 }}>
            <span className="material-icons" style={{ fontSize: 15 }}>download</span>
            {fileName}
          </a>
        ) : (
          <span style={{ color: required ? '#e53e3e' : '#a0aec0', fontSize: 12 }}>
            {required ? 'Not uploaded' : 'Not provided'}
          </span>
        )}
      </td>
    </tr>
  );
}
