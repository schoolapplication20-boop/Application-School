import { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { leaveAPI } from '../../services/api';

const STATUS_COLORS = {
  PENDING:  { bg: '#fffbeb', color: '#b7791f', label: 'Pending'  },
  APPROVED: { bg: '#f0fff4', color: '#276749', label: 'Approved' },
  REJECTED: { bg: '#fff5f5', color: '#c53030', label: 'Rejected' },
};

const LEAVE_TYPES = ['Sick Leave', 'Family Emergency', 'Festival', 'Personal', 'Other'];

const today = () => new Date().toISOString().split('T')[0];

export default function StudentLeaveRequest() {
  const [leaves,      setLeaves]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  const [form, setForm] = useState({
    leaveType: 'Sick Leave',
    fromDate:  today(),
    toDate:    today(),
    reason:    '',
  });
  const [formErrors, setFormErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await leaveAPI.getMyStudentLeaves();
      setLeaves(res.data?.data ?? []);
    } catch {
      setError('Failed to load leave history.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const validate = () => {
    const errs = {};
    if (!form.fromDate) errs.fromDate = 'From date is required';
    if (!form.toDate)   errs.toDate   = 'To date is required';
    if (form.toDate && form.fromDate && form.toDate < form.fromDate)
      errs.toDate = 'To date cannot be before from date';
    if (!form.reason.trim()) errs.reason = 'Reason is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const errs = validate();
    if (Object.keys(errs).length) { setFormErrors(errs); return; }
    setFormErrors({});
    setSubmitting(true);
    try {
      await leaveAPI.submitStudentLeave(form);
      setSuccess('Leave request submitted successfully.');
      setForm({ leaveType: 'Sick Leave', fromDate: today(), toDate: today(), reason: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputStyle = (fieldErr) => ({
    width: '100%', padding: '10px 12px', borderRadius: 8,
    border: `1px solid ${fieldErr ? '#e53e3e' : '#e2e8f0'}`,
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  });

  return (
    <Layout pageTitle="Leave Request">
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Submit Form */}
        <div className="chart-card" style={{ marginBottom: 24 }}>
          <div className="chart-card-header" style={{ marginBottom: 20 }}>
            <div>
              <div className="chart-card-title">Apply for Leave</div>
              <div className="chart-card-subtitle">Fill in the details below to submit a leave request</div>
            </div>
            <span className="material-icons" style={{ fontSize: 28, color: '#ed8936' }}>event_busy</span>
          </div>

          {error   && <div style={{ background: '#fff5f5', color: '#c53030', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{error}</div>}
          {success && <div style={{ background: '#f0fff4', color: '#276749', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13 }}>{success}</div>}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              {/* Leave Type */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Leave Type</label>
                <select
                  value={form.leaveType}
                  onChange={e => setForm(f => ({ ...f, leaveType: e.target.value }))}
                  style={inputStyle()}
                >
                  {LEAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* From Date */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>From Date *</label>
                <input
                  type="date"
                  value={form.fromDate}
                  onChange={e => setForm(f => ({ ...f, fromDate: e.target.value }))}
                  style={inputStyle(formErrors.fromDate)}
                />
                {formErrors.fromDate && <div style={{ color: '#e53e3e', fontSize: 11, marginTop: 4 }}>{formErrors.fromDate}</div>}
              </div>

              {/* To Date */}
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>To Date *</label>
                <input
                  type="date"
                  value={form.toDate}
                  min={form.fromDate}
                  onChange={e => setForm(f => ({ ...f, toDate: e.target.value }))}
                  style={inputStyle(formErrors.toDate)}
                />
                {formErrors.toDate && <div style={{ color: '#e53e3e', fontSize: 11, marginTop: 4 }}>{formErrors.toDate}</div>}
              </div>
            </div>

            {/* Reason */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 6 }}>Reason *</label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Describe the reason for your leave..."
                style={{ ...inputStyle(formErrors.reason), resize: 'vertical' }}
              />
              {formErrors.reason && <div style={{ color: '#e53e3e', fontSize: 11, marginTop: 4 }}>{formErrors.reason}</div>}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '10px 28px', background: submitting ? '#a0aec0' : '#ed8936',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 13,
                fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span className="material-icons" style={{ fontSize: 16 }}>send</span>
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </form>
        </div>

        {/* Leave History */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">My Leave Requests</span>
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
          ) : leaves.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
              <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.4 }}>event_busy</span>
              No leave requests yet
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Remark</th>
                  <th>Reviewed By</th>
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {leaves.map(l => {
                  const s = STATUS_COLORS[l.status] || STATUS_COLORS.PENDING;
                  return (
                    <tr key={l.id}>
                      <td style={{ fontSize: 12, fontWeight: 600 }}>{l.leaveType || '—'}</td>
                      <td style={{ fontSize: 12 }}>{l.fromDate}</td>
                      <td style={{ fontSize: 12 }}>{l.toDate}</td>
                      <td style={{ fontSize: 12, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.reason}>{l.reason || '—'}</td>
                      <td>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: s.bg, color: s.color }}>{s.label}</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#718096', fontStyle: l.teacherRemark ? 'normal' : 'italic' }}>
                        {l.teacherRemark || (l.status === 'PENDING' ? 'Awaiting review' : '—')}
                      </td>
                      <td style={{ fontSize: 12, color: '#718096' }}>{l.reviewedBy || '—'}</td>
                      <td style={{ fontSize: 11, color: '#a0aec0' }}>
                        {l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Layout>
  );
}
