import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Layout from '../../components/Layout';
import { studentAPI } from '../../services/api';

const fmt = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const GRADE_COLOR = {
  O:   { bg: '#f0fff4', color: '#276749' },
  'A+':{ bg: '#ebf8ff', color: '#2b6cb0' },
  A:   { bg: '#e9f0ff', color: '#3b5bdb' },
  'B+':{ bg: '#fffaf0', color: '#c05621' },
  B:   { bg: '#fefcbf', color: '#975a16' },
  'B-':{ bg: '#fef3c7', color: '#92400e' },
  C:   { bg: '#fff5f5', color: '#c53030' },
  F:   { bg: '#fff5f5', color: '#9b2335' },
};

const EXAM_TYPE_LABEL = {
  UNIT_TEST:  'Unit Test',
  MIDTERM:    'Mid Term',
  FINAL:      'Final',
  QUARTERLY:  'Quarterly',
  HALFYEARLY: 'Half Yearly',
  ANNUAL:     'Annual',
};

const EXAM_TYPE_COLOR = {
  UNIT_TEST:  { bg: '#f0fff4', color: '#276749' },
  MIDTERM:    { bg: '#ebf8ff', color: '#2b6cb0' },
  FINAL:      { bg: '#fff5f5', color: '#c53030' },
  QUARTERLY:  { bg: '#fffaf0', color: '#c05621' },
  HALFYEARLY: { bg: '#faf5ff', color: '#6b46c1' },
  ANNUAL:     { bg: '#fff5f5', color: '#9b2335' },
};

const pct = (marks, max) => {
  if (!max || max === 0) return 0;
  return Math.round((marks / max) * 100);
};

const ProgressBar = ({ value }) => {
  const color = value >= 90 ? '#276749' : value >= 75 ? '#2b6cb0' : value >= 50 ? '#c05621' : '#c53030';
  return (
    <div style={{ background: '#e2e8f0', borderRadius: 8, height: 8, overflow: 'hidden', minWidth: 80 }}>
      <div style={{ width: `${Math.min(value, 100)}%`, background: color, height: '100%', borderRadius: 8, transition: 'width 0.6s ease' }} />
    </div>
  );
};

