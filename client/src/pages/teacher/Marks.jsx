import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';

const mockMarks = [
  { id: 1, student: 'Arjun Patel', rollNo: 'S001', class: '10-A', subject: 'Mathematics', examType: 'Unit Test 1', marks: 42, maxMarks: 50, grade: 'A', date: '15 Feb 2025' },
  { id: 2, student: 'Sneha Gupta', rollNo: 'S002', class: '10-A', subject: 'Mathematics', examType: 'Unit Test 1', marks: 38, maxMarks: 50, grade: 'B', date: '15 Feb 2025' },
  { id: 3, student: 'Ravi Kumar', rollNo: 'S003', class: '10-A', subject: 'Mathematics', examType: 'Unit Test 1', marks: 45, maxMarks: 50, grade: 'A+', date: '15 Feb 2025' },
  { id: 4, student: 'Ananya Singh', rollNo: 'S004', class: '10-A', subject: 'Mathematics', examType: 'Mid Term', marks: 78, maxMarks: 100, grade: 'A', date: '10 Jan 2025' },
  { id: 5, student: 'Kiran Reddy', rollNo: 'S005', class: '10-A', subject: 'Mathematics', examType: 'Mid Term', marks: 65, maxMarks: 100, grade: 'B', date: '10 Jan 2025' },
  { id: 6, student: 'Priya Sharma', rollNo: 'S006', class: '9-B', subject: 'Mathematics', examType: 'Unit Test 1', marks: 44, maxMarks: 50, grade: 'A+', date: '16 Feb 2025' },
  { id: 7, student: 'Aditya Nair', rollNo: 'S007', class: '9-B', subject: 'Mathematics', examType: 'Unit Test 1', marks: 30, maxMarks: 50, grade: 'C', date: '16 Feb 2025' },
  { id: 8, student: 'Rahul Mehta', rollNo: 'S009', class: '9-B', subject: 'Mathematics', examType: 'Mid Term', marks: 82, maxMarks: 100, grade: 'A+', date: '11 Jan 2025' },
];

// Updated grading scale: O/A+/A/B+/B/B-/C/F
const getGrade = (marks, max) => {
  const pct = (marks / max) * 100;
  if (pct >= 90) return 'O';
  if (pct >= 80) return 'A+';
  if (pct >= 70) return 'A';
  if (pct >= 60) return 'B+';
  if (pct >= 50) return 'B';
  if (pct >= 40) return 'B-';
  if (pct >= 33) return 'C';
  return 'F';
};

const gradeColors = { O: '#276749', 'A+': '#276749', A: '#276749', 'B+': '#2b6cb0', B: '#2b6cb0', 'B-': '#c05621', C: '#c05621', F: '#c53030' };
const gradeBg    = { O: '#f0fff4', 'A+': '#f0fff4', A: '#f0fff4', 'B+': '#ebf8ff', B: '#ebf8ff', 'B-': '#fffaf0', C: '#fffaf0', F: '#fff5f5' };

export default function Marks() {
  const [marks, setMarks] = useState(mockMarks);
  const [filterClass, setFilterClass] = useState('');
  const [filterExam, setFilterExam] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ student: '', rollNo: '', class: '', subject: 'Mathematics', examType: 'Unit Test 1', marks: '', maxMarks: '50', date: '' });
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = marks.filter(m => {
    const matchClass = !filterClass || m.class === filterClass;
    const matchExam = !filterExam || m.examType === filterExam;
    return matchClass && matchExam;
  });

  const avgMarks = filtered.length > 0 ? Math.round(filtered.reduce((a, m) => a + (m.marks / m.maxMarks) * 100, 0) / filtered.length) : 0;

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.student || !formData.marks) { showToast('Student name and marks are required', 'error'); return; }
    const grade = getGrade(parseFloat(formData.marks), parseFloat(formData.maxMarks));
    setMarks([...marks, { id: Date.now(), ...formData, marks: parseFloat(formData.marks), maxMarks: parseFloat(formData.maxMarks), grade }]);
    setShowModal(false);
    setFormData({ student: '', rollNo: '', class: '', subject: 'Mathematics', examType: 'Unit Test 1', marks: '', maxMarks: '50', date: '' });
    showToast('Marks saved successfully');
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  // Auto-calculate grade when marks/maxMarks change
  const previewGrade = formData.marks && formData.maxMarks ? getGrade(+formData.marks, +formData.maxMarks) : '';

  return (
    <Layout pageTitle="Marks">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Marks & Grades</h1>
        <p>Record and manage student marks for your classes</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Records', value: marks.length, icon: 'grade', color: '#76C442' },
          { label: 'Avg Score', value: avgMarks + '%', icon: 'bar_chart', color: '#3182ce' },
          { label: 'O/A+ Students', value: marks.filter(m => m.grade === 'O' || m.grade === 'A+').length, icon: 'star', color: '#ed8936' },
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
            {['10-A','9-B','10-B','8-A'].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="filter-select" value={filterExam} onChange={e => setFilterExam(e.target.value)}>
            <option value="">All Exams</option>
            {['Unit Test 1','Unit Test 2','Mid Term','Final Exam'].map(e => <option key={e} value={e}>{e}</option>)}
          </select>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            <span className="material-icons">add</span> Add Marks
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
                        <button className="action-btn action-btn-delete" onClick={() => { setMarks(marks.filter(x => x.id !== m.id)); showToast('Record deleted', 'warning'); }}><span className="material-icons">delete</span></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Marks</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="row g-3">
                    {[
                      { field: 'student', label: 'Student Name *', placeholder: 'Student name' },
                      { field: 'rollNo',  label: 'Roll Number',    placeholder: 'e.g., S001' },
                    ].map(f => (
                      <div className="col-6" key={f.field}>
                        <label className="form-label small fw-medium">{f.label}</label>
                        <input type="text" className="form-control form-control-sm" placeholder={f.placeholder}
                          value={formData[f.field] || ''} onChange={e => setFormData({ ...formData, [f.field]: e.target.value })} />
                      </div>
                    ))}
                    <div className="col-6">
                      <label className="form-label small fw-medium">Exam Date</label>
                      <input type="date" className="form-control form-control-sm"
                        value={formData.date || ''} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Marks Obtained *</label>
                      <input type="number" className="form-control form-control-sm" placeholder="0"
                        value={formData.marks} onChange={e => setFormData({ ...formData, marks: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Max Marks</label>
                      <input type="number" className="form-control form-control-sm" placeholder="100"
                        value={formData.maxMarks} onChange={e => setFormData({ ...formData, maxMarks: e.target.value })} />
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Class</label>
                      <select className="form-select form-select-sm" value={formData.class} onChange={e => setFormData({ ...formData, class: e.target.value })}>
                        <option value="">Select Class</option>
                        {['10-A','9-B','10-B','8-A'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label small fw-medium">Exam Type</label>
                      <select className="form-select form-select-sm" value={formData.examType} onChange={e => setFormData({ ...formData, examType: e.target.value })}>
                        {['Unit Test 1','Unit Test 2','Mid Term','Final Exam'].map(e => <option key={e}>{e}</option>)}
                      </select>
                    </div>
                    {previewGrade && (
                      <div className="col-12">
                        <div className="p-2 rounded text-center" style={{ background: gradeBg[previewGrade] }}>
                          <span className="fw-bold" style={{ color: gradeColors[previewGrade] }}>
                            Auto Grade: {previewGrade} ({Math.round((+formData.marks / +formData.maxMarks) * 100)}%)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Save Marks</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
