import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (dt) => {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true,
    });
  } catch { return String(dt); }
};

const buildRequestId = (req) => {
  if (!req?.requestedAt || !req?.id) return `SDR-${req?.id ?? '?'}`;
  const d = new Date(req.requestedAt);
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  return `SDR-${date}-${String(req.id).padStart(3, '0')}`;
};

const StatusBadge = ({ status }) => {
  const map = {
    PENDING:  { bg: '#fef3c7', color: '#92400e', border: '#fcd34d', label: 'Pending'  },
    APPROVED: { bg: '#d1fae5', color: '#065f46', border: '#6ee7b7', label: 'Approved' },
    REJECTED: { bg: '#fee2e2', color: '#7f1d1d', border: '#fca5a5', label: 'Rejected' },
  };
  const s = map[status] || map.PENDING;
  return (
    <span style={{
      padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
      letterSpacing: 0.3,
    }}>
      {s.label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function StudentDeletionApprovals() {
  const { user }  = useAuth();
  const showToast = useToast();
  const isSA      = user?.role === 'SUPER_ADMIN';

  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId,   setExpandedId]   = useState(null);
  const [actionId,     setActionId]     = useState(null);
  const [actionType,   setActionType]   = useState('');
  const [notes,        setNotes]        = useState('');
  const [actioning,    setActioning]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listStudentDeletionRequests();
      setRequests(res.data?.data ?? []);
    } catch { showToast('Failed to load requests', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus ? requests.filter(r => r.status === filterStatus) : requests;
  const counts = {
    PENDING:  requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
  };

  const openAction  = (req, type) => { setActionId(req.id); setActionType(type); setNotes(''); };
  const closeAction = () => { setActionId(null); setActionType(''); setNotes(''); };

  const submitAction = async () => {
    if (!actionId) return;
    if (actionType === 'reject' && !notes.trim()) { showToast('Please provide a reason for rejection', 'error'); return; }
    setActioning(true);
    try {
      if (actionType === 'approve') {
        await adminAPI.approveStudentDeletion(actionId, { notes });
        showToast('Request approved — student soft-deleted and login disabled');
      } else {
        await adminAPI.rejectStudentDeletion(actionId, { notes });
        showToast('Request rejected — student remains active', 'warning');
      }
      closeAction(); load();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.response?.data?.error || 'Action failed', 'error');
    } finally { setActioning(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Layout pageTitle="Student Deletion Approvals">

      <div className="page-header">
        <h1>Student Deletion Requests</h1>
        <p>Review and approve or reject student deletion requests submitted by Admins</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Pending Review', value: counts.PENDING,  color: '#92400e', bg: '#fef3c7', icon: 'pending_actions' },
          { label: 'Approved',       value: counts.APPROVED, color: '#065f46', bg: '#d1fae5', icon: 'check_circle'    },
          { label: 'Rejected',       value: counts.REJECTED, color: '#7f1d1d', bg: '#fee2e2', icon: 'cancel'          },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1.5px solid var(--border-strong)', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-icons" style={{ color: c.color, fontSize: 22 }}>{c.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{c.value}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginTop: 1 }}>{c.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, background: '#f1f5f9', padding: '4px', borderRadius: 10, width: 'fit-content' }}>
        {[
          { value: '',         label: `All (${requests.length})` },
          { value: 'PENDING',  label: `Pending (${counts.PENDING})`  },
          { value: 'APPROVED', label: `Approved (${counts.APPROVED})` },
          { value: 'REJECTED', label: `Rejected (${counts.REJECTED})` },
        ].map(tab => (
          <button key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: filterStatus === tab.value ? 700 : 500,
              background: filterStatus === tab.value ? '#fff' : 'transparent',
              color: filterStatus === tab.value ? '#1e293b' : '#64748b',
              boxShadow: filterStatus === tab.value ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Request List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_top</span>
          Loading requests…
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <span className="material-icons" style={{ fontSize: 56, display: 'block', marginBottom: 12, color: '#cbd5e1' }}>task_alt</span>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>No requests found</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
            {filterStatus ? `No ${filterStatus.toLowerCase()} requests.` : 'No student deletion requests have been submitted yet.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filtered.map(req => {
            const isExpanded = expandedId === req.id;

            return (
              <div key={req.id} style={{
                background: 'var(--surface)',
                border: req.status === 'PENDING'
                  ? '1.5px solid #fcd34d'
                  : req.status === 'APPROVED' ? '1.5px solid #6ee7b7' : '1.5px solid #fca5a5',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>

                {/* ── Card Header ── */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  style={{
                    padding: '16px 20px', cursor: 'pointer',
                    background: req.status === 'PENDING'
                      ? 'linear-gradient(135deg, #fffbeb 0%, #fefce8 100%)'
                      : req.status === 'APPROVED' ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)'
                      : 'linear-gradient(135deg, #fff1f2 0%, #fef2f2 100%)',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>

                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: req.status === 'PENDING' ? '#fef3c7' : req.status === 'APPROVED' ? '#d1fae5' : '#fee2e2',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-icons" style={{
                        fontSize: 20,
                        color: req.status === 'PENDING' ? '#92400e' : req.status === 'APPROVED' ? '#065f46' : '#7f1d1d',
                      }}>
                        person_remove
                      </span>
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                          {req.studentName || 'Unknown Student'}
                        </span>
                        {req.className && (
                          <span style={{ padding: '2px 10px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                            {req.className}
                          </span>
                        )}
                        <StatusBadge status={req.status} />
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 12, color: '#64748b' }}>
                        <span>
                          <span className="material-icons" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 3 }}>person</span>
                          Requested by <strong style={{ color: '#334155' }}>{req.requestedByName || '—'}</strong>
                        </span>
                        <span>
                          <span className="material-icons" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 3 }}>schedule</span>
                          {fmtDate(req.requestedAt)}
                        </span>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, background: '#f1f5f9', padding: '1px 7px', borderRadius: 6, color: '#475569', fontWeight: 700 }}>
                          {buildRequestId(req)}
                        </span>
                      </div>
                    </div>

                    <span className="material-icons" style={{
                      color: '#94a3b8', fontSize: 22, flexShrink: 0,
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s',
                    }}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* ── Card Body (expanded) ── */}
                {isExpanded && (
                  <div style={{ padding: '20px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {req.reason && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span className="material-icons" style={{ fontSize: 16, color: '#4361ee' }}>chat_bubble_outline</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Reason for Deletion
                          </span>
                        </div>
                        <p style={{ fontSize: 14, color: '#334155', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>
                          "{req.reason}"
                        </p>
                      </div>
                    )}

                    {req.actionedAt && (
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <span className="material-icons" style={{ fontSize: 16, color: '#4361ee' }}>history</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            Audit Trail
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                          {[
                            { label: 'Request ID',   value: buildRequestId(req)      },
                            { label: 'Requested By', value: req.requestedByName       },
                            { label: 'Request Date', value: fmtDate(req.requestedAt)  },
                            { label: 'Status',       value: req.status                },
                            { label: 'Actioned By',  value: req.approvedByName || '—' },
                            { label: 'Action Date',  value: fmtDate(req.actionedAt)   },
                          ].map(({ label, value }) => (
                            <div key={label}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>{label}</div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{value || '—'}</div>
                            </div>
                          ))}
                          {req.decisionNotes && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 2 }}>Remarks</div>
                              <div style={{ fontSize: 13, color: '#334155', fontStyle: 'italic' }}>{req.decisionNotes}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {isSA && req.status === 'PENDING' && (
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4, borderTop: '1px solid #f1f5f9' }}>
                        <button
                          onClick={() => openAction(req, 'reject')}
                          style={{ padding: '10px 22px', background: '#fff', color: '#b91c1c', border: '1.5px solid #fca5a5', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="material-icons" style={{ fontSize: 16 }}>cancel</span>
                          Reject
                        </button>
                        <button
                          onClick={() => openAction(req, 'approve')}
                          style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #059669, #047857)', color: '#fff', border: 'none', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 2px 8px rgba(5,150,105,0.3)' }}>
                          <span className="material-icons" style={{ fontSize: 16 }}>check_circle</span>
                          Approve &amp; Delete
                        </button>
                      </div>
                    )}

                    {req.status === 'APPROVED' && (
                      <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-icons" style={{ color: '#065f46', fontSize: 18 }}>check_circle</span>
                        <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                          Approved by {req.approvedByName} on {fmtDate(req.actionedAt)}. Student was soft-deleted and login disabled.
                        </span>
                      </div>
                    )}
                    {req.status === 'REJECTED' && (
                      <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="material-icons" style={{ color: '#7f1d1d', fontSize: 18 }}>cancel</span>
                        <span style={{ fontSize: 13, color: '#7f1d1d', fontWeight: 600 }}>
                          Rejected by {req.approvedByName} on {fmtDate(req.actionedAt)}. The student remains active.
                          {req.decisionNotes && <span style={{ fontWeight: 400 }}> Reason: {req.decisionNotes}</span>}
                        </span>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Approve / Reject Modal ── */}
      {actionId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !actioning && closeAction()}>
          <div className="modal-container" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <div>
                <h3 className="modal-title" style={{ margin: 0 }}>
                  {actionType === 'approve' ? 'Approve & Delete Student' : 'Reject Request'}
                </h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  {actionType === 'approve'
                    ? 'The student will be soft-deleted immediately and their login disabled.'
                    : 'The request will be rejected. The student remains active.'}
                </p>
              </div>
              <button className="modal-close" onClick={closeAction} disabled={actioning}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {actionType === 'approve' && (
                <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-icons" style={{ color: '#065f46', fontSize: 18 }}>check_circle</span>
                  <span style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
                    Approving will immediately deactivate the student and disable their login.
                  </span>
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 5 }}>
                  {actionType === 'reject' ? 'Reason for Rejection *' : 'Approval Notes (optional)'}
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={actionType === 'reject' ? 'State the reason for rejecting this request…' : 'Add optional notes for the audit trail…'}
                  style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={closeAction} disabled={actioning}
                  style={{ padding: '9px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button
                  onClick={submitAction}
                  disabled={actioning || (actionType === 'reject' && !notes.trim())}
                  style={{
                    padding: '9px 24px', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
                    cursor: (actioning || (actionType === 'reject' && !notes.trim())) ? 'not-allowed' : 'pointer',
                    background: (actioning || (actionType === 'reject' && !notes.trim()))
                      ? '#a0aec0'
                      : actionType === 'approve' ? 'linear-gradient(135deg, #059669, #047857)' : '#dc2626',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', gap: 6,
                    boxShadow: actioning ? 'none' : actionType === 'approve' ? '0 2px 8px rgba(5,150,105,0.3)' : '0 2px 8px rgba(220,38,38,0.3)',
                  }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>
                    {actionType === 'approve' ? 'check_circle' : 'cancel'}
                  </span>
                  {actioning ? 'Processing…' : actionType === 'approve' ? 'Approve & Delete' : 'Reject Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
