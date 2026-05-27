import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { reportCardAPI } from '../../services/api';
import { BASE_URL } from '../../services/api';

const GRADE_COLOR = {
  O:   '#276749', 'A+': '#2b6cb0', A: '#3b5bdb',
  'B+':'#c05621', B: '#975a16', 'B-': '#92400e', C: '#c53030', F: '#9b2335',
};

const pct = (m, max) => (max > 0 ? Math.round((m / max) * 100) : 0);

export default function ReportCard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    reportCardAPI.getMyReportCard()
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load report card. Please try again.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <Layout pageTitle="Report Card">
      <div style={{ textAlign: 'center', padding: 80, color: '#718096' }}>
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
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '16px 24px 40px' }}>

        {/* Print button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }} className="no-print">
          <button onClick={() => window.print()}
            style={{ padding: '10px 24px', background: '#4299e1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="material-icons" style={{ fontSize: 18 }}>print</span> Print / Save PDF
          </button>
        </div>

        {/* Report Card */}
        <div id="report-card" style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.1)', padding: '32px 40px', fontFamily: 'Georgia, serif' }}>

          {/* School Header */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #2d3748', paddingBottom: 20, marginBottom: 24 }}>
            {logoSrc && (
              <img src={logoSrc} alt="School Logo"
                style={{ height: 72, objectFit: 'contain', marginBottom: 10, display: 'block', margin: '0 auto 10px' }}
                onError={e => { e.target.style.display = 'none'; }} />
            )}
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a202c' }}>{school.name || 'School Name'}</div>
            {school.board && <div style={{ fontSize: 13, color: '#718096', marginTop: 2 }}>{school.board} · Academic Year {school.academicYear || '—'}</div>}
            {school.address && <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>{school.address}</div>}
            {(school.phone || school.email) && (
              <div style={{ fontSize: 12, color: '#a0aec0' }}>
                {school.phone}{school.phone && school.email ? ' | ' : ''}{school.email}
              </div>
            )}
            <div style={{ marginTop: 12, fontSize: 16, fontWeight: 700, letterSpacing: 2, color: '#2d3748', textTransform: 'uppercase' }}>
              Progress Report Card
            </div>
          </div>

          {/* Student Info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24, fontSize: 13 }}>
            {[
              ['Student Name', student.name],
              ['Class / Section', student.className + (student.section ? ' – ' + student.section : '')],
              ['Roll Number', student.rollNumber],
              ['Admission No.', student.admissionNumber || '—'],
              ['Parent / Guardian', student.parentName || '—'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', gap: 8 }}>
                <span style={{ fontWeight: 700, color: '#4a5568', minWidth: 120 }}>{label}:</span>
                <span style={{ color: '#2d3748' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Attendance Summary */}
          <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 16px', marginBottom: 24, display: 'flex', gap: 32, fontSize: 13 }}>
            <span><strong>Total Days:</strong> {attendance.totalDays}</span>
            <span><strong>Present:</strong> {attendance.presentDays}</span>
            <span><strong>Attendance:</strong>
              <span style={{ color: attendance.percentage >= 75 ? '#276749' : '#c53030', fontWeight: 700, marginLeft: 4 }}>
                {attendance.percentage}%
              </span>
            </span>
          </div>

          {/* Marks by Exam Type */}
          {Object.entries(marksByExam).map(([examType, rows]) => {
            const total = rows.reduce((s, r) => s + (r.marks || 0), 0);
            const max   = rows.reduce((s, r) => s + (r.maxMarks || 0), 0);
            return (
              <div key={examType} style={{ marginBottom: 24 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>
                  {examType.replace(/_/g, ' ')}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Subject', 'Marks', 'Max Marks', 'Percentage', 'Grade'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#4a5568', border: '1px solid #e2e8f0' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => {
                      const p = pct(r.marks, r.maxMarks);
                      return (
                        <tr key={i}>
                          <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0' }}>{r.subject}</td>
                          <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0', fontWeight: 600 }}>{r.marks ?? '—'}</td>
                          <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0', color: '#718096' }}>{r.maxMarks ?? '—'}</td>
                          <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0' }}>{r.maxMarks ? `${p}%` : '—'}</td>
                          <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0', fontWeight: 700, color: GRADE_COLOR[r.grade] || '#2d3748' }}>{r.grade || '—'}</td>
                        </tr>
                      );
                    })}
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0' }}>Total</td>
                      <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0' }}>{total}</td>
                      <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0', color: '#718096' }}>{max}</td>
                      <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0', color: pct(total,max) >= 75 ? '#276749' : '#c53030' }}>{pct(total,max)}%</td>
                      <td style={{ padding: '7px 12px', border: '1px solid #e2e8f0' }} />
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Signature area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, paddingTop: 20, borderTop: '1px solid #e2e8f0', fontSize: 13 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #2d3748', paddingTop: 6, minWidth: 160 }}>Class Teacher</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #2d3748', paddingTop: 6, minWidth: 160 }}>Principal</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ borderTop: '1px solid #2d3748', paddingTop: 6, minWidth: 160 }}>Parent / Guardian</div>
            </div>
          </div>
        </div>

        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
            #report-card { box-shadow: none !important; border-radius: 0 !important; }
          }
        `}</style>
      </div>
    </Layout>
  );
}
