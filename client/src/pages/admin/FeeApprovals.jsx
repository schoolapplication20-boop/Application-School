import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const TYPE_LABEL = {
  FEE_STRUCTURE_SAVE:   'Fee Structure Change',
  FEE_STRUCTURE_DELETE: 'Fee Structure Delete',
  STUDENT_FEE_UPDATE:   'Student Fee Update',
  CONDONATION_UPDATE:   'Concession Change',
  ASSIGNMENT_DELETE:    'Fee Assignment Delete',
};

const STATUS_STYLE = {
  PENDING:  { bg: '#fffbeb', color: '#b45309', border: '#fcd34d' },
  APPROVED: { bg: '#f0fff4', color: '#276749', border: '#9ae6b4' },
  REJECTED: { bg: '#fff5f5', color: '#c53030', border: '#feb2b2' },
};

const fmt = (dt) => {
  if (!dt) return '—';
  try { return new Date(dt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }); }
  catch { return dt; }
};

const tryParse = (str) => {
  try { return str ? JSON.parse(str) : null; } catch { return null; }
};

const JsonDisplay = ({ data }) => {
  if (!data) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  const obj = typeof data === 'string' ? tryParse(data) : data;
  if (!obj) return <span style={{ fontSize: 12 }}>{String(data)}</span>;
  return (
    <div style={{ fontSize: 11, lineHeight: 1.6 }}>
      {Object.entries(obj).filter(([, v]) => v != null && v !== '' && v !== 0 && String(v) !== '0').map(([k, v]) => (
        <div key={k}>
          <span style={{ color: 'var(--text-muted)', marginRight: 4 }}>{k}:</span>
          <span style={{ fontWeight: 600 }}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
        </div>
      ))}
    </div>
  );
};

