import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { applicationAPI, adminAPI } from '../../services/api';

// Normalize API response: convert PENDING→Pending, format dateApplied from createdAt
const normalizeApp = (app) => ({
  ...app,
  status: app.status
    ? app.status.charAt(0).toUpperCase() + app.status.slice(1).toLowerCase()
    : 'Pending',
  dateApplied: app.createdAt
    ? new Date(app.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : (app.dateApplied || '—'),
  fatherName:  app.fatherName  || app.parentName || '',
  fatherPhone: app.fatherPhone || app.mobile     || '',
  parentName:  app.fatherName  || app.parentName || '',
  mobile:      app.fatherPhone || app.mobile     || '',
});

const emptyForm = {
  studentName: '', dob: '', gender: 'Male', classApplied: '',
  fatherName: '', fatherPhone: '',
  motherName: '', motherPhone: '',
  guardianName: '', guardianPhone: '',
  email: '', prevSchool: '',
  permanentAddress: '', alternateAddress: '',
  idProofName: '', idProof: '',
  tcDocName: '', tcDoc: '',
  bonafideDocName: '', bonafideDoc: '',
};

const StatusBadge = ({ status }) => {
  const map = { Pending: 'badge-warning', Approved: 'badge-success', Rejected: 'badge-danger' };
  return <span className={map[status] || 'badge-info'}>{status}</span>;
};

// Reusable doc upload box
const DocUpload = ({ label, required, fileRef, fileName, onFileChange, onRemove }) => (
  <div>
    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '6px' }}>
      {label}{required ? ' *' : ' (optional)'}
    </label>
    {fileName ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 12px', background: '#f0fff4', border: '1.5px solid #76C442', borderRadius: '8px' }}>
        <span className="material-icons" style={{ color: '#76C442', fontSize: '18px' }}>description</span>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#276749', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</span>
        <button type="button" onClick={onRemove} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#e53e3e', display: 'flex', padding: 0 }}>
          <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
        </button>
      </div>
    ) : (
      <div onClick={() => fileRef.current?.click()}
        style={{ border: '2px dashed #e2e8f0', borderRadius: '8px', padding: '14px 12px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
        onMouseEnter={e => e.currentTarget.style.borderColor = '#76C442'}
        onMouseLeave={e => e.currentTarget.style.borderColor = '#e2e8f0'}>
        <span className="material-icons" style={{ color: '#a0aec0', fontSize: '22px', display: 'block', marginBottom: '4px' }}>upload_file</span>
        <span style={{ fontSize: '12px', color: '#a0aec0' }}>Click to upload</span>
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={onFileChange} />
      </div>
    )}
  </div>
);

const SectionLabel = ({ icon, label }) => (
  <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 0 4px', borderBottom: '1.5px solid #e2e8f0', marginBottom: '2px' }}>
    <span className="material-icons" style={{ color: '#76C442', fontSize: '18px' }}>{icon}</span>
    <span style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
  </div>
);

