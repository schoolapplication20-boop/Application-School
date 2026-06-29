import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Layout from '../../components/Layout';
import StudentExportModal from '../../components/StudentExportModal';
import BulkImportModal from '../../components/BulkImportModal';
import { sortClassNames } from '../../utils/classOrder';
import { useToast } from '../../context/ToastContext';
import {
  fetchStudents as apiFetchStudents,
  createStudent as apiCreateStudent,
  updateStudent as apiUpdateStudent,
  deleteStudent as apiDeleteStudent,
} from '../../services/studentService';
import { adminAPI, onboardingVerifyAPI } from '../../services/api';
import { EMPTY_FORM, PAGE_SIZE, phoneOnly } from './students/constants';
import StudentsTable from './students/StudentsTable';
import StudentFormModal from './students/StudentFormModal';
import StudentProfileModal from './students/StudentProfileModal';
import DeleteStudentModal from './students/DeleteStudentModal';
import ViewCredentialsModal from './students/ViewCredentialsModal';
import CredentialsModal from './students/CredentialsModal';
import BulkDeleteModal from './students/BulkDeleteModal';
import PromoteClassModal from './students/PromoteClassModal';
import OnboardStudentModal from './students/OnboardStudentModal';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Students() {
  const [students, setStudents]         = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages]     = useState(0);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterClass, setFilterClass]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage]   = useState(0); // 0-based (matches Spring Page)
  const [showModal, setShowModal]       = useState(false);
  const [showExportModal, setShowExportModal]   = useState(false);
  const [showBulkImport, setShowBulkImport]     = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editStudent, setEditStudent]   = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [errors, setErrors]             = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null); // full student object
  const [saving, setSaving]             = useState(false);
  const [showCred, setShowCred]         = useState(false);   // after-add credentials
  const [newCredential, setNewCredential] = useState(null);  // { name, email, mobile, password }
  const [viewCredTarget, setViewCredTarget] = useState(null); // { studentName, username, tempPassword, firstLogin }
  const [loadingCred, setLoadingCred]   = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [apiStatus, setApiStatus]       = useState(null); // 'live' | 'offline'
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [totalActive, setTotalActive]     = useState(0);
  const [totalInactive, setTotalInactive] = useState(0);
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

  // Onboard (create account for students imported without email)
  const [onboardTarget, setOnboardTarget] = useState(null);
  const [onboardEmail, setOnboardEmail]   = useState('');
  const [onboarding, setOnboarding]       = useState(false);
  const [onboardResult, setOnboardResult] = useState(null);

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

  // Load the current page from the server — passes all active filters.
  // Called on mount, on filter/search change (page resets to 0), and after mutations.
  const loadStudents = useCallback((overridePage) => {
    const pg = overridePage !== undefined ? overridePage : currentPage;
    setLoadingStudents(true);
    const base = { search: searchTerm, className: filterClass };
    Promise.all([
      apiFetchStudents({ page: pg, size: PAGE_SIZE, ...base, status: filterStatus }),
      apiFetchStudents({ page: 0, size: 1, ...base, status: 'Active' }),
      apiFetchStudents({ page: 0, size: 1, ...base, status: 'Inactive' }),
    ])
      .then(([main, active, inactive]) => {
        setStudents(main.content);
        setTotalElements(main.totalElements);
        setTotalPages(main.totalPages);
        setTotalActive(active.totalElements);
        setTotalInactive(inactive.totalElements);
        setApiStatus('live');
      })
      .catch(() => setApiStatus('offline'))
      .finally(() => setLoadingStudents(false));
  }, [currentPage, searchTerm, filterClass, filterStatus]);

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
    () => [...new Set(availableClasses.map(c => c.name))].sort(sortClassNames),
    [availableClasses]
  );

  // Sections for the currently selected class
  const sectionsForClass = useMemo(
    () => availableClasses.filter(c => c.name === formData.class).map(c => c.section).sort(),
    [availableClasses, formData.class]
  );

  // Reload whenever page, search, or filters change
  useEffect(() => { loadStudents(); }, [loadStudents]);

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

  const showToast = useToast();

  // Server now handles filtering — `students` is already the current page of results
  const filtered = students;   // alias kept so downstream JSX references still work
  const paginated = students;  // same — server returns exactly PAGE_SIZE rows

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
    if (!editStudent && !formData.admissionNumber.trim())
      e.admissionNumber = 'Admission number is required to generate login credentials';
    if (!formData.class.trim())           e.class       = 'Class is required';
    if (!formData.fatherName.trim())      e.fatherName  = "Father's name is required";
    if (!formData.motherName.trim())      e.motherName  = "Mother's name is required";
    if (!formData.fatherPhone.trim())     e.fatherPhone = "Father's phone is required";
    else if (!/^\d{10}$/.test(formData.fatherPhone)) e.fatherPhone = 'Must be exactly 10 digits';
    if (!formData.motherPhone.trim())     e.motherPhone = "Mother's phone is required";
    else if (!/^\d{10}$/.test(formData.motherPhone)) e.motherPhone = 'Must be exactly 10 digits';
    if (formData.guardianPhone && !/^\d{10}$/.test(formData.guardianPhone)) e.guardianPhone = 'Must be exactly 10 digits';
    if (!formData.permanentAddress.trim()) e.permanentAddress = 'Permanent address is required';
    if (!editStudent && formData.studentEmail?.trim()) {
      // Email is optional — only validate format and OTP if provided
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.studentEmail.trim()))
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
    setCurrentPage(0);
    loadStudents(0);
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

  const handleOnboard = async () => {
    if (!onboardEmail.trim() || !onboardTarget) return;
    setOnboarding(true);
    try {
      const res = await adminAPI.onboardStudent(onboardTarget.id, onboardEmail.trim());
      setOnboardResult(res.data?.data || {});
      loadStudents();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create account.', 'error');
    } finally { setOnboarding(false); }
  };

  const handleViewCredentials = async (student) => {
    setLoadingCred(true);
    try {
      const res = await adminAPI.getStudentCredentials(student.id);
      const d = res.data?.data || {};
      setViewCredTarget({
        studentId:   student.id,
        studentName: student.name,
        email:        d.email,
        username:     d.username,
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

  const handleResetPassword = async (student) => {
    try {
      const res = await adminAPI.resetStudentPassword(student.studentId || student.id);
      const d = res.data?.data || {};
      setViewCredTarget(prev => ({
        ...prev,
        username:    d.username    || prev?.username,
        email:       d.loginEmail  || prev?.email,
        tempPassword: d.tempPassword,
        firstLogin:  true,
        isActive:    true,
      }));
      showToast('Password reset. Share the new temp password with the student.', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to reset password.', 'error');
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
    () => [...new Set(availableClasses.map(c => c.name))].sort(sortClassNames),
    [availableClasses]
  );

  return (
    <Layout pageTitle="Students">
      <div className="page-header">
        <h1>Student Management</h1>
        <p>Manage and view all enrolled students ({totalElements} total)</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Students', value: totalElements,                                        icon: 'school',       color: '#0de1e8' },
          { label: 'Active',         value: totalActive,   icon: 'check_circle', color: '#22c55e' },
          { label: 'Inactive',       value: totalInactive, icon: 'cancel',       color: '#e53e3e' },
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

      <StudentsTable
        loadingStudents={loadingStudents} students={students} paginated={paginated} totalElements={totalElements}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm} setCurrentPage={setCurrentPage}
        filterClass={filterClass} setFilterClass={setFilterClass} filterClassOptions={filterClassOptions}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus} totalActive={totalActive} totalInactive={totalInactive}
        setShowBulkImport={setShowBulkImport} setShowExportModal={setShowExportModal}
        adminAPI={adminAPI} showToast={showToast}
        setPromoteForm={setPromoteForm} setShowPromoteModal={setShowPromoteModal}
        selectionMode={selectionMode} setSelectionMode={setSelectionMode} exitSelectionMode={exitSelectionMode}
        selectedIds={selectedIds} isAllPageSelected={isAllPageSelected} toggleSelect={toggleSelect} toggleSelectAll={toggleSelectAll} setBulkDeleteConfirm={setBulkDeleteConfirm}
        openAddModal={openAddModal} getInitials={getInitials}
        onView={(s) => { setSelectedStudent(s); setShowViewModal(true); }}
        onEdit={openEditModal}
        onViewCredentials={handleViewCredentials}
        onCreateAccount={(s) => { setOnboardTarget(s); setOnboardEmail(''); setOnboardResult(null); }}
        onDelete={(s) => setDeleteTarget(s)}
        currentPage={currentPage} totalPages={totalPages}
      />

      {/* ══════════════════════════════════════════════════════════
          Add/Edit Modal
      ══════════════════════════════════════════════════════════ */}
      {showModal && (
        <StudentFormModal
          editStudent={editStudent} formData={formData} setFormData={setFormData} errors={errors} setErrors={setErrors} saving={saving}
          photoPreview={photoPreview} photoRef={photoRef} idProofRef={idProofRef} tcRef={tcRef} bonafideRef={bonafideRef}
          handlePhotoChange={handlePhotoChange} handleDocChange={handleDocChange} clearDoc={clearDoc}
          set={set} setPhone={setPhone}
          classNames={classNames} sectionsForClass={sectionsForClass}
          capacityInfo={capacityInfo} capacityChecking={capacityChecking}
          studentOtp={studentOtp} setStudentOtp={setStudentOtp} handleStudentSendOtp={handleStudentSendOtp} handleStudentVerifyOtp={handleStudentVerifyOtp} resetStudentOtp={resetStudentOtp}
          onClose={() => setShowModal(false)} onSubmit={handleSave}
        />
      )}

      {/* ══════════════════════════════════════════════════════════
          View Modal
      ══════════════════════════════════════════════════════════ */}
      {showViewModal && selectedStudent && (
        <StudentProfileModal
          selectedStudent={selectedStudent} getInitials={getInitials}
          onClose={() => setShowViewModal(false)}
          onEdit={() => { setShowViewModal(false); openEditModal(selectedStudent); }}
        />
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteStudentModal deleteTarget={deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete} />
      )}

      {/* ── View Existing Student Credentials Modal ─────────────────────── */}
      {viewCredTarget && (
        <ViewCredentialsModal
          viewCredTarget={viewCredTarget}
          onClose={() => setViewCredTarget(null)}
          onResetPassword={() => handleResetPassword(viewCredTarget)}
        />
      )}

      {/* ── Student Credentials Modal ──────────────────────────── */}
      {showCred && newCredential && (
        <CredentialsModal newCredential={newCredential} onClose={() => setShowCred(false)} showToast={showToast} />
      )}

      {/* Bulk Delete Confirm */}
      {bulkDeleteConfirm && (
        <BulkDeleteModal selectedIds={selectedIds} bulkDeleting={bulkDeleting} onCancel={() => setBulkDeleteConfirm(false)} onConfirm={handleBulkDelete} />
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
        <PromoteClassModal
          promoteForm={promoteForm} setPromoteForm={setPromoteForm} promoting={promoting}
          classNames={classNames} availableClasses={availableClasses}
          onCancel={() => setShowPromoteModal(false)} onConfirm={handlePromote}
        />
      )}

      {/* ── Onboard Student Modal ──────────────────────────────────────── */}
      {onboardTarget && (
        <OnboardStudentModal
          onboardTarget={onboardTarget} onboardEmail={onboardEmail} setOnboardEmail={setOnboardEmail}
          onboarding={onboarding} onboardResult={onboardResult}
          onClose={() => setOnboardTarget(null)} onConfirm={handleOnboard}
        />
      )}
    </Layout>
  );
}
