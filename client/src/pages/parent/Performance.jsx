import React, { useState } from 'react';
import Layout from '../../components/Layout';
import BarChartComponent from '../../components/Charts/BarChartComponent';

const subjectMarks = [
  { name: 'Math', marks: 84, max: 100 },
  { name: 'Science', marks: 76, max: 100 },
  { name: 'English', marks: 92, max: 100 },
  { name: 'Social', marks: 80, max: 100 },
  { name: 'Hindi', marks: 70, max: 100 },
  { name: 'Computer', marks: 88, max: 100 },
];

const allExams = [
  { id: 1, subject: 'Mathematics', exam: 'Unit Test 1', marks: 42, max: 50, grade: 'A', date: '15 Feb 2026', rank: 5 },
  { id: 2, subject: 'Mathematics', exam: 'Mid Term', marks: 78, max: 100, grade: 'A', date: '10 Jan 2026', rank: 8 },
  { id: 3, subject: 'Science', exam: 'Unit Test 1', marks: 38, max: 50, grade: 'B', date: '15 Feb 2026', rank: 12 },
  { id: 4, subject: 'English', exam: 'Unit Test 1', marks: 46, max: 50, grade: 'A+', date: '15 Feb 2026', rank: 3 },
  { id: 5, subject: 'English', exam: 'Mid Term', marks: 82, max: 100, grade: 'A+', date: '10 Jan 2026', rank: 2 },
  { id: 6, subject: 'Social Studies', exam: 'Unit Test 1', marks: 40, max: 50, grade: 'A', date: '16 Feb 2026', rank: 7 },
  { id: 7, subject: 'Hindi', exam: 'Unit Test 1', marks: 35, max: 50, grade: 'B', date: '16 Feb 2026', rank: 15 },
  { id: 8, subject: 'Computer Science', exam: 'Unit Test 1', marks: 44, max: 50, grade: 'A+', date: '17 Feb 2026', rank: 4 },
];

const Performance = () => {
  const [filterSubject, setFilterSubject] = useState('');

  const filtered = allExams.filter(e => !filterSubject || e.subject === filterSubject);
  const subjects = [...new Set(allExams.map(e => e.subject))];
  const overallPct = Math.round(subjectMarks.reduce((a, s) => a + (s.marks / s.max) * 100, 0) / subjectMarks.length);

  const gradeBg = { 'A+': '#f0fff4', 'A': '#f0fff4', 'B+': '#ebf8ff', 'B': '#ebf8ff', 'C': '#fffaf0', 'F': '#fff5f5' };
  const gradeColor = { 'A+': '#276749', 'A': '#276749', 'B+': '#2b6cb0', 'B': '#2b6cb0', 'C': '#c05621', 'F': '#c53030' };

  return (
    <Layout pageTitle="Performance">
      <div className="page-header">
            <h1>Academic Performance</h1>
            <p>Track Arjun Patel's academic progress across all subjects</p>
          </div>

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {[
              { label: 'Overall Score', value: `${overallPct}%`, color: '#76C442', icon: 'grade' },
              { label: 'Overall Grade', value: overallPct >= 90 ? 'A+' : overallPct >= 80 ? 'A' : overallPct >= 70 ? 'B+' : 'B', color: '#3182ce', icon: 'star' },
              { label: 'Class Rank', value: '5th', color: '#805ad5', icon: 'leaderboard' },
              { label: 'Best Subject', value: 'English', color: '#ed8936', icon: 'book' },
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Subject-wise Performance</div>
                  <div className="chart-card-subtitle">Marks percentage by subject</div>
                </div>
              </div>
              <BarChartComponent
                data={subjectMarks.map(s => ({ name: s.name, marks: Math.round((s.marks / s.max) * 100) }))}
                bars={[{ key: 'marks', name: 'Score %', color: '#76C442' }]}
                height={250}
              />
            </div>

            <div className="chart-card">
              <div className="chart-card-title" style={{ marginBottom: '16px' }}>Subject Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {subjectMarks.map(s => {
                  const pct = Math.round((s.marks / s.max) * 100);
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
                    <th>Rank</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(e => {
                    const pct = Math.round((e.marks / e.max) * 100);
                    return (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 600 }}>{e.subject}</td>
                        <td style={{ fontSize: '12px', color: '#718096' }}>{e.exam}</td>
                        <td style={{ fontWeight: 700 }}>{e.marks}/{e.max}</td>
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
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: gradeBg[e.grade], color: gradeColor[e.grade] }}>{e.grade}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: '13px', fontWeight: 700, color: e.rank <= 5 ? '#76C442' : '#718096' }}>
                            #{e.rank}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#a0aec0' }}>{e.date}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
      </div>
    </Layout>
  );
};

export default Performance;
