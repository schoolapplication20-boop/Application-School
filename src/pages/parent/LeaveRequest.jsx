import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useNotifications } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

export default function LeaveRequest() {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [leaves, setLeaves] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    studentName: 'Arjun Patel',
    class: '10-A',
    leaveType: 'Medical',
    fromDate: '',
    toDate: '',
    reason: '',
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Only show leaves for this parent
  const myLeaves = leaves.filter(l => l.parentId === (user?.id || 3));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.fromDate || !formData.toDate || !formData.reason.trim()) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    const newLeave = {
      id: Date.now(),
      parentId: user?.id || 3,
      parentName: user?.name || 'Rajesh Kumar',
      ...formData,
      submittedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      adminStatus: 'Pending',
      teacherStatus: 'Pending',
      finalStatus: 'Pending',
      adminComment: '',
      teacherComment: '',
    };
    const updated = [newLeave, ...leaves];
    setLeaves(updated);

    // Notify teacher (teacher reviews first before forwarding to admin)
    addNotification({
      text: `Leave request from ${user?.name || 'Parent'} for ${formData.studentName} (${formData.fromDate} – ${formData.toDate})`,
      icon: 'event_busy',
      color: '#ed8936',
      role: 'TEACHER',
      leaveId: newLeave.id,
      details: {
        type: 'parent_leave',
        sender: user?.name || 'Parent',
        senderRole: 'Parent',
        studentName: formData.studentName,
        class: formData.class,
        leaveType: formData.leaveType,
        fromDate: formData.fromDate,
        toDate: formData.toDate,
        reason: formData.reason,
        submittedAt: newLeave.submittedAt,
      },
    });

    setShowModal(false);
    setFormData({ studentName: 'Arjun Patel', class: '10-A', leaveType: 'Medical', fromDate: '', toDate: '', reason: '' });
    showToast('Leave request submitted successfully!');
  };

  const getStatusBadge = (status) => {
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
    <Layout pageTitle="Leave Request">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Leave Requests</h1>
        <p>Submit and track leave requests for your child</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Requests', value: myLeaves.length, color: '#76C442', icon: 'event_note' },
          { label: 'Pending', value: myLeaves.filter(l => l.finalStatus === 'Pending').length, color: '#ed8936', icon: 'pending_actions' },
          { label: 'Approved', value: myLeaves.filter(l => l.finalStatus === 'Approved').length, color: '#3182ce', icon: 'check_circle' },
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
          <div style={{ flex: 1, fontWeight: 700, fontSize: '15px', color: '#2d3748' }}>My Leave Requests</div>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            <span className="material-icons">add</span> New Request
          </button>
        </div>

        {myLeaves.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px' }}>
            <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0' }}>event_busy</span>
            <h3 style={{ color: '#a0aec0', marginTop: 12 }}>No leave requests yet</h3>
            <p style={{ color: '#cbd5e0' }}>Click "New Request" to submit one.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Leave Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Reason</th>
                  <th>Teacher</th>
                  <th>Admin</th>
                  <th>Final Status</th>
                </tr>
              </thead>
              <tbody>
                {myLeaves.map(l => (
                  <tr key={l.id}>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{l.studentName}</div>
                      <div style={{ fontSize: '11px', color: '#a0aec0' }}>Class {l.class}</div>
                    </td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                        background: '#76C44215', color: '#5fa832' }}>{l.leaveType}</span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{l.fromDate}</td>
                    <td style={{ fontSize: '13px' }}>{l.toDate}</td>
                    <td style={{ fontSize: '12px', color: '#718096', maxWidth: '160px' }}>{l.reason}</td>
                    <td>{getStatusBadge(l.teacherStatus)}</td>
                    <td>{getStatusBadge(l.adminStatus)}</td>
                    <td>{getStatusBadge(l.finalStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Submit Leave Request</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label small fw-medium">Student Name</label>
                      <input type="text" className="form-control form-control-sm" value={formData.studentName}
                        onChange={e => setFormData({ ...formData, studentName: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Class</label>
                      <input type="text" className="form-control form-control-sm" value={formData.class}
                        onChange={e => setFormData({ ...formData, class: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Leave Type</label>
                      <select className="form-select form-select-sm" value={formData.leaveType}
                        onChange={e => setFormData({ ...formData, leaveType: e.target.value })}>
                        {['Medical', 'Family Function', 'Emergency', 'Other'].map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="col-3">
                      <label className="form-label small fw-medium">From Date *</label>
                      <input type="date" className="form-control form-control-sm" value={formData.fromDate}
                        onChange={e => setFormData({ ...formData, fromDate: e.target.value })} required />
                    </div>
                    <div className="col-3">
                      <label className="form-label small fw-medium">To Date *</label>
                      <input type="date" className="form-control form-control-sm" value={formData.toDate}
                        min={formData.fromDate}
                        onChange={e => setFormData({ ...formData, toDate: e.target.value })} required />
                    </div>
                    <div className="col-12">
                      <label className="form-label small fw-medium">Reason *</label>
                      <textarea className="form-control form-control-sm" rows={3}
                        placeholder="Describe the reason for leave..." value={formData.reason}
                        onChange={e => setFormData({ ...formData, reason: e.target.value })} required />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
