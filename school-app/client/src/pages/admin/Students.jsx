import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const mockStudents = [
  { id: 1, name: 'Arjun Patel', rollNo: 'S001', class: '10', section: 'A', dob: '15 Jan 2010', parent: 'Rajesh Patel', mobile: '9876543210', address: '12 MG Road, Mumbai', status: 'Active' },
  { id: 2, name: 'Sneha Gupta', rollNo: 'S002', class: '9', section: 'B', dob: '22 Mar 2011', parent: 'Priya Gupta', mobile: '9876543211', address: '45 Park St, Delhi', status: 'Active' },
  { id: 3, name: 'Ravi Kumar', rollNo: 'S003', class: '8', section: 'C', dob: '05 Jul 2012', parent: 'Suresh Kumar', mobile: '9876543212', address: '8 Rose Lane, Pune', status: 'Active' },
  { id: 4, name: 'Ananya Singh', rollNo: 'S004', class: '10', section: 'B', dob: '18 Sep 2010', parent: 'Amit Singh', mobile: '9876543213', address: '33 Oak Ave, Bangalore', status: 'Active' },
  { id: 5, name: 'Kiran Reddy', rollNo: 'S005', class: '7', section: 'A', dob: '30 Nov 2013', parent: 'Venkat Reddy', mobile: '9876543214', address: '21 Lotus St, Hyderabad', status: 'Active' },
  { id: 6, name: 'Priya Sharma', rollNo: 'S006', class: '6', section: 'A', dob: '10 Feb 2014', parent: 'Mohit Sharma', mobile: '9876543215', address: '7 Green Park, Chennai', status: 'Active' },
  { id: 7, name: 'Aditya Nair', rollNo: 'S007', class: '11', section: 'A', dob: '25 Apr 2009', parent: 'Sunil Nair', mobile: '9876543216', address: '55 Hill View, Kochi', status: 'Active' },
  { id: 8, name: 'Deepika Joshi', rollNo: 'S008', class: '12', section: 'B', dob: '08 Jun 2008', parent: 'Ramesh Joshi', mobile: '9876543217', address: '3 Lake Road, Ahmedabad', status: 'Inactive' },
];

const ITEMS_PER_PAGE = 6;

