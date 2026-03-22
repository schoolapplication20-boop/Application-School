import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const mockMarks = [
  { id: 1, student: 'Arjun Patel', rollNo: 'S001', class: '10-A', subject: 'Mathematics', examType: 'Unit Test 1', marks: 42, maxMarks: 50, grade: 'A', date: '15 Feb 2026' },
  { id: 2, student: 'Sneha Gupta', rollNo: 'S002', class: '10-A', subject: 'Mathematics', examType: 'Unit Test 1', marks: 38, maxMarks: 50, grade: 'B', date: '15 Feb 2026' },
  { id: 3, student: 'Ravi Kumar', rollNo: 'S003', class: '10-A', subject: 'Mathematics', examType: 'Unit Test 1', marks: 45, maxMarks: 50, grade: 'A+', date: '15 Feb 2026' },
  { id: 4, student: 'Ananya Singh', rollNo: 'S004', class: '10-A', subject: 'Mathematics', examType: 'Mid Term', marks: 78, maxMarks: 100, grade: 'A', date: '10 Jan 2026' },
  { id: 5, student: 'Kiran Reddy', rollNo: 'S005', class: '10-A', subject: 'Mathematics', examType: 'Mid Term', marks: 65, maxMarks: 100, grade: 'B', date: '10 Jan 2026' },
  { id: 6, student: 'Priya Sharma', rollNo: 'S006', class: '9-B', subject: 'Mathematics', examType: 'Unit Test 1', marks: 44, maxMarks: 50, grade: 'A+', date: '16 Feb 2026' },
  { id: 7, student: 'Aditya Nair', rollNo: 'S007', class: '9-B', subject: 'Mathematics', examType: 'Unit Test 1', marks: 30, maxMarks: 50, grade: 'C', date: '16 Feb 2026' },
  { id: 8, student: 'Rahul Mehta', rollNo: 'S009', class: '9-B', subject: 'Mathematics', examType: 'Mid Term', marks: 82, maxMarks: 100, grade: 'A+', date: '11 Jan 2026' },
];

const getGrade = (marks, max) => {
  const pct = (marks / max) * 100;
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  return 'F';
};

const gradeColors = { 'A+': '#276749', 'A': '#276749', 'B+': '#2b6cb0', 'B': '#2b6cb0', 'C': '#c05621', 'F': '#c53030' };
const gradeBg = { 'A+': '#f0fff4', 'A': '#f0fff4', 'B+': '#ebf8ff', 'B': '#ebf8ff', 'C': '#fffaf0', 'F': '#fff5f5' };

const Marks = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [marks, setMarks] = useState(mockMarks);
  const [filterClass, setFilterClass] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ student: '', rollNo: '', class: '', subject: 'Mathematics', examType: 'Unit Test 1', marks: '', maxMarks: '50', date: '' });

  const filtered = marks.filter(m => {
    const matchClass = !filterClass || m.class === filterClass;
    const matchExam = !filterExam || m.examType === filterExam;
    return matchClass && matchExam;
  });

  const avgMarks = filtered.length > 0 ? Math.round(filtered.reduce((a, m) => a + (m.marks / m.maxMarks) * 100, 0) / filtered.length) : 0;

  const handleSave = () => {
    if (!formData.student || !formData.marks) { alert('Student name and marks are required.'); return; }
    const grade = getGrade(parseFloat(formData.marks), parseFloat(formData.maxMarks));
    setMarks([...marks, { id: Date.now(), ...formData, marks: parseFloat(formData.marks), maxMarks: parseFloat(formData.maxMarks), grade }]);
    setShowModal(false);
    setFormData({ student: '', rollNo: '', class: '', subject: 'Mathematics', examType: 'Unit Test 1', marks: '', maxMarks: '50', date: '' });
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Marks" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header">
            <h1>Marks & Grades</h1>
            <p>Record and manage student marks for your classes</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Records', value: marks.length, icon: 'grade', color: '#76C442' },
              { label: 'Avg Score', value: avgMarks + '%', icon: 'bar_chart', color: '#3182ce' },
              { label: 'A+ Students', value: marks.filter(m => m.grade === 'A+').length, icon: 'star', color: '#ed8936' },
              { label: 'Failing', value: marks.filter(m => m.grade === 'F').length, icon: 'warning', color: '#e53e3e' },
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
                {['10-A', '9-B', '10-B', '8-A'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="filter-select" value={filterExam} onChange={e => setFilterExam(e.target.value)}>
                <option value="">All Exams</option>
                {['Unit Test 1', 'Unit Test 2', 'Mid Term', 'Final Exam'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <button className="btn-add" onClick={() => setShowModal(true)}>
                <span className="material-icons">add</span>
                Add Marks
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Exam Type</th>
                    <th>Marks</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(m => {
                    const pct = Math.round((m.marks / m.maxMarks) * 100);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar-sm">{getInitials(m.student)}</div>
                            <div>
                              <div className="student-name">{m.student}</div>
                              <div className="student-class">{m.rollNo}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px', fontWeight: 600 }}>{m.class}</td>
                        <td style={{ fontSize: '12px', color: '#718096' }}>{m.examType}</td>
                        <td style={{ fontWeight: 700 }}>{m.marks}/{m.maxMarks}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '50px' }}>
                              <div className="progress-bar-custom">
                                <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 80 ? '#76C442' : pct >= 60 ? '#3182ce' : pct >= 50 ? '#ed8936' : '#e53e3e' }} />
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: gradeBg[m.grade], color: gradeColors[m.grade] }}>
                            {m.grade}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#a0aec0' }}>{m.date}</td>
                        <td>
                          <div className="action-btns">
                            <button className="action-btn action-btn-edit"><span className="material-icons">edit</span></button>
                            <button className="action-btn action-btn-delete" onClick={() => setMarks(marks.filter(x => x.id !== m.id))}><span className="material-icons">delete</span></button>
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
              <span className="modal-title">Add Marks</span>
              <button className="modal-close" onClick={() => setShowModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {[
                  { field: 'student', label: 'Student Name *', placeholder: 'Student name' },
                  { field: 'rollNo', label: 'Roll Number', placeholder: 'e.g., S001' },
                  { field: 'marks', label: 'Marks Obtained *', placeholder: '0', type: 'number' },
                  { field: 'maxMarks', label: 'Max Marks', placeholder: '100', type: 'number' },
                  { field: 'date', label: 'Exam Date', placeholder: 'DD Mon YYYY' },
                ].map(f => (
                  <div key={f.field} className="form-group" style={{ marginBottom: '12px' }}>
                    <label className="form-label">{f.label}</label>
                    <input type={f.type || 'text'} className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                      placeholder={f.placeholder} value={formData[f.field] || ''} onChange={e => setFormData({ ...formData, [f.field]: e.target.value })} />
                  </div>
                ))}
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Class</label>
                  <select className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })}>
                    <option value="">Select Class</option>
                    {['10-A', '9-B', '10-B', '8-A'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label className="form-label">Exam Type</label>
                  <select className="form-control" style={{ padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontSize: '13px' }}
                    value={formData.examType} onChange={e => setFormData({ ...formData, examType: e.target.value })}>
                    {['Unit Test 1', 'Unit Test 2', 'Mid Term', 'Final Exam'].map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', border: '1.5px solid #e2e8f0', borderRadius: '8px', background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ padding: '10px 24px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Save Marks</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marks;
