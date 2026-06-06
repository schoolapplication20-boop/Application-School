import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import { reportCardAPI, adminAPI, teacherAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';
import { sortClasses } from '../../utils/classOrder';

const pct = (m, max) => (max > 0 ? Math.round((m / max) * 100) : 0);
const fmt = (n) => Number(n || 0).toFixed(1);
const GRADE_COLOR = {
  O: '#276749', 'A+': '#2b6cb0', A: '#3b5bdb',
  'B+': '#c05621', B: '#975a16', 'B-': '#92400e', C: '#c53030', F: '#9b2335',
};

// ── Reusable report card renderer ─────────────────────────────────────────────
function ReportCardView({ data, onPrint }) {
  if (!data) return null;
  const { student, school, marksByExam, attendance } = data;
  const logoSrc = school?.logoUrl
    ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${BASE_URL}${school.logoUrl}`)
    : null;

  const allExams = Object.entries(marksByExam || {});
  const grandMarks = allExams.flatMap(([, rows]) => rows).reduce((s, r) => s + Number(r.marks || 0), 0);
  const grandMax   = allExams.flatMap(([, rows]) => rows).reduce((s, r) => s + Number(r.maxMarks || 0), 0);
  const overallPct = grandMax > 0 ? Math.round((grandMarks / grandMax) * 100) : 0;

  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      {/* School header */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#4f46e5)', padding: '20px 24px', color: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
        {logoSrc && <img src={logoSrc} alt="" style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'contain', background: '#fff', padding: 4 }} onError={e => e.target.style.display='none'} />}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>{school?.name || 'School Management System'}</div>
          <div style={{ fontSize: 12, opacity: 0.75 }}>{[school?.address, school?.board, school?.academicYear].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Overall</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: overallPct >= 80 ? '#6ee7b7' : overallPct >= 50 ? '#fde68a' : '#fca5a5' }}>{overallPct}%</div>
        </div>
        {onPrint && (
          <button onClick={onPrint} style={{ padding: '8px 14px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span className="material-icons" style={{ fontSize: 16 }}>print</span>Print
          </button>
        )}
      </div>

      {/* Student info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: '1px solid #e2e8f0' }}>
        {[
          ['Name', student?.name],
          ['Roll No.', student?.rollNumber],
          ['Admission No.', student?.admissionNumber],
          ['Class', `${student?.className || ''}${student?.section ? ' - ' + student.section : ''}`],
          ['Parent', student?.parentName],
          ['Attendance', `${attendance?.presentDays || 0}/${attendance?.totalDays || 0} days (${fmt(attendance?.percentage)}%)`],
        ].map(([label, val], i) => (
          <div key={i} style={{ padding: '10px 16px', borderRight: i % 3 < 2 ? '1px solid #f1f5f9' : 'none', borderBottom: i < 3 ? '1px solid #f1f5f9' : 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.05em' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginTop: 2 }}>{val || '—'}</div>
          </div>
        ))}
      </div>

      {/* Marks by exam */}
      {allExams.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No marks recorded for this filter.</div>
      ) : allExams.map(([examType, rows]) => {
        const etTotal = rows.reduce((s, r) => s + Number(r.marks || 0), 0);
        const etMax   = rows.reduce((s, r) => s + Number(r.maxMarks || 0), 0);
        const etPct   = etMax > 0 ? Math.round((etTotal / etMax) * 100) : 0;
        return (
          <div key={examType} style={{ borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ padding: '10px 16px', background: '#f8faff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#4f46e5' }}>{examType}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: etPct >= 80 ? '#16a34a' : etPct >= 50 ? '#f59e0b' : '#dc2626' }}>
                {etTotal}/{etMax} ({etPct}%)
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#fafcff' }}>
                  {['Subject', 'Marks', 'Max', '%', 'Grade', 'Date'].map(h => (
                    <th key={h} style={{ padding: '7px 14px', textAlign: h === 'Subject' ? 'left' : 'center', color: '#64748b', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const p = pct(r.marks, r.maxMarks);
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                      <td style={{ padding: '8px 14px', fontWeight: 600, color: '#1e293b' }}>{r.subject}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', fontWeight: 700 }}>{r.marks}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', color: '#64748b' }}>{r.maxMarks}</td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <div style={{ background: '#f1f5f9', borderRadius: 20, height: 6, width: 60, margin: '0 auto 3px', overflow: 'hidden' }}>
                          <div style={{ width: `${p}%`, height: '100%', background: p >= 80 ? '#16a34a' : p >= 50 ? '#f59e0b' : '#dc2626', borderRadius: 20 }} />
                        </div>
                        <span style={{ fontSize: 11 }}>{p}%</span>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 800, background: (GRADE_COLOR[r.grade] || '#64748b') + '18', color: GRADE_COLOR[r.grade] || '#64748b' }}>{r.grade || '—'}</span>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>{r.examDate || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ReportCardHub() {
  const { user } = useAuth();
  const isTeacher = user?.role === 'TEACHER';

  const [classes,    setClasses]    = useState([]);
  const [examTypes,  setExamTypes]  = useState([]);
  const [filterClass,  setFilterClass]  = useState('');
  const [filterSection,setFilterSection]= useState('');
  const [filterExam,   setFilterExam]   = useState('');
  const [studentSearch,setStudentSearch]= useState('');
  const [classStudents,setClassStudents]= useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [cardData,   setCardData]   = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [loadingClass,setLoadingClass]= useState(false);
  const [searchResults,setSearchResults]= useState([]);
  const [searching,  setSearching]  = useState(false);
  const [printingAll,setPrintingAll] = useState(false);
  const [isClassTeacher, setIsClassTeacher] = useState(null); // null = loading, true/false = resolved

  // Load class list and exam types on mount
  useEffect(() => {
    if (isTeacher) {
      // Teachers: only load their assigned class via teacher API
      teacherAPI.getClassTeacherAssignment()
        .then(res => {
          const assignment = res.data?.data;
          if (assignment?.isClassTeacher && assignment?.classId) {
            setIsClassTeacher(true);
            // Build a single-class list from the assignment
            setClasses([{
              id:      assignment.classId,
              name:    assignment.className,
              section: assignment.section,
            }]);
            // Auto-select so students load immediately
            setFilterClass(String(assignment.classId));
          } else {
            setIsClassTeacher(false);
            setClasses([]);
          }
        })
        .catch(() => { setIsClassTeacher(false); setClasses([]); });
    } else {
      // Admin / Super Admin: load all classes
      setIsClassTeacher(false);
      adminAPI.getClasses()
        .then(res => setClasses((res.data?.data ?? []).slice().sort(sortClasses)))
        .catch(() => {});
    }
    reportCardAPI.getSchoolFilters()
      .then(res => setExamTypes(res.data?.data?.examTypes ?? []))
      .catch(() => {});
  }, [isTeacher]);

  // Load students when class filter changes
  const loadClassStudents = useCallback(async () => {
    if (!filterClass) { setClassStudents([]); return; }
    const cls = classes.find(c => c.id === Number(filterClass));
    if (!cls) return;
    setLoadingClass(true);
    try {
      const params = { className: cls.name, section: cls.section || '', examType: filterExam || undefined };
      const res = await reportCardAPI.getClassReportCards(params);
      setClassStudents(res.data?.data ?? []);
    } catch { setClassStudents([]); }
    finally { setLoadingClass(false); }
  }, [filterClass, filterExam, classes]);

  useEffect(() => { loadClassStudents(); }, [loadClassStudents]);

  // Load report card for selected student — cancelled flag prevents stale response overwriting
  useEffect(() => {
    if (!selectedStudent) { setCardData(null); return; }
    let cancelled = false;
    setLoading(true);
    const params = filterExam ? { examType: filterExam } : {};
    reportCardAPI.getAnyStudentCard(selectedStudent.studentId, params)
      .then(res => { if (!cancelled) setCardData(res.data?.data); })
      .catch(() => { if (!cancelled) setCardData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [selectedStudent, filterExam]);

  // Student name search — admin/super_admin only (teacher uses class list instead)
  useEffect(() => {
    if (isTeacher) { setSearchResults([]); return; }
    if (!studentSearch || studentSearch.length < 2) { setSearchResults([]); return; }
    let alive = true;
    const t = setTimeout(async () => {
      if (!alive) return;
      setSearching(true);
      try {
        const res = await adminAPI.searchStudentsForFee(studentSearch, '', '');
        if (alive) setSearchResults(res.data?.data ?? []);
      } catch { if (alive) setSearchResults([]); }
      finally { if (alive) setSearching(false); }
    }, 300);
    return () => { clearTimeout(t); alive = false; };
  }, [studentSearch, isTeacher]);

  const selectStudent = (s) => {
    setSelectedStudent({ studentId: s.id || s.studentId, name: s.name, rollNumber: s.rollNumber });
    setSearchResults([]);
    setStudentSearch('');
    setClassStudents([]);
    setFilterClass('');
  };

  const selectClassStudent = (s) => {
    setSelectedStudent({ studentId: s.studentId, name: s.name, rollNumber: s.rollNumber });
  };

  const sections = [...new Set(classes.map(c => c.section).filter(Boolean))].sort();
  const visibleClasses = classes.filter(c => !filterSection || c.section === filterSection);

  const handlePrint = () => { window.print(); };

  // Print all students in the selected class as one multi-page A4 document
  const printAllReportCards = async () => {
    if (!classStudents.length) return;
    setPrintingAll(true);
    try {
      const params = filterExam ? { examType: filterExam } : {};
      const cards = await Promise.all(
        classStudents.map(s =>
          reportCardAPI.getAnyStudentCard(s.studentId, params)
            .then(r => ({ student: s, data: r.data?.data }))
            .catch(() => ({ student: s, data: null }))
        )
      );

      const w = window.open('', '_blank');
      const buildCard = (data) => {
        if (!data) return '<div class="page"><p style="color:#999">No data</p></div>';
        const { student, school, marksByExam, attendance } = data;
        const allExams = Object.entries(marksByExam || {});
        const gTotal = allExams.flatMap(([,r])=>r).reduce((s,r)=>s+Number(r.marks||0),0);
        const gMax   = allExams.flatMap(([,r])=>r).reduce((s,r)=>s+Number(r.maxMarks||0),0);
        const overallPct = gMax > 0 ? Math.round((gTotal/gMax)*100) : 0;
        const pctBar = (p) => `<div style="background:#f1f5f9;border-radius:4px;height:5px;width:60px;display:inline-block;vertical-align:middle;margin-left:4px"><div style="width:${p}%;height:100%;background:${p>=80?'#16a34a':p>=50?'#f59e0b':'#dc2626'};border-radius:4px"></div></div>`;
        const logoSrc = school?.logoUrl ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${window.location.origin}${school.logoUrl}`) : null;
        const examsHtml = allExams.map(([et, rows]) => {
          const tot = rows.reduce((s,r)=>s+Number(r.marks||0),0);
          const mx  = rows.reduce((s,r)=>s+Number(r.maxMarks||0),0);
          const p   = mx > 0 ? Math.round((tot/mx)*100) : 0;
          return `<div class="exam-section">
            <div class="exam-header"><span>${et}</span><span>${tot}/${mx} (${p}%)</span></div>
            <table class="marks-table"><thead><tr><th>Subject</th><th>Marks</th><th>Max</th><th>%</th><th>Grade</th><th>Date</th></tr></thead><tbody>
            ${rows.map(r=>`<tr><td>${r.subject||''}</td><td style="text-align:center;font-weight:700">${r.marks??''}</td><td style="text-align:center;color:#64748b">${r.maxMarks??''}</td><td style="text-align:center">${r.maxMarks>0?Math.round((r.marks/r.maxMarks)*100):'—'}%</td><td style="text-align:center;font-weight:700;color:${p>=80?'#16a34a':p>=50?'#f59e0b':'#dc2626'}">${r.grade||'—'}</td><td style="text-align:center;color:#94a3b8;font-size:10px">${r.examDate||'—'}</td></tr>`).join('')}
            </tbody></table></div>`;
        }).join('');

        return `<div class="page">
          <div class="school-header">
            ${logoSrc ? `<img src="${logoSrc}" class="logo" onerror="this.style.display='none'">` : ''}
            <div class="school-name">${school?.name||'School'}</div>
            <div class="school-sub">${[school?.address,school?.board,school?.academicYear].filter(Boolean).join(' · ')}</div>
            <div class="report-title">ACADEMIC REPORT CARD <span class="overall-badge">${overallPct}%</span></div>
          </div>
          <div class="student-grid">
            ${[['Name',student?.name],['Roll No.',student?.rollNumber],['Admission No.',student?.admissionNumber||'—'],['Class',`${student?.className||''}${student?.section?' - '+student.section:''}`],['Parent',student?.parentName||'—'],['Attendance',`${attendance?.presentDays||0}/${attendance?.totalDays||0} (${Number(attendance?.percentage||0).toFixed(1)}%)`]].map(([l,v])=>`<div class="info-cell"><div class="info-label">${l}</div><div class="info-val">${v||'—'}</div></div>`).join('')}
          </div>
          ${examsHtml || '<div style="padding:20px;text-align:center;color:#94a3b8;font-size:13px">No marks recorded</div>'}
          <div class="signature-row"><div class="sig-line">Class Teacher</div><div class="sig-line">Principal</div><div class="sig-line">Parent / Guardian</div></div>
        </div>`;
      };

      w.document.write(`<!DOCTYPE html><html><head><title>Class Report Cards</title>
      <style>
        @page{size:A4 portrait;margin:15mm}
        *{margin:0;padding:0;box-sizing:border-box;font-family:Arial,sans-serif}
        body{background:#fff;font-size:12px}
        .page{page-break-after:always;min-height:267mm;padding:0;display:flex;flex-direction:column;gap:8px}
        .page:last-child{page-break-after:avoid}
        .school-header{text-align:center;border-bottom:2px solid #1e1b4b;padding-bottom:10px;margin-bottom:10px}
        .logo{width:52px;height:52px;object-fit:contain;display:block;margin:0 auto 6px}
        .school-name{font-size:18px;font-weight:900;color:#1e1b4b}
        .school-sub{font-size:10px;color:#718096;margin:3px 0}
        .report-title{font-size:12px;font-weight:700;color:#4f46e5;letter-spacing:.05em;margin-top:6px;text-transform:uppercase}
        .overall-badge{background:#eef2ff;color:#4f46e5;border-radius:12px;padding:2px 8px;font-size:11px;margin-left:8px}
        .student-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 8px;border:1px solid #e2e8f0;border-radius:6px;padding:8px}
        .info-cell{padding:4px 6px}
        .info-label{font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em}
        .info-val{font-size:12px;font-weight:600;color:#1e293b;margin-top:1px}
        .exam-section{border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:6px}
        .exam-header{display:flex;justify-content:space-between;background:#f8faff;padding:5px 10px;font-size:11px;font-weight:700;color:#4f46e5;border-bottom:1px solid #e2e8f0}
        .marks-table{width:100%;border-collapse:collapse;font-size:11px}
        .marks-table th{padding:4px 8px;background:#fafcff;color:#64748b;font-weight:700;font-size:10px;text-transform:uppercase;border-bottom:1px solid #f1f5f9}
        .marks-table td{padding:4px 8px;border-bottom:1px solid #f9fafb}
        .signature-row{display:flex;justify-content:space-between;margin-top:auto;padding-top:24px}
        .sig-line{width:28%;border-top:1px solid #2d3748;padding-top:4px;text-align:center;font-size:10px;color:#718096}
        @media print{.page{page-break-after:always}}
      </style></head><body>${cards.map(c=>buildCard(c.data)).join('')}</body></html>`);
      w.document.close();
      setTimeout(() => { w.focus(); w.print(); }, 600);
    } finally { setPrintingAll(false); }
  };

  return (
    <Layout pageTitle="Report Cards">
      <div className="page-header">
        <h1>Report Cards</h1>
        <p>{isTeacher ? 'Academic performance records for your class' : 'View academic performance records by student or class'}</p>
      </div>

      {/* Class teacher banner */}
      {isTeacher && isClassTeacher === true && classes[0] && (
        <div style={{ background: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-icons" style={{ color: '#4f46e5', fontSize: 20 }}>class</span>
          <div>
            <span style={{ fontWeight: 700, color: '#3730a3', fontSize: 13 }}>Your class: {classes[0].name}{classes[0].section ? ` - ${classes[0].section}` : ''}</span>
            <span style={{ fontSize: 12, color: '#6366f1', marginLeft: 8 }}>Showing report cards for your assigned students only</span>
          </div>
        </div>
      )}

      {/* Not a class teacher */}
      {isTeacher && isClassTeacher === false && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <span className="material-icons" style={{ fontSize: 56, display: 'block', marginBottom: 12, color: '#e2e8f0' }}>assignment_ind</span>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#475569' }}>Report cards are available to class teachers only</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>You are not assigned as a class teacher. Contact your admin to update your role.</p>
        </div>
      )}

      {/* Loading teacher assignment */}
      {isTeacher && isClassTeacher === null && (
        <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading your class assignment…</div>
      )}

      {/* Filters bar — shown for admin/super_admin and class teachers */}
      {(!isTeacher || isClassTeacher === true) && isClassTeacher !== null && (
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {/* Class selector — only for admin/super_admin; teachers have their class auto-selected */}
        {!isTeacher && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Class</label>
            <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setSelectedStudent(null); setCardData(null); }}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 140 }}>
              <option value="">— Select class —</option>
              {visibleClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Exam type */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Exam Type</label>
          <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 150 }}>
            <option value="">All Exam Types</option>
            {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
          </select>
        </div>

        {/* OR search student — admin/super_admin only */}
        {!isTeacher && (
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 4 }}>Or search student</label>
            <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Name or admission no…"
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none', width: 200 }} />
            {searching && <span style={{ position: 'absolute', right: 10, top: 32, fontSize: 11, color: '#94a3b8' }}>Searching…</span>}
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                {searchResults.map(s => (
                  <div key={s.id} onMouseDown={() => selectStudent(s)}
                    style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{s.className}{s.section ? ` - ${s.section}` : ''} · Roll: {s.rollNumber}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(selectedStudent || (!isTeacher && filterClass)) && (
          <button onClick={() => { setSelectedStudent(null); if (!isTeacher) setFilterClass(''); setCardData(null); setClassStudents([]); setStudentSearch(''); }}
            style={{ padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#64748b', marginTop: 18 }}>
            {isTeacher ? 'Back to class' : 'Clear'}
          </button>
        )}
      </div>
      )}

      {/* Class student list */}
      {filterClass && !selectedStudent && (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f8faff', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>Students in class</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>{loadingClass ? 'Loading…' : `${classStudents.length} students`}</span>
              {classStudents.length > 0 && !loadingClass && (
                <button onClick={printAllReportCards} disabled={printingAll}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', border: 'none', borderRadius: 7, background: printingAll ? '#a5b4fc' : 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', fontWeight: 700, fontSize: 11, cursor: printingAll ? 'not-allowed' : 'pointer' }}>
                  <span className="material-icons" style={{ fontSize: 14 }}>print</span>
                  {printingAll ? 'Preparing…' : 'Print All (A4)'}
                </button>
              )}
            </div>
          </div>
          {loadingClass ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
          ) : classStudents.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: '#94a3b8' }}>No students found</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {classStudents.map((s, i) => (
                <div key={s.studentId} onClick={() => selectClassStudent(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafcff' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafcff'}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {(s.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Roll: {s.rollNumber} · Adm: {s.admissionNumber || '—'}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {Object.keys(s.marksByExam || {}).length} exam type{Object.keys(s.marksByExam || {}).length !== 1 ? 's' : ''}
                  </div>
                  <span className="material-icons" style={{ color: '#4f46e5', fontSize: 18 }}>chevron_right</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Selected student report card */}
      {selectedStudent && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button onClick={() => { setSelectedStudent(null); setCardData(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, background: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: '#64748b' }}>
              <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
              {filterClass ? 'Back to class' : 'Clear'}
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#1e293b' }}>{selectedStudent.name}</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading report card…</div>
          ) : (
            <ReportCardView data={cardData} onPrint={handlePrint} />
          )}
        </div>
      )}

      {/* Empty state — only for admin/super_admin (teachers auto-load their class) */}
      {!isTeacher && !filterClass && !selectedStudent && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8' }}>
          <span className="material-icons" style={{ fontSize: 56, display: 'block', marginBottom: 12, color: '#e2e8f0' }}>school</span>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Select a class or search for a student to view report cards</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Use the class dropdown to browse all students, or type a name to search directly</p>
        </div>
      )}
    </Layout>
  );
}
