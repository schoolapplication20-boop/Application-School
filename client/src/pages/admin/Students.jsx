import { useState, useEffect, useRef, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import StudentExportModal from '../../components/StudentExportModal';
import {
  fetchStudents as apiFetchStudents,
  createStudent as apiCreateStudent,
  updateStudent as apiUpdateStudent,
  deleteStudent as apiDeleteStudent,
} from '../../services/studentService';
import { adminAPI } from '../../services/api';

const mockStudents = [
  {
    id: 1, name: 'Arjun Patel', rollNo: 'S001', class: '10', section: 'A',
    dob: '2010-01-15', bloodGroup: 'B+', status: 'Active', photo: null,
    fatherName: 'Rajesh Patel',   fatherPhone: '9876543210',
    motherName: 'Meena Patel',    motherPhone: '9876543220',
    guardianName: '', guardianPhone: '',
    permanentAddress: '12 MG Road, Mumbai', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    // legacy compat
    parent: 'Rajesh Patel', mobile: '9876543210', address: '12 MG Road, Mumbai',
  },
  {
    id: 2, name: 'Sneha Gupta', rollNo: 'S002', class: '9', section: 'B',
    dob: '2011-03-22', bloodGroup: 'O+', status: 'Active', photo: null,
    fatherName: 'Ramesh Gupta',   fatherPhone: '9876543211',
    motherName: 'Priya Gupta',    motherPhone: '9876543221',
    guardianName: '', guardianPhone: '',
    permanentAddress: '45 Park St, Delhi', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Ramesh Gupta', mobile: '9876543211', address: '45 Park St, Delhi',
  },
  {
    id: 3, name: 'Ravi Kumar', rollNo: 'S003', class: '8', section: 'C',
    dob: '2012-07-05', bloodGroup: 'A+', status: 'Active', photo: null,
    fatherName: 'Suresh Kumar',   fatherPhone: '9876543212',
    motherName: 'Lata Kumar',     motherPhone: '9876543222',
    guardianName: '', guardianPhone: '',
    permanentAddress: '8 Rose Lane, Pune', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Suresh Kumar', mobile: '9876543212', address: '8 Rose Lane, Pune',
  },
  {
    id: 4, name: 'Ananya Singh', rollNo: 'S004', class: '10', section: 'B',
    dob: '2010-09-18', bloodGroup: 'AB+', status: 'Active', photo: null,
    fatherName: 'Amit Singh',     fatherPhone: '9876543213',
    motherName: 'Sunita Singh',   motherPhone: '9876543223',
    guardianName: '', guardianPhone: '',
    permanentAddress: '33 Oak Ave, Bangalore', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Amit Singh', mobile: '9876543213', address: '33 Oak Ave, Bangalore',
  },
  {
    id: 5, name: 'Kiran Reddy', rollNo: 'S005', class: '7', section: 'A',
    dob: '2013-11-30', bloodGroup: 'O-', status: 'Active', photo: null,
    fatherName: 'Venkat Reddy',   fatherPhone: '9876543214',
    motherName: 'Kavitha Reddy',  motherPhone: '9876543224',
    guardianName: '', guardianPhone: '',
    permanentAddress: '21 Lotus St, Hyderabad', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Venkat Reddy', mobile: '9876543214', address: '21 Lotus St, Hyderabad',
  },
  {
    id: 6, name: 'Priya Sharma', rollNo: 'S006', class: '6', section: 'A',
    dob: '2014-02-10', bloodGroup: 'A-', status: 'Active', photo: null,
    fatherName: 'Mohit Sharma',   fatherPhone: '9876543215',
    motherName: 'Rekha Sharma',   motherPhone: '9876543225',
    guardianName: '', guardianPhone: '',
    permanentAddress: '7 Green Park, Chennai', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Mohit Sharma', mobile: '9876543215', address: '7 Green Park, Chennai',
  },
  {
    id: 7, name: 'Aditya Nair', rollNo: 'S007', class: '11', section: 'A',
    dob: '2009-04-25', bloodGroup: 'B-', status: 'Active', photo: null,
    fatherName: 'Sunil Nair',     fatherPhone: '9876543216',
    motherName: 'Anita Nair',     motherPhone: '9876543226',
    guardianName: '', guardianPhone: '',
    permanentAddress: '55 Hill View, Kochi', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Sunil Nair', mobile: '9876543216', address: '55 Hill View, Kochi',
  },
  {
    id: 8, name: 'Deepika Joshi', rollNo: 'S008', class: '12', section: 'B',
    dob: '2008-06-08', bloodGroup: 'O+', status: 'Inactive', photo: null,
    fatherName: 'Ramesh Joshi',   fatherPhone: '9876543217',
    motherName: 'Suman Joshi',    motherPhone: '9876543227',
    guardianName: '', guardianPhone: '',
    permanentAddress: '3 Lake Road, Ahmedabad', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Ramesh Joshi', mobile: '9876543217', address: '3 Lake Road, Ahmedabad',
  },
  {
    id: 9, name: 'Rahul Mehta', rollNo: 'S009', class: '9', section: 'A',
    dob: '2011-08-14', bloodGroup: 'A+', status: 'Active', photo: null,
    fatherName: 'Dinesh Mehta',   fatherPhone: '9876543218',
    motherName: 'Geeta Mehta',    motherPhone: '9876543228',
    guardianName: '', guardianPhone: '',
    permanentAddress: '19 Elm St, Surat', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Dinesh Mehta', mobile: '9876543218', address: '19 Elm St, Surat',
  },
  {
    id: 10, name: 'Pooja Iyer', rollNo: 'S010', class: '8', section: 'A',
    dob: '2012-12-02', bloodGroup: 'B+', status: 'Active', photo: null,
    fatherName: 'Krishna Iyer',   fatherPhone: '9876543219',
    motherName: 'Padma Iyer',     motherPhone: '9876543229',
    guardianName: '', guardianPhone: '',
    permanentAddress: '66 Maple Ave, Coimbatore', alternateAddress: '',
    idProof: null, idProofName: '', tcDocument: null, tcDocumentName: '',
    bonafideDocument: null, bonafideDocumentName: '',
    parent: 'Krishna Iyer', mobile: '9876543219', address: '66 Maple Ave, Coimbatore',
  },
];

const EMPTY_FORM = {
  name: '', rollNo: '', class: '', section: '', dob: '', bloodGroup: '', status: 'Active', photo: null,
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
      <div style={{ width: 28, height: 28, borderRadius: 7, background: '#76C44218', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#76C442' }}>{icon}</span>
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
          onMouseEnter={e => e.currentTarget.style.borderColor = '#76C442'}
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Students() {
  const [students, setStudents]         = useState([]);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterClass, setFilterClass]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [currentPage, setCurrentPage]   = useState(1);
  const [showModal, setShowModal]       = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editStudent, setEditStudent]   = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [formData, setFormData]         = useState(EMPTY_FORM);
  const [errors, setErrors]             = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null); // full student object
  const [toast, setToast]               = useState(null);
  const [saving, setSaving]             = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [apiStatus, setApiStatus]       = useState(null); // 'live' | 'offline'
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [availableClasses, setAvailableClasses] = useState([]); // [{name, section}] from DB

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
    if (!formData.rollNo.trim())          e.rollNo      = 'Roll number is required';
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
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Modal open helpers ────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditStudent(null);
    setFormData(EMPTY_FORM);
    setPhotoPreview(null);
    setErrors({});
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFormData(fd => ({ ...fd, [field]: ev.target.result, [nameField]: file.name }));
      if (errors[field === 'idProof' ? 'idProof' : field]) {
        setErrors(er => ({ ...er, [field === 'idProof' ? 'idProof' : field]: '' }));
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
    if (!validate()) {
      document.querySelector('.is-invalid')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSaving(true);
    const payload = {
      name:             formData.name,
      rollNo:           formData.rollNo,
      class:            formData.class,
      section:          formData.section,
      dob:              formData.dob,
      bloodGroup:       formData.bloodGroup,
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
      // backend field aliases
      parent:  formData.fatherName,
      mobile:  formData.fatherPhone,
      address: formData.permanentAddress,
    };
    try {
      if (editStudent) {
        const result = await apiUpdateStudent(editStudent.id, payload);
        if (!result.success) { showToast(result.message || 'Failed to update student', 'error'); return; }
        showToast('Student updated successfully');
      } else {
        const result = await apiCreateStudent(payload);
        if (!result.success) { showToast(result.message || 'Failed to add student', 'error'); return; }
        showToast('Student added successfully');
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
          { label: 'Total Students', value: students.length,                                    icon: 'school',       color: '#76C442' },
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
          <button className="btn-add" onClick={openAddModal}>
            <span className="material-icons">person_add</span> Add Student
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Roll No</th>
                <th>Class</th>
                <th>Section</th>
                <th>Blood Group</th>
                <th>Father's Name</th>
                <th>Father's Phone</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingStudents ? (
                <tr><td colSpan={9}><div className="empty-state"><span className="material-icons" style={{ animation: 'spin 1s linear infinite' }}>refresh</span><h3>Loading students...</h3></div></td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={9}><div className="empty-state"><span className="material-icons">search_off</span><h3>No students found</h3></div></td></tr>
              ) : paginated.map(s => (
                <tr key={s.id}>
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
                  <td><span className="badge bg-danger bg-opacity-10 text-danger fw-bold" style={{ fontSize: 11 }}>{s.bloodGroup || '—'}</span></td>
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
                  <span className="material-icons" style={{ color: '#76C442', fontSize: 20 }}>
                    {editStudent ? 'edit' : 'person_add'}
                  </span>
                  {editStudent ? 'Edit Student' : 'Add New Student'}
                </h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
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
                    <div className="col-md-6">
                      <label className="form-label fw-medium small">Roll Number *</label>
                      <input type="text" className={`form-control form-control-sm ${errors.rollNo ? 'is-invalid' : ''}`}
                        placeholder="e.g., S001" value={formData.rollNo}
                        onChange={set('rollNo')} />
                      {errors.rollNo && <div className="invalid-feedback">{errors.rollNo}</div>}
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium small">Class *</label>
                      <select
                        className={`form-select form-select-sm ${errors.class ? 'is-invalid' : ''}`}
                        value={formData.class}
                        onChange={e => setFormData(fd => ({ ...fd, class: e.target.value, section: '' }))}
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
                    <div className="col-md-3">
                      <label className="form-label fw-medium small">Date of Birth</label>
                      <input type="date" className="form-control form-control-sm"
                        value={formData.dob} max={new Date().toISOString().split('T')[0]}
                        onChange={set('dob')} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium small">Blood Group</label>
                      <select className="form-select form-select-sm" value={formData.bloodGroup} onChange={set('bloodGroup')}>
                        <option value="">Select</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg}>{bg}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label fw-medium small">Status</label>
                      <select className="form-select form-select-sm" value={formData.status} onChange={set('status')}>
                        <option>Active</option>
                        <option>Inactive</option>
                      </select>
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
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)} disabled={saving}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ background: '#76C442', border: 'none', minWidth: 120 }} disabled={saving}>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 18, background: 'linear-gradient(135deg,#76C442,#5fa832)', borderRadius: 14, padding: '20px 24px', marginBottom: 20 }}>
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
                      {selectedStudent.bloodGroup && (
                        <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', padding: '2px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                          {selectedStudent.bloodGroup}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <ViewSection title="Basic Information" icon="badge">
                  <ViewRow label="Date of Birth" value={formatDOB(selectedStudent.dob)} />
                  <ViewRow label="Class / Section" value={`Class ${selectedStudent.class}${selectedStudent.section ? `-${selectedStudent.section}` : ''}`} />
                  <ViewRow label="Roll Number" value={selectedStudent.rollNo} mono />
                  <ViewRow label="Blood Group" value={selectedStudent.bloodGroup} />
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
                <button className="btn btn-primary" style={{ background: '#76C442', border: 'none' }}
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

      {/* Excel Export Modal */}
      {showExportModal && (
        <StudentExportModal
          students={students}
          onClose={() => setShowExportModal(false)}
        />
      )}
    </Layout>
  );
}

// ─── View modal helpers ───────────────────────────────────────────────────────
function ViewSection({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, paddingBottom: 6, borderBottom: '1.5px solid #f0f4f8' }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#76C442' }}>{icon}</span>
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
