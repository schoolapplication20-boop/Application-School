import React from 'react';
import { BASE_URL } from '../services/api';

// ─────────────────────────────────────────────────────────────────────────────
// Shared A4 portrait Progress Report Card — master template
// Used by: Student, Teacher, Admin, Super Admin, Parent portals, Print, PDF
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

// Paired grading scale — 2 entries per row to match A4 print layout
const GRADE_SCALE_PAIRS = [
  [{ range: '91 - 100', grade: 'O'  }, { range: '51 - 60', grade: 'B'  }],
  [{ range: '81 - 90',  grade: 'A+' }, { range: '41 - 50', grade: 'C'  }],
  [{ range: '71 - 80',  grade: 'A'  }, { range: '35 - 40', grade: 'D'  }],
  [{ range: '61 - 70',  grade: 'B+' }, { range: 'Below 35', grade: 'F' }],
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

const SectionTitle = ({ children }) => (
  <div style={{
    background: DARK_BLUE, padding: '5px 14px',
  }}>
    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
      {children}
    </span>
  </div>
);

// ── Print styles ──────────────────────────────────────────────────────────────
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

const tblBorder = `1px solid ${BORDER}`;

// ─────────────────────────────────────────────────────────────────────────────
export default function ProfessionalReportCard({ data, gradeScale = [], examFilter = '', onPrint, printId = 'rc-print-root' }) {
  if (!data) return null;

  const { student = {}, school = {}, marksByExam = {}, attendance = {},
          manualAttendanceByExam = {} } = data;

  // Prefer manually-entered attendance (from Marks Bulk Entry) over the
  // auto-computed daily attendance log.  Resolution order:
  //  1. Manual entry for the currently-selected exam type (examFilter) — exact match only.
  //  2. Auto-computed attendance from daily records (legacy fallback).
  //
  // NOTE: We intentionally do NOT fall back to Object.values(manualAttendanceByExam)[0]
  // when the filter doesn't match, because that would show the wrong exam's attendance
  // (e.g. Term 1 data on a Term 2 report card) which is worse than showing computed data.
  const manualAtt = (examFilter && manualAttendanceByExam[examFilter]) || null;

  const displayAtt = manualAtt
    ? {
        totalDays:   manualAtt.totalWorkingDays,
        presentDays: manualAtt.presentDays,
        percentage:  manualAtt.percentage,
      }
    : attendance;

  const logoSrc = school.logoUrl
    ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${BASE_URL}${school.logoUrl}`)
    : null;

  const allRows    = Object.values(marksByExam).flat();
  const grandTotal = allRows.reduce((s, r) => s + Number(r.marks    || 0), 0);
  const grandMax   = allRows.reduce((s, r) => s + Number(r.maxMarks || 0), 0);
  const overallPct = p(grandTotal, grandMax);
  const overallGrade = gradeFromPct(overallPct, gradeScale);
  const anyFail      = allRows.some(isFailing);
  const finalResult  = grandMax > 0 ? (anyFail ? 'FAIL' : 'PASS') : '—';

  const td = (extra = {}) => ({
    padding: '6px 8px', borderBottom: tblBorder, borderRight: tblBorder, ...extra,
  });

  const th = (align = 'center', extra = {}) => ({
    padding: '8px 8px', textAlign: align, fontWeight: 700, color: '#fff',
    background: DARK_BLUE, fontSize: 11, borderRight: `1px solid #2d4d8c`,
    borderBottom: `1px solid #2d4d8c`, ...extra,
  });

  return (
    <>
      <style>{PRINT_CSS}</style>

      {/* Print button — screen only */}
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

      {/* ── Report Card Root ── */}
      <div id={printId} className="rc-print-root"
        style={{ maxWidth: 800, margin: '0 auto', fontFamily: '"Segoe UI", Arial, sans-serif' }}>
        <div className="rc-outer-wrap" style={{
          background: '#fff', border: `2px solid ${BLUE}`, borderRadius: 6,
          overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
        }}>

          {/* ════════════════════════ HEADER ════════════════════════ */}
          <div style={{ padding: '16px 20px 12px', background: '#fff', borderBottom: `3px double ${BLUE}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

              {/* School Logo */}
              <div style={{ flexShrink: 0, width: 82, height: 82 }}>
                {logoSrc ? (
                  <img src={logoSrc} alt="Logo"
                    style={{ width: 82, height: 82, objectFit: 'contain' }}
                    onError={e => { e.target.style.display = 'none'; }} />
                ) : (
                  <div style={{
                    width: 82, height: 82, background: LIGHT_BG, borderRadius: 8,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: BLUE, fontWeight: 900, fontSize: 28, border: `2px solid ${BORDER}`,
                  }}>
                    {school.name?.charAt(0) || 'S'}
                  </div>
                )}
              </div>

              {/* School Details — centered */}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: DARK_BLUE, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.2 }}>
                  {school.name || 'School Name'}
                </div>
                {school.affiliationNumber && (
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 4, fontWeight: 600 }}>
                    {school.board ? `${school.board} ` : ''}Affiliation No: {school.affiliationNumber}
                  </div>
                )}
                {school.address && (
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 3 }}>
                    {school.address}{school.phone ? ` | Ph: ${school.phone}` : ''}
                  </div>
                )}
                {(school.email || school.website) && (
                  <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>
                    {[school.email && `Email: ${school.email}`, school.website && `Website: ${school.website}`].filter(Boolean).join(' | ')}
                  </div>
                )}
                {/* Board shown if no affiliation number */}
                {school.board && !school.affiliationNumber && (
                  <div style={{ fontSize: 11, color: BLUE, fontWeight: 700, marginTop: 3, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {school.board} Affiliated
                  </div>
                )}
              </div>

              {/* Academic Year Box */}
              <div style={{
                flexShrink: 0, border: `2px solid ${DARK_BLUE}`, borderRadius: 4,
                padding: '8px 14px', textAlign: 'center', minWidth: 100,
                background: LIGHT_BG,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: DARK_BLUE, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Academic Year
                </div>
                <div style={{ fontSize: 16, fontWeight: 900, color: DARK_BLUE, marginTop: 4 }}>
                  {school.academicYear || '—'}
                </div>
              </div>
            </div>

            {/* Report Title with decorative lines */}
            <div style={{ textAlign: 'center', marginTop: 14, paddingTop: 12, borderTop: `1.5px solid ${BORDER}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
                <div style={{ height: 2, flex: 1, background: `linear-gradient(to right, transparent, ${BLUE})`, borderRadius: 1 }} />
                <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: 4, color: DARK_BLUE, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                  Progress Report Card
                </span>
                <div style={{ height: 2, flex: 1, background: `linear-gradient(to left, transparent, ${BLUE})`, borderRadius: 1 }} />
              </div>
              {examFilter && (
                <div style={{ marginTop: 8 }}>
                  <span style={{
                    display: 'inline-block',
                    background: DARK_BLUE, color: '#fff',
                    padding: '5px 28px', borderRadius: 4,
                    fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase',
                  }}>
                    Examination: {examFilter}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ════════════════════════ BODY ════════════════════════ */}
          <div style={{ padding: '12px 20px 16px' }}>

            {/* ── Student Information ─────────────────────────────────────── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: `1.5px solid ${BORDER}`, marginBottom: 10, fontSize: 12 }}>
              <tbody>
                {[
                  [['Student Name',    student.name            || '—'], ['Roll Number',       student.rollNumber      || '—']],
                  [['Admission No.',   student.admissionNumber || '—'], ['Date of Birth',     student.dateOfBirth     || '—']],
                  [['Class & Section', `${student.className || '—'}${student.section ? ' - ' + student.section : ''}`],
                   ['Parent / Guardian', student.parentName   || '—']],
                ].map((row, ri) => (
                  <tr key={ri} style={{ borderBottom: ri < 2 ? tblBorder : 'none' }}>
                    {row.map(([label, value], ci) => (
                      <td key={ci} style={{
                        padding: '8px 14px', width: '50%',
                        borderRight: ci === 0 ? tblBorder : 'none',
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#4b5563' }}>{label}</span>
                        <span style={{ color: '#6b7280' }}> : </span>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{value}</span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Attendance Summary ──────────────────────────────────────── */}
            <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
              <SectionTitle>Attendance Summary</SectionTitle>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: LIGHT_BG }}>
                    {['TOTAL WORKING DAYS', 'PRESENT DAYS', 'ATTENDANCE %'].map(h => (
                      <th key={h} style={{
                        padding: '7px 10px', textAlign: 'center', fontWeight: 700,
                        color: DARK_BLUE, borderBottom: tblBorder, borderRight: tblBorder, fontSize: 11,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, borderRight: tblBorder }}>
                      {displayAtt.totalDays ?? 0}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#16a34a', borderRight: tblBorder }}>
                      {displayAtt.presentDays ?? 0}
                    </td>
                    <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                      <span style={{
                        fontWeight: 900, fontSize: 14,
                        color: Number(displayAtt.percentage) >= 75 ? '#16a34a' : '#dc2626',
                      }}>
                        {Number(displayAtt.percentage || 0).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* ── Subject-wise Marks Tables ────────────────────────────────── */}
            {Object.keys(marksByExam).length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '24px', color: '#9ca3af', fontSize: 13,
                border: '1px dashed #d1d5db', borderRadius: 6, marginBottom: 10,
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
                <div key={examType} style={{ border: `1.5px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                  {/* Exam section header */}
                  <div style={{
                    background: DARK_BLUE, padding: '5px 14px',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: 1 }}>
                      {examType}
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
                      <tr>
                        <th style={th('center', { width: 36 })}>S.NO.</th>
                        <th style={th('left')}>SUBJECT</th>
                        <th style={th('center', { width: 90 })}>INTERNAL</th>
                        <th style={th('center', { width: 90 })}>EXTERNAL</th>
                        <th style={th('center', { width: 100 })}>MARKS OBTAINED</th>
                        <th style={th('center', { width: 100 })}>MAXIMUM MARKS</th>
                        <th style={th('center', { width: 90 })}>PERCENTAGE (%)</th>
                        <th style={th('center', { width: 65 })}>GRADE</th>
                        <th style={th('center', { width: 65, borderRight: 'none' })}>RESULT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const subPct = p(r.marks, r.maxMarks);
                        const fail   = isFailing(r);
                        const isIE   = r.marksType === 'INTERNAL_EXTERNAL';
                        return (
                          <tr key={i} style={{ background: fail ? '#fef2f2' : i % 2 === 0 ? '#fff' : '#f8faff' }}>
                            <td style={td({ textAlign: 'center', color: '#6b7280', fontSize: 11 })}>{i + 1}</td>
                            <td style={{ ...td({ fontWeight: 600 }), color: fail ? '#991b1b' : '#111827' }}>
                              {r.subject}
                            </td>
                            <td style={td({ textAlign: 'center', color: isIE ? '#7c3aed' : '#9ca3af', fontSize: 11 })}>
                              {isIE ? `${r.internalMarksObtained ?? 0}/${r.internalMaxMarks ?? 0}` : '—'}
                            </td>
                            <td style={td({ textAlign: 'center', color: isIE ? '#0369a1' : '#9ca3af', fontSize: 11 })}>
                              {isIE ? `${r.externalMarksObtained ?? 0}/${r.externalMaxMarks ?? 0}` : '—'}
                            </td>
                            <td style={td({ textAlign: 'center', fontWeight: 800, fontSize: 13, color: DARK_BLUE })}>
                              {r.marks ?? '—'}
                            </td>
                            <td style={td({ textAlign: 'center', color: '#4b5563' })}>
                              {r.maxMarks ?? '—'}
                            </td>
                            <td style={{ ...td({ textAlign: 'center', fontWeight: 700 }), color: fail ? '#dc2626' : subPct >= 75 ? '#16a34a' : '#374151' }}>
                              {r.maxMarks > 0 ? `${subPct}%` : '—'}
                            </td>
                            <td style={td({ textAlign: 'center' })}>
                              <GradeChip grade={r.grade} />
                            </td>
                            <td style={{ ...td({ textAlign: 'center', fontWeight: 700, fontSize: 11, borderRight: 'none' }), color: fail ? '#dc2626' : '#16a34a' }}>
                              {r.maxMarks > 0 ? (fail ? 'FAIL' : 'PASS') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr style={{ background: '#dbeafe', borderTop: `2px solid ${BLUE}` }}>
                        <td colSpan={4} style={{ padding: '7px 14px', fontWeight: 900, color: DARK_BLUE, fontSize: 12, borderRight: tblBorder }}>
                          TOTAL
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 900, fontSize: 14, color: DARK_BLUE, borderRight: tblBorder }}>
                          {etTotal}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: '#374151', fontWeight: 700, borderRight: tblBorder }}>
                          {etMax}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 900, color: etFail ? '#dc2626' : '#16a34a', fontSize: 13, borderRight: tblBorder }}>
                          {etPct}%
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', borderRight: tblBorder }}>
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

            {/* ── Academic Summary ────────────────────────────────────────── */}
            {grandMax > 0 && (
              <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden', marginBottom: 10 }}>
                <SectionTitle>Academic Summary</SectionTitle>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: LIGHT_BG }}>
                      {['TOTAL MARKS', 'MAXIMUM MARKS', 'PERCENTAGE (%)', 'OVERALL GRADE', 'RESULT'].map(h => (
                        <th key={h} style={{
                          padding: '7px 8px', textAlign: 'center', fontWeight: 700,
                          color: DARK_BLUE, borderBottom: tblBorder, borderRight: tblBorder, fontSize: 11,
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 900, fontSize: 16, color: DARK_BLUE, borderRight: tblBorder }}>
                        {grandTotal}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 700, color: '#374151', borderRight: tblBorder }}>
                        {grandMax}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 900, fontSize: 16, color: anyFail ? '#dc2626' : '#16a34a', borderRight: tblBorder }}>
                        {overallPct}%
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center', borderRight: tblBorder }}>
                        <GradeChip grade={overallGrade} />
                      </td>
                      <td style={{
                        padding: '10px 8px', textAlign: 'center', fontWeight: 900, fontSize: 14,
                        color: finalResult === 'PASS' ? '#16a34a' : '#dc2626',
                        background: finalResult === 'PASS' ? '#f0fdf4' : '#fef2f2',
                      }}>
                        {finalResult}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── Class Teacher Remarks + Grading Scale ───────────────────── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>

              {/* Class Teacher Remarks */}
              <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
                <SectionTitle>Class Teacher's Remarks</SectionTitle>
                <div style={{ padding: '10px 14px', background: '#fafbfc', minHeight: 110 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ borderBottom: '1px solid #d1d5db', marginBottom: 22, paddingBottom: 4, minHeight: 20 }} />
                  ))}
                </div>
              </div>

              {/* Grading Scale — 2-column paired layout */}
              <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
                <SectionTitle>Grading Scale</SectionTitle>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: LIGHT_BG }}>
                      {['PERCENTAGE RANGE', 'GRADE', 'PERCENTAGE RANGE', 'GRADE'].map((h, i) => (
                        <th key={i} style={{
                          padding: '5px 8px', textAlign: 'center', fontWeight: 700,
                          color: DARK_BLUE, borderBottom: tblBorder,
                          borderRight: i < 3 ? tblBorder : 'none',
                        }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {GRADE_SCALE_PAIRS.map(([left, right], i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f8faff', borderBottom: tblBorder }}>
                        <td style={{ padding: '4px 8px', textAlign: 'center', color: '#374151', borderRight: tblBorder }}>{left.range}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', borderRight: tblBorder }}>
                          <GradeChip grade={left.grade} />
                        </td>
                        <td style={{ padding: '4px 8px', textAlign: 'center', color: '#374151', borderRight: tblBorder }}>{right.range}</td>
                        <td style={{ padding: '4px 8px', textAlign: 'center' }}>
                          <GradeChip grade={right.grade} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── Note ────────────────────────────────────────────────────── */}
            <div style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic', marginBottom: 14, paddingLeft: 2 }}>
              Note: Co-scholastic areas like Work Education, Art Education, Health &amp; Physical Education and Discipline are assessed on a 3-point scale (A: Excellent, B: Good, C: Needs Improvement).
            </div>

            {/* ── Signatures ──────────────────────────────────────────────── */}
            <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 4, padding: '16px 20px 10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {['CLASS TEACHER', 'PRINCIPAL', 'PARENT / GUARDIAN'].map(sig => (
                  <div key={sig} style={{ textAlign: 'center' }}>
                    <div style={{ height: 44, borderBottom: `1.5px solid #374151`, margin: '0 16px 8px' }} />
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b' }}>{sig}</div>
                    <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>Signature</div>
                  </div>
                ))}
              </div>
            </div>

          </div>{/* end body padding */}
        </div>{/* end outer card */}
      </div>{/* end print root */}
    </>
  );
}
