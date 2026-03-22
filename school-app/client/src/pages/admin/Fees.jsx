import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const mockFees = [
  { id: 1, student: 'Arjun Patel', rollNo: 'S001', class: '10-A', type: 'Tuition Fee', amount: 15000, dueDate: '10 Mar 2026', paidDate: '08 Mar 2026', status: 'PAID' },
  { id: 2, student: 'Sneha Gupta', rollNo: 'S002', class: '9-B', type: 'Tuition Fee', amount: 12000, dueDate: '10 Mar 2026', paidDate: '11 Mar 2026', status: 'PAID' },
  { id: 3, student: 'Ravi Kumar', rollNo: 'S003', class: '8-C', type: 'Tuition Fee', amount: 12000, dueDate: '10 Mar 2026', paidDate: null, status: 'PENDING' },
  { id: 4, student: 'Ananya Singh', rollNo: 'S004', class: '10-B', type: 'Tuition Fee', amount: 15000, dueDate: '10 Feb 2026', paidDate: null, status: 'OVERDUE' },
  { id: 5, student: 'Kiran Reddy', rollNo: 'S005', class: '7-A', type: 'Transport Fee', amount: 3500, dueDate: '05 Mar 2026', paidDate: '04 Mar 2026', status: 'PAID' },
  { id: 6, student: 'Priya Sharma', rollNo: 'S006', class: '6-A', type: 'Tuition Fee', amount: 10000, dueDate: '10 Mar 2026', paidDate: null, status: 'PENDING' },
  { id: 7, student: 'Aditya Nair', rollNo: 'S007', class: '11-A', type: 'Lab Fee', amount: 2000, dueDate: '15 Mar 2026', paidDate: '12 Mar 2026', status: 'PAID' },
  { id: 8, student: 'Deepika Joshi', rollNo: 'S008', class: '12-B', type: 'Exam Fee', amount: 1500, dueDate: '01 Feb 2026', paidDate: null, status: 'OVERDUE' },
];

const Fees = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [fees, setFees] = useState(mockFees);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ student: '', rollNo: '', class: '', type: 'Tuition Fee', amount: '', dueDate: '', status: 'PENDING' });

  const filtered = fees.filter(f => {
    const matchSearch = f.student.toLowerCase().includes(searchTerm.toLowerCase()) || f.rollNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = !filterStatus || f.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalRevenue = fees.filter(f => f.status === 'PAID').reduce((a, f) => a + f.amount, 0);
  const totalPending = fees.filter(f => f.status === 'PENDING').reduce((a, f) => a + f.amount, 0);
  const totalOverdue = fees.filter(f => f.status === 'OVERDUE').reduce((a, f) => a + f.amount, 0);

  const getStatusBadge = (status) => {
    const map = { 'PAID': 'status-paid', 'PENDING': 'status-pending', 'OVERDUE': 'status-overdue' };
    return <span className={`status-badge ${map[status]}`}>{status}</span>;
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const handleAddFee = () => {
    if (!formData.student || !formData.amount) { alert('Student name and amount are required.'); return; }
    setFees([...fees, { id: Date.now(), ...formData, amount: parseFloat(formData.amount), paidDate: null }]);
    setShowModal(false);
  };

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Fees" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header">
            <h1>Fee Management</h1>
            <p>Track student fee payments and dues</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Collected', value: `₹${totalRevenue.toLocaleString()}`, icon: 'payments', color: '#76C442' },
              { label: 'Pending', value: `₹${totalPending.toLocaleString()}`, icon: 'pending', color: '#ed8936' },
              { label: 'Overdue', value: `₹${totalOverdue.toLocaleString()}`, icon: 'warning', color: '#e53e3e' },
              { label: 'Total Records', value: fees.length, icon: 'receipt', color: '#3182ce' },
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
              <div className="search-input-wrapper">
                <span className="material-icons">search</span>
                <input type="text" className="search-input" placeholder="Search by student or roll no..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
              </select>
              <button className="btn-add" onClick={() => { setFormData({ student: '', rollNo: '', class: '', type: 'Tuition Fee', amount: '', dueDate: '', status: 'PENDING' }); setShowModal(true); }}>
                <span className="material-icons">add</span>
                Add Fee
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Fee Type</th>
                    <th>Amount</th>
                    <th>Due Date</th>
                    <th>Paid Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar-sm">{getInitials(f.student)}</div>
                          <div>
                            <div className="student-name">{f.student}</div>
                            <div className="student-class">{f.rollNo}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', fontWeight: 600 }}>{f.class}</td>
                      <td style={{ fontSize: '12px', color: '#718096' }}>{f.type}</td>
                      <td style={{ fontWeight: 700, color: '#2d3748' }}>₹{f.amount.toLocaleString()}</td>
                      <td style={{ fontSize: '12px', color: f.status === 'OVERDUE' ? '#e53e3e' : '#718096', fontWeight: f.status === 'OVERDUE' ? 600 : 400 }}>{f.dueDate}</td>
                      <td style={{ fontSize: '12px', color: '#76C442', fontWeight: 500 }}>{f.paidDate || '—'}</td>
                      <td>{getStatusBadge(f.status)}</td>
                      <td>
                        <div className="action-btns">
                          {f.status !== 'PAID' && (
                            <button
                              onClick={() => setFees(fees.map(x => x.id === f.id ? { ...x, status: 'PAID', paidDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) } : x))}
                              style={{ padding: '4px 10px', background: '#76C44215', border: 'none', borderRadius: '6px', color: '#76C442', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Mark Paid
                            </button>
                          )}
                          <button className="action-btn action-btn-view" title="View"><span className="material-icons">visibility</span></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <span className="modal-title">Add Fee Record</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { field: 'student', label: 'Student Name *', placeholder: 'Student name' },
                  { field: 'rollNo', label: 'Roll Number', placeholder: 'e.g., S001' },
                  { field: 'class', label: 'Class', placeholder: 'e.g., 10-A' },
                  { field: 'amount', label: 'Amount (₹) *', placeholder: 'Fee amount', type: 'number' },
                  { field: 'dueDate', label: 'Due Date', placeholder: 'DD Mon YYYY' },
                ].map(f => (
                  <div key={f.field} className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">{f.label}</label>
                    <input type={f.type || 'text'} className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                      placeholder={f.placeholder} value={formData[f.field] || ''} onChange={e => setFormData({ ...formData, [f.field]: e.target.value })} />
                  </div>
                ))}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Fee Type</label>
                  <select className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                    {['Tuition Fee', 'Transport Fee', 'Lab Fee', 'Exam Fee', 'Library Fee', 'Sports Fee'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Status</label>
                  <select className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleAddFee} style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Add Fee</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Fees;
