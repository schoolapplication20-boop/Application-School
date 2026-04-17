import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { leaveAPI } from '../../services/api';

const STATUS_COLORS = {
  PENDING:  { bg: '#fffbeb', color: '#b7791f', label: 'Pending'  },
  APPROVED: { bg: '#f0fff4', color: '#276749', label: 'Approved' },
  REJECTED: { bg: '#fff5f5', color: '#c53030', label: 'Rejected' },
};

export default function LeaveApproval() {
  const [leaves,     setLeaves]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [toast,      setToast]      = useState(null);

  // Modal state
  const [selected,   setSelected]   = useState(null); // leave object
  const [remark,     setRemark]     = useState('');
  const [actionType, setActionType] = useState('');   // 'APPROVED' | 'REJECTED'
  const [acting,     setActing]     = useState(false);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await leaveAPI.getClassStudentLeaves();
      setLeaves(res.data?.data ?? []);
    } catch (err) {
      const msg = err.response?.data?.message || '';
      // No primary class assigned → show empty state, not an error
      if (err.response?.status === 200 || msg.toLowerCase().includes('no primary')) {
        setLeaves([]);
      } else {
        setError(msg || 'Failed to load leave requests.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openModal = (leave, action) => {
    setSelected(leave);
    setActionType(action);
    setRemark('');
  };

  const closeModal = () => {
    setSelected(null);
    setRemark('');
    setActionType('');
  };

  const handleAction = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await leaveAPI.approveRejectLeave(selected.id, {
        status:        actionType,
        teacherRemark: remark.trim() || undefined,
      });
      showToast(`Leave request ${actionType.toLowerCase()} successfully.`);
      closeModal();
      await load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed.', 'error');
    } finally {
      setActing(false);
    }
  };

  const pending   = leaves.filter(l => l.status === 'PENDING');
  const decided   = leaves.filter(l => l.status !== 'PENDING');

  const StatusBadge = ({ status }) => {
    const s = STATUS_COLORS[status] || STATUS_COLORS.PENDING;
    return (
      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  return (
    <Layout pageTitle="Leave Approval">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          background: toast.type === 'error' ? '#fff5f5' : '#f0fff4',
          color:      toast.type === 'error' ? '#c53030' : '#276749',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span className="material-icons" style={{ fontSize: 18 }}>
            {toast.type === 'error' ? 'error' : 'check_circle'}
          </span>
          {toast.msg}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: 'Pending',  value: pending.length,  icon: 'pending_actions', color: '#ed8936' },
          { label: 'Approved', value: leaves.filter(l => l.status === 'APPROVED').length, icon: 'check_circle', color: '#76C442' },
          { label: 'Rejected', value: leaves.filter(l => l.status === 'REJECTED').length, icon: 'cancel',       color: '#e53e3e' },
          { label: 'Total',    value: leaves.length,   icon: 'list_alt',        color: '#3182ce' },
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

      {error && (
        <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Pending Requests */}
      <div className="data-table-card" style={{ marginBottom: 24 }}>
        <div className="data-table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ color: '#ed8936', fontSize: 18 }}>pending_actions</span>
            <span className="data-table-title">Pending Requests ({pending.length})</span>
          </div>
          <button
            onClick={load}
            disabled={loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}
          >
            <span className="material-icons" style={{ fontSize: 16, animation: loading ? 'spin 1s linear infinite' : 'none' }}>refresh</span>
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
            <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>hourglass_empty</span>
            Loading…
          </div>
        ) : pending.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
            <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.4 }}>event_available</span>
            No pending leave requests
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th><th>Class</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Applied On</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pending.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 700, fontSize: 13 }}>{l.requesterName}</td>
                  <td style={{ fontSize: 12, color: '#718096' }}>{l.classSection || '—'}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#ed893615', color: '#c05621' }}>
                      {l.leaveType || 'Other'}
                    </span>
                  </td>
                  <td style={{ fontSize: 12 }}>{l.fromDate}</td>
                  <td style={{ fontSize: 12 }}>{l.toDate}</td>
                  <td style={{ fontSize: 12, color: '#718096', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason}>{l.reason || '—'}</td>
                  <td style={{ fontSize: 11, color: '#a0aec0' }}>
                    {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => openModal(l, 'APPROVED')}
                        style={{ padding: '5px 12px', background: '#f0fff4', color: '#276749', border: '1px solid #c6f6d5', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <span className="material-icons" style={{ fontSize: 13 }}>check_circle</span>
                        Approve
                      </button>
                      <button
                        onClick={() => openModal(l, 'REJECTED')}
                        style={{ padding: '5px 12px', background: '#fff5f5', color: '#c53030', border: '1px solid #fed7d7', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <span className="material-icons" style={{ fontSize: 13 }}>cancel</span>
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Decided Requests */}
      {decided.length > 0 && (
        <div className="data-table-card">
          <div className="data-table-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ color: '#76C442', fontSize: 18 }}>task_alt</span>
              <span className="data-table-title">Decided ({decided.length})</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th><th>Class</th><th>Type</th><th>From</th><th>To</th><th>Status</th><th>Remark</th><th>Reviewed By</th>
              </tr>
            </thead>
            <tbody>
              {decided.map(l => (
                <tr key={l.id}>
                  <td style={{ fontWeight: 700, fontSize: 13 }}>{l.requesterName}</td>
                  <td style={{ fontSize: 12, color: '#718096' }}>{l.classSection || '—'}</td>
                  <td style={{ fontSize: 12 }}>{l.leaveType || 'Other'}</td>
                  <td style={{ fontSize: 12 }}>{l.fromDate}</td>
                  <td style={{ fontSize: 12 }}>{l.toDate}</td>
                  <td><StatusBadge status={l.status} /></td>
                  <td style={{ fontSize: 12, color: '#718096', fontStyle: l.teacherRemark ? 'normal' : 'italic' }}>
                    {l.teacherRemark || '—'}
                  </td>
                  <td style={{ fontSize: 12, color: '#718096' }}>{l.reviewedBy || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action Modal */}
      {selected && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 460,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: actionType === 'APPROVED' ? '#f0fff4' : '#fff5f5',
              }}>
                <span className="material-icons" style={{ color: actionType === 'APPROVED' ? '#276749' : '#c53030', fontSize: 22 }}>
                  {actionType === 'APPROVED' ? 'check_circle' : 'cancel'}
                </span>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>
                  {actionType === 'APPROVED' ? 'Approve' : 'Reject'} Leave Request
                </div>
                <div style={{ fontSize: 12, color: '#718096' }}>for {selected.requesterName}</div>
              </div>
            </div>

            {/* Leave summary */}
            <div style={{ background: '#f7fafc', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: 13 }}>
                {[
                  ['Type',   selected.leaveType || 'Other'],
                  ['Class',  selected.classSection || '—'],
                  ['From',   selected.fromDate],
                  ['To',     selected.toDate],
                ].map(([k, v]) => (
                  <div key={k}>
                    <span style={{ color: '#a0aec0', fontSize: 11 }}>{k}</span>
                    <div style={{ fontWeight: 600, color: '#2d3748' }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.reason && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#4a5568' }}>
                  <span style={{ color: '#a0aec0', fontSize: 11 }}>Reason</span>
                  <div>{selected.reason}</div>
                </div>
              )}
            </div>

            {/* Remark */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>
                Remark <span style={{ fontWeight: 400, color: '#a0aec0' }}>(optional)</span>
              </label>
              <textarea
                rows={2}
                value={remark}
                onChange={e => setRemark(e.target.value)}
                placeholder="Add a note for the student…"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={closeModal}
                disabled={acting}
                style={{ padding: '9px 20px', background: '#edf2f7', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, color: '#4a5568', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleAction}
                disabled={acting}
                style={{
                  padding: '9px 24px', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  color: '#fff', cursor: acting ? 'not-allowed' : 'pointer',
                  background: acting ? '#a0aec0' : (actionType === 'APPROVED' ? '#38a169' : '#e53e3e'),
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                <span className="material-icons" style={{ fontSize: 15 }}>
                  {actionType === 'APPROVED' ? 'check_circle' : 'cancel'}
                </span>
                {acting ? 'Processing…' : (actionType === 'APPROVED' ? 'Approve' : 'Reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  );
}
