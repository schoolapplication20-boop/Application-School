import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { reportCardAPI, gradeScaleAPI } from '../../services/api';
import { BASE_URL } from '../../services/api';

const GRADE_COLOR = {
  O:   '#276749', 'A+': '#2b6cb0', A: '#3b5bdb',
  'B+':'#c05621', B: '#975a16', 'B-': '#92400e', C: '#c53030', F: '#9b2335',
};

const pct = (m, max) => (max > 0 ? Math.round((m / max) * 100) : 0);

/** Derive overall grade from a percentage using a sorted grade scale array. */
const overallGradeFromPct = (percentage, scale) => {
  const sorted = [...(scale || [])].sort((a, b) => b.minPercentage - a.minPercentage);
  if (!sorted.length) {
    if (percentage >= 90) return 'O';
    if (percentage >= 80) return 'A+';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B+';
    if (percentage >= 50) return 'B';
    if (percentage >= 40) return 'B-';
    if (percentage >= 33) return 'C';
    return 'F';
  }
  const entry = sorted.find(s => percentage >= Number(s.minPercentage));
  return entry ? entry.grade : sorted[sorted.length - 1]?.grade || 'F';
};

const handlePrint = () => {
  document.body.classList.add('printing-report-card');
  window.print();
  const cleanup = () => {
    document.body.classList.remove('printing-report-card');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
};

export default function ReportCard() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [examTypes,     setExamTypes]     = useState([]);
  const [selected,      setSelected]      = useState(null); // null = not yet resolved
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [gradeScale,    setGradeScale]    = useState([]);

  useEffect(() => {
    gradeScaleAPI.forStudent().then(r => setGradeScale(r.data?.data || [])).catch(() => {});
  }, []);

  // Load available exam types first
  useEffect(() => {
    reportCardAPI.getMyFilters()
      .then(r => {
        const types = r.data?.data?.examTypes || [];
        setExamTypes(types);
        setSelected(types.length > 0 ? types[0] : '');
      })
      .catch(() => setSelected(''))
      .finally(() => setFiltersLoaded(true));
  }, []);

  // Load report card once filters are resolved
  useEffect(() => {
    if (!filtersLoaded) return;
    setLoading(true);
    setError('');
    reportCardAPI.getMyReportCard(selected || null)
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load report card. Please try again.'))
      .finally(() => setLoading(false));
  }, [selected, filtersLoaded]);

  if (loading) return (
    <Layout pageTitle="Report Card">
      <div style={{ textAlign: 'center', padding: 80, color: 'var(--text-secondary)' }}>
        <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_top</span>
        Loading report card…
      </div>
    </Layout>
  );

  if (error || !data) return (
    <Layout pageTitle="Report Card">
      <div style={{ textAlign: 'center', padding: 80, color: '#c53030' }}>
        <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>error</span>
        {error || 'No report card data available.'}
      </div>
    </Layout>
  );

  const { student, school, marksByExam, attendance } = data;
  const logoSrc = school.logoUrl
    ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${BASE_URL}${school.logoUrl}`)
    : null;

  return (
    <Layout pageTitle="Report Card">
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm;
          }
          body.printing-report-card * { visibility: hidden; }
          body.printing-report-card #report-card,
          body.printing-report-card #report-card * { visibility: visible; }
          body.printing-report-card #report-card {
            position: fixed;
            top: 0; left: 0; right: 0;
            width: 180mm;
            max-width: 180mm;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 10mm 0 0 0 !important;
            margin: 0 !important;
            font-size: 10pt;
            line-height: 1.4;
          }
          body.printing-report-card table { page-break-inside: avoid; }
          body.printing-report-card tr    { page-break-inside: avoid; }
        }
      `}</style>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px 16px 40px' }}>

        {/* Controls bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }} className="no-print">
          {/* Exam type selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Exam:</label>
            {examTypes.length > 0 ? (
              <select value={selected} onChange={e => setSelected(e.target.value)}
                style={{ padding: '8px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', background: 'var(--surface)', cursor: 'pointer' }}>
                {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
              </select>
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>No exams recorded yet</span>
            )}
          </div>
          <button onClick={handlePrint}
            style={{ padding: '9px 20px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-icons" style={{ fontSize: 17 }}>print</span> Print / Save PDF
          </button>
        </div>

        {/* Report Card */}
        <div id="report-card" style={{ background: 'var(--surface)', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', padding: '28px 24px', fontFamily: 'Georgia, serif' }}>

          {/* School Header */}
          <div style={{ borderBottom: '2px solid #2d3748', paddingBottom: 16, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 10 }}>
              {logoSrc && (
                <img src={logoSrc} alt="School Logo"
                  style={{ height: 64, width: 64, objectFit: 'contain', flexShrink: 0 }}
                  onError={e => { e.target.style.display = 'none'; }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{school.name || 'School Name'}</div>
                {school.board && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{school.board} · Academic Year {school.academicYear || '—'}</div>}
                {school.address && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{school.address}</div>}
                {(school.phone || school.email) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {school.phone}{school.phone && school.email ? ' | ' : ''}{school.email}
                  </div>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, letterSpacing: 2, color: 'var(--text-primary)', textTransform: 'uppercase', borderTop: '1px solid var(--border-strong)', paddingTop: 10 }}>
              Progress Report Card{selected ? ` — ${selected}` : ''}
            </div>
          </div>

          {/* Student Info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 20, fontSize: 13 }}>
            {[
              ['Student Name', student.name],
              ['Class / Section', student.className + (student.section ? ' – ' + student.section : '')],
              ['Roll Number', student.rollNumber],
              ['Admission No.', student.admissionNumber || '—'],
              ['Parent / Guardian', student.parentName || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontWeight: 700, color: 'var(--text-secondary)', minWidth: 110, fontSize: 12 }}>{label}:</span>
                <span style={{ color: 'var(--text-primary)' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Attendance Summary */}
          <div style={{ background: 'var(--surface-alt)', borderRadius: 8, padding: '10px 14px', marginBottom: 20, display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 13 }}>
            <span><strong>Total Days:</strong> {attendance.totalDays}</span>
            <span><strong>Present:</strong> {attendance.presentDays}</span>
            <span><strong>Attendance:</strong>
              <span style={{ color: attendance.percentage >= 75 ? '#276749' : '#c53030', fontWeight: 700, marginLeft: 4 }}>
                {attendance.percentage}%
              </span>
            </span>
          </div>

          {/* Marks by Exam Type */}
          {Object.keys(marksByExam).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>grade</span>
              No marks recorded for {selected ? `"${selected}"` : 'this exam'}.
            </div>
          ) : (
            Object.entries(marksByExam).map(([examType, rows]) => {
              const total      = rows.reduce((s, r) => s + (r.marks    || 0), 0);
              const max        = rows.reduce((s, r) => s + (r.maxMarks || 0), 0);
              const overallPct = pct(total, max);
              const hasFail    = rows.some(r => r.grade === 'F' || (r.maxMarks > 0 && pct(r.marks, r.maxMarks) < 33));
              const result     = hasFail ? 'FAIL' : 'PASS';
              const oGrade     = overallGradeFromPct(overallPct, gradeScale);
              return (
                <div key={examType} style={{ marginBottom: 24 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 8, borderBottom: '1px solid var(--border-strong)', paddingBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{examType.replace(/_/g, ' ')}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 12, background: result === 'PASS' ? '#f0fff4' : '#fff5f5', color: result === 'PASS' ? '#276749' : '#c53030', border: `1px solid ${result === 'PASS' ? '#68d391' : '#fc8181'}` }}>
                      {result}
                    </span>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: 'var(--surface-alt)' }}>
                          {['Subject', 'Marks', 'Max Marks', 'Percentage', 'Grade'].map(h => (
                            <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 700, color: 'var(--text-secondary)', border: '1px solid var(--border-strong)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => {
                          const p = pct(r.marks, r.maxMarks);
                          const isFail = r.grade === 'F' || (r.maxMarks > 0 && p < 33);
                          return (
                            <tr key={i} style={{ background: isFail ? '#fff5f5' : undefined }}>
                              <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)' }}>{r.subject}</td>
                              <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', fontWeight: 600 }}>{r.marks ?? '—'}</td>
                              <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}>{r.maxMarks ?? '—'}</td>
                              <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', color: isFail ? '#c53030' : 'inherit' }}>{r.maxMarks ? `${p}%` : '—'}</td>
                              <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', fontWeight: 700, color: GRADE_COLOR[r.grade] || '#2d3748' }}>{r.grade || '—'}</td>
                            </tr>
                          );
                        })}
                        {/* Totals row */}
                        <tr style={{ background: 'var(--surface-alt)', fontWeight: 700 }}>
                          <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)' }}>Total</td>
                          <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)' }}>{total}</td>
                          <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', color: 'var(--text-secondary)' }}>{max}</td>
                          <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', color: overallPct >= 33 ? '#276749' : '#c53030' }}>{overallPct}%</td>
                          <td style={{ padding: '6px 10px', border: '1px solid var(--border-strong)', fontWeight: 700, color: GRADE_COLOR[oGrade] || '#2d3748' }}>{oGrade}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          )}

          {/* Signature area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 16, borderTop: '1px solid var(--border-strong)', fontSize: 12, flexWrap: 'wrap', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #2d3748', paddingTop: 6, minWidth: 140 }}>Class Teacher</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #2d3748', paddingTop: 6, minWidth: 140 }}>Principal</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #2d3748', paddingTop: 6, minWidth: 140 }}>Parent / Guardian</div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
