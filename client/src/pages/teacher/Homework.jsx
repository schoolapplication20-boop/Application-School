import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';

const initialHW = [
  { id: 1, title: 'Chapter 5 — Quadratic Equations', class: '10-A', subject: 'Mathematics', dueDate: '2025-03-25', description: 'Solve exercises 1–15 from the textbook. Show full working.', assignedAt: '18 Mar 2025', status: 'Active' },
  { id: 2, title: 'Essay on Indian Constitution', class: '9-B', subject: 'Social Science', dueDate: '2025-03-22', description: 'Write a 500-word essay on the importance of the Indian Constitution.', assignedAt: '17 Mar 2025', status: 'Active' },
];

export default function Homework() {
  const [homework, setHomework] = useState(initialHW);
  const [showModal, setShowModal] = useState(false);
  const [filterClass, setFilterClass] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({ title: '', class: '', subject: '', dueDate: '', description: '' });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = homework.filter(h => {
    const matchClass  = !filterClass  || h.class === filterClass;
    const matchStatus = !filterStatus || h.status === filterStatus;
    return matchClass && matchStatus;
  });

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.class) {
      showToast('Title and Class are required', 'error'); return;
    }
    const updated = [...homework, {
      id: Date.now(),
      ...formData,
      assignedAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Active',
    }];
    setHomework(updated);
    setShowModal(false);
    setFormData({ title: '', class: '', subject: '', dueDate: '', description: '' });
    showToast('Homework assigned successfully!');
  };

  const handleDelete = (id) => {
    const updated = homework.filter(h => h.id !== id);
    setHomework(updated);
    showToast('Homework deleted', 'warning');
  };

  const handleMarkComplete = (id) => {
    const updated = homework.map(h => h.id === id ? { ...h, status: 'Completed' } : h);
    setHomework(updated);
    saveHW(updated);
    showToast('Marked as completed');
  };

  const statusColor = { Active: '#76C442', Completed: '#3182ce' };

  return (
    <Layout pageTitle="Homework">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Homework</h1>
        <p>Assign and manage homework for your classes</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: homework.length, color: '#76C442', icon: 'menu_book' },
          { label: 'Active', value: homework.filter(h => h.status === 'Active').length, color: '#3182ce', icon: 'pending_actions' },
          { label: 'Completed', value: homework.filter(h => h.status === 'Completed').length, color: '#805ad5', icon: 'check_circle' },
          { label: 'Classes', value: [...new Set(homework.map(h => h.class))].length, color: '#ed8936', icon: 'class' },
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
          <select className="filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {['10-A', '9-B', '10-B', '8-A'].map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option>Active</option>
            <option>Completed</option>
          </select>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            <span className="material-icons">add</span> Assign Homework
          </button>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {filtered.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0' }}>menu_book</span>
              <h3 style={{ color: '#a0aec0', marginTop: 12 }}>No homework found</h3>
            </div>
          ) : filtered.map(h => {
            const color = statusColor[h.status] || '#76C442';
            const isOverdue = h.status === 'Active' && new Date(h.dueDate) < new Date();
            return (
              <div key={h.id} style={{ border: `1.5px solid ${isOverdue ? '#fed7d7' : '#f0f4f8'}`, borderRadius: '12px', padding: '20px', background: isOverdue ? '#fff5f5' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: color + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-icons" style={{ color, fontSize: '18px' }}>menu_book</span>
                      </div>
                      <div>
                        <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748', margin: 0 }}>{h.title}</h3>
                        <div style={{ fontSize: '12px', color: '#a0aec0' }}>Assigned: {h.assignedAt}</div>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 12px', lineHeight: '1.5' }}>{h.description}</p>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {[
                        { icon: 'class', text: `Class ${h.class}` },
                        { icon: 'science', text: h.subject },
                        { icon: 'calendar_today', text: `Due: ${h.dueDate}` },
                      ].map((info, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icons" style={{ fontSize: '14px', color: '#a0aec0' }}>{info.icon}</span>
                          <span style={{ fontSize: '12px', color: isOverdue && info.icon === 'calendar_today' ? '#e53e3e' : '#718096' }}>{info.text}</span>
                        </div>
                      ))}
                      {isOverdue && (
                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, background: '#fff5f5', color: '#e53e3e' }}>OVERDUE</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: 16 }}>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                      background: color + '15', color }}>{h.status}</span>
                    <div className="action-btns">
                      {h.status === 'Active' && (
                        <button className="action-btn" style={{ color: '#76C442', background: '#f0fff4' }}
                          title="Mark Complete" onClick={() => handleMarkComplete(h.id)}>
                          <span className="material-icons">check_circle</span>
                        </button>
                      )}
                      <button className="action-btn action-btn-delete" onClick={() => handleDelete(h.id)} title="Delete">
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assign Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Assign Homework</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label small fw-medium">Title *</label>
                    <input type="text" className="form-control form-control-sm" placeholder="Homework title"
                      value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                  </div>
                  <div className="row g-3 mb-3">
                    <div className="col-6">
                      <label className="form-label small fw-medium">Class *</label>
                      <select className="form-select form-select-sm" value={formData.class}
                        onChange={e => setFormData({ ...formData, class: e.target.value })} required>
                        <option value="">Select Class</option>
                        {['10-A', '9-B', '10-B', '8-A'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Subject</label>
                      <select className="form-select form-select-sm" value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}>
                        <option value="">Select Subject</option>
                        {['Mathematics', 'Science', 'English', 'Social Science', 'Hindi', 'Computer Science'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Due Date</label>
                      <input type="date" className="form-control form-control-sm" value={formData.dueDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                    </div>
                  </div>
                  <div className="mb-2">
                    <label className="form-label small fw-medium">Description</label>
                    <textarea className="form-control form-control-sm" rows={3} placeholder="Instructions for students..."
                      value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Assign</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
