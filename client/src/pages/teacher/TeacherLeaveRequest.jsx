import React, { useState, useEffect, useRef } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { leaveAPI } from '../../services/api';

const fmt = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const normalizeStatus = (s) => {
  if (!s) return 'Pending';
  const lower = s.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
};

const STATUS_COLOR = { Pending: '#ed8936', Approved: '#76C442', Rejected: '#e53e3e' };
const STATUS_BG    = { Pending: '#fffaf0', Approved: '#f0fff4', Rejected: '#fff5f5' };
const STATUS_ICON  = { Pending: 'schedule', Approved: 'check_circle', Rejected: 'cancel' };

export default function TeacherLeaveRequest() {
  const { user } = useAuth();
  const { notifications } = useNotifications();
  const [leaves, setLeaves]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal]   = useState(false);
  const [toast, setToast]           = useState(null);
  const prevLeaveDecisionCount = useRef(0);
  const [formData, setFormData] = useState({
    leaveType: 'Medical',
    fromDate:  '',
    toDate:    '',
    reason:    '',
  });

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const loadLeaves = async (silent = false) => {
    if (!user?.id) return;
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res  = await leaveAPI.getMyLeaves(user.id, 'TEACHER');
      const data = res.data?.data ?? res.data ?? [];
      setLeaves(Array.isArray(data) ? data : []);
    } catch {
      // keep existing list on error
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadLeaves(); }, [user?.id]);

  // Auto-refresh when admin makes a leave decision (notification-driven)
  useEffect(() => {
    const decisionCount = notifications.filter(n => n.linkType === 'leave_decision').length;
    if (decisionCount > prevLeaveDecisionCount.current) {
      loadLeaves(true);
      showToast('Admin has responded to your leave request', 'success');
    }
    prevLeaveDecisionCount.current = decisionCount;
  }, [notifications]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.fromDate || !formData.toDate || !formData.reason.trim()) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      await leaveAPI.createLeave({
        requesterType: 'TEACHER',
        requesterId:   user?.id,
        requesterName: user?.name || 'Teacher',
        leaveType:     formData.leaveType,
        fromDate:      formData.fromDate,
        toDate:        formData.toDate,
        reason:        formData.reason,
      });
      await loadLeaves();
      setShowModal(false);
      setFormData({ leaveType: 'Medical', fromDate: '', toDate: '', reason: '' });
      showToast('Leave request submitted — Admin will be notified');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit leave request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pending  = leaves.filter(l => (l.status || '').toUpperCase() === 'PENDING').length;
  const approved = leaves.filter(l => (l.status || '').toUpperCase() === 'APPROVED').length;
  const rejected = leaves.filter(l => (l.status || '').toUpperCase() === 'REJECTED').length;

  // Recently decided leaves (decided but not yet seen by teacher in this session)
  const decidedLeaves = leaves.filter(l => {
    const s = (l.status || '').toUpperCase();
    return s === 'APPROVED' || s === 'REJECTED';
  });

  return (
    <Layout pageTitle="Leave Request">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>My Leave Requests</h1>
        <p>Apply for leave — requests are reviewed and approved by Admin</p>
      </div>

      {/* Decision Alert Banner — shown when there are decided leaves */}
      {decidedLeaves.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          {decidedLeaves.slice(0, 3).map(l => {
            const status = normalizeStatus(l.status);
            const color  = STATUS_COLOR[status] || '#718096';
            const bg     = STATUS_BG[status]    || '#f7fafc';
            const icon   = STATUS_ICON[status]  || 'info';
            return (
              <div key={l.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: bg, border: `1.5px solid ${color}40`,
                borderRadius: 10, padding: '12px 16px', marginBottom: 8,
              }}>
                <span className="material-icons" style={{ color, fontSize: 20 }}>{icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color, fontSize: 13 }}>
                    Leave {status}
                  </span>
                  <span style={{ fontSize: 12, color: '#718096', marginLeft: 8 }}>
                    {l.leaveType} · {l.fromDate} → {l.toDate}
                  </span>
                  {l.adminComment && (
                    <span style={{ fontSize: 12, color: '#718096', marginLeft: 8 }}>
                      · Admin remark: <em>{l.adminComment}</em>
                    </span>
                  )}
                </div>
                {l.reviewedBy && (
                  <span style={{ fontSize: 11, color: '#a0aec0' }}>by {l.reviewedBy}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total',    value: leaves.length, color: '#76C442', icon: 'event_note'      },
          { label: 'Pending',  value: pending,        color: '#ed8936', icon: 'pending_actions' },
          { label: 'Approved', value: approved,       color: '#3182ce', icon: 'check_circle'    },
          { label: 'Rejected', value: rejected,       color: '#e53e3e', icon: 'cancel'          },
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
          <div style={{ flex: 1, fontWeight: 700, fontSize: '15px', color: '#2d3748' }}>My Leave History</div>
          <button onClick={() => loadLeaves(true)} disabled={refreshing}
            style={{ marginRight: 8, border: '1px solid #e2e8f0', background: '#fff', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: '#718096', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-icons" style={{ fontSize: 16, animation: refreshing ? 'spin 1s linear infinite' : 'none' }}>refresh</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            <span className="material-icons">add</span> Apply for Leave
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
            Loading…
          </div>
        ) : leaves.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0' }}>event_busy</span>
            <h3 style={{ color: '#a0aec0', marginTop: 12 }}>No leave requests yet</h3>
            <p style={{ color: '#cbd5e0' }}>Click "Apply for Leave" to submit a request.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Submitted</th>
                  <th>Admin Decision</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => {
                  const status = normalizeStatus(l.status);
                  const color  = STATUS_COLOR[status] || '#718096';
                  const bg     = STATUS_BG[status]    || '#f7fafc';
                  const icon   = STATUS_ICON[status]  || 'schedule';
                  const decided = status === 'Approved' || status === 'Rejected';
                  return (
                    <tr key={l.id} style={decided ? { background: bg } : {}}>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                          background: '#76C44215', color: '#5fa832' }}>{l.leaveType || '—'}</span>
                      </td>
                      <td style={{ fontSize: '13px' }}>{l.fromDate || '—'}</td>
                      <td style={{ fontSize: '13px' }}>{l.toDate   || '—'}</td>
                      <td style={{ fontSize: '12px', color: '#718096', maxWidth: '180px' }}>{l.reason}</td>
                      <td style={{ fontSize: '12px', color: '#a0aec0' }}>{fmt(l.createdAt)}</td>
                      <td style={{ maxWidth: '180px' }}>
                        {decided ? (
                          <div>
                            <div style={{ fontSize: '12px', color: '#718096' }}>{l.adminComment || 'No remark'}</div>
                            {l.reviewedBy && (
                              <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: 2 }}>
                                by {l.reviewedBy} · {fmt(l.reviewedAt)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#a0aec0', fontStyle: 'italic' }}>Awaiting admin review</span>
                        )}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
                          background: bg, color,
                          border: `1px solid ${color}30`,
                        }}>
                          <span className="material-icons" style={{ fontSize: 13 }}>{icon}</span>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Apply Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Apply for Leave</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label small fw-medium">Leave Type</label>
                      <select className="form-select form-select-sm" value={formData.leaveType}
                        onChange={e => setFormData({ ...formData, leaveType: e.target.value })}>
                        {['Medical', 'Personal', 'Family Emergency', 'Other'].map(t => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">From Date *</label>
                      <input type="date" className="form-control form-control-sm" value={formData.fromDate}
                        onChange={e => setFormData({ ...formData, fromDate: e.target.value })} required />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">To Date *</label>
                      <input type="date" className="form-control form-control-sm" value={formData.toDate}
                        min={formData.fromDate}
                        onChange={e => setFormData({ ...formData, toDate: e.target.value })} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-medium">Reason *</label>
                      <textarea className="form-control form-control-sm" rows={3}
                        placeholder="Describe the reason for leave…" value={formData.reason}
                        onChange={e => setFormData({ ...formData, reason: e.target.value })} required />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => setShowModal(false)} disabled={submitting}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
