import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { diaryAPI, adminAPI } from '../../services/api';

const STATUS_COLOR  = { PENDING: '#ed8936', APPROVED: '#76C442', REJECTED: '#e53e3e' };
const STATUS_BG     = { PENDING: '#fff7ed', APPROVED: '#f0fff4', REJECTED: '#fff5f5' };

export default function DiaryMonitoring() {
  const [entries,   setEntries]   = useState([]);
  const [teachers,  setTeachers]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toast,     setToast]     = useState(null);
  const [preview,   setPreview]   = useState(null);   // entry for lightbox
  const [reviewing, setReviewing] = useState(null);   // entry for review modal

  // Filters
  const [filterClass,   setFilterClass]   = useState('');
  const [filterTeacher, setFilterTeacher] = useState('');
  const [filterDate,    setFilterDate]    = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');

  // Review form
  const [reviewForm, setReviewForm] = useState({ reviewStatus: '', adminComment: '' });
  const [reviewSaving, setReviewSaving] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterClass)   params.className  = filterClass;
      if (filterTeacher) params.teacherId  = filterTeacher;
      if (filterDate)    params.date       = filterDate;
      const res = await diaryAPI.getAll(params);
      let data = res.data?.data ?? [];
      if (filterStatus) data = data.filter(e => e.reviewStatus === filterStatus);
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [filterClass, filterTeacher, filterDate, filterStatus]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Load teachers for filter dropdown
  useEffect(() => {
    adminAPI.getTeachers()
      .then(res => setTeachers(res.data?.data ?? []))
      .catch(() => setTeachers([]));
  }, []);

  // Unique classes derived from loaded entries
  const classes = [...new Set(entries.map(e => e.className).filter(Boolean))].sort();

  const openReview = (entry) => {
    setReviewing(entry);
    setReviewForm({ reviewStatus: entry.reviewStatus || 'PENDING', adminComment: entry.adminComment || '' });
  };

  const handleReviewSave = async () => {
    if (!reviewing) return;
    setReviewSaving(true);
    try {
      await diaryAPI.updateReview(reviewing.id, reviewForm);
      showToast('Review updated');
      setReviewing(null);
      fetchEntries();
    } catch {
      showToast('Failed to update review', 'error');
    } finally {
      setReviewSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this diary entry permanently?')) return;
    try {
      await diaryAPI.delete(id);
      showToast('Entry deleted', 'warning');
      fetchEntries();
    } catch {
      showToast('Failed to delete entry', 'error');
    }
  };

  const handleDownload = (entry) => {
    const link = document.createElement('a');
    link.href = entry.imageUrl;
    link.download = entry.imageName || `diary-${entry.diaryDate}-${entry.className}.jpg`;
    link.click();
  };

  const clearFilters = () => {
    setFilterClass(''); setFilterTeacher(''); setFilterDate(''); setFilterStatus('');
  };

  const statCounts = {
    total:    entries.length,
    pending:  entries.filter(e => e.reviewStatus === 'PENDING'  || !e.reviewStatus).length,
    approved: entries.filter(e => e.reviewStatus === 'APPROVED').length,
    rejected: entries.filter(e => e.reviewStatus === 'REJECTED').length,
  };

  return (
    <Layout pageTitle="Homework / Diary Monitoring">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Homework / Diary Monitoring</h1>
        <p>Review all class diary entries uploaded by teachers</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Entries', value: statCounts.total,    color: '#3182ce', icon: 'photo_library' },
          { label: 'Pending',       value: statCounts.pending,  color: '#ed8936', icon: 'hourglass_empty' },
          { label: 'Approved',      value: statCounts.approved, color: '#76C442', icon: 'check_circle' },
          { label: 'Rejected',      value: statCounts.rejected, color: '#e53e3e', icon: 'cancel' },
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

      {/* Filters */}
      <div className="data-table-card" style={{ marginBottom: '20px' }}>
        <div className="search-filter-bar" style={{ flexWrap: 'wrap', gap: '10px' }}>
          {/* Class filter - populated from entries */}
          <select className="filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Teacher filter */}
          <select className="filter-select" value={filterTeacher} onChange={e => setFilterTeacher(e.target.value)}>
            <option value="">All Teachers</option>
            {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>

          {/* Date filter */}
          <input type="date" className="filter-select" value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            style={{ padding: '7px 12px' }} />

          {/* Status filter */}
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          {(filterClass || filterTeacher || filterDate || filterStatus) && (
            <button onClick={clearFilters} style={{ border: 'none', background: '#fff5f5', color: '#e53e3e', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
              <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle', marginRight: '4px' }}>close</span>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Entry Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
          Loading diary entries...
        </div>
      ) : entries.length === 0 ? (
        <div className="data-table-card" style={{ textAlign: 'center', padding: '60px' }}>
          <span className="material-icons" style={{ fontSize: 56, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>photo_library</span>
          <h3 style={{ color: '#a0aec0', margin: '0 0 8px' }}>No diary entries found</h3>
          <p style={{ color: '#cbd5e0', margin: 0, fontSize: '14px' }}>Try adjusting the filters or wait for teachers to upload</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {entries.map(entry => {
            const status = entry.reviewStatus || 'PENDING';
            return (
              <div key={entry.id} style={{ border: '1.5px solid #f0f4f8', borderRadius: '14px', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {/* Image */}
                <div style={{ position: 'relative', cursor: 'pointer', height: '180px', background: '#f7fafc' }}
                  onClick={() => setPreview(entry)}>
                  <img src={entry.imageUrl} alt="Diary"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.2s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}>
                    <span className="material-icons" style={{ color: '#fff', fontSize: 36, opacity: 0, transition: 'opacity 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = 1; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = 0; }}>zoom_in</span>
                  </div>
                  {/* Status badge */}
                  <span style={{
                    position: 'absolute', top: 10, right: 10,
                    background: STATUS_COLOR[status], color: '#fff',
                    borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700,
                  }}>
                    {status}
                  </span>
                </div>

                {/* Info */}
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14px', color: '#2d3748' }}>
                        Class {entry.className}{entry.section ? ` - ${entry.section}` : ''}
                      </div>
                      <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                        {entry.teacherName || 'Teacher'} · {entry.diaryDate}
                      </div>
                    </div>
                    <span style={{ background: '#f0f4f8', color: '#4a5568', borderRadius: '8px', padding: '3px 8px', fontSize: '11px', fontWeight: 600 }}>
                      {entry.subject || 'General'}
                    </span>
                  </div>

                  {entry.description && (
                    <p style={{ fontSize: '12px', color: '#718096', margin: '0 0 10px', lineHeight: 1.5 }}>
                      {entry.description.length > 90 ? entry.description.slice(0, 90) + '…' : entry.description}
                    </p>
                  )}

                  {entry.adminComment && (
                    <div style={{ background: '#f7f0ff', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', fontSize: '12px', color: '#805ad5' }}>
                      <span style={{ fontWeight: 700 }}>Comment: </span>{entry.adminComment}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button onClick={() => setPreview(entry)} title="View"
                      style={{ flex: 1, border: 'none', background: '#ebf8ff', color: '#3182ce', borderRadius: '8px', padding: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span className="material-icons" style={{ fontSize: '14px' }}>visibility</span> View
                    </button>
                    <button onClick={() => openReview(entry)} title="Review"
                      style={{ flex: 1, border: 'none', background: STATUS_BG[status], color: STATUS_COLOR[status], borderRadius: '8px', padding: '7px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                      <span className="material-icons" style={{ fontSize: '14px' }}>rate_review</span> Review
                    </button>
                    <button onClick={() => handleDownload(entry)} title="Download"
                      style={{ border: 'none', background: '#f0f4f8', color: '#4a5568', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer' }}>
                      <span className="material-icons" style={{ fontSize: '16px' }}>download</span>
                    </button>
                    <button onClick={() => handleDelete(entry.id)} title="Delete"
                      style={{ border: 'none', background: '#fff5f5', color: '#e53e3e', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer' }}>
                      <span className="material-icons" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Image Preview Lightbox */}
      {preview && (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', maxWidth: '760px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f0f4f8' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#2d3748', fontSize: '15px' }}>
                  Class {preview.className}{preview.section ? ` - ${preview.section}` : ''} · {preview.subject || 'General'}
                </div>
                <div style={{ fontSize: '12px', color: '#a0aec0', marginTop: '2px' }}>
                  {preview.teacherName} · {preview.diaryDate}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => { setPreview(null); openReview(preview); }}
                  style={{ border: 'none', background: '#f0fff4', color: '#276749', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>rate_review</span> Review
                </button>
                <button onClick={() => handleDownload(preview)}
                  style={{ border: 'none', background: '#f0f4f8', color: '#4a5568', borderRadius: '8px', padding: '8px 14px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span className="material-icons" style={{ fontSize: '16px' }}>download</span> Download
                </button>
                <button onClick={() => setPreview(null)}
                  style={{ border: 'none', background: '#fff5f5', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#e53e3e' }}>
                  <span className="material-icons" style={{ fontSize: '18px' }}>close</span>
                </button>
              </div>
            </div>
            <img src={preview.imageUrl} alt="Diary full"
              style={{ width: '100%', maxHeight: '520px', objectFit: 'contain', background: '#f7fafc' }} />
            {preview.description && (
              <div style={{ padding: '16px 20px', fontSize: '13px', color: '#4a5568', borderTop: '1px solid #f0f4f8' }}>
                {preview.description}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewing && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Review Diary Entry</h5>
                <button className="btn-close" onClick={() => setReviewing(null)} />
              </div>
              <div className="modal-body">
                <div style={{ marginBottom: '16px', padding: '12px', background: '#f7fafc', borderRadius: '10px', fontSize: '13px' }}>
                  <div style={{ fontWeight: 700, color: '#2d3748', marginBottom: '4px' }}>
                    Class {reviewing.className} · {reviewing.subject || 'General'} · {reviewing.diaryDate}
                  </div>
                  <div style={{ color: '#718096' }}>Teacher: {reviewing.teacherName}</div>
                </div>

                <div className="mb-3">
                  <label className="form-label small fw-medium">Review Status</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {['PENDING', 'APPROVED', 'REJECTED'].map(s => (
                      <button key={s} type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, reviewStatus: s }))}
                        style={{
                          flex: 1, padding: '10px', border: `2px solid ${reviewForm.reviewStatus === s ? STATUS_COLOR[s] : '#e2e8f0'}`,
                          borderRadius: '10px', background: reviewForm.reviewStatus === s ? STATUS_BG[s] : '#fff',
                          color: reviewForm.reviewStatus === s ? STATUS_COLOR[s] : '#a0aec0',
                          cursor: 'pointer', fontWeight: 700, fontSize: '12px', transition: 'all 0.2s',
                        }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-2">
                  <label className="form-label small fw-medium">Admin Comment <span style={{ color: '#a0aec0' }}>(optional)</span></label>
                  <textarea className="form-control form-control-sm" rows={3}
                    placeholder="Add a comment for the teacher..."
                    value={reviewForm.adminComment}
                    onChange={e => setReviewForm(prev => ({ ...prev, adminComment: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setReviewing(null)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleReviewSave} disabled={reviewSaving}
                  style={{ background: '#76C442', border: 'none' }}>
                  {reviewSaving ? 'Saving...' : 'Save Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