export default function StudentMarks() {
  const [marks, setMarks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [filterExam, setFilterExam] = useState('ALL');
  const [view, setView]             = useState('subject'); // 'subject' | 'exam' | 'trend'

  useEffect(() => {
    studentAPI.getMyMarks()
      .then(r => setMarks(r.data?.data || r.data || []))
      .catch(() => setError('Failed to load marks. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  const examTypes = ['ALL', ...Array.from(new Set(marks.map(m => m.examType).filter(Boolean)))];

  const filtered = filterExam === 'ALL' ? marks : marks.filter(m => m.examType === filterExam);

  // Group by subject
  const bySubject = filtered.reduce((acc, m) => {
    const key = m.subject || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // Group by exam type
  const byExam = filtered.reduce((acc, m) => {
    const key = m.examType || 'Unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  // Overall totals
  const totalObtained = filtered.reduce((s, m) => s + (m.marks || 0), 0);
  const totalMax      = filtered.reduce((s, m) => s + (m.maxMarks || 0), 0);
  const overallPct    = pct(totalObtained, totalMax);
  const overallGrade  = overallPct >= 90 ? 'O' : overallPct >= 80 ? 'A+' : overallPct >= 70 ? 'A'
    : overallPct >= 60 ? 'B+' : overallPct >= 50 ? 'B' : overallPct >= 40 ? 'B-'
    : overallPct >= 33 ? 'C' : 'F';

  return (
    <Layout>
      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1a202c', margin: 0 }}>My Marks</h1>
          <p style={{ color: '#718096', marginTop: 4, fontSize: 14 }}>View your marks by subject and exam</p>
        </div>

        {/* Grade Scale Legend */}
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 16px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#718096', marginRight: 4 }}>GRADE SCALE:</span>
          {[['O','90%+'],['A+','80%+'],['A','70%+'],['B+','60%+'],['B','50%+'],['B-','40%+'],['C','33%+'],['F','<33%']].map(([g, r]) => (
            <span key={g} style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 16, background: GRADE_COLOR[g]?.bg || '#f7fafc', color: GRADE_COLOR[g]?.color || '#4a5568' }}>
              {g} <span style={{ fontWeight: 400, opacity: 0.8 }}>{r}</span>
            </span>
          ))}
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
            <span className="material-icons" style={{ fontSize: 48, marginBottom: 12, display: 'block' }}>hourglass_top</span>
            Loading your marks...
          </div>
        )}

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #fed7d7', borderRadius: 10, padding: 16, color: '#c53030', marginBottom: 20 }}>
            <span className="material-icons" style={{ verticalAlign: 'middle', marginRight: 8 }}>error</span>
            {error}
          </div>
        )}

        {!loading && !error && marks.length === 0 && (
          <div style={{ textAlign: 'center', padding: 60, color: '#718096' }}>
            <span className="material-icons" style={{ fontSize: 56, marginBottom: 12, display: 'block', color: '#cbd5e0' }}>grade</span>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#4a5568' }}>No marks available yet</p>
            <p style={{ fontSize: 14 }}>Your teacher hasn't entered any marks yet. Check back after your exams.</p>
          </div>
        )}

        {!loading && !error && marks.length > 0 && (
          <>
            {/* Summary cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #4299e1' }}>
                <div style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>Total Marks</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2d3748' }}>{totalObtained}<span style={{ fontSize: 15, color: '#718096' }}>/{totalMax}</span></div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #48bb78' }}>
                <div style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>Overall %</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2d3748' }}>{overallPct}%</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #9f7aea' }}>
                <div style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>Overall Grade</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: GRADE_COLOR[overallGrade]?.color || '#2d3748' }}>{overallGrade}</div>
              </div>
              <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', borderLeft: '4px solid #ed8936' }}>
                <div style={{ fontSize: 13, color: '#718096', marginBottom: 4 }}>Subjects</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#2d3748' }}>{Object.keys(bySubject).length}</div>
              </div>
            </div>

            {/* Filters & View Toggle */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {examTypes.map(et => (
                  <button key={et} onClick={() => setFilterExam(et)}
                    style={{
                      padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                      background: filterExam === et ? '#4299e1' : '#edf2f7',
                      color: filterExam === et ? '#fff' : '#4a5568',
                    }}>
                    {et === 'ALL' ? 'All Exams' : (EXAM_TYPE_LABEL[et] || et)}
                  </button>
                ))}
              </div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {[
                  { key: 'subject', icon: 'subject',     label: 'By Subject' },
                  { key: 'exam',    icon: 'event',       label: 'By Exam' },
                  { key: 'trend',   icon: 'show_chart',  label: 'Trend' },
                ].map(v => (
                  <button key={v.key} onClick={() => setView(v.key)}
                    style={{ padding: '6px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', border: 'none',
                      background: view === v.key ? '#2d3748' : '#edf2f7',
                      color: view === v.key ? '#fff' : '#4a5568' }}>
                    <span className="material-icons" style={{ fontSize: 16, verticalAlign: 'middle', marginRight: 4 }}>{v.icon}</span>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── By Subject View ── */}
            {view === 'subject' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(bySubject).map(([subject, entries]) => {
                  const subTotal   = entries.reduce((s, e) => s + (e.marks || 0), 0);
                  const subMax     = entries.reduce((s, e) => s + (e.maxMarks || 0), 0);
                  const subPct     = pct(subTotal, subMax);
                  const bestGrade  = entries.reduce((best, e) => {
                    const order = ['O','A+','A','B+','B','B-','C','F'];
                    return order.indexOf(e.grade) < order.indexOf(best) ? e.grade : best;
                  }, 'F');

                  return (
                    <div key={subject} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                      {/* Subject header */}
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                        <span className="material-icons" style={{ color: '#4299e1', fontSize: 22 }}>menu_book</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, color: '#2d3748' }}>{subject}</div>
                          <div style={{ fontSize: 12, color: '#718096' }}>{entries.length} exam{entries.length > 1 ? 's' : ''}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#718096' }}>Total</div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: '#2d3748' }}>{subTotal}/{subMax}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#718096' }}>Percentage</div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: '#2d3748' }}>{subPct}%</div>
                          </div>
                          <div style={{ background: GRADE_COLOR[bestGrade]?.bg || '#f7fafc', color: GRADE_COLOR[bestGrade]?.color || '#2d3748',
                            padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 18 }}>
                            {bestGrade}
                          </div>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ padding: '8px 20px', background: '#f8fafc' }}>
                        <ProgressBar value={subPct} />
                      </div>

                      {/* Exam rows */}
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              {['Exam Type', 'Date', 'Marks', 'Max Marks', '%', 'Grade'].map(h => (
                                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#718096', borderBottom: '1px solid #edf2f7' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((e, i) => {
                              const p = pct(e.marks, e.maxMarks);
                              const gc = GRADE_COLOR[e.grade] || {};
                              const ec = EXAM_TYPE_COLOR[e.examType] || { bg: '#f7fafc', color: '#4a5568' };
                              return (
                                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                  <td style={{ padding: '12px 16px' }}>
                                    <span style={{ background: ec.bg, color: ec.color, padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                                      {EXAM_TYPE_LABEL[e.examType] || e.examType}
                                    </span>
                                  </td>
                                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#4a5568' }}>{fmt(e.examDate)}</td>
                                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 15, color: '#2d3748' }}>{e.marks ?? '—'}</td>
                                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#718096' }}>{e.maxMarks ?? '—'}</td>
                                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#2d3748' }}>{e.maxMarks ? `${p}%` : '—'}</td>
                                  <td style={{ padding: '12px 16px' }}>
                                    <span style={{ background: gc.bg || '#f7fafc', color: gc.color || '#2d3748', padding: '3px 12px', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
                                      {e.grade || '—'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── By Exam View ── */}
            {view === 'exam' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {Object.entries(byExam).map(([examType, entries]) => {
                  const examTotal = entries.reduce((s, e) => s + (e.marks || 0), 0);
                  const examMax   = entries.reduce((s, e) => s + (e.maxMarks || 0), 0);
                  const examPct   = pct(examTotal, examMax);
                  const ec        = EXAM_TYPE_COLOR[examType] || { bg: '#f7fafc', color: '#4a5568' };

                  return (
                    <div key={examType} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                      {/* Exam header */}
                      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                        background: ec.bg }}>
                        <span className="material-icons" style={{ color: ec.color, fontSize: 22 }}>event</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 16, color: ec.color }}>{EXAM_TYPE_LABEL[examType] || examType}</div>
                          <div style={{ fontSize: 12, color: '#718096' }}>{entries.length} subject{entries.length > 1 ? 's' : ''}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#718096' }}>Total</div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: '#2d3748' }}>{examTotal}/{examMax}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, color: '#718096' }}>Percentage</div>
                            <div style={{ fontWeight: 700, fontSize: 18, color: '#2d3748' }}>{examPct}%</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ padding: '8px 20px', background: '#f8fafc' }}>
                        <ProgressBar value={examPct} />
                      </div>

                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              {['Subject', 'Date', 'Marks', 'Max Marks', '%', 'Grade'].map(h => (
                                <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#718096', borderBottom: '1px solid #edf2f7' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {entries.map((e, i) => {
                              const p  = pct(e.marks, e.maxMarks);
                              const gc = GRADE_COLOR[e.grade] || {};
                              return (
                                <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#2d3748' }}>{e.subject || '—'}</td>
                                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#4a5568' }}>{fmt(e.examDate)}</td>
                                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 15, color: '#2d3748' }}>{e.marks ?? '—'}</td>
                                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#718096' }}>{e.maxMarks ?? '—'}</td>
                                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#2d3748' }}>{e.maxMarks ? `${p}%` : '—'}</td>
                                  <td style={{ padding: '12px 16px' }}>
                                    <span style={{ background: gc.bg || '#f7fafc', color: gc.color || '#2d3748', padding: '3px 12px', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
                                      {e.grade || '—'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                            {/* Total row */}
                            <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                              <td style={{ padding: '12px 16px', color: '#2d3748' }}>Total</td>
                              <td style={{ padding: '12px 16px' }} />
                              <td style={{ padding: '12px 16px', fontSize: 15, color: '#2d3748' }}>{examTotal}</td>
                              <td style={{ padding: '12px 16px', color: '#718096' }}>{examMax}</td>
                              <td style={{ padding: '12px 16px', color: '#2d3748' }}>{examPct}%</td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{ background: GRADE_COLOR[overallGrade]?.bg, color: GRADE_COLOR[overallGrade]?.color, padding: '3px 12px', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
                                  {overallGrade}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* ── Trend View ── */}
            {view === 'trend' && (() => {
              const COLORS = ['#4299e1','#48bb78','#ed8936','#9f7aea','#f56565','#38b2ac','#dd6b20','#805ad5'];
              const subjects = Object.keys(bySubject);
              const examOrder = ['UNIT_TEST','QUARTERLY','MIDTERM','HALFYEARLY','FINAL','ANNUAL'];
              const allExams = Array.from(new Set(marks.map(m => m.examType).filter(Boolean)))
                .sort((a, b) => examOrder.indexOf(a) - examOrder.indexOf(b));

              const chartData = allExams.map(et => {
                const point = { exam: EXAM_TYPE_LABEL[et] || et };
                subjects.forEach(sub => {
                  const entry = marks.find(m => m.examType === et && m.subject === sub);
                  point[sub] = entry ? pct(entry.marks, entry.maxMarks) : null;
                });
                return point;
              });

              return (
                <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', padding: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: '#2d3748', marginBottom: 20 }}>
                    Academic Performance Trend
                  </div>
                  {chartData.length < 2 ? (
                    <div style={{ textAlign: 'center', color: '#718096', padding: 40 }}>
                      Not enough exam data to show a trend. You need marks from at least 2 different exam types.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={340}>
                      <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="exam" tick={{ fontSize: 13 }} />
                        <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 12 }} />
                        <Tooltip formatter={(v) => v !== null ? `${v}%` : '—'} />
                        <Legend />
                        {subjects.map((sub, i) => (
                          <Line key={sub} type="monotone" dataKey={sub}
                            stroke={COLORS[i % COLORS.length]}
                            strokeWidth={2} dot={{ r: 4 }}
                            connectNulls={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
    </Layout>
  );
}
