import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Button from '../../components/Button';
import { teacherAPI } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const getGrade = (marks, max) => {
  if (!marks || !max) return '';
  const pct = (marks / max) * 100;
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'B-';
  if (pct >= 33) return 'C';
  return 'F';
};

const gradeColor = { O: '#276749', 'A+': '#276749', A: '#276749', 'B+': '#2b6cb0', B: '#2b6cb0', 'B-': '#c05621', C: '#c05621', F: '#c53030' };
const gradeBg    = { O: '#f0fff4', 'A+': '#f0fff4', A: '#f0fff4', 'B+': '#ebf8ff', B: '#ebf8ff', 'B-': '#fffaf0', C: '#fffaf0', F: '#fff5f5' };
const statusColor = { Active: '#0de1e8', Completed: '#3182ce', Overdue: '#e53e3e' };

const EMPTY_FORM = { title: '', description: '', className: '', dueDate: '', maxMarks: '' };

export default function Assignments() {
  const [assignments,    setAssignments]    = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [filterStatus,   setFilterStatus]   = useState('');
  const [showModal,      setShowModal]      = useState(false);
  const [formData,       setFormData]       = useState(EMPTY_FORM);
  const [saving,         setSaving]         = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [deleting,       setDeleting]       = useState(false);
  // Submissions panel
  const [viewSubmissions,  setViewSubmissions]  = useState(null); // assignment object
  const [submissions,      setSubmissions]      = useState([]);
  const [loadingSubs,      setLoadingSubs]      = useState(false);
  const [gradingId,        setGradingId]        = useState(null);
  const [gradeForm,        setGradeForm]        = useState({ grade: '', feedback: '' });
  const [savingGrade,      setSavingGrade]      = useState(false);

  const showToast = useToast();

  // ── Load assignments from backend ─────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await teacherAPI.getAssignments();
      const data = res.data?.data ?? res.data ?? [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load assignments', 'error');
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Submissions ───────────────────────────────────────────────────────────
  const openSubmissions = async (assignment) => {
    setViewSubmissions(assignment);
    setLoadingSubs(true);
    setSubmissions([]);
    setGradingId(null);
    try {
      const res = await teacherAPI.getAssignmentSubmissions(assignment.id);
      setSubmissions(res.data?.data ?? []);
    } catch {
      setSubmissions([]);
    } finally {
      setLoadingSubs(false);
    }
  };

  const handleGrade = async (sub) => {
    setSavingGrade(true);
    try {
      await teacherAPI.gradeSubmission(viewSubmissions.id, sub.id, gradeForm);
      setGradingId(null);
      // Refresh list
      const res = await teacherAPI.getAssignmentSubmissions(viewSubmissions.id);
      setSubmissions(res.data?.data ?? []);
      showToast('Grade saved');
    } catch {
      showToast('Failed to save grade', 'error');
    } finally {
      setSavingGrade(false);
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim())     { showToast('Title is required', 'error'); return; }
    if (!formData.className.trim()) { showToast('Class is required', 'error'); return; }

    setSaving(true);
    try {
      const res = await teacherAPI.createAssignment({
        title:       formData.title.trim(),
        description: formData.description.trim(),
        className:   formData.className.trim(),
        dueDate:     formData.dueDate || null,
        maxMarks:    formData.maxMarks ? Number(formData.maxMarks) : null,
        status:      'ACTIVE',
      });
      const created = res.data?.data ?? res.data;
      if (res.data?.success === false) {
        showToast(res.data.message || 'Failed to create assignment', 'error');
        return;
      }
      // Only add to state after confirmed backend save
      if (created?.id) {
        setAssignments(prev => [created, ...prev]);
      } else {
        await load(); // fallback: reload from DB
      }
      setShowModal(false);
      setFormData(EMPTY_FORM);
      showToast('Assignment created successfully');
    } catch (err) {
      showToast(err.response?.data?.message || 'Network error — assignment not saved', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await teacherAPI.deleteAssignment(deleteTarget.id);
      // Only remove from UI after backend confirms deletion
      setAssignments(prev => prev.filter(a => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      showToast('Assignment deleted', 'warning');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to delete assignment. Please try again.';
      showToast(msg, 'error');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const filtered = assignments.filter(a => !filterStatus || a.status === filterStatus);

  return (
    <Layout pageTitle="Assignments">
      <div className="page-header">
        <h1>Assignments</h1>
        <p>Create and manage assignments for your classes</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total',     value: assignments.length,                                       color: '#0de1e8' },
          { label: 'Active',    value: assignments.filter(a => a.status === 'Active').length,    color: '#3182ce' },
          { label: 'Completed', value: assignments.filter(a => a.status === 'Completed').length, color: '#805ad5' },
          { label: 'Overdue',   value: assignments.filter(a => a.status === 'Overdue').length,   color: '#e53e3e' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</div>
            <div className="stat-label">{c.label} Assignments</div>
          </div>
        ))}
      </div>

      <div className="data-table-card">
        <div className="search-filter-bar">
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Active</option>
            <option>Completed</option>
            <option>Overdue</option>
          </select>
          <Button variant="add" onClick={() => { setFormData(EMPTY_FORM); setShowModal(true); }}>
            <span className="material-icons">add</span> New Assignment
          </Button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
            Loading assignments…
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
            <span className="material-icons" style={{ fontSize: 48, color: 'var(--border-strong)', display: 'block', marginBottom: 12 }}>assignment</span>
            <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
              {filterStatus ? `No ${filterStatus.toLowerCase()} assignments.` : 'No assignments yet.'}
            </p>
            {!filterStatus && (
              <Button variant="add" onClick={() => setShowModal(true)}>
                <span className="material-icons">add</span> Create First Assignment
              </Button>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {filtered.map(a => {
              const color = statusColor[a.status] || '#0de1e8';
              const submitted = a.submittedCount ?? a.submitted ?? 0;
              const total     = a.totalStudents  ?? a.total     ?? 0;
              const pct       = total > 0 ? Math.round((submitted / total) * 100) : 0;
              return (
                <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span className="material-icons" style={{ color, fontSize: 18 }}>assignment</span>
                        </div>
                        <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{a.title}</h3>
                      </div>
                      {a.description && (
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 10px', lineHeight: 1.5 }}>{a.description}</p>
                      )}
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {a.classSection && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-icons" style={{ fontSize: 14, color: 'var(--text-muted)' }}>class</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Class {a.classSection}</span>
                          </div>
                        )}
                        {a.dueDate && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-icons" style={{ fontSize: 14, color: 'var(--text-muted)' }}>calendar_today</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Due: {a.dueDate}</span>
                          </div>
                        )}
                        {total > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <span className="material-icons" style={{ fontSize: 14, color: 'var(--text-muted)' }}>assignment_turned_in</span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{submitted}/{total} submitted</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, marginLeft: 16 }}>
                      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: color + '15', color }}>{a.status || 'Active'}</span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openSubmissions(a)}
                          title="View Submissions"
                          style={{ border: 'none', background: '#ebf8ff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#2b6cb0', fontWeight: 600, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className="material-icons" style={{ fontSize: 15 }}>assignment_turned_in</span>
                          Submissions
                        </button>
                        <Button
                          variant="delete"
                          title="Delete Assignment"
                          onClick={() => setDeleteTarget(a)}
                        />
                      </div>
                    </div>
                  </div>
                  {total > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div className="progress-bar-custom">
                          <div className="progress-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color, minWidth: 40 }}>{pct}%</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Create Assignment Modal ──────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !saving && setShowModal(false)}>
          <div className="modal-container" style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Create New Assignment</h3>
              <button onClick={() => setShowModal(false)} disabled={saving}
                style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>
                    Title <span style={{ color: '#e53e3e' }}>*</span>
                  </label>
                  <input
                    type="text" className="form-control form-control-sm"
                    placeholder="Assignment title"
                    maxLength={200}
                    value={formData.title}
                    onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Description</label>
                  <textarea
                    className="form-control form-control-sm" rows={3}
                    placeholder="Assignment instructions…"
                    maxLength={5000}
                    value={formData.description}
                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>
                      Class <span style={{ color: '#e53e3e' }}>*</span>
                    </label>
                    <input
                      type="text" className="form-control form-control-sm"
                      placeholder="e.g. 10-A"
                      value={formData.className}
                      onChange={e => setFormData(f => ({ ...f, className: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Due Date</label>
                    <input
                      type="date" className="form-control form-control-sm"
                      min={new Date().toISOString().split('T')[0]}
                      value={formData.dueDate}
                      onChange={e => setFormData(f => ({ ...f, dueDate: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ width: '50%' }}>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: 13, marginBottom: 5 }}>Max Marks</label>
                  <input
                    type="number" className="form-control form-control-sm"
                    placeholder="e.g. 100" min={1}
                    value={formData.maxMarks}
                    onChange={e => setFormData(f => ({ ...f, maxMarks: e.target.value }))}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} disabled={saving}
                  style={{ padding: '9px 20px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600 }}>
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  style={{ padding: '9px 20px', background: saving ? '#a0aec0' : '#0de1e8', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {saving ? (
                    <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Saving…</>
                  ) : 'Create Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Submissions Modal ───────────────────────────────────────────────── */}
      {viewSubmissions && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setViewSubmissions(null)}>
          <div className="modal-container" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Submissions</h3>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{viewSubmissions.title} — Class {viewSubmissions.className}</div>
              </div>
              <button onClick={() => setViewSubmissions(null)}
                style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-secondary)' }}>✕</button>
            </div>
            <div style={{ padding: '16px 24px', maxHeight: '60vh', overflowY: 'auto' }}>
              {loadingSubs ? (
                <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)' }}>Loading…</div>
              ) : submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <span className="material-icons" style={{ fontSize: 40, color: 'var(--border-strong)', display: 'block', marginBottom: 8 }}>inbox</span>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No submissions yet</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {submissions.map(sub => (
                    <div key={sub.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{sub.studentName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>
                            {sub.classSection} · {sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                          </div>
                          {sub.notes && (
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6, padding: '6px 10px', background: 'var(--surface-alt)', borderRadius: 6 }}>{sub.notes}</div>
                          )}
                          {sub.grade && (
                            <span style={{ display: 'inline-block', marginTop: 6, padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 700, background: '#ebf8ff', color: '#2b6cb0' }}>Grade: {sub.grade}</span>
                          )}
                          {sub.feedback && (
                            <div style={{ fontSize: 12, color: '#805ad5', marginTop: 4, fontStyle: 'italic' }}>Feedback: {sub.feedback}</div>
                          )}
                        </div>
                        {gradingId === sub.id ? (
                          <div style={{ minWidth: 200 }}>
                            <input
                              type="text" placeholder="Grade (e.g. A, 85/100)"
                              maxLength={50}
                              value={gradeForm.grade}
                              onChange={e => setGradeForm(f => ({ ...f, grade: e.target.value }))}
                              style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, marginBottom: 6, boxSizing: 'border-box' }}
                            />
                            <textarea
                              placeholder="Feedback (optional)"
                              rows={2}
                              maxLength={2000}
                              value={gradeForm.feedback}
                              onChange={e => setGradeForm(f => ({ ...f, feedback: e.target.value }))}
                              style={{ width: '100%', padding: '6px 10px', border: '1px solid var(--border-strong)', borderRadius: 6, fontSize: 12, resize: 'none', marginBottom: 6, boxSizing: 'border-box' }}
                            />
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleGrade(sub)} disabled={savingGrade}
                                style={{ flex: 1, padding: '6px', background: '#0de1e8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                {savingGrade ? 'Saving…' : 'Save'}
                              </button>
                              <button onClick={() => setGradingId(null)}
                                style={{ padding: '6px 10px', background: 'var(--surface-alt)', color: 'var(--text-secondary)', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setGradingId(sub.id); setGradeForm({ grade: sub.grade || '', feedback: sub.feedback || '' }); }}
                            style={{ border: 'none', background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0 }}>
                            <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 3 }}>grade</span>
                            {sub.grade ? 'Re-grade' : 'Grade'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', marginRight: 'auto' }}>{submissions.length} submission{submissions.length !== 1 ? 's' : ''}</span>
              <button onClick={() => setViewSubmissions(null)}
                style={{ padding: '8px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ─────────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !deleting && setDeleteTarget(null)}>
          <div className="modal-container" style={{ maxWidth: 400 }}>
            <div className="modal-body" style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fff5f5', border: '3px solid #fc8181', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="material-icons" style={{ fontSize: 32, color: '#e53e3e' }}>delete_outline</span>
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Delete Assignment?</h3>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
                <strong>{deleteTarget.title}</strong>
              </p>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 24px' }}>This action cannot be undone.</p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                  style={{ padding: '9px 22px', border: '1.5px solid var(--border-strong)', borderRadius: 9, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleDelete} disabled={deleting}
                  style={{ padding: '9px 22px', background: '#e53e3e', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {deleting ? (
                    <><span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} /> Deleting…</>
                  ) : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