const Applications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState('All');
  const [search, setSearch]             = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedApp, setSelectedApp]   = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [formData, setFormData]         = useState(emptyForm);
  const [formErrors, setFormErrors]     = useState({});
  const [toast, setToast]               = useState(null);
  const [saving, setSaving]             = useState(false);
  const [classList, setClassList]       = useState([]);

  const idProofRef   = useRef(null);
  const tcRef        = useRef(null);
  const bonafideRef  = useRef(null);

  const navigate = useNavigate();

  const showToast = (message, type = 'success') => setToast({ message, type });

  // Load all applications from the API
  const loadApplications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await applicationAPI.getAll();
      const data = res.data?.data ?? [];
      setApplications(Array.isArray(data) ? data.map(normalizeApp) : []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  useEffect(() => {
    adminAPI.getClasses().then(res => {
      const data = res.data?.data ?? res.data ?? [];
      setClassList(Array.isArray(data) ? data : []);
    }).catch(() => setClassList([]));
  }, []);

  const filtered = applications.filter(a => {
    const matchTab = activeTab === 'All' || a.status === activeTab;
    const matchSearch = !search || a.studentName.toLowerCase().includes(search.toLowerCase()) || a.classApplied.toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const stats = {
    total:    applications.length,
    pending:  applications.filter(a => a.status === 'Pending').length,
    approved: applications.filter(a => a.status === 'Approved').length,
    rejected: applications.filter(a => a.status === 'Rejected').length,
  };

  const handleApprove = async (id) => {
    try {
      await applicationAPI.updateStatus(id, { status: 'APPROVED' });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'Approved' } : a));
      showToast('Application approved successfully!');
    } catch {
      showToast('Failed to approve application.', 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { setFormErrors({ reason: 'Please provide a reason.' }); return; }
    try {
      await applicationAPI.updateStatus(selectedApp.id, { status: 'REJECTED', adminNotes: rejectReason });
      setApplications(prev => prev.map(a => a.id === selectedApp.id ? { ...a, status: 'Rejected', adminNotes: rejectReason } : a));
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedApp(null);
      showToast('Application rejected.', 'warning');
    } catch {
      showToast('Failed to reject application.', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this application?')) return;
    try {
      await applicationAPI.delete(id);
      setApplications(prev => prev.filter(a => a.id !== id));
      showToast('Application deleted.', 'error');
    } catch {
      showToast('Failed to delete application.', 'error');
    }
  };

  const handleDocChange = (field, nameField, ref) => {
    const file = ref.current?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setFormData(fd => ({ ...fd, [field]: e.target.result, [nameField]: file.name }));
    reader.readAsDataURL(file);
  };

  const removeDoc = (field, nameField, ref) => {
    setFormData(fd => ({ ...fd, [field]: '', [nameField]: '' }));
    if (ref.current) ref.current.value = '';
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.studentName.trim()) errors.studentName = 'Required';
    if (!formData.dob) errors.dob = 'Required';
    if (!formData.fatherName.trim()) errors.fatherName = 'Required';
    if (!formData.motherName.trim()) errors.motherName = 'Required';
    if (!formData.fatherPhone.trim() || !/^\d{10}$/.test(formData.fatherPhone)) errors.fatherPhone = 'Valid 10-digit number required';
    if (!formData.motherPhone.trim() || !/^\d{10}$/.test(formData.motherPhone)) errors.motherPhone = 'Valid 10-digit number required';
    if (formData.guardianPhone && !/^\d{10}$/.test(formData.guardianPhone)) errors.guardianPhone = 'Must be 10 digits if provided';
    if (!formData.permanentAddress.trim()) errors.permanentAddress = 'Required';
    if (!formData.idProofName) errors.idProof = 'ID proof document is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const payload = {
        studentName:      formData.studentName,
        dob:              formData.dob,
        gender:           formData.gender,
        classApplied:     formData.classApplied,
        fatherName:       formData.fatherName,
        fatherPhone:      formData.fatherPhone,
        motherName:       formData.motherName,
        motherPhone:      formData.motherPhone,
        guardianName:     formData.guardianName,
        guardianPhone:    formData.guardianPhone,
        email:            formData.email,
        prevSchool:       formData.prevSchool,
        permanentAddress: formData.permanentAddress,
        alternateAddress: formData.alternateAddress,
        idProof:          formData.idProof,
        idProofName:      formData.idProofName,
        tcDoc:            formData.tcDoc,
        tcDocName:        formData.tcDocName,
        bonafideDoc:      formData.bonafideDoc,
        bonafideDocName:  formData.bonafideDocName,
      };
      const res = await applicationAPI.create(payload);
      const saved = normalizeApp(res.data?.data || payload);
      setApplications(prev => [saved, ...prev]);
      setShowAddModal(false);
      setFormData(emptyForm);
      setFormErrors({});
      [idProofRef, tcRef, bonafideRef].forEach(r => { if (r.current) r.current.value = ''; });
      showToast('Application submitted successfully!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit application.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const iStyle = (err) => ({
    padding: '10px 12px', border: `1.5px solid ${err ? '#e53e3e' : '#e2e8f0'}`,
    borderRadius: '8px', fontSize: '13px', width: '100%', outline: 'none',
    fontFamily: 'Poppins, sans-serif', boxSizing: 'border-box',
  });
  const errStyle = { fontSize: '11px', color: '#e53e3e', marginTop: '4px' };

  return (
    <Layout pageTitle="Student Applications">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Student Applications</h1>
          <p>Review and manage new student admission applications</p>
        </div>
        <button className="btn-add" onClick={() => { setFormData(emptyForm); setFormErrors({}); setShowAddModal(true); }}>
          <span className="material-icons">add</span> New Application
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: stats.total, color: '#3182ce', icon: 'description' },
          { label: 'Pending', value: stats.pending, color: '#ed8936', icon: 'pending_actions' },
          { label: 'Approved', value: stats.approved, color: '#76C442', icon: 'check_circle' },
          { label: 'Rejected', value: stats.rejected, color: '#e53e3e', icon: 'cancel' },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ cursor: 'pointer' }} onClick={() => setActiveTab(c.label === 'Total' ? 'All' : c.label)}>
            <div className="stat-icon" style={{ backgroundColor: c.color + '15' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label} Applications</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="data-table-card">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['All', 'Pending', 'Approved', 'Rejected'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '8px 18px', border: 'none', borderRadius: '8px', cursor: 'pointer',
              background: activeTab === tab ? '#76C442' : '#f7fafc',
              color: activeTab === tab ? '#fff' : '#718096',
              fontWeight: 600, fontSize: '13px',
            }}>
              {tab} {tab === 'All' ? `(${stats.total})` : tab === 'Pending' ? `(${stats.pending})` : tab === 'Approved' ? `(${stats.approved})` : `(${stats.rejected})`}
            </button>
          ))}
          <div className="search-input-wrapper" style={{ marginLeft: 'auto', minWidth: '250px' }}>
            <span className="material-icons">search</span>
            <input type="text" className="search-input" placeholder="Search by name or class..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Student Name</th>
                <th>Class Applied</th>
                <th>Father's Name</th>
                <th>Mobile</th>
                <th>Date Applied</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>Loading applications...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}><div className="empty-state"><span className="material-icons">search_off</span><h3>No applications found</h3></div></td></tr>
              ) : filtered.map((app, i) => (
                <tr key={app.id}>
                  <td style={{ color: '#a0aec0', fontSize: '12px' }}>{i + 1}</td>
                  <td>
                    <div className="student-cell">
                      <div className="student-avatar-sm">{app.studentName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
                      <div>
                        <div className="student-name">{app.studentName}</div>
                        <div className="student-class">{app.gender} • DOB: {app.dob}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, fontSize: '13px' }}>{app.classApplied}</td>
                  <td style={{ fontSize: '13px' }}>{app.fatherName || app.parentName}</td>
                  <td style={{ fontSize: '12px', color: '#718096' }}>{app.fatherPhone || app.mobile}</td>
                  <td style={{ fontSize: '12px', color: '#718096' }}>{app.dateApplied}</td>
                  <td><StatusBadge status={app.status} /></td>
                  <td>
                    <div className="action-btns">
                      <button className="action-btn action-btn-view" title="View" onClick={() => { setSelectedApp(app); setShowViewModal(true); }}>
                        <span className="material-icons">visibility</span>
                      </button>
                      {app.status === 'Pending' && (
                        <>
                          <button title="Approve" onClick={() => handleApprove(app.id)} style={{ padding: '4px 10px', background: '#76C44215', border: 'none', borderRadius: '6px', color: '#76C442', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            Approve
                          </button>
                          <button title="Reject" onClick={() => { setSelectedApp(app); setRejectReason(''); setFormErrors({}); setShowRejectModal(true); }} style={{ padding: '4px 10px', background: '#e53e3e15', border: 'none', borderRadius: '6px', color: '#e53e3e', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            Reject
                          </button>
                        </>
                      )}
                      <button className="action-btn action-btn-delete" title="Delete" onClick={() => handleDelete(app.id)}>
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add Application Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className="modal-container" style={{ maxWidth: 680 }}>
            <div className="modal-header">
              <span className="modal-title">New Student Application</span>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><span className="material-icons">close</span></button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                  {/* ── Student Info ── */}
                  <SectionLabel icon="person" label="Student Information" />

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Student Name *</label>
                    <input style={iStyle(formErrors.studentName)} placeholder="Full name" value={formData.studentName}
                      onChange={e => setFormData({ ...formData, studentName: e.target.value })} />
                    {formErrors.studentName && <p style={errStyle}>{formErrors.studentName}</p>}
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Date of Birth *</label>
                    <input type="date" style={iStyle(formErrors.dob)} value={formData.dob}
                      onChange={e => setFormData({ ...formData, dob: e.target.value })} />
                    {formErrors.dob && <p style={errStyle}>{formErrors.dob}</p>}
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Gender</label>
                    <select style={iStyle()} value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                      <option>Male</option><option>Female</option><option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Class Applied</label>
                    <select style={iStyle()} value={formData.classApplied} onChange={e => setFormData({ ...formData, classApplied: e.target.value })}>
                      <option value="">Select a class</option>
                      {[...new Set(classList.map(c => c.name))].map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Previous School</label>
                    <input style={iStyle()} placeholder="Previous school name" value={formData.prevSchool}
                      onChange={e => setFormData({ ...formData, prevSchool: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Email</label>
                    <input type="email" style={iStyle()} placeholder="Parent email" value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })} />
                  </div>

                  {/* ── Parent & Guardian ── */}
                  <SectionLabel icon="family_restroom" label="Parent & Guardian Details" />

                  {/* Father */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Father's Name *</label>
                    <input style={iStyle(formErrors.fatherName)} placeholder="Father's full name" value={formData.fatherName}
                      onChange={e => setFormData({ ...formData, fatherName: e.target.value })} />
                    {formErrors.fatherName && <p style={errStyle}>{formErrors.fatherName}</p>}
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Father's Phone *</label>
                    <input type="tel" style={iStyle(formErrors.fatherPhone)} placeholder="10-digit number" maxLength={10}
                      value={formData.fatherPhone}
                      onChange={e => setFormData({ ...formData, fatherPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                    {formErrors.fatherPhone && <p style={errStyle}>{formErrors.fatherPhone}</p>}
                  </div>

                  {/* Mother */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Mother's Name *</label>
                    <input style={iStyle(formErrors.motherName)} placeholder="Mother's full name" value={formData.motherName}
                      onChange={e => setFormData({ ...formData, motherName: e.target.value })} />
                    {formErrors.motherName && <p style={errStyle}>{formErrors.motherName}</p>}
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Mother's Phone *</label>
                    <input type="tel" style={iStyle(formErrors.motherPhone)} placeholder="10-digit number" maxLength={10}
                      value={formData.motherPhone}
                      onChange={e => setFormData({ ...formData, motherPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                    {formErrors.motherPhone && <p style={errStyle}>{formErrors.motherPhone}</p>}
                  </div>

                  {/* Guardian (optional) */}
                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Guardian Name <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional)</span></label>
                    <input style={iStyle()} placeholder="Guardian's full name" value={formData.guardianName}
                      onChange={e => setFormData({ ...formData, guardianName: e.target.value })} />
                  </div>

                  <div>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Guardian Phone <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional)</span></label>
                    <input type="tel" style={iStyle(formErrors.guardianPhone)} placeholder="10-digit number" maxLength={10}
                      value={formData.guardianPhone}
                      onChange={e => setFormData({ ...formData, guardianPhone: e.target.value.replace(/\D/g, '').slice(0, 10) })} />
                    {formErrors.guardianPhone && <p style={errStyle}>{formErrors.guardianPhone}</p>}
                  </div>

                  {/* ── Address ── */}
                  <SectionLabel icon="location_on" label="Address" />

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Permanent Address *</label>
                    <textarea style={{ ...iStyle(formErrors.permanentAddress), minHeight: '64px', resize: 'vertical' }}
                      placeholder="Enter permanent address" value={formData.permanentAddress}
                      onChange={e => setFormData({ ...formData, permanentAddress: e.target.value })} />
                    {formErrors.permanentAddress && <p style={errStyle}>{formErrors.permanentAddress}</p>}
                  </div>

                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: '4px' }}>Alternate Address <span style={{ color: '#a0aec0', fontWeight: 400 }}>(optional)</span></label>
                    <textarea style={{ ...iStyle(), minHeight: '64px', resize: 'vertical' }}
                      placeholder="Enter alternate address" value={formData.alternateAddress}
                      onChange={e => setFormData({ ...formData, alternateAddress: e.target.value })} />
                  </div>

                  {/* ── Documents ── */}
                  <SectionLabel icon="folder" label="Documents" />

                  <div style={{ gridColumn: '1/-1' }}>
                    <DocUpload
                      label="ID Proof" required
                      fileRef={idProofRef}
                      fileName={formData.idProofName}
                      onFileChange={() => handleDocChange('idProof', 'idProofName', idProofRef)}
                      onRemove={() => removeDoc('idProof', 'idProofName', idProofRef)}
                    />
                    {formErrors.idProof && <p style={errStyle}>{formErrors.idProof}</p>}
                  </div>

                  <DocUpload
                    label="TC (Transfer Certificate)"
                    fileRef={tcRef}
                    fileName={formData.tcDocName}
                    onFileChange={() => handleDocChange('tcDoc', 'tcDocName', tcRef)}
                    onRemove={() => removeDoc('tcDoc', 'tcDocName', tcRef)}
                  />

                  <DocUpload
                    label="Bonafide Certificate"
                    fileRef={bonafideRef}
                    fileName={formData.bonafideDocName}
                    onFileChange={() => handleDocChange('bonafideDoc', 'bonafideDocName', bonafideRef)}
                    onRemove={() => removeDoc('bonafideDoc', 'bonafideDocName', bonafideRef)}
                  />

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" disabled={saving} className="btn" style={{ background: saving ? '#a0aec0' : '#76C442', color: '#fff', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Modal ── */}
      {showViewModal && selectedApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowViewModal(false)}>
          <div className="modal-container" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <span className="modal-title">Application Details</span>
              <button className="modal-close" onClick={() => setShowViewModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto', padding: '20px 24px' }}>
              {/* Avatar + name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '16px', background: '#f7fafc', borderRadius: '12px' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 700 }}>
                  {selectedApp.studentName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 700, color: '#2d3748' }}>{selectedApp.studentName}</div>
                  <div style={{ fontSize: '13px', color: '#718096' }}>{selectedApp.classApplied} • Applied {selectedApp.dateApplied}</div>
                  <StatusBadge status={selectedApp.status} />
                </div>
              </div>

              {/* Student Info */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons" style={{ color: '#76C442', fontSize: '16px' }}>person</span> Student Information
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {[['Gender', selectedApp.gender], ['Date of Birth', selectedApp.dob], ['Previous School', selectedApp.prevSchool], ['Email', selectedApp.email]].map(([l, v]) => v ? (
                  <div key={l} style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', marginTop: '3px' }}>{v}</div>
                  </div>
                ) : null)}
              </div>

              {/* Parent & Guardian */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons" style={{ color: '#76C442', fontSize: '16px' }}>family_restroom</span> Parent & Guardian
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {[
                  ['Father\'s Name', selectedApp.fatherName || selectedApp.parentName],
                  ['Father\'s Phone', selectedApp.fatherPhone || selectedApp.mobile],
                  ['Mother\'s Name', selectedApp.motherName],
                  ['Mother\'s Phone', selectedApp.motherPhone],
                  ['Guardian Name', selectedApp.guardianName],
                  ['Guardian Phone', selectedApp.guardianPhone],
                ].map(([l, v]) => v ? (
                  <div key={l} style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', marginTop: '3px' }}>{v}</div>
                  </div>
                ) : null)}
              </div>

              {/* Address */}
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-icons" style={{ color: '#76C442', fontSize: '16px' }}>location_on</span> Address
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                {[['Permanent Address', selectedApp.permanentAddress || selectedApp.address], ['Alternate Address', selectedApp.alternateAddress]].map(([l, v]) => v ? (
                  <div key={l} style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: '8px' }}>
                    <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600, textTransform: 'uppercase' }}>{l}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', marginTop: '3px' }}>{v}</div>
                  </div>
                ) : null)}
              </div>

              {/* Documents */}
              {(selectedApp.idProofName || selectedApp.tcDocName || selectedApp.bonafideDocName) && (
                <>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="material-icons" style={{ color: '#76C442', fontSize: '16px' }}>folder</span> Documents
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {[['ID Proof', selectedApp.idProofName, selectedApp.idProof], ['TC Document', selectedApp.tcDocName, selectedApp.tcDoc], ['Bonafide Certificate', selectedApp.bonafideDocName, selectedApp.bonafideDoc]].map(([l, name, data]) => name ? (
                      <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#f0fff4', border: '1px solid #c6f6d5', borderRadius: '8px' }}>
                        <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>description</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '11px', color: '#a0aec0', fontWeight: 600 }}>{l}</div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#276749' }}>{name}</div>
                        </div>
                        {data && (
                          <a href={data} download={name} style={{ fontSize: '12px', color: '#3182ce', fontWeight: 600, textDecoration: 'none' }}>Download</a>
                        )}
                      </div>
                    ) : null)}
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowViewModal(false)}>Close</button>
              {selectedApp.status === 'Pending' && (
                <>
                  <button className="btn" style={{ background: '#76C442', color: '#fff', fontWeight: 600 }}
                    onClick={() => { handleApprove(selectedApp.id); setShowViewModal(false); }}>Approve</button>
                  <button className="btn" style={{ background: '#e53e3e', color: '#fff', fontWeight: 600 }}
                    onClick={() => { setShowViewModal(false); setShowRejectModal(true); }}>Reject</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Reject Reason Modal ── */}
      {showRejectModal && selectedApp && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowRejectModal(false)}>
          <div className="modal-container" style={{ maxWidth: 460 }}>
            <div className="modal-header">
              <span className="modal-title">Reject Application</span>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body" style={{ padding: '16px 24px' }}>
              <p style={{ fontSize: '14px', color: '#718096', marginBottom: '12px' }}>
                Rejecting application for <strong>{selectedApp?.studentName}</strong>. Please provide a reason:
              </p>
              <textarea
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', minHeight: '100px', resize: 'vertical', fontFamily: 'Poppins, sans-serif', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Enter rejection reason..."
                value={rejectReason}
                onChange={e => { setRejectReason(e.target.value); setFormErrors({}); }}
              />
              {formErrors.reason && <p style={{ fontSize: '11px', color: '#e53e3e', marginTop: '4px' }}>{formErrors.reason}</p>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn" style={{ background: '#e53e3e', color: '#fff', fontWeight: 600 }} onClick={handleReject}>Confirm Rejection</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Applications;
