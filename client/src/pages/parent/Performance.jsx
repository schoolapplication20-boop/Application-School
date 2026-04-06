import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import BarChartComponent from '../../components/Charts/BarChartComponent';
import { useAuth } from '../../context/AuthContext';
import { parentAPI } from '../../services/api';

const gradeBg    = { 'A+': '#f0fff4', 'A': '#f0fff4', 'B+': '#ebf8ff', 'B': '#ebf8ff', 'C': '#fffaf0', 'F': '#fff5f5' };
const gradeColor = { 'A+': '#276749', 'A': '#276749', 'B+': '#2b6cb0', 'B': '#2b6cb0', 'C': '#c05621', 'F': '#c53030' };

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function Performance() {
  const { user } = useAuth();
  const [child,         setChild]         = useState(null);
  const [marks,         setMarks]         = useState([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    parentAPI.getMyChildren()
      .then(res => {
        const list = res.data?.data ?? [];
        const c = list[0] ?? null;
        setChild(c);
        if (!c?.id) { setLoading(false); return; }
        return parentAPI.getChildMarks(c.id);
      })
      .then(res => {
        if (res) setMarks(res.data?.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Build per-subject aggregates from real marks
  const subjectMap = {};
  marks.forEach(m => {
    if (!m.subject) return;
    if (!subjectMap[m.subject]) subjectMap[m.subject] = { marks: 0, max: 0 };
    subjectMap[m.subject].marks += (m.marks || 0);
    subjectMap[m.subject].max   += (m.maxMarks || 0);
  });
  const subjectMarks = Object.entries(subjectMap).map(([name, v]) => ({ name, marks: v.marks, max: v.max }));

  const overallPct = subjectMarks.length > 0
    ? Math.round(subjectMarks.reduce((a, s) => a + (s.max > 0 ? (s.marks / s.max) * 100 : 0), 0) / subjectMarks.length)
    : 0;

  const overallGrade = overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' : overallPct >= 60 ? 'B' : 'C';

  const bestSubject = subjectMarks.reduce((best, s) => {
    const pct = s.max > 0 ? (s.marks / s.max) * 100 : 0;
    return pct > (best.pct || 0) ? { name: s.name, pct } : best;
  }, {}).name || '—';

  const subjects = [...new Set(marks.map(m => m.subject).filter(Boolean))];
  const filtered = marks.filter(m => !filterSubject || m.subject === filterSubject);

  if (loading) {
    return (
      <Layout pageTitle="Performance">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
          Loading…
        </div>
      </Layout>
    );
  }

  if (!child) {
    return (
      <Layout pageTitle="Performance">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span className="material-icons" style={{ fontSize: 64, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>child_care</span>
          <p style={{ color: '#a0aec0', fontSize: 13 }}>No child linked to your account.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Performance">
      <div className="page-header">
        <h1>Academic Performance</h1>
        <p>Track {child.name}'s academic progress across all subjects</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Overall Score', value: marks.length > 0 ? `${overallPct}%` : '—', color: '#76C442', icon: 'grade' },
          { label: 'Overall Grade', value: marks.length > 0 ? overallGrade : '—',       color: '#3182ce', icon: 'star' },
          { label: 'Total Exams',   value: marks.length,                                 color: '#805ad5', icon: 'leaderboard' },
          { label: 'Best Subject',  value: bestSubject,                                  color: '#ed8936', icon: 'book' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: s.color + '15' }}>
              <span className="material-icons" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {marks.length === 0 ? (
        <div className="data-table-card" style={{ textAlign: 'center', padding: '60px 20px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>grade</span>
          No marks recorded yet
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Subject-wise Performance</div>
                  <div className="chart-card-subtitle">Marks percentage by subject</div>
                </div>
              </div>
              <BarChartComponent
                data={subjectMarks.map(s => ({ name: s.name, marks: s.max > 0 ? Math.round((s.marks / s.max) * 100) : 0 }))}
                bars={[{ key: 'marks', name: 'Score %', color: '#76C442' }]}
                height={250}
              />
            </div>

            <div className="chart-card">
              <div className="chart-card-title" style={{ marginBottom: '16px' }}>Subject Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {subjectMarks.map(s => {
                  const pct = s.max > 0 ? Math.round((s.marks / s.max) * 100) : 0;
                  const color = pct >= 90 ? '#76C442' : pct >= 75 ? '#3182ce' : pct >= 60 ? '#ed8936' : '#e53e3e';
                  return (
                    <div key={s.name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568' }}>{s.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: color }}>{pct}%</span>
                      </div>
                      <div className="progress-bar-custom">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}cc)` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="data-table-card">
            <div className="search-filter-bar">
              <div className="data-table-title" style={{ flex: 1 }}>Detailed Score Card</div>
              <select className="filter-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}>
                <option value="">All Subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Exam</th>
                    <th>Marks</th>
                    <th>Percentage</th>
                    <th>Grade</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtered].sort((a, b) => new Date(b.examDate || 0) - new Date(a.examDate || 0)).map(m => {
                    const pct = m.maxMarks > 0 ? Math.round((m.marks / m.maxMarks) * 100) : 0;
                    return (
                      <tr key={m.id}>
                        <td style={{ fontWeight: 600 }}>{m.subject}</td>
                        <td style={{ fontSize: '12px', color: '#718096' }}>{m.examType || '—'}</td>
                        <td style={{ fontWeight: 700 }}>{m.marks}/{m.maxMarks}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '50px' }}>
                              <div className="progress-bar-custom">
                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: gradeBg[m.grade] || '#f7fafc', color: gradeColor[m.grade] || '#4a5568' }}>
                            {m.grade || '—'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#a0aec0' }}>{fmtDate(m.examDate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