export default function FeeApprovals() {
  const { user }   = useAuth();
  const showToast  = useToast();
  const isSA       = user?.role === 'SUPER_ADMIN';

  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [actionId,    setActionId]    = useState(null); // request being actioned
  const [actionType,  setActionType]  = useState('');   // 'approve' | 'reject'
  const [notes,       setNotes]       = useState('');
  const [actioning,   setActioning]   = useState(false);
  const [expandedId,  setExpandedId]  = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminAPI.listFeeEditRequests();
      setRequests(res.data?.data ?? []);
    } catch { showToast('Failed to load requests', 'error'); }
    finally { setLoading(false); }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = filterStatus
    ? requests.filter(r => r.status === filterStatus)
    : requests;

  const counts = {
    PENDING:  requests.filter(r => r.status === 'PENDING').length,
    APPROVED: requests.filter(r => r.status === 'APPROVED').length,
    REJECTED: requests.filter(r => r.status === 'REJECTED').length,
  };

  const openAction = (req, type) => { setActionId(req.id); setActionType(type); setNotes(''); };
  const closeAction = () => { setActionId(null); setActionType(''); setNotes(''); };

  const submitAction = async () => {
    if (!actionId) return;
    if (actionType === 'reject' && !notes.trim()) {
      showToast('Please provide a reason for rejection', 'error'); return;
    }
    setActioning(true);
    try {
      if (actionType === 'approve') {
        await adminAPI.approveFeeEditRequest(actionId, { notes });
        showToast('Request approved — change applied successfully');
      } else {
        await adminAPI.rejectFeeEditRequest(actionId, { notes });
        showToast('Request rejected', 'warning');
      }
      closeAction();
      load();
    } catch (err) {
      showToast(err?.response?.data?.message || err?.response?.data?.error || 'Action failed', 'error');
    } finally { setActioning(false); }
  };

  return (
    <Layout pageTitle="Fee Approvals">
      <div className="page-header">
        <h1>Fee Change Requests</h1>
        <p>Review and action fee modification requests submitted by Admins</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Pending',  value: counts.PENDING,  color: '#b45309', bg: '#fffbeb', icon: 'hourglass_top' },
          { label: 'Approved', value: counts.APPROVED, color: '#276749', bg: '#f0fff4', icon: 'check_circle'  },
          { label: 'Rejected', value: counts.REJECTED, color: '#c53030', bg: '#fff5f5', icon: 'cancel'        },
        ].map(c => (
          <div key={c.label} className="stat-card" style={{ flex: 1, minWidth: 150 }}>
            <div className="stat-icon" style={{ background: c.bg }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Filter + table */}
      <div className="data-table-card">
        <div className="search-filter-bar">
          <select className="filter-select" value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
            {filtered.length} request{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            <span className="material-icons" style={{ fontSize: 40 }}>hourglass_empty</span>
            <p style={{ marginTop: 8 }}>Loading requests…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <span className="material-icons" style={{ fontSize: 52, color: 'var(--border-strong)' }}>task_alt</span>
            <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 12 }}>
              No requests found
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            {filtered.map(req => {
              const ss   = STATUS_STYLE[req.status] || STATUS_STYLE.PENDING;
              const isEx = expandedId === req.id;
              return (
                <div key={req.id} style={{
                  border: `1px solid var(--border-strong)`, borderRadius: 10, marginBottom: 10,
                  background: 'var(--surface)', overflow: 'hidden',
                }}>
                  {/* Summary row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', cursor: 'pointer' }}
                    onClick={() => setExpandedId(isEx ? null : req.id)}>
                    <span className="material-icons" style={{ color: ss.color, fontSize: 20 }}>
                      {req.status === 'PENDING' ? 'pending' : req.status === 'APPROVED' ? 'check_circle' : 'cancel'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>
                          {TYPE_LABEL[req.requestType] || req.requestType}
                        </span>
                        {req.studentName && (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            — {req.studentName}
                          </span>
                        )}
                        {req.className && (
                          <span style={{ padding: '2px 8px', background: '#eff6ff', color: '#2563eb', borderRadius: 12, fontSize: 11, fontWeight: 600 }}>
                            {req.className}
                          </span>
                        )}
                        <span style={{ padding: '2px 10px', background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, borderRadius: 20, fontSize: 11, fontWeight: 700 }}>
                          {req.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                        Requested by <strong>{req.requestedByName || '—'}</strong> · {fmt(req.requestedAt)}
                        {req.actionedAt && (
                          <span> · Actioned by <strong>{req.approvedByName || '—'}</strong> {fmt(req.actionedAt)}</span>
                        )}
                      </div>
                    </div>
                    <span className="material-icons" style={{ color: 'var(--text-muted)', fontSize: 20 }}>
                      {isEx ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>

                  {/* Expanded detail */}
                  {isEx && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '14px 18px', background: 'var(--surface-alt)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 14 }}>

                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                            Current / Existing
                          </div>
                          <JsonDisplay data={req.existingValues} />
                        </div>

                        <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: '#276749', textTransform: 'uppercase', marginBottom: 6 }}>
                            Requested Change
                          </div>
                          <JsonDisplay data={req.newValues} />
                        </div>

                        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, padding: '10px 14px' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                            Reason
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                            {req.reason || '—'}
                          </p>
                        </div>
                      </div>

                      {req.approvalNotes && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 10 }}>
                          <strong>Notes:</strong> {req.approvalNotes}
                        </div>
                      )}

                      {isSA && req.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => openAction(req, 'reject')}
                            style={{ padding: '8px 18px', background: '#fff5f5', color: '#c53030', border: '1.5px solid #feb2b2', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                            Reject
                          </button>
                          <button onClick={() => openAction(req, 'approve')}
                            style={{ padding: '8px 20px', background: '#276749', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className="material-icons" style={{ fontSize: 16 }}>check_circle</span>
                            Approve & Apply
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Approve / Reject modal */}
      {actionId && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !actioning && closeAction()}>
          <div className="modal-container" style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
              </h3>
              <button className="modal-close" onClick={closeAction} disabled={actioning}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {actionType === 'approve' && (
                <div style={{ background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#276749' }}>
                  Approving will immediately apply this fee change to the system.
                </div>
              )}
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>
                  {actionType === 'reject' ? 'Reason for Rejection *' : 'Notes (optional)'}
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder={actionType === 'reject' ? 'State the reason for rejecting…' : 'Optional notes…'}
                  style={{ width: '100%', padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={closeAction} disabled={actioning}
                  style={{ padding: '9px 20px', border: '1px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={submitAction} disabled={actioning || (actionType === 'reject' && !notes.trim())}
                  style={{ padding: '9px 22px', background: actionType === 'approve' ? '#276749' : '#c53030', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: actioning ? 0.7 : 1 }}>
                  {actioning ? 'Processing…' : actionType === 'approve' ? 'Approve & Apply' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
