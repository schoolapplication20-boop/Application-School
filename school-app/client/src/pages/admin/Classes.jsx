import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const mockClasses = [
  { id: 1, name: 'Class 10', section: 'A', teacher: 'Priya Sharma', subject: 'Mathematics', capacity: 40, enrolled: 38, room: '101' },
  { id: 2, name: 'Class 10', section: 'B', teacher: 'Sunita Rao', subject: 'English', capacity: 40, enrolled: 36, room: '102' },
  { id: 3, name: 'Class 9', section: 'A', teacher: 'Rajesh Verma', subject: 'Science', capacity: 40, enrolled: 40, room: '201' },
  { id: 4, name: 'Class 9', section: 'B', teacher: 'Priya Sharma', subject: 'Mathematics', capacity: 40, enrolled: 34, room: '202' },
  { id: 5, name: 'Class 8', section: 'A', teacher: 'Amit Joshi', subject: 'Social Studies', capacity: 35, enrolled: 32, room: '301' },
  { id: 6, name: 'Class 8', section: 'B', teacher: 'Kavita Iyer', subject: 'Hindi', capacity: 35, enrolled: 30, room: '302' },
  { id: 7, name: 'Class 7', section: 'A', teacher: 'Mohan Das', subject: 'Computer Science', capacity: 35, enrolled: 28, room: '401' },
  { id: 8, name: 'Class 6', section: 'A', teacher: 'Anita Pillai', subject: 'Biology', capacity: 30, enrolled: 25, room: '501' },
];

const Classes = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [classes, setClasses] = useState(mockClasses);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editClass, setEditClass] = useState(null);
  const [formData, setFormData] = useState({ name: '', section: '', teacher: '', subject: '', capacity: '', enrolled: '', room: '' });

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.teacher.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = () => {
    if (!formData.name || !formData.section) { alert('Class name and section are required.'); return; }
    if (editClass) {
      setClasses(classes.map(c => c.id === editClass.id ? { ...c, ...formData } : c));
    } else {
      setClasses([...classes, { id: Date.now(), ...formData, enrolled: 0 }]);
    }
    setShowModal(false);
  };

  const getOccupancyColor = (enrolled, capacity) => {
    const pct = (enrolled / capacity) * 100;
    if (pct >= 95) return '#e53e3e';
    if (pct >= 80) return '#ed8936';
    return '#76C442';
  };

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Classes" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header">
            <h1>Class Management</h1>
            <p>Overview of all classes and sections</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Classes', value: classes.length, icon: 'class', color: '#76C442' },
              { label: 'Total Capacity', value: classes.reduce((a, c) => a + c.capacity, 0), icon: 'people', color: '#3182ce' },
              { label: 'Total Enrolled', value: classes.reduce((a, c) => a + c.enrolled, 0), icon: 'school', color: '#805ad5' },
              { label: 'Avg Occupancy', value: Math.round((classes.reduce((a, c) => a + (c.enrolled / c.capacity), 0) / classes.length) * 100) + '%', icon: 'bar_chart', color: '#ed8936' },
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
                <input type="text" className="search-input" placeholder="Search classes..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <button className="btn-add" onClick={() => { setEditClass(null); setFormData({ name: '', section: '', teacher: '', subject: '', capacity: '', enrolled: '', room: '' }); setShowModal(true); }}>
                <span className="material-icons">add</span>
                Add Class
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Class</th>
                    <th>Class Teacher</th>
                    <th>Subject</th>
                    <th>Room</th>
                    <th>Occupancy</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(c => {
                    const pct = Math.round((c.enrolled / c.capacity) * 100);
                    const color = getOccupancyColor(c.enrolled, c.capacity);
                    return (
                      <tr key={c.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '38px', height: '38px', borderRadius: '10px',
                              background: '#76C44215', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                              <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>class</span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.name} - {c.section}</div>
                              <div style={{ fontSize: '11px', color: '#a0aec0' }}>Section {c.section}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px' }}>{c.teacher}</td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: '#76C44215', color: '#76C442' }}>
                            {c.subject}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px', fontWeight: 600, color: '#718096' }}>Room {c.room}</td>
                        <td style={{ minWidth: '140px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <div className="progress-bar-custom">
                                <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: color, minWidth: '40px' }}>
                              {c.enrolled}/{c.capacity}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: '#a0aec0', marginTop: '2px' }}>{pct}% full</div>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button className="action-btn action-btn-view" title="View"><span className="material-icons">visibility</span></button>
                            <button className="action-btn action-btn-edit" onClick={() => { setEditClass(c); setFormData({ ...c }); setShowModal(true); }} title="Edit"><span className="material-icons">edit</span></button>
                            <button className="action-btn action-btn-delete" onClick={() => setClasses(classes.filter(x => x.id !== c.id))} title="Delete"><span className="material-icons">delete</span></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
              <span className="modal-title">{editClass ? 'Edit Class' : 'Add New Class'}</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { field: 'name', label: 'Class Name *', placeholder: 'e.g., Class 10' },
                  { field: 'section', label: 'Section *', placeholder: 'e.g., A' },
                  { field: 'teacher', label: 'Class Teacher', placeholder: 'Teacher name' },
                  { field: 'subject', label: 'Subject', placeholder: 'Primary subject' },
                  { field: 'capacity', label: 'Capacity', placeholder: 'Max students', type: 'number' },
                  { field: 'room', label: 'Room No', placeholder: 'e.g., 101' },
                ].map(f => (
                  <div key={f.field} className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">{f.label}</label>
                    <input type={f.type || 'text'} className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                      placeholder={f.placeholder} value={formData[f.field] || ''} onChange={e => setFormData({ ...formData, [f.field]: e.target.value })} />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
                {editClass ? 'Update' : 'Add Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
