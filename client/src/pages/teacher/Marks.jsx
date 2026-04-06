import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { teacherAPI } from '../../services/api';

const EXAM_TYPES = ['Unit Test 1', 'Unit Test 2', 'Mid Term', 'Final Exam', 'Annual Exam'];
const SUBJECTS = [
  'Mathematics', 'Science', 'English', 'Social Studies', 'Hindi',
  'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Physical Education',
  'History', 'Geography', 'Economics',
];

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

const gradeColors = {
  O: '#276749', 'A+': '#276749', A: '#276749',
  'B+': '#2b6cb0', B: '#2b6cb0', 'B-': '#c05621',
  C: '#c05621', F: '#c53030',
};
const gradeBg = {
  O: '#f0fff4', 'A+': '#f0fff4', A: '#f0fff4',
  'B+': '#ebf8ff', B: '#ebf8ff', 'B-': '#fffaf0',
  C: '#fffaf0', F: '#fff5f5',
};

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const sel = (extra = {}) => ({
  padding: '8px 10px', fontSize: 12, border: '1.5px solid #e2e8f0',
  borderRadius: 7, outline: 'none', background: '#fff', boxSizing: 'border-box', ...extra,
});

export default function Marks() {
  const { user } = useAuth();

  // ── Main data ─────────────────────────────────────────────────────────────────
  const [classes, setClasses]           = useState([]);
  const [students, setStudents]         = useState([]);
  const [allMarks, setAllMarks]         = useState([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMarks, setLoadingMarks] = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────────
  const [filterClassId, setFilterClassId] = useState('');
  const [filterExam, setFilterExam]       = useState('');

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  // ── Bulk modal state ──────────────────────────────────────────────────────────
  const [showModal, setShowModal]             = useState(false);
  const [bulkClassId, setBulkClassId]         = useState('');
  const [bulkExamType, setBulkExamType]       = useState(EXAM_TYPES[0]);
  const [bulkDate, setBulkDate]               = useState('');
  const [bulkMaxMarks, setBulkMaxMarks]       = useState('100');
  const [bulkSubjects, setBulkSubjects]       = useState([SUBJECTS[0]]);
  const [bulkStudents, setBulkStudents]       = useState([]);
  const [loadingBulkStudents, setLoadingBulkStudents] = useState(false);
  // grid[studentId][subject] = marks string value
  const [grid, setGrid]                       = useState({});
  const [saving, setSaving]                   = useState(false);

  // ── Load teacher's classes on mount ───────────────────────────────────────────
  useEffect(() => {
    teacherAPI.getMyClasses(user.id)
      .then(r => {
        const cls = r?.data?.data ?? r?.data ?? [];
        setClasses(Array.isArray(cls) ? cls : []);
      })
      .catch(() => showToast('Failed to load classes', 'error'))
      .finally(() => setLoading(false));
  }, [user.id]);

  // ── Load all students + marks ─────────────────────────────────────────────────
  const loadAllData = useCallback(async (classList) => {
    if (!classList.length) return;
    setLoadingMarks(true);
    try {
      const studentArrays = await Promise.all(
        classList.map(cls =>
          teacherAPI.getClassStudents(cls.id)
            .then(r => (r?.data?.data ?? r?.data ?? []).map(s => ({
              ...s,
              classId:    cls.id,
              classLabel: cls.section ? `${cls.name}-${cls.section}` : cls.name,
            })))
            .catch(() => [])
        )
      );
      const allStudents = studentArrays.flat();
      setStudents(allStudents);

      const marksArrays = await Promise.all(
        allStudents.map(s =>
          teacherAPI.getMarks(s.id)
            .then(r => (r?.data?.data ?? r?.data ?? []).map(m => ({
              ...m,
              studentName: m.studentName || s.name,
              rollNumber:  s.rollNumber || '',
              classLabel:  s.classLabel,
              classId:     s.classId,
            })))
            .catch(() => [])
        )
      );
      setAllMarks(marksArrays.flat());
    } catch {
      showToast('Failed to load data', 'error');
    } finally {
      setLoadingMarks(false);
    }
  }, []);

  useEffect(() => { if (classes.length) loadAllData(classes); }, [classes, loadAllData]);

  // ── Load students for bulk modal when class changes ───────────────────────────
  useEffect(() => {
    if (!bulkClassId) { setBulkStudents([]); setGrid({}); return; }
    const cls = classes.find(c => String(c.id) === bulkClassId);
    setLoadingBulkStudents(true);
    teacherAPI.getClassStudents(Number(bulkClassId))
      .then(r => {
        const studs = (r?.data?.data ?? r?.data ?? []).map(s => ({
          ...s,
          classLabel: cls ? (cls.section ? `${cls.name}-${cls.section}` : cls.name) : '',
        }));
        setBulkStudents(studs);
        const g = {};
        studs.forEach(s => { g[s.id] = {}; });
        setGrid(g);
      })
      .catch(() => showToast('Failed to load students', 'error'))
      .finally(() => setLoadingBulkStudents(false));
  }, [bulkClassId, classes]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const toggleSubject = (sub) =>
    setBulkSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);

  const updateCell = (studentId, subject, value) =>
    setGrid(prev => ({ ...prev, [studentId]: { ...prev[studentId], [subject]: value } }));

  // ── Filtered marks list ───────────────────────────────────────────────────────
  const filtered = allMarks.filter(m => {
    const matchClass = !filterClassId || String(m.classId) === String(filterClassId);
    const matchExam  = !filterExam    || m.examType === filterExam;
    return matchClass && matchExam;
  });

  const avgPct = filtered.length > 0
    ? Math.round(filtered.reduce((a, m) => a + (m.marks / m.maxMarks) * 100, 0) / filtered.length)
    : 0;

  // ── Open modal ────────────────────────────────────────────────────────────────
  const openModal = () => {
    setBulkClassId(filterClassId || (classes[0] ? String(classes[0].id) : ''));
    setBulkExamType(EXAM_TYPES[0]);
    setBulkDate('');
    setBulkMaxMarks('100');
    setBulkSubjects([SUBJECTS[0]]);
    setGrid({});
    setShowModal(true);
  };

  // ── Save all marks ────────────────────────────────────────────────────────────
  const handleBulkSave = async () => {
    if (!bulkClassId) { showToast('Select a class', 'error'); return; }
    if (bulkSubjects.length === 0) { showToast('Select at least one subject', 'error'); return; }
    const maxNum = parseFloat(bulkMaxMarks);
    if (isNaN(maxNum) || maxNum <= 0) { showToast('Enter valid max marks', 'error'); return; }

    const date = bulkDate || new Date().toISOString().split('T')[0];
    const cls  = classes.find(c => String(c.id) === bulkClassId);

    const entries = [];
    for (const student of bulkStudents) {
      for (const subject of bulkSubjects) {
        const val = grid[student.id]?.[subject];
        if (val === undefined || val === '') continue;
        const marksNum = parseFloat(val);
        if (isNaN(marksNum) || marksNum < 0 || marksNum > maxNum) continue;
        entries.push({
          studentId:   student.id,
          studentName: student.name,
          subject,
          examType:    bulkExamType,
          marks:       marksNum,
          maxMarks:    maxNum,
          grade:       getGrade(marksNum, maxNum),
          teacherId:   user.id,
          examDate:    date,
        });
      }
    }

    if (entries.length === 0) { showToast('No marks entered', 'error'); return; }

    setSaving(true);
    try {
      const results = await Promise.all(entries.map(e => teacherAPI.addMarks(e)));
      const classLabel = cls ? (cls.section ? `${cls.name}-${cls.section}` : cls.name) : '';
      const saved = results
        .map((r, i) => {
          const data = r?.data?.data ?? r?.data;
          if (!data) return null;
          const student = bulkStudents.find(s => s.id === entries[i].studentId);
          return {
            ...data,
            studentName: student?.name || data.studentName,
            rollNumber:  student?.rollNumber || '',
            classLabel,
            classId:     Number(bulkClassId),
          };
        })
        .filter(Boolean);

      setAllMarks(prev => [...prev, ...saved]);
      showToast(`${saved.length} record${saved.length !== 1 ? 's' : ''} saved successfully`);
      setShowModal(false);
    } catch {
      showToast('Failed to save some marks', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async (markId) => {
    try {
      await teacherAPI.deleteMarks(markId);
      setAllMarks(prev => prev.filter(m => m.id !== markId));
      showToast('Record deleted', 'warning');
    } catch {
      showToast('Failed to delete', 'error');
    }
  };

  // ── Count filled cells ────────────────────────────────────────────────────────
  const filledCount = bulkStudents.reduce((acc, s) =>
    acc + bulkSubjects.filter(sub => (grid[s.id]?.[sub] ?? '') !== '').length, 0);

  // ── Expanded students in grouped view ────────────────────────────────────────
  const [expandedStudents, setExpandedStudents] = useState(new Set());
  const toggleStudent = (studentId) =>
    setExpandedStudents(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });

  // Group filtered marks by student
  const groupedByStudent = (() => {
    const map = new Map();
    for (const m of filtered) {
      const key = String(m.studentId);
      if (!map.has(key)) map.set(key, { studentId: key, studentName: m.studentName, rollNumber: m.rollNumber, classLabel: m.classLabel, classId: m.classId, rows: [] });
      map.get(key).rows.push(m);
    }
    return [...map.values()].sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));
  })();

  // ── Loading / empty states ────────────────────────────────────────────────────
  if (loading) return (
    <Layout pageTitle="Marks">
      <div style={{ textAlign: 'center', padding: 80, color: '#a0aec0' }}>
        <span className="material-icons" style={{ fontSize: 48 }}>hourglass_empty</span>
        <p style={{ marginTop: 8 }}>Loading your classes...</p>
      </div>
    </Layout>
  );

  if (!classes.length) return (
    <Layout pageTitle="Marks">
      <div className="page-header"><h1>Marks &amp; Grades</h1></div>
      <div style={{ textAlign: 'center', padding: 80 }}>
        <span className="material-icons" style={{ fontSize: 56, color: '#e2e8f0' }}>school</span>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#4a5568', marginTop: 12 }}>No classes assigned</div>
        <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 4 }}>Contact admin to get assigned to a class.</div>
      </div>
    </Layout>
  );

  return (
    <Layout pageTitle="Marks">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Marks &amp; Grades</h1>
        <p>Record and manage student marks for your assigned classes</p>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Records', value: allMarks.length, icon: 'grade', color: '#76C442' },
          { label: 'Avg Score',     value: avgPct + '%',    icon: 'bar_chart', color: '#3182ce' },
          { label: 'O / A+',        value: allMarks.filter(m => m.grade === 'O' || m.grade === 'A+').length, icon: 'star', color: '#ed8936' },
          { label: 'Failing',       value: allMarks.filter(m => m.grade === 'F').length, icon: 'warning', color: '#e53e3e' },
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

      {/* ── Marks table ── */}
      <div className="data-table-card">
        <div className="search-filter-bar">
          <select className="filter-select" value={filterClassId} onChange={e => setFilterClassId(e.target.value)}>
            <option value="">All My Classes</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id}>{cls.section ? `${cls.name}-${cls.section}` : cls.name}</option>
            ))}
          </select>
          <select className="filter-select" value={filterExam} onChange={e => setFilterExam(e.target.value)}>
            <option value="">All Exams</option>
            {EXAM_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
          </select>
          <button className="btn-add" onClick={openModal}>
            <span className="material-icons">add</span> Add Marks
          </button>
        </div>

        {loadingMarks ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 40 }}>hourglass_empty</span>
            <p style={{ marginTop: 8 }}>Loading marks...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <span className="material-icons" style={{ fontSize: 48, color: '#e2e8f0' }}>grade</span>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#4a5568', marginTop: 12 }}>No marks records yet</div>
            <div style={{ fontSize: 13, color: '#a0aec0', marginTop: 4 }}>Click "Add Marks" to record student performance.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Subjects</th>
                  <th>Avg Score</th>
                  <th>Overall Grade</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groupedByStudent.map((group, idx) => {
                  const isExpanded = expandedStudents.has(group.studentId);
                  const avgPctGroup = Math.round(
                    group.rows.reduce((a, m) => a + (m.marks / m.maxMarks) * 100, 0) / group.rows.length
                  );
                  const overallGrade = getGrade(avgPctGroup, 100);
                  return (
                    <React.Fragment key={group.studentId}>
                      {/* ── Summary row ── */}
                      <tr style={{ background: isExpanded ? '#f0fdf4' : undefined }}>
                        <td style={{ color: '#a0aec0', fontSize: 12 }}>{idx + 1}</td>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar-sm">{getInitials(group.studentName)}</div>
                            <div>
                              <div className="student-name">{group.studentName || '—'}</div>
                              <div className="student-class">{group.rollNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{group.classLabel || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {[...new Set(group.rows.map(r => r.subject))].map(sub => (
                              <span key={sub} style={{ padding: '3px 9px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#4361ee15', color: '#4361ee' }}>{sub}</span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 54 }}>
                              <div className="progress-bar-custom">
                                <div className="progress-fill" style={{ width: `${avgPctGroup}%`, background: avgPctGroup >= 80 ? '#76C442' : avgPctGroup >= 60 ? '#3182ce' : avgPctGroup >= 50 ? '#ed8936' : '#e53e3e' }} />
                              </div>
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{avgPctGroup}%</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: gradeBg[overallGrade] || '#f7fafc', color: gradeColors[overallGrade] || '#4a5568' }}>
                            {overallGrade}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              title={isExpanded ? 'Hide subject marks' : 'View subject marks'}
                              onClick={() => toggleStudent(group.studentId)}
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, border: 'none', background: isExpanded ? '#76C44220' : '#4361ee15', cursor: 'pointer' }}
                            >
                              <span className="material-icons" style={{ fontSize: 18, color: isExpanded ? '#76C442' : '#4361ee' }}>
                                {isExpanded ? 'visibility_off' : 'visibility'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* ── Expanded subject rows ── */}
                      {isExpanded && group.rows.map((m, rIdx) => {
                        const pct = Math.round((m.marks / m.maxMarks) * 100);
                        return (
                          <tr key={m.id} style={{ background: rIdx % 2 === 0 ? '#fafffe' : '#f0fdf4' }}>
                            <td style={{ color: '#a0aec0', fontSize: 11, paddingLeft: 32 }}>{rIdx + 1}</td>
                            <td style={{ paddingLeft: 32 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="material-icons" style={{ fontSize: 14, color: '#a0aec0' }}>subdirectory_arrow_right</span>
                                <span style={{ fontSize: 12, color: '#4a5568', fontWeight: 600 }}>{m.subject}</span>
                              </div>
                            </td>
                            <td style={{ fontSize: 12, color: '#718096' }}>{m.examType}</td>
                            <td style={{ fontWeight: 700, fontSize: 13 }}>{m.marks}/{m.maxMarks}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 54 }}>
                                  <div className="progress-bar-custom">
                                    <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 80 ? '#76C442' : pct >= 60 ? '#3182ce' : pct >= 50 ? '#ed8936' : '#e53e3e' }} />
                                  </div>
                                </div>
                                <span style={{ fontSize: 12, fontWeight: 600 }}>{pct}%</span>
                              </div>
                            </td>
                            <td>
                              <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: gradeBg[m.grade] || '#f7fafc', color: gradeColors[m.grade] || '#4a5568' }}>
                                {m.grade}
                              </span>
                            </td>
                            <td>
                              <div className="action-btns">
                                <button className="action-btn action-btn-delete" title="Delete" onClick={() => handleDelete(m.id)}>
                                  <span className="material-icons">delete</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          BULK MARKS ENTRY MODAL
          ══════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => !saving && setShowModal(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: 16, width: '96vw', maxWidth: 1200, maxHeight: '94vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.20)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >

            {/* ── Modal header ── */}
            <div style={{ padding: '18px 28px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#1a202c' }}>Add Marks — Bulk Entry</h3>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#718096' }}>
                  Select class, subjects &amp; enter marks for multiple students at once
                </p>
              </div>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: '#f7fafc', borderRadius: 8, cursor: 'pointer', padding: '6px 8px', display: 'flex' }}>
                <span className="material-icons" style={{ fontSize: 20, color: '#718096' }}>close</span>
              </button>
            </div>

            {/* ── Config row ── */}
            <div style={{ padding: '14px 28px', borderBottom: '1px solid #e2e8f0', background: '#fafbfc', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end', flexShrink: 0 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Class *</label>
                <select value={bulkClassId} onChange={e => setBulkClassId(e.target.value)} style={sel({ width: 150 })}>
                  <option value="">Select</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={String(cls.id)}>
                      {cls.section ? `${cls.name}-${cls.section}` : cls.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Exam Type *</label>
                <select value={bulkExamType} onChange={e => setBulkExamType(e.target.value)} style={sel({ width: 150 })}>
                  {EXAM_TYPES.map(et => <option key={et} value={et}>{et}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Exam Date</label>
                <input type="date" value={bulkDate} onChange={e => setBulkDate(e.target.value)} style={sel({ width: 155 })} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 4 }}>Max Marks (per subject)</label>
                <input type="number" min="1" placeholder="100" value={bulkMaxMarks} onChange={e => setBulkMaxMarks(e.target.value)} style={sel({ width: 110 })} />
              </div>
            </div>

            {/* ── Subject selector ── */}
            <div style={{ padding: '12px 28px', borderBottom: '1px solid #e2e8f0', background: '#fafbfc', flexShrink: 0 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#4a5568', display: 'block', marginBottom: 8 }}>
                Select Subjects * &nbsp;
                <span style={{ fontWeight: 400, color: '#a0aec0' }}>({bulkSubjects.length} selected)</span>
                &nbsp;
                <button type="button" onClick={() => setBulkSubjects([...SUBJECTS])} style={{ fontSize: 10, color: '#4361ee', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Select All</button>
                &nbsp;·&nbsp;
                <button type="button" onClick={() => setBulkSubjects([])} style={{ fontSize: 10, color: '#e53e3e', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Clear</button>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {SUBJECTS.map(sub => {
                  const checked = bulkSubjects.includes(sub);
                  return (
                    <label key={sub} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, border: `1.5px solid ${checked ? '#76C442' : '#e2e8f0'}`, background: checked ? '#f0fff4' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: checked ? 700 : 400, color: checked ? '#276749' : '#718096', userSelect: 'none', transition: 'all 0.15s' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleSubject(sub)} style={{ accentColor: '#76C442', cursor: 'pointer', width: 13, height: 13 }} />
                      {sub}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ── Entry grid ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 28px 16px' }}>
              {!bulkClassId ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0' }}>
                  <span className="material-icons" style={{ fontSize: 44 }}>class</span>
                  <p style={{ marginTop: 8 }}>Select a class above to see students</p>
                </div>
              ) : loadingBulkStudents ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0' }}>
                  <span className="material-icons" style={{ fontSize: 44 }}>hourglass_empty</span>
                  <p style={{ marginTop: 8 }}>Loading students...</p>
                </div>
              ) : bulkStudents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0' }}>
                  <span className="material-icons" style={{ fontSize: 44 }}>person_off</span>
                  <p style={{ marginTop: 8 }}>No students in this class</p>
                </div>
              ) : bulkSubjects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0' }}>
                  <span className="material-icons" style={{ fontSize: 44 }}>subject</span>
                  <p style={{ marginTop: 8 }}>Select at least one subject above</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', marginTop: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f7fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', minWidth: 200, position: 'sticky', left: 0, background: '#f7fafc', zIndex: 2 }}>
                          Student
                        </th>
                        {bulkSubjects.map(sub => (
                          <th key={sub} style={{ padding: '10px 10px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #e2e8f0', whiteSpace: 'nowrap', minWidth: 115 }}>
                            {sub}
                            <div style={{ fontSize: 10, color: '#a0aec0', fontWeight: 400, marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>
                              out of {bulkMaxMarks}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bulkStudents.map((student, idx) => (
                        <tr key={student.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafbfc' }}>
                          {/* Student name (sticky left) */}
                          <td style={{ padding: '9px 14px', borderBottom: '1px solid #f0f4f8', position: 'sticky', left: 0, background: idx % 2 === 0 ? '#fff' : '#fafbfc', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#76C44220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: '#76C442', flexShrink: 0 }}>
                                {getInitials(student.name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, fontSize: 13, color: '#2d3748', whiteSpace: 'nowrap' }}>{student.name}</div>
                                <div style={{ fontSize: 11, color: '#a0aec0' }}>{student.rollNumber || student.admissionNumber || '—'}</div>
                              </div>
                            </div>
                          </td>

                          {/* One input per subject */}
                          {bulkSubjects.map(sub => {
                            const val    = grid[student.id]?.[sub] ?? '';
                            const numVal = parseFloat(val);
                            const maxNum = parseFloat(bulkMaxMarks);
                            const isOver = val !== '' && !isNaN(numVal) && numVal > maxNum;
                            const grade  = val !== '' && !isNaN(numVal) && !isOver ? getGrade(numVal, maxNum) : '';
                            return (
                              <td key={sub} style={{ padding: '8px 10px', borderBottom: '1px solid #f0f4f8', textAlign: 'center', verticalAlign: 'middle' }}>
                                <input
                                  type="number"
                                  min="0"
                                  max={bulkMaxMarks}
                                  placeholder="—"
                                  value={val}
                                  onChange={e => updateCell(student.id, sub, e.target.value)}
                                  style={{
                                    width: 78, padding: '6px 8px', fontSize: 13, fontWeight: 600,
                                    textAlign: 'center',
                                    border: `1.5px solid ${isOver ? '#e53e3e' : val ? '#76C442' : '#e2e8f0'}`,
                                    borderRadius: 8, outline: 'none',
                                    background: isOver ? '#fff5f5' : val ? '#f0fff4' : '#fff',
                                    color: isOver ? '#e53e3e' : '#2d3748',
                                    transition: 'border-color 0.15s, background 0.15s',
                                  }}
                                />
                                {grade && (
                                  <div style={{ fontSize: 10, fontWeight: 700, marginTop: 3, color: gradeColors[grade] }}>
                                    {grade} · {Math.round((numVal / maxNum) * 100)}%
                                  </div>
                                )}
                                {isOver && (
                                  <div style={{ fontSize: 10, color: '#e53e3e', marginTop: 3 }}>exceeds max</div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* ── Modal footer ── */}
            <div style={{ padding: '14px 28px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0, background: '#fff' }}>
              <div style={{ fontSize: 12, color: '#718096' }}>
                {bulkStudents.length > 0 && bulkSubjects.length > 0 ? (
                  <span>
                    <strong style={{ color: '#4361ee' }}>{filledCount}</strong> of {bulkStudents.length * bulkSubjects.length} cells filled
                    &nbsp;·&nbsp; {bulkStudents.length} student{bulkStudents.length !== 1 ? 's' : ''} × {bulkSubjects.length} subject{bulkSubjects.length !== 1 ? 's' : ''}
                  </span>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ padding: '9px 22px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleBulkSave}
                  disabled={saving || !bulkClassId || bulkSubjects.length === 0 || filledCount === 0}
                  style={{
                    padding: '9px 24px',
                    background: (saving || !bulkClassId || bulkSubjects.length === 0 || filledCount === 0) ? '#a0aec0' : '#76C442',
                    color: '#fff', border: 'none', borderRadius: 9, fontWeight: 600, fontSize: 13,
                    cursor: (saving || !bulkClassId || bulkSubjects.length === 0 || filledCount === 0) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <span className="material-icons" style={{ fontSize: 17 }}>save</span>
                  {saving ? `Saving ${filledCount} records...` : `Save ${filledCount > 0 ? filledCount + ' Records' : 'All Marks'}`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </Layout>
  );
}
