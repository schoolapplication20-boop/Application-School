import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useNotifications } from '../../context/NotificationContext';

export default function LeaveApproval() {
  const { addNotification } = useNotifications();
  const [leaves, setLeaves] = useState([]);
  const [toast, setToast] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [forwardComment, setForwardComment] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Section 1: New from parents — teacher hasn't acted yet
  const newRequests = leaves.filter(l => l.teacherStatus === 'Pending');

  // Section 2: Admin has decided — teacher needs to confirm and notify parent
  const adminDecided = leaves.filter(
    l => l.teacherStatus === 'Forwarded' && l.adminStatus !== 'Pending'
  );

  // Section 3: Fully completed
  const completed = leaves.filter(
    l => l.teacherStatus !== 'Pending' && l.teacherStatus !== 'Forwarded'
  );

  // Teacher forwards leave to admin
  const handleForward = (leaveId) => {
    const updated = leaves.map(l => {
      if (l.id !== leaveId) return l;
      return { ...l, teacherStatus: 'Forwarded', teacherComment: forwardComment };
    });
    setLeaves(updated);

    const leave = leaves.find(l => l.id === leaveId);
    addNotification({
      text: `Teacher forwarded leave request for ${leave?.studentName} from ${leave?.parentName}. Please review.`,
      icon: 'forward_to_inbox',
      color: '#3182ce',
      role: 'ADMIN',
      leaveId,
      details: {
        type: 'forwarded_leave',
        sender: 'Teacher',
        senderRole: 'Teacher',
        studentName: leave?.studentName,
        parentName: leave?.parentName,
        class: leave?.class,
        leaveType: leave?.leaveType,
        fromDate: leave?.fromDate,
        toDate: leave?.toDate,
        reason: leave?.reason,
        teacherComment: forwardComment || '',
        submittedAt: leave?.submittedAt,
      },
    });

    setSelectedLeave(null);
    setForwardComment('');
    showToast('Leave forwarded to Admin');
  };

  // Teacher confirms admin's decision and notifies parent
  const handleConfirm = (leaveId) => {
    const leave = leaves.find(l => l.id === leaveId);
    if (!leave) return;
    const finalStatus = leave.adminStatus; // mirror admin decision
    const updated = leaves.map(l => {
      if (l.id !== leaveId) return l;
      return { ...l, teacherStatus: finalStatus, finalStatus };
    });
    setLeaves(updated);

    addNotification({
      text: `Your leave request for ${leave.studentName} has been ${finalStatus.toLowerCase()} by the teacher (${finalStatus === 'Approved' ? 'Admin approved' : 'Admin rejected'}).`,
      icon: finalStatus === 'Approved' ? 'check_circle' : 'cancel',
      color: finalStatus === 'Approved' ? '#76C442' : '#e53e3e',
      role: 'PARENT',
      leaveId,
    });

    showToast(`Leave ${finalStatus.toLowerCase()} — parent notified`);
  };

  const getStatusBadge = (status) => {
    const map = { Pending: '#ed8936', Approved: '#76C442', Rejected: '#e53e3e', Forwarded: '#3182ce' };
    const bg  = { Pending: '#fffaf0', Approved: '#f0fff4', Rejected: '#fff5f5', Forwarded: '#ebf8ff' };
    return (
      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700,
        background: bg[status] || '#f7fafc', color: map[status] || '#718096' }}>
        {status}
      </span>
    );
  };

  return (
    <Layout pageTitle="Leave Approval">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Leave Approval</h1>
        <p>Review parent leave requests and coordinate with Admin</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'New Requests', value: newRequests.length, color: '#ed8936', icon: 'inbox' },
          { label: 'Awaiting Admin', value: leaves.filter(l => l.teacherStatus === 'Forwarded' && l.adminStatus === 'Pending').length, color: '#3182ce', icon: 'pending_actions' },
          { label: 'To Confirm', value: adminDecided.length, color: '#805ad5', icon: 'rule' },
          { label: 'Completed', value: completed.length, color: '#76C442', icon: 'task_alt' },
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

      {/* Section 1: New requests from parents */}
      <div className="data-table-card" style={{ marginBottom: '24px' }}>
        <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="material-icons" style={{ color: '#ed8936', fontSize: '18px' }}>inbox</span>
          New Requests from Parents ({newRequests.length})
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Student</th><th>Parent</th><th>Leave Type</th>
                <th>Duration</th><th>Reason</th><th>Submitted</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {newRequests.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state" style={{ padding: '24px' }}>
                    <span className="material-icons" style={{ fontSize: 36, color: '#e2e8f0' }}>event_available</span>
                    <p style={{ color: '#a0aec0', margin: '8px 0 0' }}>No new leave requests</p>
                  </div>
                </td></tr>
              ) : newRequests.map(l => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.studentName}</div>
                    <div style={{ fontSize: '11px', color: '#a0aec0' }}>Class {l.class}</div>
                  </td>
                  <td style={{ fontSize: '13px' }}>{l.parentName}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                      background: '#76C44215', color: '#5fa832' }}>{l.leaveType}</span>
                  </td>
                  <td style={{ fontSize: '12px', color: '#718096' }}>{l.fromDate} → {l.toDate}</td>
                  <td style={{ fontSize: '12px', color: '#718096', maxWidth: '140px' }}>{l.reason}</td>
                  <td style={{ fontSize: '12px', color: '#a0aec0' }}>{l.submittedAt}</td>
                  <td>
                    <button className="action-btn" style={{ background: '#ebf8ff', color: '#3182ce' }}
                      title="Forward to Admin"
                      onClick={() => { setSelectedLeave({ ...l, mode: 'forward' }); setForwardComment(''); }}>
                      <span className="material-icons">forward_to_inbox</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Admin has decided — teacher must confirm */}
      {adminDecided.length > 0 && (
        <div className="data-table-card" style={{ marginBottom: '24px' }}>
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons" style={{ color: '#805ad5', fontSize: '18px' }}>rule</span>
            Admin Decision Received — Confirm & Notify Parent ({adminDecided.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th><th>Parent</th><th>Leave Type</th>
                  <th>Duration</th><th>Admin Decision</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminDecided.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.studentName}</div>
                      <div style={{ fontSize: '11px', color: '#a0aec0' }}>Class {l.class}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{l.parentName}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: '#76C44215', color: '#5fa832' }}>{l.leaveType}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#718096' }}>{l.fromDate} → {l.toDate}</td>
                    <td>{getStatusBadge(l.adminStatus)}</td>
                    <td>
                      <button
                        className="btn btn-sm"
                        style={{
                          background: l.adminStatus === 'Approved' ? '#76C442' : '#e53e3e',
                          color: '#fff', border: 'none', borderRadius: '8px',
                          padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                        }}
                        onClick={() => handleConfirm(l.id)}
                      >
                        <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4 }}>
                          {l.adminStatus === 'Approved' ? 'check_circle' : 'cancel'}
                        </span>
                        {l.adminStatus === 'Approved' ? 'Approve & Notify Parent' : 'Reject & Notify Parent'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Section 3: Completed */}
      {completed.length > 0 && (
        <div className="data-table-card">
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="material-icons" style={{ color: '#76C442', fontSize: '18px' }}>task_alt</span>
            Completed ({completed.length})
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th><th>Parent</th><th>Leave Type</th>
                  <th>Duration</th><th>Final Status</th>
                </tr>
              </thead>
              <tbody>
                {completed.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.studentName}</div>
                      <div style={{ fontSize: '11px', color: '#a0aec0' }}>Class {l.class}</div>
                    </td>
                    <td style={{ fontSize: '13px' }}>{l.parentName}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: '#76C44215', color: '#5fa832' }}>{l.leaveType}</span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#718096' }}>{l.fromDate} → {l.toDate}</td>
                    <td>{getStatusBadge(l.finalStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Forward to Admin Modal */}
      {selectedLeave?.mode === 'forward' && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Forward to Admin</h5>
                <button className="btn-close" onClick={() => setSelectedLeave(null)} />
              </div>
              <div className="modal-body">
                <div style={{ background: '#f7fafc', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                    {[
                      ['Student', selectedLeave.studentName],
                      ['Class', selectedLeave.class],
                      ['Parent', selectedLeave.parentName],
                      ['Type', selectedLeave.leaveType],
                      ['From', selectedLeave.fromDate],
                      ['To', selectedLeave.toDate],
                    ].map(([k, v]) => (
                      <div key={k}><span style={{ color: '#a0aec0' }}>{k}: </span><strong>{v}</strong></div>
                    ))}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#a0aec0' }}>Reason: </span>{selectedLeave.reason}
                  </div>
                </div>
                <label className="form-label small fw-medium">Note to Admin (optional)</label>
                <textarea className="form-control form-control-sm" rows={2} value={forwardComment}
                  onChange={e => setForwardComment(e.target.value)} placeholder="Add a note for Admin..." />
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setSelectedLeave(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={() => handleForward(selectedLeave.id)}>
                  <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>forward_to_inbox</span>
                  Forward to Admin
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
