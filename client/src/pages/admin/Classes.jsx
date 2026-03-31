import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { adminAPI } from '../../services/api';

// Derive display category from class name
const getCategory = (name) => {
  if (!name) return 'Secondary';
  const n = name.toLowerCase();
  if (['nursery', 'lkg', 'ukg'].some(x => n.includes(x))) return 'Pre-Primary';
  const num = parseInt(n.replace(/\D/g, '')) || 0;
  if (num >= 1 && num <= 5) return 'Primary';
  return 'Secondary';
};

// Used by the category filter in the table — derived automatically from class names via getCategory()
const CATEGORIES = ['Pre-Primary', 'Primary', 'Secondary'];

const initialForm = { className: '', section: '', teacher: '', capacity: '' };

const iStyle = { padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', background: '#fff', outline: 'none', fontFamily: 'Poppins, sans-serif' };

const Classes = () => {
  const [classes,      setClasses]      = useState([]);
  const [classLoading, setClassLoading] = useState(false);
  const [allStudents,  setAllStudents]  = useState([]);
  const [studLoading,  setStudLoading]  = useState(false);

  // Main table filters
  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterClass,    setFilterClass]    = useState('');
  const [filterSection,  setFilterSection]  = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  // Modals
  const [showModal,  setShowModal]  = useState(false);
  const [editClass,  setEditClass]  = useState(null);
  const [formData,   setFormData]   = useState(initialForm);
  const [toast,      setToast]      = useState(null);

  // Student view panel
  const [viewClass,  setViewClass]  = useState(null);
  const [viewSearch, setViewSearch] = useState('');

  // Confirmation dialogs
  const [deleteClassTarget,   setDeleteClassTarget]   = useState(null); // class row to delete
  const [deleteStudentTarget, setDeleteStudentTarget] = useState(null); // student to delete from view modal

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Map backend ClassRoom to frontend shape ───────────────────────────────
  const mapClass = (c) => ({
    id:       c.id,
    name:     c.name,
    section:  c.section,
    teacher:  c.teacherName || '',
    capacity: c.capacity    || 40,
    category: getCategory(c.name),
    isActive: c.isActive,
  });

  const loadClasses = () => {
    setClassLoading(true);
    adminAPI.getClasses()
      .then(res => {
        const data = res.data?.data ?? [];
        setClasses(Array.isArray(data) ? data.map(mapClass) : []);
      })
      .catch(() => setClasses([]))
      .finally(() => setClassLoading(false));
  };

  const loadStudents = () => {
    setStudLoading(true);
    adminAPI.getStudents({ page: 0, size: 1000 })
      .then(res => {
        const data = res.data?.data?.content ?? res.data?.data ?? [];
        setAllStudents(Array.isArray(data) ? data : []);
      })
      .catch(() => setAllStudents([]))
      .finally(() => setStudLoading(false));
  };

  // ── Load classes + students from backend ─────────────────────────────────
  useEffect(() => {
    loadClasses();
    loadStudents();
  }, []);

  // ── Compute enrolled count per class from actual students ────────────────
  const enrolledMap = useMemo(() => {
    const map = {};
    allStudents.forEach(s => {
      const cn  = s.className || s.class || '';
      const sec = s.section   || '';
      // Backend class name is "Class 10", student className is "10"
      const normalized = cn.match(/^\d+$/) ? `Class ${cn}` : cn;
      const key = `${normalized}|${sec}`;
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [allStudents]);

  const withEnrolled = useMemo(() =>
    classes.map(c => ({ ...c, enrolled: enrolledMap[`${c.name}|${c.section}`] || 0 })),
  [classes, enrolledMap]);

  // ── Derived filter options from classes list ──────────────────────────────
  const classOptions   = useMemo(() => [...new Set(withEnrolled.map(c => c.name))].sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0;
    const nb = parseInt(b.replace(/\D/g, '')) || 0;
    return na - nb;
  }), [withEnrolled]);

  const sectionOptions = useMemo(() =>
    [...new Set(withEnrolled.map(c => c.section))].sort(), [withEnrolled]);

  // ── Main table filtered list ──────────────────────────────────────────────
  const filtered = useMemo(() => withEnrolled.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !q ||
      c.name.toLowerCase().includes(q) ||
      (c.teacher || '').toLowerCase().includes(q) ||
      (c.teacher || '').toLowerCase().includes(q);
    const matchClass   = !filterClass    || c.name     === filterClass;
    const matchSection = !filterSection  || c.section  === filterSection;
    const matchCat     = !filterCategory || c.category === filterCategory;
    return matchSearch && matchClass && matchSection && matchCat;
  }), [withEnrolled, searchTerm, filterClass, filterSection, filterCategory]);

  // ── Students shown in the view panel ─────────────────────────────────────
  const viewStudents = useMemo(() => {
    if (!viewClass) return [];
    return allStudents.filter(s => {
      const sClass   = String(s.className || s.class || '').trim();
      const sSection = String(s.section || '').trim();

      // Normalise both sides: strip leading "Class " so "Class 3" and "3" both match
      const normalise = (v) => v.replace(/^Class\s+/i, '').trim();
      const targetClass   = normalise(viewClass.name);
      const targetSection = viewClass.section;

      const matchClass   = normalise(sClass) === targetClass;
      const matchSection = sSection === targetSection;

      const q = viewSearch.toLowerCase();
      const matchSearch = !q ||
        (s.name || '').toLowerCase().includes(q) ||
        String(s.rollNumber || s.rollNo || '').toLowerCase().includes(q) ||
        (s.parentName || s.parent || '').toLowerCase().includes(q);

      return matchClass && matchSection && matchSearch;
    });
  }, [allStudents, viewClass, viewSearch]);

  // ── Open view panel — always reload students for fresh data ──────────────
  const openView = (c) => {
    setViewClass(c);
    setViewSearch('');
    loadStudents();
  };

  // ── Delete class (with cascade) ──────────────────────────────────────────
  const handleDeleteClass = async () => {
    if (!deleteClassTarget) return;
    try {
      await adminAPI.deleteClass(deleteClassTarget.id);
      showToast(`${deleteClassTarget.name} – ${deleteClassTarget.section} and all its students have been deleted`, 'warning');
      loadClasses();
      loadStudents();
    } catch {
      showToast('Failed to delete class. Please try again.', 'error');
    } finally {
      setDeleteClassTarget(null);
    }
  };

  // ── Delete individual student from view modal ────────────────────────────
  const handleDeleteStudent = async () => {
    if (!deleteStudentTarget) return;
    try {
      await adminAPI.deleteStudent(deleteStudentTarget.id);
      showToast(`${deleteStudentTarget.name} has been removed`, 'warning');
      loadStudents();
    } catch {
      showToast('Failed to delete student. Please try again.', 'error');
    } finally {
      setDeleteStudentTarget(null);
    }
  };

  // ── Occupancy colour ─────────────────────────────────────────────────────
  const occColor = (enrolled, capacity) => {
    const pct = (enrolled / (capacity || 1)) * 100;
    if (pct >= 95) return '#e53e3e';
    if (pct >= 80) return '#ed8936';
    return '#76C442';
  };

  // ── Save (add / edit) ────────────────────────────────────────────────────
  const handleSave = async () => {
    const name    = (formData.className || '').trim();
    const section = (formData.section   || '').trim().toUpperCase();

    if (!name)    { showToast('Class name is required', 'error');  return; }
    if (!section) { showToast('Section is required', 'error');     return; }

    const payload = {
      name,
      section,
      teacherName: formData.teacher  || '',
      capacity:    +formData.capacity || 40,
      isActive:    true,
    };

    try {
      if (editClass) {
        await adminAPI.updateClass(editClass.id, payload);
        showToast('Class updated');
      } else {
        await adminAPI.createClass(payload);
        showToast('Class added successfully');
      }
      loadClasses();
    } catch (err) {
      const msg = err.response?.data?.message || (editClass ? 'Failed to update class' : 'Class already exists or could not be saved');
      showToast(msg, 'error');
    }

    setShowModal(false);
    setFormData(initialForm);
    setEditClass(null);
  };

  const openEdit = (c) => {
    setEditClass(c);
    setFormData({ className: c.name, section: c.section, teacher: c.teacher || '', capacity: c.capacity || '' });
    setShowModal(true);
  };

  const getInitials = (name) =>
    (name || 'S').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Layout pageTitle="Classes">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Class Management</h1>
        <p>Overview of all classes and sections</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Classes',  value: withEnrolled.length,                                                       icon: 'class',     color: '#76C442' },
          { label: 'Total Capacity', value: withEnrolled.reduce((a, c) => a + (c.capacity || 0), 0),                   icon: 'people',    color: '#3182ce' },
          { label: 'Total Enrolled', value: allStudents.length,                                                         icon: 'school',    color: '#805ad5' },
          { label: 'Avg Occupancy',  value: withEnrolled.length ? Math.round(withEnrolled.reduce((a, c) => a + (c.enrolled || 0) / (c.capacity || 1), 0) / withEnrolled.length * 100) + '%' : '0%', icon: 'bar_chart', color: '#ed8936' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: s.color + '15' }}>
              <span className="material-icons" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table + Filters */}
      <div className="data-table-card">
        {/* ── Filter bar ── */}
        <div style={{ display: 'flex', gap: '10px', padding: '16px 16px 0', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div className="search-input-wrapper" style={{ flex: '1 1 180px', minWidth: 0 }}>
            <span className="material-icons">search</span>
            <input type="text" className="search-input" placeholder="Search classes, teacher..."
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>

          {/* Class filter */}
          <select style={{ ...iStyle, minWidth: '130px' }} value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classOptions.map(cn => <option key={cn} value={cn}>{cn}</option>)}
          </select>

          {/* Section filter */}
          <select style={{ ...iStyle, minWidth: '110px' }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
            <option value="">All Sections</option>
            {sectionOptions.map(sec => <option key={sec} value={sec}>Section {sec}</option>)}
          </select>

          {/* Category filter */}
          <select style={{ ...iStyle, minWidth: '130px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>

          {/* Clear filters */}
          {(filterClass || filterSection || filterCategory || searchTerm) && (
            <button onClick={() => { setFilterClass(''); setFilterSection(''); setFilterCategory(''); setSearchTerm(''); }}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer', fontSize: '12px', color: '#718096', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}>
              <span className="material-icons" style={{ fontSize: '14px' }}>close</span>
              Clear
            </button>
          )}

          <button className="btn-add" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}
            onClick={() => { setEditClass(null); setFormData(initialForm); setShowModal(true); }}>
            <span className="material-icons">add</span> Add Class
          </button>
        </div>

        {/* Active filters summary */}
        {(filterClass || filterSection || filterCategory) && (
          <div style={{ padding: '8px 16px 0', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {filterClass && (
              <span style={{ padding: '3px 10px', background: '#76C44220', color: '#276749', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {filterClass}
                <span className="material-icons" style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => setFilterClass('')}>close</span>
              </span>
            )}
            {filterSection && (
              <span style={{ padding: '3px 10px', background: '#3182ce20', color: '#2b6cb0', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                Section {filterSection}
                <span className="material-icons" style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => setFilterSection('')}>close</span>
              </span>
            )}
            {filterCategory && (
              <span style={{ padding: '3px 10px', background: '#ed893620', color: '#c05621', borderRadius: '20px', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                {filterCategory}
                <span className="material-icons" style={{ fontSize: '12px', cursor: 'pointer' }} onClick={() => setFilterCategory('')}>close</span>
              </span>
            )}
            <span style={{ fontSize: '11px', color: '#a0aec0', lineHeight: '24px' }}>
              Showing {filtered.length} of {withEnrolled.length} classes
            </span>
          </div>
        )}

        <div style={{ overflowX: 'auto', marginTop: '8px' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Category</th>
                <th>Class Teacher</th>
                <th>Occupancy</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {classLoading ? (
                <tr><td colSpan={5}><div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>Loading classes...</div></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state" style={{ padding: '40px' }}>
                    <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>class</span>
                    <h3 style={{ color: '#a0aec0' }}>No classes found</h3>
                  </div>
                </td></tr>
              ) : filtered.map(c => {
                const pct   = c.capacity ? Math.round((c.enrolled / c.capacity) * 100) : 0;
                const color = occColor(c.enrolled, c.capacity || 1);
                return (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: 38, height: 38, borderRadius: '10px', background: '#76C44215', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>class</span>
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name} – {c.section}</div>
                          <div style={{ fontSize: '11px', color: '#a0aec0' }}>Section {c.section}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: c.category === 'Pre-Primary' ? '#fef3c720' : c.category === 'Primary' ? '#ebf8ff' : '#f0fff4',
                        color:      c.category === 'Pre-Primary' ? '#d97706'   : c.category === 'Primary' ? '#2b6cb0' : '#276749' }}>
                        {c.category || 'Secondary'}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{c.teacher || '—'}</td>
                    <td style={{ minWidth: 140 }}>
                      <div onClick={() => openView(c)} title="Click to view students" style={{ cursor: 'pointer' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1 }}>
                            <div className="progress-bar-custom">
                              <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}cc)` }} />
                            </div>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color, minWidth: 40 }}>{c.enrolled}/{c.capacity}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: 2 }}>{pct}% full · <span style={{ color: '#76C442' }}>view</span></div>
                      </div>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn action-btn-view" title="View Students" onClick={() => openView(c)}>
                          <span className="material-icons">visibility</span>
                        </button>
                        <button className="action-btn action-btn-edit" onClick={() => openEdit(c)} title="Edit">
                          <span className="material-icons">edit</span>
                        </button>
                        <button className="action-btn action-btn-delete" title="Delete Class"
                          onClick={() => setDeleteClassTarget(c)}>
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

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <span className="modal-title">{editClass ? 'Edit Class' : 'Add New Class'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              {/* Class Name */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                  Class Name <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <input
                  type="text"
                  style={{ ...iStyle, width: '100%', boxSizing: 'border-box' }}
                  placeholder="e.g., Nursery, LKG, UKG, Class 6, Class 10"
                  value={formData.className || ''}
                  onChange={e => setFormData({ ...formData, className: e.target.value })}
                  autoFocus
                />
                <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 4 }}>
                  Type any class name exactly as you want it stored
                </div>
              </div>

              {/* Section */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 6 }}>
                  Section <span style={{ color: '#e53e3e' }}>*</span>
                </label>
                <input
                  type="text"
                  style={{ ...iStyle, width: '100%', boxSizing: 'border-box' }}
                  placeholder="e.g., A, B, C, D"
                  value={formData.section || ''}
                  onChange={e => setFormData({ ...formData, section: e.target.value.toUpperCase() })}
                  maxLength={5}
                />
              </div>

              {/* Optional fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { field: 'teacher',  label: 'Class Teacher (Optional)', placeholder: 'Teacher name' },
                  { field: 'capacity', label: 'Capacity (Optional)',       placeholder: 'Max students', type: 'number' },
                ].map(f => (
                  <div key={f.field}>
                    <label style={{ fontSize: 13, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      style={{ ...iStyle, width: '100%', boxSizing: 'border-box' }}
                      placeholder={f.placeholder}
                      value={formData[f.field] || ''}
                      onChange={e => setFormData({ ...formData, [f.field]: e.target.value })}
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => { setShowModal(false); setEditClass(null); setFormData(initialForm); }}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
              <button onClick={handleSave}
                style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                {editClass ? 'Update' : 'Add Class'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Students Modal ── */}
      {viewClass && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewClass(null)}>
          <div className="modal-container" style={{ maxWidth: 700 }}>
            {/* Header */}
            <div className="modal-header">
              <div>
                <span className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-icons" style={{ color: '#76C442', fontSize: 20 }}>groups</span>
                  Students List
                </span>
                <p style={{ fontSize: 12, color: '#a0aec0', margin: '2px 0 0' }}>
                  {viewClass.name} — Section {viewClass.section}
                </p>
              </div>
              <button className="modal-close" onClick={() => setViewClass(null)}><span className="material-icons">close</span></button>
            </div>

            {/* Search only */}
            <div style={{ padding: '14px 20px', background: '#f7fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span className="material-icons" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#a0aec0' }}>search</span>
                <input
                  style={{ ...iStyle, width: '100%', boxSizing: 'border-box', paddingLeft: 32 }}
                  placeholder="Search by name, roll no, or parent name..."
                  value={viewSearch}
                  onChange={e => setViewSearch(e.target.value)}
                  autoFocus
                />
              </div>
              <span style={{ fontSize: 13, color: '#718096', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {studLoading ? 'Loading...' : `${viewStudents.length} student${viewStudents.length !== 1 ? 's' : ''}`}
              </span>
            </div>

            {/* Student table */}
            <div className="modal-body" style={{ padding: 0, maxHeight: '50vh', overflowY: 'auto' }}>
              {studLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }} />
                  Loading students...
                </div>
              ) : viewStudents.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                  <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>school</span>
                  <p style={{ color: '#a0aec0', margin: 0, fontWeight: 600 }}>No students found</p>
                  <p style={{ color: '#cbd5e0', fontSize: 12, margin: '4px 0 0' }}>
                    {viewSearch ? `No students match "${viewSearch}" in ${viewClass.name} – ${viewClass.section}` : `No students enrolled in ${viewClass.name} – Section ${viewClass.section}`}
                  </p>
                </div>
              ) : (
                <table className="data-table" style={{ margin: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ paddingLeft: 20 }}>#</th>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Class</th>
                      <th>Section</th>
                      <th>Parent</th>
                      <th style={{ paddingRight: 20 }}>Status</th>
                      <th style={{ paddingRight: 20 }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewStudents.map((s, idx) => (
                      <tr key={s.id}>
                        <td style={{ paddingLeft: 20, color: '#a0aec0', fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                              {getInitials(s.name)}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 13 }}>{s.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: '#718096' }}>{s.rollNumber || s.rollNo || '—'}</td>
                        <td>
                          <span style={{ padding: '2px 8px', background: '#76C44220', color: '#276749', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {String(s.className || s.class || '—').replace(/^Class\s+/i, '')}
                          </span>
                        </td>
                        <td>
                          <span style={{ padding: '2px 8px', background: '#3182ce20', color: '#2b6cb0', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {s.section || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: 13, color: '#4a5568' }}>{s.parentName || s.parent || '—'}</td>
                        <td>
                          <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: (s.isActive ?? s.status === 'Active') ? '#f0fff4' : '#fff5f5', color: (s.isActive ?? s.status === 'Active') ? '#76C442' : '#e53e3e' }}>
                            {(s.isActive ?? s.status === 'Active') ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ paddingRight: 20 }}>
                          <button className="action-btn action-btn-delete" title="Remove student"
                            onClick={() => setDeleteStudentTarget(s)}>
                            <span className="material-icons">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={() => setViewClass(null)}
                style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Confirm Delete Class ── */}
      {deleteClassTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteClassTarget(null)}>
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ color: '#e53e3e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons">warning</span>
                Delete Class
              </span>
              <button className="modal-close" onClick={() => setDeleteClassTarget(null)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#2d3748', marginBottom: 8 }}>
                Are you sure you want to delete <strong>{deleteClassTarget.name} – Section {deleteClassTarget.section}</strong>?
              </p>
              <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c53030' }}>
                <span className="material-icons" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 6 }}>info</span>
                This will permanently delete the class and <strong>all students enrolled in it</strong>. This action cannot be undone.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteClassTarget(null)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleDeleteClass}
                style={{ padding: '10px 24px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Yes, Delete Class & Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete Student ── */}
      {deleteStudentTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setDeleteStudentTarget(null)}>
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <span className="modal-title" style={{ color: '#e53e3e', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-icons">warning</span>
                Remove Student
              </span>
              <button className="modal-close" onClick={() => setDeleteStudentTarget(null)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: '#2d3748', marginBottom: 8 }}>
                Are you sure you want to remove <strong>{deleteStudentTarget.name}</strong> from this class?
              </p>
              <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c53030' }}>
                <span className="material-icons" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 6 }}>info</span>
                Only this student will be deleted. The class and other students will remain unaffected.
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setDeleteStudentTarget(null)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Cancel
              </button>
              <button onClick={handleDeleteStudent}
                style={{ padding: '10px 24px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                Yes, Remove Student
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Classes;
