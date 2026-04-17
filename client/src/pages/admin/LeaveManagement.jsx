import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { leaveAPI } from '../../services/api';

const normalizeStatus = (s) => {
  if (!s) return 'Pending';
  const l = s.toLowerCase();
  return l.charAt(0).toUpperCase() + l.slice(1);
};

const fmt = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function LeaveManagement() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [tab, setTab]                         = useState('teacher');
  const [teacherLeaves, setTeacherLeaves]     = useState([]);
  const [studentLeaves, setStudentLeaves]     = useState([]);
  const [loadingTeacher, setLoadingTeacher]   = useState(true);
  const [loadingStudent, setLoadingStudent]   = useState(true);
  const [toast, setToast]                     = useState(null);
  const [filterStatus, setFilterStatus]       = useState('');
  const [selectedTeacherLeave, setSelectedTeacherLeave] = useState(null);
  const [comment, setComment]                 = useState('');
  const [actioning, setActioning]             = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadTeacherLeaves = async () => {
    setLoadingTeacher(true);
    try {
      const res  = await leaveAPI.getTeacherLeaves();
      const data = res.data?.data ?? res.data ?? [];
      setTeacherLeaves(Array.isArray(data) ? data : []);
    } catch { /* keep existing */ }
    finally { setLoadingTeacher(false); }
  };

  const loadStudentLeaves = async () => {
    setLoadingStudent(true);
    try {
      const res  = await leaveAPI.getStudentLeaves();
      const data = res.data?.data ?? res.data ?? [];
      setStudentLeaves(Array.isArray(data) ? data : []);
    } catch { /* keep existing */ }
    finally { setLoadingStudent(false); }
  };

  useEffect(() => {
    loadTeacherLeaves();
    if (!isSuperAdmin) loadStudentLeaves();
  }, [isSuperAdmin]);

  // ── Derived lists ─────────────────────────────────────────────────────────
  const filteredTeacher = filterStatus
    ? teacherLeaves.filter(l => normalizeStatus(l.status) === filterStatus)
    : teacherLeaves;

  const filteredStudent = filterStatus
    ? studentLeaves.filter(l => normalizeStatus(l.status) === filterStatus)
    : studentLeaves;

  const teacherPending = teacherLeaves.filter(l => (l.status || '').toUpperCase() === 'PENDING').length;
  const studentPending = studentLeaves.filter(l => (l.status || '').toUpperCase() === 'PENDING').length;

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleTeacherAction = async (leaveId, action) => {
    if (actioning) return;
    setActioning(true);
    try {
      await leaveAPI.updateStatus(leaveId, {
        status:      action.toUpperCase(),
        adminComment: comment.trim() || null,
        reviewedBy:  user?.name || 'Admin',
      });
      await loadTeacherLeaves();
      setSelectedTeacherLeave(null);
      setComment('');
      showToast(`Leave ${action.toLowerCase()} — teacher has been notified`);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update leave status', 'error');
    } finally {
      setActioning(false);
    }
  };

  const handleDeleteTeacher = async (id) => {
    try {
      await leaveAPI.deleteLeave(id);
      setTeacherLeaves(prev => prev.filter(l => l.id !== id));
      showToast('Leave request deleted', 'warning');
    } catch { showToast('Failed to delete', 'error'); }
  };

  const getStatusBadge = (rawStatus) => {
    const status = normalizeStatus(rawStatus);
    const map = { Pending: '#ed8936', Approved: '#76C442', Rejected: '#e53e3e' };
    const bg  = { Pending: '#fffaf0', Approved: '#f0fff4', Rejected: '#fff5f5' };
    return (
      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
        background: bg[status] || '#f7fafc', color: map[status] || '#718096' }}>
        {status}
      </span>
    );
  };

  return (
    <Layout pageTitle="Leave Management">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Leave Management</h1>
        <p>Review and manage student and teacher leave requests</p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${isSuperAdmin ? 2 : 4},1fr)`, gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Teacher Leaves',  value: teacherLeaves.length,  color: '#805ad5', icon: 'person' },
          { label: 'Teacher Pending', value: teacherPending,         color: '#ed8936', icon: 'pending_actions' },
          ...(!isSuperAdmin ? [
            { label: 'Student Leaves',  value: studentLeaves.length,  color: '#76C442', icon: 'school' },
            { label: 'Student Pending', value: studentPending,         color: '#3182ce', icon: 'pending_actions' },
          ] : []),
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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {[
          { key: 'teacher', label: 'Teacher Leave Requests', icon: 'person',  badge: teacherPending },
          ...(!isSuperAdmin ? [{ key: 'student', label: 'Student Leave Requests', icon: 'school', badge: studentPending }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setFilterStatus(''); }}
            style={{
              padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px',
              background: tab === t.key ? '#76C442' : '#f7fafc',
              color:      tab === t.key ? '#fff'    : '#718096',
              boxShadow:  tab === t.key ? '0 2px 8px rgba(118,196,66,0.3)' : 'none',
              transition: 'all 0.2s',
            }}>
            <span className="material-icons" style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: tab === t.key ? 'rgba(255,255,255,0.3)' : '#ed8936',
                color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px' }}>
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Teacher Leaves Tab ─────────────────────────────────────────────── */}
      {tab === 'teacher' && (
        <div className="data-table-card">
          <div className="search-filter-bar">
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Teacher</th><th>Leave Type</th><th>From</th>
                  <th>To</th><th>Reason</th><th>Submitted</th><th>Admin Remark</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingTeacher ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '30px', color: '#a0aec0' }}>Loading…</td></tr>
                ) : filteredTeacher.length === 0 ? (
                  <tr><td colSpan={9}>
                    <div className="empty-state" style={{ padding: '30px' }}>
                      <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0' }}>event_busy</span>
                      <h3 style={{ color: '#a0aec0' }}>No teacher leave requests</h3>
                    </div>
                  </td></tr>
                ) : filteredTeacher.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.requesterName}</div>
                    </td>
                    <td><span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                      fontWeight: 600, background: '#805ad515', color: '#805ad5' }}>{l.leaveType || '—'}</span></td>
                    <td style={{ fontSize: '13px' }}>{l.fromDate}</td>
                    <td style={{ fontSize: '13px' }}>{l.toDate}</td>
                    <td style={{ fontSize: '12px', color: '#718096', maxWidth: '160px' }}>{l.reason}</td>
                    <td style={{ fontSize: '12px', color: '#a0aec0' }}>{fmt(l.createdAt)}</td>
                    <td style={{ fontSize: '12px', color: '#718096', maxWidth: '140px' }}>{l.adminComment || '—'}</td>
                    <td>{getStatusBadge(l.status)}</td>
                    <td>
                      <div className="action-btns">
                        {(l.status || '').toUpperCase() === 'PENDING' && (
                          <button className="action-btn" style={{ background: '#f0fff4', color: '#76C442' }}
                            title="Review" onClick={() => { setSelectedTeacherLeave(l); setComment(''); }}>
                            <span className="material-icons">how_to_reg</span>
                          </button>
                        )}
                        <button className="action-btn action-btn-delete" title="Delete"
                          onClick={() => handleDeleteTeacher(l.id)}>
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
      )}

      {/* ── Student Leaves Tab ─────────────────────────────────────────────── */}
      {tab === 'student' && (
        <div className="data-table-card">
          <div className="search-filter-bar">
            <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Status</option>
              <option>Pending</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th><th>Leave Type</th><th>Duration</th>
                  <th>Reason</th><th>Submitted</th><th>Teacher Remark</th><th>Status</th><th>Handled By</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudent ? (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: '30px', color: '#a0aec0' }}>Loading…</td></tr>
                ) : filteredStudent.length === 0 ? (
                  <tr><td colSpan={8}>
                    <div className="empty-state" style={{ padding: '30px' }}>
                      <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0' }}>event_busy</span>
                      <h3 style={{ color: '#a0aec0' }}>No student leave requests</h3>
                    </div>
                  </td></tr>
                ) : filteredStudent.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.requesterName}</div>
                      <div style={{ fontSize: '11px', color: '#a0aec0' }}>{l.classSection}</div>
                    </td>
                    <td><span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px',
                      fontWeight: 600, background: '#76C44215', color: '#5fa832' }}>{l.leaveType || '—'}</span></td>
                    <td style={{ fontSize: '12px', color: '#718096' }}>{l.fromDate} → {l.toDate}</td>
                    <td style={{ fontSize: '12px', color: '#718096', maxWidth: '140px' }}>{l.reason}</td>
                    <td style={{ fontSize: '12px', color: '#a0aec0' }}>{fmt(l.createdAt)}</td>
                    <td style={{ fontSize: '12px', color: '#718096', maxWidth: '140px' }}>{l.adminComment || '—'}</td>
                    <td>{getStatusBadge(l.status)}</td>
                    <td>
                      <div className="action-btns">
                        <span style={{ fontSize: '11px', color: '#a0aec0', fontStyle: 'italic' }}>
                          Handled by teacher
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Review Teacher Leave Modal ──────────────────────────────────────── */}
      {selectedTeacherLeave && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Review Teacher Leave</h5>
                <button className="btn-close" onClick={() => setSelectedTeacherLeave(null)} />
              </div>
              <div className="modal-body">
                <div style={{ background: '#f7fafc', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    {[
                      ['Teacher',    selectedTeacherLeave.requesterName],
                      ['Leave Type', selectedTeacherLeave.leaveType || '—'],
                      ['From',       selectedTeacherLeave.fromDate],
                      ['To',         selectedTeacherLeave.toDate],
                      ['Submitted',  fmt(selectedTeacherLeave.createdAt)],
                      ['Status',     normalizeStatus(selectedTeacherLeave.status)],
                    ].map(([k, v]) => (
                      <div key={k}><span style={{ color: '#a0aec0' }}>{k}: </span><strong>{v}</strong></div>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#a0aec0' }}>Reason: </span>{selectedTeacherLeave.reason}
                  </div>
                </div>
                <label className="form-label small fw-medium">Remark to Teacher (optional)</label>
                <textarea className="form-control form-control-sm" rows={2} value={comment}
                  onChange={e => setComment(e.target.value)} placeholder="Add a remark for the teacher…" />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary"
                  onClick={() => setSelectedTeacherLeave(null)} disabled={actioning}>
                  Cancel
                </button>
                <button className="btn btn-danger" disabled={actioning}
                  onClick={() => handleTeacherAction(selectedTeacherLeave.id, 'Rejected')}>
                  <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>cancel</span>
                  {actioning ? 'Saving…' : 'Reject'}
                </button>
                <button className="btn btn-success" disabled={actioning}
                  onClick={() => handleTeacherAction(selectedTeacherLeave.id, 'Approved')}>
                  <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>check_circle</span>
                  {actioning ? 'Saving…' : 'Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}
