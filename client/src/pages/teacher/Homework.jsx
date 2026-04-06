import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { teacherAPI, diaryAPI } from '../../services/api';

const TODAY = new Date().toISOString().split('T')[0];

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Computer Science', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography'];

const initialHW = [
  { id: 1, title: 'Chapter 5 — Quadratic Equations', class: '10-A', subject: 'Mathematics', dueDate: '2025-03-25', description: 'Solve exercises 1–15. Show full working.', assignedAt: '18 Mar 2025', status: 'Active' },
  { id: 2, title: 'Essay on Indian Constitution', class: '9-B', subject: 'Social Science', dueDate: '2025-03-22', description: 'Write a 500-word essay.', assignedAt: '17 Mar 2025', status: 'Active' },
];

export default function Homework() {
  const { user } = useAuth();

  // ── Tab ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('homework');

  // ── Toast ────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Homework state ───────────────────────────────────────────────────────
  const [homework, setHomework] = useState(initialHW);
  const [showHWModal, setShowHWModal] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [hwForm, setHWForm] = useState({ title: '', class: '', subject: '', dueDate: '', description: '' });

  const filteredHW = homework.filter(h => {
    const matchClass  = !filterClass  || h.class === filterClass;
    const matchStatus = !filterStatus || h.status === filterStatus;
    return matchClass && matchStatus;
  });

  const handleHWSave = (e) => {
    e.preventDefault();
    if (!hwForm.title.trim() || !hwForm.class) {
      showToast('Title and Class are required', 'error'); return;
    }
    setHomework(prev => [...prev, {
      id: Date.now(), ...hwForm,
      assignedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Active',
    }]);
    setShowHWModal(false);
    setHWForm({ title: '', class: '', subject: '', dueDate: '', description: '' });
    showToast('Homework assigned successfully!');
  };

  const handleDelete = (id) => {
    setHomework(prev => prev.filter(h => h.id !== id));
    showToast('Homework deleted', 'warning');
  };

  const handleMarkComplete = (id) => {
    setHomework(prev => prev.map(h => h.id === id ? { ...h, status: 'Completed' } : h));
    showToast('Marked as completed');
  };

  const statusColor = { Active: '#76C442', Completed: '#3182ce' };

  // ── Diary state ──────────────────────────────────────────────────────────
  const [myClasses, setMyClasses]   = useState([]);
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [previewEntry, setPreviewEntry] = useState(null);

  const [diaryForm, setDiaryForm] = useState({
    className: '', section: '', subject: '', diaryDate: TODAY,
    description: '', imageUrl: '', imageName: '',
  });
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  // Load teacher's classes
  useEffect(() => {
    if (!user?.id) return;
    teacherAPI.getMyClasses(user.id)
      .then(res => {
        const classes = res.data?.data ?? [];
        setMyClasses(Array.isArray(classes) ? classes : []);
      })
      .catch(() => setMyClasses([]));
  }, [user?.id]);

  // Load diary entries whenever tab opens
  useEffect(() => {
    if (activeTab !== 'diary' || !diaryForm.className) return;
    fetchDiary(diaryForm.className);
  }, [activeTab, diaryForm.className]);

  const fetchDiary = async (className) => {
    if (!className) return;
    setDiaryLoading(true);
    try {
      const res = await diaryAPI.getByClass(className);
      const data = res.data?.data ?? [];
      setDiaryEntries(Array.isArray(data) ? data : []);
    } catch {
      setDiaryEntries([]);
    } finally {
      setDiaryLoading(false);
    }
  };

  const handleClassChange = (e) => {
    const cls = myClasses.find(c => c.id === Number(e.target.value));
    const className = cls ? cls.name : '';
    const section   = cls ? (cls.section || '') : '';
    setDiaryForm(prev => ({ ...prev, className, section }));
    if (className) fetchDiary(className);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Image-only validation
    if (!file.type.startsWith('image/')) {
      showToast('Only image files are allowed (JPG, PNG, GIF, etc.)', 'error');
      e.target.value = '';
      return;
    }
    // 5 MB limit
    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be smaller than 5 MB', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result;
      setDiaryForm(prev => ({ ...prev, imageUrl: base64, imageName: file.name }));
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleDiarySubmit = async (e) => {
    e.preventDefault();
    if (!diaryForm.className) { showToast('Please select a class', 'error'); return; }
    if (!diaryForm.imageUrl)  { showToast('Please upload a diary image', 'error'); return; }

    setSubmitting(true);
    try {
      await diaryAPI.create({
        ...diaryForm,
        teacherId:   user?.id,
        teacherName: user?.name,
      });
      showToast('Today\'s Diary uploaded successfully!');
      setDiaryForm(prev => ({ ...prev, description: '', imageUrl: '', imageName: '', diaryDate: TODAY }));
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      fetchDiary(diaryForm.className);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to upload diary';
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = (entry) => {
    const link = document.createElement('a');
    link.href = entry.imageUrl;
    link.download = entry.imageName || `diary-${entry.diaryDate}.jpg`;
    link.click();
  };

  const reviewColor = { PENDING: '#ed8936', APPROVED: '#76C442', REJECTED: '#e53e3e' };

  return (
    <Layout pageTitle="Homework & Diary">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Homework & Diary</h1>
        <p>Manage homework assignments and upload today's class diary</p>
      </div>

      {/* Tab Switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '2px solid #f0f4f8', paddingBottom: '0' }}>
        {[
          { key: 'homework', label: 'Homework', icon: 'menu_book' },
          { key: 'diary',    label: "Today's Diary", icon: 'photo_camera' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: '14px', fontWeight: 600,
            color: activeTab === tab.key ? '#76C442' : '#718096',
            borderBottom: activeTab === tab.key ? '2px solid #76C442' : '2px solid transparent',
            marginBottom: '-2px', transition: 'all 0.2s',
          }}>
            <span className="material-icons" style={{ fontSize: '18px' }}>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── HOMEWORK TAB ── */}
      {activeTab === 'homework' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total',     value: homework.length,                                       color: '#76C442', icon: 'menu_book' },
              { label: 'Active',    value: homework.filter(h => h.status === 'Active').length,    color: '#3182ce', icon: 'pending_actions' },
              { label: 'Completed', value: homework.filter(h => h.status === 'Completed').length, color: '#805ad5', icon: 'check_circle' },
              { label: 'Classes',   value: [...new Set(homework.map(h => h.class))].length,       color: '#ed8936', icon: 'class' },
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

          <div className="data-table-card">
            <div className="search-filter-bar">
              <select className="filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
                <option value="">All Classes</option>
                {[...new Set(homework.map(h => h.class))].map(c => <option key={c}>{c}</option>)}
              </select>
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option>Active</option>
                <option>Completed</option>
              </select>
              <button className="btn-add" onClick={() => setShowHWModal(true)}>
                <span className="material-icons">add</span> Assign Homework
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {filteredHW.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px' }}>
                  <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0' }}>menu_book</span>
                  <h3 style={{ color: '#a0aec0', marginTop: 12 }}>No homework found</h3>
                </div>
              ) : filteredHW.map(h => {
                const color = statusColor[h.status] || '#76C442';
                const isOverdue = h.status === 'Active' && new Date(h.dueDate) < new Date();
                return (
                  <div key={h.id} style={{ border: `1.5px solid ${isOverdue ? '#fed7d7' : '#f0f4f8'}`, borderRadius: '12px', padding: '20px', background: isOverdue ? '#fff5f5' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span className="material-icons" style={{ color, fontSize: '18px' }}>menu_book</span>
                          </div>
                          <div>
                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748', margin: 0 }}>{h.title}</h3>
                            <div style={{ fontSize: '12px', color: '#a0aec0' }}>Assigned: {h.assignedAt}</div>
                          </div>
                        </div>
                        <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 12px', lineHeight: '1.5' }}>{h.description}</p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          {[
                            { icon: 'class',         text: `Class ${h.class}` },
                            { icon: 'science',       text: h.subject },
                            { icon: 'calendar_today', text: `Due: ${h.dueDate}` },
                          ].map((info, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="material-icons" style={{ fontSize: '14px', color: '#a0aec0' }}>{info.icon}</span>
                              <span style={{ fontSize: '12px', color: isOverdue && info.icon === 'calendar_today' ? '#e53e3e' : '#718096' }}>{info.text}</span>
                            </div>
                          ))}
                          {isOverdue && <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: '#fff5f5', color: '#e53e3e' }}>OVERDUE</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: 16 }}>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: color + '15', color }}>{h.status}</span>
                        <div className="action-btns">
                          {h.status === 'Active' && (
                            <button className="action-btn" style={{ color: '#76C442', background: '#f0fff4' }} title="Mark Complete" onClick={() => handleMarkComplete(h.id)}>
                              <span className="material-icons">check_circle</span>
                            </button>
                          )}
                          <button className="action-btn action-btn-delete" onClick={() => handleDelete(h.id)} title="Delete">
                            <span className="material-icons">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assign Homework Modal */}
          {showHWModal && (
            <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Assign Homework</h5>
                    <button className="btn-close" onClick={() => setShowHWModal(false)} />
                  </div>
                  <form onSubmit={handleHWSave}>
                    <div className="modal-body">
                      <div className="mb-3">
                        <label className="form-label small fw-medium">Title *</label>
                        <input type="text" className="form-control form-control-sm" placeholder="Homework title"
                          value={hwForm.title} onChange={e => setHWForm({ ...hwForm, title: e.target.value })} required />
                      </div>
                      <div className="row g-3 mb-3">
                        <div className="col-6">
                          <label className="form-label small fw-medium">Class *</label>
                          <select className="form-select form-select-sm" value={hwForm.class}
                            onChange={e => setHWForm({ ...hwForm, class: e.target.value })} required>
                            <option value="">Select Class</option>
                            {myClasses.length > 0
                              ? myClasses.map(c => <option key={c.id} value={c.name}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>)
                              : ['10-A', '9-B', '10-B', '8-A'].map(c => <option key={c}>{c}</option>)}
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="form-label small fw-medium">Subject</label>
                          <select className="form-select form-select-sm" value={hwForm.subject}
                            onChange={e => setHWForm({ ...hwForm, subject: e.target.value })}>
                            <option value="">Select Subject</option>
                            {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="col-6">
                          <label className="form-label small fw-medium">Due Date</label>
                          <input type="date" className="form-control form-control-sm" value={hwForm.dueDate}
                            min={TODAY}
                            onChange={e => setHWForm({ ...hwForm, dueDate: e.target.value })} />
                        </div>
                      </div>
                      <div className="mb-2">
                        <label className="form-label small fw-medium">Description</label>
                        <textarea className="form-control form-control-sm" rows={3} placeholder="Instructions for students..."
                          value={hwForm.description} onChange={e => setHWForm({ ...hwForm, description: e.target.value })} />
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowHWModal(false)}>Cancel</button>
                      <button type="submit" className="btn btn-primary">Assign</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── DIARY TAB ── */}
      {activeTab === 'diary' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

          {/* Upload Form */}
          <div className="data-table-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#76C44215', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>photo_camera</span>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#2d3748' }}>Upload Today's Diary</h3>
                <p style={{ margin: 0, fontSize: '12px', color: '#a0aec0' }}>Visible only to parents of this class</p>
              </div>
            </div>

            <form onSubmit={handleDiarySubmit}>
              {/* Class */}
              <div className="mb-3">
                <label className="form-label small fw-medium">Class *</label>
                <select className="form-select form-select-sm" onChange={handleClassChange} required
                  defaultValue="">
                  <option value="" disabled>Select your class</option>
                  {myClasses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="row g-3 mb-3">
                {/* Subject */}
                <div className="col-6">
                  <label className="form-label small fw-medium">Subject <span style={{ color: '#a0aec0' }}>(optional)</span></label>
                  <select className="form-select form-select-sm" value={diaryForm.subject}
                    onChange={e => setDiaryForm(prev => ({ ...prev, subject: e.target.value }))}>
                    <option value="">All Subjects</option>
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                {/* Date */}
                <div className="col-6">
                  <label className="form-label small fw-medium">Date</label>
                  <input type="date" className="form-control form-control-sm"
                    value={diaryForm.diaryDate} max={TODAY}
                    onChange={e => setDiaryForm(prev => ({ ...prev, diaryDate: e.target.value }))} />
                </div>
              </div>

              {/* Image Upload */}
              <div className="mb-3">
                <label className="form-label small fw-medium">Diary Photo * <span style={{ color: '#a0aec0' }}>(max 5 MB, images only)</span></label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #e2e8f0', borderRadius: '12px', padding: '20px', textAlign: 'center',
                    cursor: 'pointer', background: imagePreview ? '#f0fff4' : '#fafafa',
                    transition: 'all 0.2s',
                  }}
                >
                  {imagePreview ? (
                    <div>
                      <img src={imagePreview} alt="Preview"
                        style={{ maxHeight: '160px', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
                      <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#76C442' }}>
                        {diaryForm.imageName} — click to change
                      </p>
                    </div>
                  ) : (
                    <>
                      <span className="material-icons" style={{ fontSize: '40px', color: '#cbd5e0' }}>add_photo_alternate</span>
                      <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#a0aec0' }}>Click to upload diary photo</p>
                      <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#cbd5e0' }}>JPG, PNG, GIF — up to 5 MB</p>
                    </>
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageChange} />
              </div>

              {/* Description */}
              <div className="mb-4">
                <label className="form-label small fw-medium">Description <span style={{ color: '#a0aec0' }}>(optional)</span></label>
                <textarea className="form-control form-control-sm" rows={3}
                  placeholder="E.g. Today's classwork, homework details, announcements..."
                  value={diaryForm.description}
                  onChange={e => setDiaryForm(prev => ({ ...prev, description: e.target.value }))} />
              </div>

              <button type="submit" className="btn btn-primary w-100" disabled={submitting}
                style={{ background: '#76C442', border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 600 }}>
                {submitting ? 'Uploading...' : 'Upload Diary'}
              </button>
            </form>
          </div>

          {/* Recent Diary Entries */}
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748', marginBottom: '16px' }}>
              {diaryForm.className ? `Recent Diary — Class ${diaryForm.className}` : 'Select a class to view entries'}
            </h3>

            {diaryLoading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>hourglass_empty</span>
                Loading...
              </div>
            ) : !diaryForm.className ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>photo_library</span>
                <p>Select a class to see diary entries</p>
              </div>
            ) : diaryEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#a0aec0' }}>
                <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>photo_library</span>
                <p>No diary entries yet</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {diaryEntries.map(entry => (
                  <div key={entry.id} style={{ border: '1.5px solid #f0f4f8', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                    {/* Thumbnail */}
                    <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setPreviewEntry(entry)}>
                      <img src={entry.imageUrl} alt="Diary"
                        style={{ width: '100%', height: '160px', objectFit: 'cover' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0}>
                        <span className="material-icons" style={{ color: '#fff', fontSize: 36 }}>zoom_in</span>
                      </div>
                      <span style={{ position: 'absolute', top: 8, right: 8, background: reviewColor[entry.reviewStatus] || '#ed8936', color: '#fff', borderRadius: '20px', padding: '2px 10px', fontSize: '11px', fontWeight: 700 }}>
                        {entry.reviewStatus || 'PENDING'}
                      </span>
                    </div>
                    <div style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748' }}>
                            {entry.subject || 'General'} — {entry.diaryDate}
                          </div>
                          {entry.description && (
                            <p style={{ fontSize: '12px', color: '#718096', margin: '4px 0 0', lineHeight: 1.5 }}>
                              {entry.description.length > 80 ? entry.description.slice(0, 80) + '…' : entry.description}
                            </p>
                          )}
                          {entry.adminComment && (
                            <p style={{ fontSize: '11px', color: '#805ad5', margin: '6px 0 0', fontStyle: 'italic' }}>
                              Admin: {entry.adminComment}
                            </p>
                          )}
                        </div>
                        <button onClick={() => handleDownload(entry)} title="Download"
                          style={{ border: 'none', background: '#f0f4f8', borderRadius: '8px', padding: '6px', cursor: 'pointer', color: '#718096', flexShrink: 0, marginLeft: 8 }}>
                          <span className="material-icons" style={{ fontSize: '16px' }}>download</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Image Preview Lightbox */}
      {previewEntry && (
        <div onClick={() => setPreviewEntry(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', maxWidth: '700px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f4f8' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#2d3748' }}>{previewEntry.subject || 'General Diary'} — {previewEntry.diaryDate}</div>
                <div style={{ fontSize: '12px', color: '#a0aec0' }}>Class {previewEntry.className}{previewEntry.section ? ` - ${previewEntry.section}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => handleDownload(previewEntry)} style={{ border: 'none', background: '#f0f4f8', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', color: '#4a5568', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>download</span> Download
                </button>
                <button onClick={() => setPreviewEntry(null)} style={{ border: 'none', background: '#fff5f5', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#e53e3e' }}>
                  <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
            </div>
            <img src={previewEntry.imageUrl} alt="Diary full"
              style={{ width: '100%', maxHeight: '500px', objectFit: 'contain', background: '#f7fafc' }} />
            {previewEntry.description && (
              <div style={{ padding: '16px 20px', fontSize: '13px', color: '#4a5568', borderTop: '1px solid #f0f4f8' }}>
                {previewEntry.description}
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
