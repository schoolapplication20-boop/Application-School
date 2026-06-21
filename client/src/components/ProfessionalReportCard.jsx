import React from 'react';
import { BASE_URL } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Shared A4 portrait Progress Report Card
// Used by: Student Portal, Teacher Portal, Admin Portal, Parent Portal, Print
// ─────────────────────────────────────────────────────────────────────────────

const BLUE      = '#1d4ed8';
const DARK_BLUE = '#1e3a8a';
const LIGHT_BG  = '#eff6ff';
const BORDER    = '#bfdbfe';

const GRADE_STYLE = {
  O:    { color: '#14532d', bg: '#dcfce7', border: '#86efac' },
  'A+': { color: '#1e3a8a', bg: '#dbeafe', border: '#93c5fd' },
  A:    { color: '#1e40af', bg: '#e0f2fe', border: '#7dd3fc' },
  'B+': { color: '#78350f', bg: '#fef3c7', border: '#fcd34d' },
  B:    { color: '#7c2d12', bg: '#ffedd5', border: '#fdba74' },
  'B-': { color: '#4c1d95', bg: '#ede9fe', border: '#c4b5fd' },
  C:    { color: '#9a3412', bg: '#fff7ed', border: '#fb923c' },
  D:    { color: '#713f12', bg: '#fef9c3', border: '#fde047' },
  F:    { color: '#7f1d1d', bg: '#fee2e2', border: '#fca5a5' },
};

const DEFAULT_GRADE_SCALE = [
  { range: '91 – 100', grade: 'O',  label: 'Outstanding' },
  { range: '81 – 90',  grade: 'A+', label: 'Excellent' },
  { range: '71 – 80',  grade: 'A',  label: 'Very Good' },
  { range: '61 – 70',  grade: 'B+', label: 'Good' },
  { range: '51 – 60',  grade: 'B',  label: 'Above Average' },
  { range: '41 – 50',  grade: 'C',  label: 'Average' },
  { range: '35 – 40',  grade: 'D',  label: 'Below Average' },
  { range: 'Below 35', grade: 'F',  label: 'Fail' },
];

const p = (marks, max) => (max > 0 ? Math.round((marks / max) * 100) : 0);

const gradeFromPct = (pct, scale) => {
  const sorted = [...(scale || [])].sort((a, b) => Number(b.minPercentage) - Number(a.minPercentage));
  if (sorted.length) {
    const entry = sorted.find(s => pct >= Number(s.minPercentage));
    return entry ? entry.grade : sorted[sorted.length - 1]?.grade || 'F';
  }
  if (pct >= 91) return 'O';
  if (pct >= 81) return 'A+';
  if (pct >= 71) return 'A';
  if (pct >= 61) return 'B+';
  if (pct >= 51) return 'B';
  if (pct >= 41) return 'C';
  if (pct >= 35) return 'D';
  return 'F';
};

const isFailing = (r) => r.grade === 'F' || (r.maxMarks > 0 && p(r.marks, r.maxMarks) < 35);

const GradeChip = ({ grade }) => {
  const s = GRADE_STYLE[grade] || { color: '#374151', bg: '#f3f4f6', border: '#d1d5db' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: 4,
      fontWeight: 800, fontSize: 12, letterSpacing: 0.3,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>{grade || '—'}</span>
  );
};

