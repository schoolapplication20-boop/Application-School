import React, { useState } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';

// Updated grading scale: O/A+/A/B+/B/B-/C/F
const getGrade = (marks, max) => {
  if (!marks || !max) return '';
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

const GRADE_LIST = ['O', 'A+', 'A', 'B+', 'B', 'B-', 'C', 'F'];

const gradeColor = { O: '#276749', 'A+': '#276749', A: '#276749', 'B+': '#2b6cb0', B: '#2b6cb0', 'B-': '#c05621', C: '#c05621', F: '#c53030' };
const gradeBg    = { O: '#f0fff4', 'A+': '#f0fff4', A: '#f0fff4', 'B+': '#ebf8ff', B: '#ebf8ff', 'B-': '#fffaf0', C: '#fffaf0', F: '#fff5f5' };

const mockAssignments = [
  { id: 1, title: 'Quadratic Equations Practice', description: 'Solve problems 1-20 from textbook chapter 4', class: '10-A', dueDate: '20 Mar 2025', submitted: 30, total: 38, status: 'Active',    createdAt: '10 Mar 2025' },
  { id: 2, title: 'Trigonometry Worksheet',        description: 'Complete the attached worksheet on sin, cos and tan values', class: '9-B',  dueDate: '22 Mar 2025', submitted: 18, total: 34, status: 'Active',    createdAt: '12 Mar 2025' },
  { id: 3, title: 'Algebra Test Revision',         description: 'Revise chapters 1-5, focus on word problems', class: '10-B', dueDate: '18 Mar 2025', submitted: 36, total: 36, status: 'Completed', createdAt: '08 Mar 2025' },
  { id: 4, title: 'Geometry Proofs',               description: 'Prove the given theorems with step by step explanation', class: '8-A',  dueDate: '25 Mar 2025', submitted: 5,  total: 32, status: 'Active',    createdAt: '15 Mar 2025' },
  { id: 5, title: 'Statistics Project',            description: 'Collect data from school canteen and create statistical analysis', class: '10-A', dueDate: '30 Mar 2025', submitted: 0,  total: 38, status: 'Active',    createdAt: '17 Mar 2025' },
];

const mockSubmissions = [
  { id: 1, name: 'Arjun Patel',   rollNo: 'S001', submittedAt: '18 Mar 2025 10:30 AM', grade: 'A',  marks: 42, maxMarks: 50, status: 'Graded',    starred: false },
  { id: 2, name: 'Sneha Gupta',   rollNo: 'S002', submittedAt: '18 Mar 2025 11:15 AM', grade: '',   marks: '',  maxMarks: 50, status: 'Submitted', starred: false },
  { id: 3, name: 'Ravi Kumar',    rollNo: 'S003', submittedAt: '19 Mar 2025 09:00 AM', grade: 'O',  marks: 48, maxMarks: 50, status: 'Graded',    starred: true  },
  { id: 4, name: 'Ananya Singh',  rollNo: 'S004', submittedAt: '',                     grade: '',   marks: '',  maxMarks: 50, status: 'Pending',   starred: false },
  { id: 5, name: 'Kiran Reddy',   rollNo: 'S005', submittedAt: '18 Mar 2025 03:00 PM', grade: '',   marks: '',  maxMarks: 50, status: 'Submitted', starred: false },
];

const statusColor = { Active: '#76C442', Completed: '#3182ce', Overdue: '#e53e3e' };

export default function Assignments() {
  const [assignments, setAssignments]       = useState(mockAssignments);
  const [showModal, setShowModal]           = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions]       = useState(mockSubmissions);
  const [filterStatus, setFilterStatus]     = useState('');
  const [formData, setFormData]             = useState({ title: '', description: '', class: '', dueDate: '' });
  const [toast, setToast]                   = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const filtered = assignments.filter(a => !filterStatus || a.status === filterStatus);

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title || !formData.class) { showToast('Title and Class are required', 'error'); return; }
    setAssignments([...assignments, {
      id: Date.now(), ...formData, submitted: 0, total: 38, status: 'Active',
      createdAt: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    }]);
    setShowModal(false);
    setFormData({ title: '', description: '', class: '', dueDate: '' });
    showToast('Assignment created successfully');
  };

  const openGradeModal = (a) => {
    setSelectedAssignment(a);
    setShowGradeModal(true);
  };

  const saveGrade = (subId, marks, maxMarks) => {
    const grade = getGrade(marks, maxMarks);
    setSubmissions(prev => prev.map(s => s.id === subId
      ? { ...s, marks: +marks, maxMarks: +maxMarks, grade, status: marks !== '' ? 'Graded' : s.status }
      : s));
  };

  const toggleStar = (subId) => {
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, starred: !s.starred } : s));
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <Layout pageTitle="Assignments">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Assignments</h1>
        <p>Create and manage assignments for your classes</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total',       value: assignments.length,                                            color: '#76C442' },
          { label: 'Active',      value: assignments.filter(a => a.status === 'Active').length,         color: '#3182ce' },
          { label: 'Completed',   value: assignments.filter(a => a.status === 'Completed').length,      color: '#805ad5' },
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
            <option>Active</option>
            <option>Completed</option>
            <option>Overdue</option>
          </select>
          <button className="btn-add" onClick={() => setShowModal(true)}>
            <span className="material-icons">add</span> New Assignment
          </button>
        </div>

        <div style={{ display: 'grid', gap: '16px' }}>
          {filtered.map(a => {
            const submittedPct = Math.round((a.submitted / a.total) * 100);
            const color = statusColor[a.status] || '#76C442';
            return (
              <div key={a.id} style={{ border: '1px solid #f0f4f8', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-icons" style={{ color, fontSize: '18px' }}>assignment</span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#2d3748', margin: 0 }}>{a.title}</h3>
                    </div>
                    <p style={{ fontSize: '13px', color: '#718096', margin: '0 0 10px', lineHeight: '1.5' }}>{a.description}</p>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                      {[
                        { icon: 'class',               text: `Class ${a.class}` },
                        { icon: 'calendar_today',       text: `Due: ${a.dueDate}` },
                        { icon: 'assignment_turned_in', text: `${a.submitted}/${a.total} submitted` },
                        { icon: 'event',               text: `Created: ${a.createdAt}` },
                      ].map((info, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span className="material-icons" style={{ fontSize: '14px', color: '#a0aec0' }}>{info.icon}</span>
                          <span style={{ fontSize: '12px', color: '#718096' }}>{info.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', marginLeft: 16 }}>
                    <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: color + '15', color }}>{a.status}</span>
                    <div className="action-btns">
                      <button className="action-btn" title="Grade Submissions" style={{ color: '#805ad5', background: '#f3e8ff' }} onClick={() => openGradeModal(a)}>
                        <span className="material-icons">grade</span>
                      </button>
                      <button className="action-btn action-btn-delete" onClick={() => { setAssignments(assignments.filter(x => x.id !== a.id)); showToast('Assignment deleted', 'warning'); }}>
                        <span className="material-icons">delete</span>
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="progress-bar-custom">
                      <div className="progress-fill" style={{ width: `${submittedPct}%` }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 600, color, minWidth: '40px' }}>{submittedPct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Assignment Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Assignment</h5>
                <button className="btn-close" onClick={() => setShowModal(false)} />
              </div>
              <form onSubmit={handleSave}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-medium small">Title *</label>
                    <input type="text" className="form-control form-control-sm" placeholder="Assignment title"
                      value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-medium small">Description</label>
                    <textarea className="form-control form-control-sm" rows={3} placeholder="Assignment instructions..."
                      value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="row g-3">
                    <div className="col-6">
                      <label className="form-label fw-medium small">Class *</label>
                      <select className="form-select form-select-sm" value={formData.class}
                        onChange={e => setFormData({ ...formData, class: e.target.value })}>
                        <option value="">Select Class</option>
                        {['10-A', '9-B', '10-B', '8-A'].map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label fw-medium small">Due Date</label>
                      <input type="date" className="form-control form-control-sm"
                        min={new Date().toISOString().split('T')[0]}
                        value={formData.dueDate} onChange={e => setFormData({ ...formData, dueDate: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Assignment</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Grade Submissions Modal */}
      {showGradeModal && selectedAssignment && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title">Grade Submissions</h5>
                  <p className="text-muted small mb-0">{selectedAssignment.title} · Class {selectedAssignment.class}</p>
                </div>
                <button className="btn-close" onClick={() => setShowGradeModal(false)} />
              </div>

              {/* Grade Scale Reference */}
              <div style={{ padding: '12px 20px', background: '#f7fafc', borderBottom: '1px solid #f0f4f8' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#718096', marginBottom: '6px' }}>Grading Scale:</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { grade: 'O',  range: '90–100' },
                    { grade: 'A+', range: '80–89'  },
                    { grade: 'A',  range: '70–79'  },
                    { grade: 'B+', range: '60–69'  },
                    { grade: 'B',  range: '50–59'  },
                    { grade: 'B-', range: '40–49'  },
                    { grade: 'C',  range: '33–39'  },
                    { grade: 'F',  range: '0–32'   },
                  ].map(g => (
                    <span key={g.grade} style={{ padding: '3px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                      background: gradeBg[g.grade], color: gradeColor[g.grade] }}>
                      {g.grade}: {g.range}%
                    </span>
                  ))}
                </div>
              </div>

              <div className="modal-body p-0">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="ps-3">Student</th>
                      <th>Submitted At</th>
                      <th>Max Marks</th>
                      <th>Marks</th>
                      <th>Grade</th>
                      <th>Star</th>
                      <th className="pe-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map(s => {
                      const autoGrade = getGrade(s.marks, s.maxMarks);
                      return (
                        <tr key={s.id}>
                          <td className="ps-3">
                            <div className="d-flex align-items-center gap-2">
                              <div className="student-avatar-sm" style={{ width: 32, height: 32, fontSize: 12 }}>{getInitials(s.name)}</div>
                              <div>
                                <div className="fw-medium small">{s.name}</div>
                                <div className="text-muted" style={{ fontSize: 11 }}>{s.rollNo}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ fontSize: 12, color: '#718096' }}>{s.submittedAt || '—'}</td>
                          <td style={{ fontSize: 13, fontWeight: 600 }}>{s.maxMarks}</td>
                          <td>
                            <input type="number" className="form-control form-control-sm" style={{ width: 70 }}
                              placeholder="0" min={0} max={s.maxMarks}
                              value={s.marks === '' ? '' : s.marks}
                              onChange={e => saveGrade(s.id, e.target.value, s.maxMarks)}
                              disabled={s.status === 'Pending'} />
                          </td>
                          <td>
                            {autoGrade ? (
                              <span style={{ padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                                background: gradeBg[autoGrade], color: gradeColor[autoGrade] }}>
                                {autoGrade}
                              </span>
                            ) : <span style={{ color: '#a0aec0' }}>—</span>}
                          </td>
                          <td>
                            <button
                              onClick={() => toggleStar(s.id)}
                              title={s.starred ? 'Remove star' : 'Star this submission'}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px',
                                color: s.starred ? '#f6ad55' : '#e2e8f0', fontSize: '22px', lineHeight: 1 }}>
                              <span className="material-icons" style={{ fontSize: 22 }}>
                                {s.starred ? 'star' : 'star_border'}
                              </span>
                            </button>
                          </td>
                          <td className="pe-3">
                            <span className={`badge ${s.status === 'Graded' ? 'bg-success' : s.status === 'Submitted' ? 'bg-primary' : 'bg-secondary'}`} style={{ fontSize: 10 }}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowGradeModal(false)}>Close</button>
                <button className="btn btn-primary" onClick={() => { setShowGradeModal(false); showToast('Grades saved successfully'); }}>Save Grades</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
