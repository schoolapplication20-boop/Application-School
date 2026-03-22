import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const mockTeachers = [
  { id: 1, name: 'Priya Sharma', empId: 'T001', subject: 'Mathematics', classes: '10-A, 9-B', qualification: 'M.Sc Mathematics', joining: '01 Jun 2018', mobile: '9876543220', email: 'priya.s@school.com', status: 'Active' },
  { id: 2, name: 'Rajesh Verma', empId: 'T002', subject: 'Science', classes: '8-A, 8-B', qualification: 'M.Sc Physics', joining: '15 Aug 2019', mobile: '9876543221', email: 'rajesh.v@school.com', status: 'Active' },
  { id: 3, name: 'Sunita Rao', empId: 'T003', subject: 'English', classes: '10-B, 11-A', qualification: 'M.A English', joining: '01 Mar 2020', mobile: '9876543222', email: 'sunita.r@school.com', status: 'Active' },
  { id: 4, name: 'Amit Joshi', empId: 'T004', subject: 'Social Studies', classes: '7-A, 7-B', qualification: 'M.A History', joining: '10 Jan 2021', mobile: '9876543223', email: 'amit.j@school.com', status: 'Active' },
  { id: 5, name: 'Kavita Iyer', empId: 'T005', subject: 'Hindi', classes: '6-A, 6-B', qualification: 'M.A Hindi', joining: '05 Jul 2017', mobile: '9876543224', email: 'kavita.i@school.com', status: 'Active' },
  { id: 6, name: 'Mohan Das', empId: 'T006', subject: 'Computer Science', classes: '11-B, 12-A', qualification: 'B.Tech CS', joining: '20 Sep 2022', mobile: '9876543225', email: 'mohan.d@school.com', status: 'Active' },
  { id: 7, name: 'Anita Pillai', empId: 'T007', subject: 'Biology', classes: '12-A, 12-B', qualification: 'M.Sc Biology', joining: '01 Jun 2016', mobile: '9876543226', email: 'anita.p@school.com', status: 'On Leave' },
];

