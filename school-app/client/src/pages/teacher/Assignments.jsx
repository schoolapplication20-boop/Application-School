import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const mockAssignments = [
  { id: 1, title: 'Quadratic Equations Practice', description: 'Solve problems 1-20 from textbook chapter 4', class: '10-A', dueDate: '20 Mar 2026', submitted: 30, total: 38, status: 'Active', createdAt: '10 Mar 2026' },
  { id: 2, title: 'Trigonometry Worksheet', description: 'Complete the attached worksheet on sin, cos and tan values', class: '9-B', dueDate: '22 Mar 2026', submitted: 18, total: 34, status: 'Active', createdAt: '12 Mar 2026' },
  { id: 3, title: 'Algebra Test Revision', description: 'Revise chapters 1-5, focus on word problems', class: '10-B', dueDate: '18 Mar 2026', submitted: 36, total: 36, status: 'Completed', createdAt: '08 Mar 2026' },
  { id: 4, title: 'Geometry Proofs', description: 'Prove the given theorems with step by step explanation', class: '8-A', dueDate: '25 Mar 2026', submitted: 5, total: 32, status: 'Active', createdAt: '15 Mar 2026' },
  { id: 5, title: 'Statistics Project', description: 'Collect data from school canteen and create statistical analysis', class: '10-A', dueDate: '30 Mar 2026', submitted: 0, total: 38, status: 'Active', createdAt: '17 Mar 2026' },
];

const Assignments = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [assignments, setAssignments] = useState(mockAssignments);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [formData, setFormData] = useState({ title: '', description: '', class: '', dueDate: '' });

  const filtered = assignments.filter(a => !filterStatus || a.status === filterStatus);

  const handleSave = () => {
    if (!formData.title || !formData.class) { alert('Title and Class are required.'); return; }
    setAssignments([...assignments, { id: Date.now(), ...formData, submitted: 0, total: 38, status: 'Active', createdAt: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) }]);
    setShowModal(false);
    setFormData({ title: '', description: '', class: '', dueDate: '' });
  };

  const statusColor = { 'Active': '#76C442', 'Completed': '#3182ce', 'Overdue': '#e53e3e' };

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Assignments" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header">
            <h1>Assignments</h1>
            <p>Create and manage assignments for your classes</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total', value: assignments.length, color: '#76C442' },
              { label: 'Active', value: assignments.filter(a => a.status === 'Active').length, color: '#3182ce' },
              { label: 'Completed', value: assignments.filter(a => a.status === 'Completed').length, color: '#805ad5' },
              { label: 'Avg Submission', value: Math.round(assignments.reduce((acc, a) => acc + (a.submitted / a.total), 0) / assignments.length * 100) + '%', color: '#ed8936' },
            ].map(c => (
              <div key={c.label} className="stat-card">
                <div style={{ fontSize: '28px', fontWeight: 700, color: c.color }}>{c.value}</div>
                <div className="stat-label">{c.label} Assignments</div>
              </div>
            ))}
          </div>

          <div className="data-table-card">
            <div className="search-filter-bar">
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="Active">Active</option>
                <option value="Completed">Completed</option>
                <option value="Overdue">Overdue</option>
              </select>
              <button className="btn-add" onClick={() => setShowModal(true)}>
                <span className="material-icons">add</span>
                New Assignment
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              {filtered.map(a => {
                const submittedPct = Math.round((a.submitted / a.total) * 100);
                const color = statusColor[a.status] || '#76C442';
                return (
                  <div key={a.id} style={{ border: '1px solid #f0f4f8', borderRadius: '12px', padding: '20px', transition: 'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.08)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className="material-icons" style={{ color: color, fontSize: '18px' }}>assignment</span>
                          </div>
                          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748', margin: 0 }}>{a.title}</h3>
                        </div>
                        <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 10px', lineHeight: '1.5' }}>{a.description}</p>
                        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                          {[
                            { icon: 'class', text: `Class ${a.class}` },
                            { icon: 'calendar_today', text: `Due: ${a.dueDate}` },
                            { icon: 'assignment_turned_in', text: `${a.submitted}/${a.total} submitted` },
                            { icon: 'event', text: `Created: ${a.createdAt}` },
                          ].map((info, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span className="material-icons" style={{ fontSize: '14px', color: '#a0aec0' }}>{info.icon}</span>
                              <span style={{ fontSize: '12px', color: '#718096' }}>{info.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: color + '15', color: color }}>
                          {a.status}
                        </span>
                        <div className="action-btns">
                          <button className="action-btn action-btn-view"><span className="material-icons">visibility</span></button>
                          <button className="action-btn action-btn-edit"><span className="material-icons">edit</span></button>
                          <button className="action-btn action-btn-delete" onClick={() => setAssignments(assignments.filter(x => x.id !== a.id))}><span className="material-icons">delete</span></button>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ flex: 1 }}>
                        <div className="progress-bar-custom">
                          <div className="progress-fill" style={{ width: `${submittedPct}%` }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: color, minWidth: '40px' }}>{submittedPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <span className="modal-title">Create New Assignment</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Title *</label>
                <input type="text" className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                  placeholder="Assignment title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label className="form-label">Description</label>
                <textarea className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', minHeight: '80px', resize: 'vertical' }}
                  placeholder="Assignment instructions..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Class *</label>
                  <select className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })}>
                    <option value="">Select Class</option>
                    {['10-A', '9-B', '10-B', '8-A'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label className="form-label">Due Date</label>
                  <input type="text" className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    placeholder="DD Mon YYYY" value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Create Assignment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