const SectionHeader = ({ title }) => (
  <div style={{
    background: BLUE, padding: '5px 14px', display: 'flex', alignItems: 'center',
  }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
      {title}
    </span>
  </div>
);

const Card = ({ title, children, style = {} }) => (
  <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden', ...style }}>
    {title && <SectionHeader title={title} />}
    {children}
  </div>
);

// ── Print styles injected once ──────────────────────────────────────────────
const PRINT_CSS = `
  @media print {
    @page { size: A4 portrait; margin: 8mm 10mm; }
    .rc-no-print   { display: none !important; }
    .rc-outer-wrap { box-shadow: none !important; border: 2px solid #1d4ed8 !important; }
    body > * { visibility: hidden; }
    .rc-print-root,
    .rc-print-root * { visibility: visible !important; }
    .rc-print-root {
      position: fixed; top: 0; left: 0; right: 0;
      width: 190mm; max-width: 190mm;
      font-size: 10pt;
    }
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfessionalReportCard({ data, gradeScale = [], examFilter = '', onPrint, printId = 'rc-print-root' }) {
  if (!data) return null;

  const { student = {}, school = {}, marksByExam = {}, attendance = {} } = data;

  const logoSrc = school.logoUrl
    ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${BASE_URL}${school.logoUrl}`)
    : null;

  // Aggregate across all exam sections in the filtered view
  const allRows    = Object.values(marksByExam).flat();
  const grandTotal = allRows.reduce((s, r) => s + Number(r.marks    || 0), 0);
  const grandMax   = allRows.reduce((s, r) => s + Number(r.maxMarks || 0), 0);
  const overallPct = p(grandTotal, grandMax);
  const overallGrade  = gradeFromPct(overallPct, gradeScale);
  const anyFail       = allRows.some(isFailing);
  const finalResult   = grandMax > 0 ? (anyFail ? 'FAIL' : 'PASS') : '—';
  const absentDays    = Number(attendance.totalDays || 0) - Number(attendance.presentDays || 0);

  const td = (extra = {}) => ({
    padding: '6px 9px', borderBottom: '1px solid #e5e7eb', ...extra,
  });

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* Screen-only controls */}
      {onPrint && (
        <div className="rc-no-print" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button onClick={onPrint} style={{
            padding: '9px 22px', background: BLUE, color: '#fff', border: 'none',
            borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <span className="material-icons" style={{ fontSize: 17 }}>print</span> Print / Save PDF
          </button>
        </div>
      )}

      {/* ── Report Card Body ── */}
      <div id={printId} className="rc-print-root"
        style={{ maxWidth: 800, margin: '0 auto', fontFamily: '"Segoe UI", Arial, sans-serif' }}>
        <div className="rc-outer-wrap" style={{
          background: '#fff', border: `2px solid ${BLUE}`, borderRadius: 8,
          overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}>

          {/* ── HEADER ─────────────────────────────────────────────────────── */}
          <div style={{ borderBottom: `3px double ${BLUE}`, padding: '16px 20px 12px', background: '#fff' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

              {/* Logo */}
              <div style={{ flexShrink: 0, width: 76, height: 76, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {logoSrc ? (
                  <img src={logoSrc} alt="Logo"
                    style={{ width: 76, height: 76, objectFit: 'contain' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{
                    width: 76, height: 76, background: LIGHT_BG, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: BLUE, fontWeight: 900, fontSize: 24, border: `2px solid ${BORDER}`,
                  }}>
                    {school.name?.charAt(0) || 'S'}
                  </div>
                )}
              </div>

              {/* School Details */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: DARK_BLUE, letterSpacing: 0.5, lineHeight: 1.2 }}>
                  {school.name || 'School Name'}
                </div>
                {school.board && (
                  <div style={{ fontSize: 11, color: BLUE, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {school.board} Affiliated
                  </div>
                )}
                {school.address && (
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 3 }}>{school.address}</div>
                )}
                <div style={{ fontSize: 11, color: '#4b5563', marginTop: 2 }}>
                  {[
                    school.phone  && `Ph: ${school.phone}`,
                    school.email  && `Email: ${school.email}`,
                    school.website,
                  ].filter(Boolean).join('  •  ')}
                </div>
                {school.affiliationNumber && (
                  <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                    Affiliation No: {school.affiliationNumber}
                  </div>
                )}
              </div>

              {/* Academic Year Box */}
              <div style={{
                flexShrink: 0, border: `2px solid ${BLUE}`, borderRadius: 6,
                padding: '7px 14px', textAlign: 'center', minWidth: 88,
                background: LIGHT_BG,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Academic Year
                </div>
                <div style={{ fontSize: 14, fontWeight: 900, color: DARK_BLUE, marginTop: 3 }}>
                  {school.academicYear || '—'}
                </div>
              </div>
            </div>

            {/* Report Title */}
            <div style={{ textAlign: 'center', marginTop: 12, paddingTop: 10, borderTop: `1.5px solid ${BORDER}` }}>
              <div style={{
                fontSize: 15, fontWeight: 900, letterSpacing: 4, color: DARK_BLUE,
                textTransform: 'uppercase',
              }}>
                Progress Report Card
              </div>
              {examFilter && (
                <div style={{ fontSize: 12, color: BLUE, fontWeight: 700, marginTop: 4, letterSpacing: 1 }}>
                  — {examFilter} —
                </div>
              )}
            </div>
          </div>

          <div style={{ padding: '14px 20px 18px' }}>

            {/* ── STUDENT INFORMATION ─────────────────────────────────────── */}
            <Card title="Student Information" style={{ marginBottom: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 14px', gap: '8px 24px', background: '#fff' }}>
                {[
                  ['Student Name',       student.name],
                  ['Admission Number',   student.admissionNumber || '—'],
                  ['Roll Number',        student.rollNumber      || '—'],
                  ['Date of Birth',      student.dateOfBirth    || '—'],
                  ['Class & Section',    `${student.className || '—'}${student.section ? ' – ' + student.section : ''}`],
                  ['Parent / Guardian',  student.parentName     || '—'],
                ].map(([label, value]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5563', minWidth: 130, flexShrink: 0 }}>
                      {label}:
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{value}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── ATTENDANCE ──────────────────────────────────────────────── */}
            <Card title="Attendance Summary" style={{ marginBottom: 12 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: LIGHT_BG }}>
                    {['Total Working Days', 'Present Days', 'Absent Days', 'Attendance Percentage'].map(h => (
                      <th key={h} style={{ padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: DARK_BLUE, borderBottom: `1px solid ${BORDER}`, fontSize: 11 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ ...td(), textAlign: 'center', fontWeight: 600 }}>{attendance.totalDays ?? '—'}</td>
                    <td style={{ ...td(), textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{attendance.presentDays ?? '—'}</td>
                    <td style={{ ...td(), textAlign: 'center', fontWeight: 700, color: '#dc2626' }}>
                      {attendance.totalDays != null && attendance.presentDays != null ? absentDays : '—'}
                    </td>
                    <td style={{ ...td(), textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 900, fontSize: 14,
                        color: Number(attendance.percentage) >= 75 ? '#16a34a' : '#dc2626',
                      }}>
                        {Number(attendance.percentage || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>

            {/* ── MARKS TABLES ────────────────────────────────────────────── */}
            {Object.keys(marksByExam).length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: 13,
                border: '1px dashed #d1d5db', borderRadius: 6, marginBottom: 12,
              }}>
                No marks recorded for this examination.
              </div>
            ) : Object.entries(marksByExam).map(([examType, rows]) => {
              const etTotal = rows.reduce((s, r) => s + Number(r.marks    || 0), 0);
              const etMax   = rows.reduce((s, r) => s + Number(r.maxMarks || 0), 0);
              const etPct   = p(etTotal, etMax);
              const etGrade = gradeFromPct(etPct, gradeScale);
              const etFail  = rows.some(isFailing);
              const gs      = GRADE_STYLE[etGrade] || { color: '#374151', bg: '#f3f4f6', border: '#d1d5db' };
              return (
                <div key={examType} style={{ border: `1.5px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                  <div style={{ background: BLUE, padding: '5px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Subject-wise Marks — {examType}
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 800, padding: '2px 12px', borderRadius: 20,
                      background: etFail ? '#dc2626' : '#16a34a', color: '#fff', letterSpacing: 1,
                    }}>
                      {etFail ? 'FAIL' : 'PASS'}
                    </span>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: LIGHT_BG }}>
                        {['S.No.', 'Subject', 'Marks Obtained', 'Maximum Marks', 'Percentage (%)', 'Grade', 'Result'].map(h => (
                          <th key={h} style={{
                            padding: '7px 8px', textAlign: h === 'Subject' ? 'left' : 'center',
                            fontWeight: 700, color: DARK_BLUE,
                            borderBottom: `1.5px solid ${BORDER}`, fontSize: 11,
                          }}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const subPct  = p(r.marks, r.maxMarks);
                        const fail    = isFailing(r);
                        return (
                          <tr key={i} style={{ background: fail ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#f8faff' }}>
                            <td style={{ ...td(), textAlign: 'center', color: '#9ca3af', fontSize: 11 }}>{i + 1}</td>
                            <td style={{ ...td({ fontWeight: 600 }), color: fail ? '#991b1b' : '#111827' }}>
                              {r.subject}
                            </td>
                            <td style={{ ...td({ textAlign: 'center', fontWeight: 800, fontSize: 13, color: DARK_BLUE }) }}>
                              {r.marks ?? '—'}
                            </td>
                            <td style={{ ...td({ textAlign: 'center', color: '#4b5563' }) }}>
                              {r.maxMarks ?? '—'}
                            </td>
                            <td style={{ ...td({ textAlign: 'center', fontWeight: 700, color: fail ? '#dc2626' : subPct >= 75 ? '#16a34a' : '#374151' }) }}>
                              {r.maxMarks > 0 ? `${subPct}%` : '—'}
                            </td>
                            <td style={{ ...td({ textAlign: 'center' }) }}>
                              <GradeChip grade={r.grade} />
                            </td>
                            <td style={{ ...td({ textAlign: 'center', fontWeight: 700, fontSize: 11 }), color: fail ? '#dc2626' : '#16a34a' }}>
                              {r.maxMarks > 0 ? (fail ? 'FAIL' : 'PASS') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr style={{ background: '#dbeafe', borderTop: `2px solid ${BORDER}` }}>
                        <td colSpan={2} style={{ padding: '7px 10px', fontWeight: 900, color: DARK_BLUE, fontSize: 12 }}>
                          TOTAL
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 900, fontSize: 14, color: DARK_BLUE }}>
                          {etTotal}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: '#374151', fontWeight: 700 }}>
                          {etMax}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 900, color: etFail ? '#dc2626' : '#16a34a', fontSize: 13 }}>
                          {etPct}%
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 4, fontWeight: 900, fontSize: 13, background: gs.bg, color: gs.color, border: `1px solid ${gs.border}` }}>
                            {etGrade}
                          </span>
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 900, color: etFail ? '#dc2626' : '#16a34a' }}>
                          {etFail ? 'FAIL' : 'PASS'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })}

            {/* ── ACADEMIC SUMMARY ────────────────────────────────────────── */}
            {grandMax > 0 && (
              <Card title="Academic Summary" style={{ marginBottom: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', background: '#fff' }}>
                  {[
                    { label: 'Total Marks',    value: grandTotal,    color: DARK_BLUE, big: false },
                    { label: 'Maximum Marks',  value: grandMax,      color: '#374151', big: false },
                    { label: 'Percentage',     value: `${overallPct}%`, color: anyFail ? '#dc2626' : '#16a34a', big: true },
                    { label: 'Overall Grade',  value: overallGrade,  color: (GRADE_STYLE[overallGrade] || {}).color || DARK_BLUE, big: true },
                    { label: 'Final Result',   value: finalResult,   color: finalResult === 'PASS' ? '#16a34a' : '#dc2626', big: true },
                  ].map(({ label, value, color, big }, i) => (
                    <div key={label} style={{
                      padding: '12px 8px', textAlign: 'center',
                      borderRight: i < 4 ? `1px solid ${BORDER}` : 'none',
                      background: i === 4 ? (finalResult === 'PASS' ? '#f0fdf4' : '#fef2f2') : i % 2 === 0 ? '#f8faff' : '#fff',
                    }}>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 5 }}>
                        {label}
                      </div>
                      <div style={{ fontSize: big ? 18 : 20, fontWeight: 900, color }}>
                        {i === 3 ? <GradeChip grade={value} /> : value}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── GRADING SCALE + REMARKS ─────────────────────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

              {/* Grading Scale */}
              <Card title="Grading Scale">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: LIGHT_BG }}>
                      {['Percentage', 'Grade', 'Performance'].map(h => (
                        <th key={h} style={{ padding: '5px 8px', textAlign: h === 'Performance' ? 'left' : 'center', fontWeight: 700, color: DARK_BLUE, borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DEFAULT_GRADE_SCALE.map((row, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8faff', borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '4px 8px', textAlign: 'center', color: '#374151' }}>{row.range}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                          <GradeChip grade={row.grade} />
                        </td>
                        <td style={{ padding: '4px 8px', color: '#4b5563' }}>{row.label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>

              {/* Remarks */}
              <Card title="Class Teacher Remarks">
                <div style={{ padding: '10px 14px', background: '#fafbfc', height: '100%', minHeight: 120 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{ borderBottom: '1px solid #d1d5db', marginBottom: i < 3 ? 18 : 0, paddingBottom: 4, minHeight: 22 }} />
                  ))}
                </div>
              </Card>
            </div>

            {/* ── SIGNATURES ──────────────────────────────────────────────── */}
            <Card title={null}>
              <div style={{ padding: '14px 20px', background: '#fff' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {['Class Teacher', 'Principal', 'Parent / Guardian'].map(sig => (
                    <div key={sig} style={{ textAlign: 'center' }}>
                      <div style={{ height: 44, borderBottom: `1.5px solid #374151`, margin: '0 16px 6px' }} />
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{sig}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Signature &amp; Seal</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

          </div>{/* end padding wrapper */}
        </div>{/* end outer card */}
      </div>{/* end print root */}
    </>
  );
}