const Teachers = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [teachers, setTeachers] = useState(mockTeachers);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [formData, setFormData] = useState({
    name: '', empId: '', subject: '', classes: '', qualification: '',
    joining: '', mobile: '', email: '', status: 'Active'
  });
  const [deleteId, setDeleteId] = useState(null);

  const filtered = teachers.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.empId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openAddModal = () => {
    setEditTeacher(null);
    setFormData({ name: '', empId: '', subject: '', classes: '', qualification: '', joining: '', mobile: '', email: '', status: 'Active' });
    setShowModal(true);
  };

  const openEditModal = (t) => {
    setEditTeacher(t);
    setFormData({ ...t });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.empId) {
      alert('Name and Employee ID are required.');
      return;
    }
    if (editTeacher) {
      setTeachers(teachers.map(t => t.id === editTeacher.id ? { ...t, ...formData } : t));
    } else {
      setTeachers([...teachers, { id: Date.now(), ...formData }]);
    }
    setShowModal(false);
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const getStatusBadge = (status) => {
    const map = { 'Active': 'status-present', 'On Leave': 'status-pending', 'Inactive': 'status-absent' };
    return <span className={`status-badge ${map[status] || ''}`}>{status}</span>;
  };

  const subjectColors = {
    'Mathematics': '#76C442', 'Science': '#3182ce', 'English': '#805ad5',
    'Social Studies': '#e53e3e', 'Hindi': '#ed8936', 'Computer Science': '#38b2ac',
    'Biology': '#d69e2e'
  };

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
      />
      {mobileSidebarOpen && (
        <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar
          pageTitle="Teachers"
          onMenuToggle={() => {
            if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
            else setSidebarCollapsed(!sidebarCollapsed);
          }}
        />

        <div className="page-content">
          <div className="page-header">
            <h1>Teacher Management</h1>
            <p>Manage all teaching staff ({teachers.length} total)</p>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Teachers', value: teachers.length, icon: 'person', color: '#76C442' },
              { label: 'Active', value: teachers.filter(t => t.status === 'Active').length, icon: 'check_circle', color: '#3182ce' },
              { label: 'On Leave', value: teachers.filter(t => t.status === 'On Leave').length, icon: 'event_busy', color: '#ed8936' },
              { label: 'Subjects', value: [...new Set(teachers.map(t => t.subject))].length, icon: 'book', color: '#805ad5' },
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
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by name, subject, ID..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="btn-add" onClick={openAddModal}>
                <span className="material-icons">person_add</span>
                Add Teacher
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Teacher</th>
                    <th>Emp ID</th>
                    <th>Subject</th>
                    <th>Classes</th>
                    <th>Joining Date</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => (
                    <tr key={t.id}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar-sm" style={{ background: `linear-gradient(135deg, ${subjectColors[t.subject] || '#76C442'}, #5fa832)` }}>
                            {getInitials(t.name)}
                          </div>
                          <div>
                            <div className="student-name">{t.name}</div>
                            <div className="student-class">{t.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600, color: '#718096' }}>{t.empId}</td>
                      <td>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                          background: (subjectColors[t.subject] || '#76C442') + '15',
                          color: subjectColors[t.subject] || '#76C442'
                        }}>
                          {t.subject}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#718096' }}>{t.classes}</td>
                      <td style={{ fontSize: '12px', color: '#718096' }}>{t.joining}</td>
                      <td>{getStatusBadge(t.status)}</td>
                      <td>
                        <div className="action-btns">
                          <button className="action-btn action-btn-view" title="View"><span className="material-icons">visibility</span></button>
                          <button className="action-btn action-btn-edit" onClick={() => openEditModal(t)} title="Edit"><span className="material-icons">edit</span></button>
                          <button className="action-btn action-btn-delete" onClick={() => setDeleteId(t.id)} title="Delete"><span className="material-icons">delete</span></button>
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <span className="modal-title">{editTeacher ? 'Edit Teacher' : 'Add New Teacher'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { field: 'name', label: 'Full Name *', placeholder: 'Enter full name' },
                  { field: 'empId', label: 'Employee ID *', placeholder: 'e.g., T001' },
                  { field: 'subject', label: 'Subject', placeholder: 'e.g., Mathematics' },
                  { field: 'classes', label: 'Assigned Classes', placeholder: 'e.g., 10-A, 9-B' },
                  { field: 'qualification', label: 'Qualification', placeholder: 'e.g., M.Sc Mathematics' },
                  { field: 'joining', label: 'Joining Date', placeholder: 'DD Mon YYYY' },
                  { field: 'mobile', label: 'Mobile', placeholder: '10-digit mobile' },
                  { field: 'email', label: 'Email', placeholder: 'teacher@school.com', type: 'email' },
                ].map(f => (
                  <div key={f.field} className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">{f.label}</label>
                    <input
                      type={f.type || 'text'}
                      className="form-control"
                      style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                      placeholder={f.placeholder}
                      value={formData[f.field] || ''}
                      onChange={e => setFormData({ ...formData, [f.field]: e.target.value })}
                    />
                  </div>
                ))}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Status</label>
                  <select
                    className="form-control"
                    style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    value={formData.status || 'Active'}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="On Leave">On Leave</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                {editTeacher ? 'Update' : 'Add Teacher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-container" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="material-icons" style={{ color: '#e53e3e', fontSize: '28px' }}>delete</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Remove Teacher?</h3>
              <p style={{ color: '#718096', fontSize: '14px', marginBottom: '24px' }}>This will permanently remove the teacher record.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => setDeleteId(null)} style={{ padding: '10px 24px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => { setTeachers(teachers.filter(t => t.id !== deleteId)); setDeleteId(null); }} style={{ padding: '10px 24px', background: '#e53e3e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teachers;