const Students = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [students, setStudents] = useState(mockStudents);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [formData, setFormData] = useState({
    name: '', rollNo: '', class: '', section: '', dob: '',
    parent: '', mobile: '', address: '', status: 'Active'
  });
  const [deleteId, setDeleteId] = useState(null);

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.parent.toLowerCase().includes(searchTerm.toLowerCase());
    const matchClass = !filterClass || s.class === filterClass;
    return matchSearch && matchClass;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openAddModal = () => {
    setEditStudent(null);
    setFormData({ name: '', rollNo: '', class: '', section: '', dob: '', parent: '', mobile: '', address: '', status: 'Active' });
    setShowModal(true);
  };

  const openEditModal = (student) => {
    setEditStudent(student);
    setFormData({ ...student });
    setShowModal(true);
  };

  const handleSave = () => {
    if (!formData.name || !formData.rollNo || !formData.class) {
      alert('Please fill required fields: Name, Roll No, Class');
      return;
    }
    if (editStudent) {
      setStudents(students.map(s => s.id === editStudent.id ? { ...s, ...formData } : s));
    } else {
      const newId = Math.max(...students.map(s => s.id)) + 1;
      setStudents([...students, { id: newId, ...formData }]);
    }
    setShowModal(false);
  };

  const handleDelete = (id) => {
    setStudents(students.filter(s => s.id !== id));
    setDeleteId(null);
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

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
          pageTitle="Students"
          onMenuToggle={() => {
            if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
            else setSidebarCollapsed(!sidebarCollapsed);
          }}
        />

        <div className="page-content">
          <div className="page-header">
            <h1>Student Management</h1>
            <p>Manage and view all enrolled students ({students.length} total)</p>
          </div>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Students', value: students.length, icon: 'school', color: '#76C442' },
              { label: 'Active', value: students.filter(s => s.status === 'Active').length, icon: 'check_circle', color: '#3182ce' },
              { label: 'Inactive', value: students.filter(s => s.status === 'Inactive').length, icon: 'cancel', color: '#e53e3e' },
              { label: 'Classes', value: '12', icon: 'class', color: '#805ad5' },
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

          {/* Table Card */}
          <div className="data-table-card">
            <div className="search-filter-bar">
              <div className="search-input-wrapper">
                <span className="material-icons">search</span>
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search students, roll no, parent..."
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <select
                className="filter-select"
                value={filterClass}
                onChange={e => { setFilterClass(e.target.value); setCurrentPage(1); }}
              >
                <option value="">All Classes</option>
                {['6', '7', '8', '9', '10', '11', '12'].map(c => (
                  <option key={c} value={c}>Class {c}</option>
                ))}
              </select>
              <button className="btn-add" onClick={openAddModal}>
                <span className="material-icons">person_add</span>
                Add Student
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Roll No</th>
                    <th>Class</th>
                    <th>Parent</th>
                    <th>Mobile</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.length === 0 ? (
                    <tr>
                      <td colSpan={7}>
                        <div className="empty-state">
                          <span className="material-icons">search_off</span>
                          <h3>No students found</h3>
                          <p>Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  ) : paginated.map(s => (
                    <tr key={s.id}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar-sm">{getInitials(s.name)}</div>
                          <div>
                            <div className="student-name">{s.name}</div>
                            <div className="student-class">DOB: {s.dob}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#718096', fontWeight: 600 }}>{s.rollNo}</td>
                      <td><span style={{ fontSize: '13px', fontWeight: 700 }}>Class {s.class}-{s.section}</span></td>
                      <td style={{ fontSize: '13px' }}>{s.parent}</td>
                      <td style={{ fontSize: '12px', color: '#718096' }}>{s.mobile}</td>
                      <td>
                        <span className={`status-badge ${s.status === 'Active' ? 'status-present' : 'status-absent'}`}>
                          {s.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-btns">
                          <button className="action-btn action-btn-view" title="View">
                            <span className="material-icons">visibility</span>
                          </button>
                          <button className="action-btn action-btn-edit" onClick={() => openEditModal(s)} title="Edit">
                            <span className="material-icons">edit</span>
                          </button>
                          <button className="action-btn action-btn-delete" onClick={() => setDeleteId(s.id)} title="Delete">
                            <span className="material-icons">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-bar">
                <div className="pagination-info">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
                </div>
                <div className="pagination-controls">
                  <button className="page-btn" onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1}>
                    <span className="material-icons" style={{ fontSize: '16px' }}>chevron_left</span>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                    <button key={p} className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => setCurrentPage(p)}>
                      {p}
                    </button>
                  ))}
                  <button className="page-btn" onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages}>
                    <span className="material-icons" style={{ fontSize: '16px' }}>chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-container">
            <div className="modal-header">
              <span className="modal-title">{editStudent ? 'Edit Student' : 'Add New Student'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <span className="material-icons">close</span>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { field: 'name', label: 'Full Name *', placeholder: 'Enter full name', type: 'text' },
                  { field: 'rollNo', label: 'Roll Number *', placeholder: 'e.g., S001', type: 'text' },
                  { field: 'class', label: 'Class *', placeholder: 'e.g., 10', type: 'text' },
                  { field: 'section', label: 'Section', placeholder: 'e.g., A', type: 'text' },
                  { field: 'dob', label: 'Date of Birth', placeholder: 'DD Mon YYYY', type: 'text' },
                  { field: 'mobile', label: 'Mobile', placeholder: '10-digit mobile', type: 'tel' },
                  { field: 'parent', label: 'Parent Name', placeholder: "Parent's full name", type: 'text' },
                ].map(f => (
                  <div key={f.field} className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">{f.label}</label>
                    <input
                      type={f.type}
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
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Address</label>
                <textarea
                  className="form-control"
                  style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', resize: 'vertical', minHeight: '70px' }}
                  placeholder="Enter address"
                  value={formData.address || ''}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowModal(false)}
                style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', fontSize: '14px', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                {editStudent ? 'Update Student' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-container" style={{ maxWidth: '380px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-body" style={{ padding: '32px 28px', textAlign: 'center' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <span className="material-icons" style={{ color: '#e53e3e', fontSize: '28px' }}>delete</span>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Delete Student?</h3>
              <p style={{ color: '#718096', fontSize: '14px', marginBottom: '24px' }}>This action cannot be undone. The student record will be permanently deleted.</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button onClick={() => setDeleteId(null)} style={{ padding: '10px 24px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                <button onClick={() => handleDelete(deleteId)} style={{ padding: '10px 24px', background: '#e53e3e', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Students;
