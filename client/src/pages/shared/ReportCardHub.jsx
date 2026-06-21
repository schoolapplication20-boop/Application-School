import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import ProfessionalReportCard from '../../components/ProfessionalReportCard';
import { reportCardAPI, adminAPI, teacherAPI, gradeScaleAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';
import { sortClasses } from '../../utils/classOrder';

const _pct = (m, max) => (max > 0 ? Math.round((m / max) * 100) : 0);

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
  const [gradeScale,     setGradeScale]     = useState([]);

  // Load grade scale once
  useEffect(() => {
    gradeScaleAPI.list()
      .then(r => setGradeScale(r.data?.data || []))
      .catch(() => {});
  }, []);

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
      // Admin / Super Admin: load classrooms; fall back to distinct student class names
      // if no classrooms have been configured yet.
      setIsClassTeacher(false);
      adminAPI.getClasses()
        .then(res => {
          const rooms = res.data?.data ?? [];
          if (rooms.length > 0) {
            setClasses(rooms.slice().sort(sortClasses));
          } else {
            // No classrooms configured — derive class list from enrolled students
            return adminAPI.getDistinctStudentClasses()
              .then(r2 => {
                const fromStudents = (r2.data?.data ?? []).map((c, i) => ({
                  id:      `${c.name}||${c.section || ''}`,  // synthetic id
                  name:    c.name,
                  section: c.section || null,
                }));
                setClasses(fromStudents.sort(sortClasses));
              });
          }
        })
        .catch(() => {});
    }
    reportCardAPI.getSchoolFilters()
      .then(res => setExamTypes(res.data?.data?.examTypes ?? []))
      .catch(() => {});
  }, [isTeacher]);

  // Load students when class filter changes
  const loadClassStudents = useCallback(async () => {
    if (!filterClass) { setClassStudents([]); return; }
    // Support both numeric classroom IDs and synthetic string IDs from student-derived classes
    const cls = classes.find(c => String(c.id) === String(filterClass));
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

      const gradeStyle = {
        O:  'background:#dcfce7;color:#14532d',  'A+': 'background:#dbeafe;color:#1e3a8a',
        A:  'background:#e0f2fe;color:#1e40af',  'B+': 'background:#fef3c7;color:#78350f',
        B:  'background:#ffedd5;color:#7c2d12',  'B-': 'background:#ede9fe;color:#4c1d95',
        C:  'background:#fff7ed;color:#9a3412',  D:   'background:#fef9c3;color:#713f12',
        F:  'background:#fee2e2;color:#7f1d1d',
      };
      const gradeFromPctH = (p) => {
        if (p >= 91) return 'O'; if (p >= 81) return 'A+'; if (p >= 71) return 'A';
        if (p >= 61) return 'B+'; if (p >= 51) return 'B'; if (p >= 41) return 'C';
        if (p >= 35) return 'D'; return 'F';
      };
      const failingH = (r) => r.grade === 'F' || (r.maxMarks > 0 && Math.round((r.marks / r.maxMarks) * 100) < 35);
      const gradeChip = (g) => `<span style="display:inline-block;padding:1px 8px;border-radius:3px;font-weight:800;font-size:11px;${gradeStyle[g]||'background:#f3f4f6;color:#374151'}">${g||'—'}</span>`;
      const pass = (fail) => `<span style="font-weight:700;color:${fail?'#dc2626':'#16a34a'}">${fail?'FAIL':'PASS'}</span>`;

      const buildCard = (data, examLabel = '') => {
        if (!data) return '<div class="page"><p style="color:#999;padding:20px">No data</p></div>';
        const { student = {}, school = {}, marksByExam = {}, attendance = {} } = data;
        const logoSrc = school.logoUrl ? (school.logoUrl.startsWith('http') ? school.logoUrl : `${window.location.origin}${school.logoUrl}`) : null;
        const allExamEntries = Object.entries(marksByExam);
        const allRows  = allExamEntries.flatMap(([,r]) => r);
        const gTotal   = allRows.reduce((s,r) => s + Number(r.marks || 0), 0);
        const gMax     = allRows.reduce((s,r) => s + Number(r.maxMarks || 0), 0);
        const oPct     = gMax > 0 ? Math.round((gTotal / gMax) * 100) : 0;
        const oGrade   = gradeFromPctH(oPct);
        const oFail    = allRows.some(failingH);
        const absent   = Number(attendance.totalDays||0) - Number(attendance.presentDays||0);

        const examsHtml = allExamEntries.map(([et, rows]) => {
          const tot = rows.reduce((s,r) => s + Number(r.marks||0), 0);
          const mx  = rows.reduce((s,r) => s + Number(r.maxMarks||0), 0);
          const ep  = mx > 0 ? Math.round((tot / mx) * 100) : 0;
          const eg  = gradeFromPctH(ep);
          const ef  = rows.some(failingH);
          return `<div class="exam-section">
            <div class="exam-header">
              <span>Subject-wise Marks — ${et}</span>
              <span style="font-weight:800;padding:2px 12px;border-radius:20px;background:${ef?'#dc2626':'#16a34a'};color:#fff;font-size:10px">${ef?'FAIL':'PASS'}</span>
            </div>
            <table class="mtbl"><thead><tr>
              <th style="width:28px">S.No.</th><th style="text-align:left">Subject</th>
              <th>Marks</th><th>Max</th><th>%</th><th>Grade</th><th>Result</th>
            </tr></thead><tbody>
            ${rows.map((r,i)=>{
              const sp = r.maxMarks > 0 ? Math.round((r.marks/r.maxMarks)*100) : 0;
              const sf = failingH(r);
              return `<tr style="${sf?'background:#fef2f2':i%2===0?'':'background:#f8faff'}">
                <td style="text-align:center;color:#9ca3af">${i+1}</td>
                <td style="font-weight:600;color:${sf?'#991b1b':'#111827'}">${r.subject||''}</td>
                <td style="text-align:center;font-weight:800;color:#1e3a8a;font-size:13px">${r.marks??'—'}</td>
                <td style="text-align:center;color:#4b5563">${r.maxMarks??'—'}</td>
                <td style="text-align:center;font-weight:700;color:${sf?'#dc2626':sp>=75?'#16a34a':'#374151'}">${r.maxMarks>0?sp+'%':'—'}</td>
                <td style="text-align:center">${gradeChip(r.grade)}</td>
                <td style="text-align:center">${r.maxMarks > 0 ? pass(sf) : '—'}</td>
              </tr>`;
            }).join('')}
            <tr style="background:#dbeafe;font-weight:900">
              <td colspan="2" style="padding:6px 8px;color:#1e3a8a">TOTAL</td>
              <td style="text-align:center;color:#1e3a8a;font-size:13px">${tot}</td>
              <td style="text-align:center;color:#374151">${mx}</td>
              <td style="text-align:center;font-weight:900;color:${ef?'#dc2626':'#16a34a'}">${ep}%</td>
              <td style="text-align:center">${gradeChip(eg)}</td>
              <td style="text-align:center">${pass(ef)}</td>
            </tr>
            </tbody></table></div>`;
        }).join('');

        return `<div class="page">
          <div class="hdr">
            <div style="display:flex;align-items:center;gap:16px">
              ${logoSrc ? `<img src="${logoSrc}" class="logo" onerror="this.style.display='none'">` : `<div class="logo-ph">${school.name?.charAt(0)||'S'}</div>`}
              <div style="flex:1;text-align:center">
                <div class="school-name">${school.name||'School'}</div>
                ${school.board ? `<div class="school-board">${school.board} Affiliated</div>` : ''}
                ${school.address ? `<div class="school-det">${school.address}</div>` : ''}
                <div class="school-det">${[school.phone&&`Ph: ${school.phone}`,school.email].filter(Boolean).join('  •  ')}</div>
              </div>
              <div class="yr-box"><div class="yr-lbl">Acad. Year</div><div class="yr-val">${school.academicYear||'—'}</div></div>
            </div>
            <div class="title-row">
              <div class="rc-title">PROGRESS REPORT CARD</div>
              ${examLabel ? `<div class="rc-exam">${examLabel}</div>` : ''}
            </div>
          </div>

          <div class="si-box">
            <div class="si-hdr">Student Information</div>
            <div class="si-grid">
              ${[['Student Name',student.name],['Admission No.',student.admissionNumber||'—'],['Roll Number',student.rollNumber||'—'],['Date of Birth',student.dateOfBirth||'—'],['Class & Section',`${student.className||'—'}${student.section?' – '+student.section:''}`],['Parent / Guardian',student.parentName||'—']].map(([l,v])=>`<div class="si-cell"><div class="si-lbl">${l}:</div><div class="si-val">${v||'—'}</div></div>`).join('')}
            </div>
          </div>

          <div class="att-box">
            <div class="si-hdr">Attendance Summary</div>
            <table class="att-tbl"><thead><tr><th>Total Working Days</th><th>Present Days</th><th>Absent Days</th><th>Attendance %</th></tr></thead>
            <tbody><tr>
              <td>${attendance.totalDays??'—'}</td>
              <td style="color:#16a34a;font-weight:700">${attendance.presentDays??'—'}</td>
              <td style="color:#dc2626;font-weight:700">${absent||'—'}</td>
              <td><span style="font-weight:900;font-size:14px;color:${Number(attendance.percentage||0)>=75?'#16a34a':'#dc2626'}">${Number(attendance.percentage||0).toFixed(1)}%</span></td>
            </tr></tbody></table>
          </div>

          ${examsHtml || '<div style="padding:16px;text-align:center;color:#9ca3af;font-size:12px;border:1px dashed #d1d5db;border-radius:6px;margin-bottom:8px">No marks recorded</div>'}

          ${gMax > 0 ? `<div class="sum-box">
            <div class="si-hdr">Academic Summary</div>
            <div class="sum-grid">
              <div class="sum-cell"><div class="sum-lbl">Total Marks</div><div class="sum-val" style="color:#1e3a8a">${gTotal}</div></div>
              <div class="sum-cell"><div class="sum-lbl">Maximum Marks</div><div class="sum-val" style="color:#374151">${gMax}</div></div>
              <div class="sum-cell"><div class="sum-lbl">Percentage</div><div class="sum-val" style="color:${oFail?'#dc2626':'#16a34a'}">${oPct}%</div></div>
              <div class="sum-cell"><div class="sum-lbl">Overall Grade</div><div class="sum-val">${gradeChip(oGrade)}</div></div>
              <div class="sum-cell" style="background:${oFail?'#fef2f2':'#f0fdf4'}"><div class="sum-lbl">Final Result</div><div class="sum-val" style="color:${oFail?'#dc2626':'#16a34a'}">${oFail?'FAIL':'PASS'}</div></div>
            </div>
          </div>` : ''}

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
            <div style="border:1.5px solid #bfdbfe;border-radius:6px;overflow:hidden">
              <div class="si-hdr">Grading Scale</div>
              <table style="width:100%;border-collapse:collapse;font-size:10px">
                <thead><tr style="background:#eff6ff"><th style="padding:4px;text-align:center;color:#1e3a8a;border-bottom:1px solid #bfdbfe">%</th><th style="padding:4px;text-align:center;color:#1e3a8a;border-bottom:1px solid #bfdbfe">Grade</th><th style="padding:4px;text-align:left;color:#1e3a8a;border-bottom:1px solid #bfdbfe">Performance</th></tr></thead>
                <tbody>
                  ${[['91–100','O','Outstanding'],['81–90','A+','Excellent'],['71–80','A','Very Good'],['61–70','B+','Good'],['51–60','B','Above Average'],['41–50','C','Average'],['35–40','D','Below Average'],['< 35','F','Fail']].map(([r,g,l],i)=>`<tr style="${i%2===0?'':'background:#f8faff'}"><td style="padding:3px 6px;text-align:center;color:#374151">${r}</td><td style="padding:3px 6px;text-align:center">${gradeChip(g)}</td><td style="padding:3px 6px;color:#4b5563">${l}</td></tr>`).join('')}
                </tbody>
              </table>
            </div>
            <div style="border:1.5px solid #bfdbfe;border-radius:6px;overflow:hidden">
              <div class="si-hdr">Class Teacher Remarks</div>
              <div style="padding:10px 12px;background:#fafbfc">
                ${[0,1,2,3].map(()=>'<div style="border-bottom:1px solid #d1d5db;margin-bottom:18px;min-height:18px"></div>').join('')}
              </div>
            </div>
          </div>

          <div style="border:1.5px solid #bfdbfe;border-radius:6px;padding:12px 20px">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
              ${['Class Teacher','Principal','Parent / Guardian'].map(s=>`<div style="text-align:center"><div style="height:40px;border-bottom:1.5px solid #374151;margin:0 16px 6px"></div><div style="font-size:11px;font-weight:700;color:#1e293b">${s}</div><div style="font-size:10px;color:#9ca3af;margin-top:1px">Signature &amp; Seal</div></div>`).join('')}
            </div>
          </div>
        </div>`;
      };

      w.document.write(`<!DOCTYPE html><html><head><title>Class Report Cards</title>
      <style>
        @page{size:A4 portrait;margin:8mm 10mm}
        *{margin:0;padding:0;box-sizing:border-box}
        body{background:#fff;font-family:"Segoe UI",Arial,sans-serif;font-size:12px}
        .page{page-break-after:always;padding:0;display:flex;flex-direction:column;gap:8px}
        .page:last-child{page-break-after:avoid}
        .hdr{border:2px solid #1d4ed8;border-radius:6px;padding:12px 16px 10px;margin-bottom:8px}
        .logo{width:72px;height:72px;object-fit:contain}
        .logo-ph{width:72px;height:72px;background:#dbeafe;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#1d4ed8;font-weight:900;font-size:22px;flex-shrink:0}
        .school-name{font-size:19px;font-weight:900;color:#1e3a8a;letter-spacing:.5px}
        .school-board{font-size:10px;color:#2563eb;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-top:2px}
        .school-det{font-size:10px;color:#4b5563;margin-top:2px}
        .yr-box{border:2px solid #1d4ed8;border-radius:5px;padding:6px 12px;text-align:center;min-width:80px;background:#eff6ff}
        .yr-lbl{font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px}
        .yr-val{font-size:13px;font-weight:900;color:#1e3a8a;margin-top:2px}
        .title-row{text-align:center;margin-top:10px;padding-top:8px;border-top:1.5px solid #bfdbfe}
        .rc-title{font-size:14px;font-weight:900;letter-spacing:3px;color:#1e3a8a;text-transform:uppercase}
        .rc-exam{font-size:11px;color:#2563eb;font-weight:700;margin-top:3px;letter-spacing:1px}
        .si-box,.att-box,.sum-box{border:1.5px solid #bfdbfe;border-radius:6px;overflow:hidden;margin-bottom:8px}
        .si-hdr{background:#1d4ed8;padding:4px 12px;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px}
        .si-grid{display:grid;grid-template-columns:1fr 1fr;padding:8px 12px;gap:6px 20px}
        .si-cell{display:flex;align-items:flex-start;gap:5px}
        .si-lbl{font-size:10px;font-weight:700;color:#4b5563;min-width:115px;flex-shrink:0}
        .si-val{font-size:11px;font-weight:600;color:#111827}
        .att-tbl{width:100%;border-collapse:collapse;font-size:11px}
        .att-tbl th{padding:5px 10px;text-align:center;font-weight:700;color:#1e3a8a;background:#eff6ff;border-bottom:1px solid #bfdbfe}
        .att-tbl td{padding:6px 10px;text-align:center;font-weight:600}
        .exam-section{border:1.5px solid #bfdbfe;border-radius:6px;overflow:hidden;margin-bottom:8px}
        .exam-header{background:#1d4ed8;padding:4px 12px;display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px}
        .mtbl{width:100%;border-collapse:collapse;font-size:11px}
        .mtbl th{padding:5px 7px;background:#eff6ff;color:#1e3a8a;font-weight:700;font-size:10px;text-align:center;border-bottom:1.5px solid #bfdbfe}
        .mtbl td{padding:5px 7px;border-bottom:1px solid #e5e7eb}
        .sum-grid{display:grid;grid-template-columns:repeat(5,1fr)}
        .sum-cell{padding:10px 6px;text-align:center;border-right:1px solid #bfdbfe}
        .sum-cell:last-child{border-right:none}
        .sum-lbl{font-size:8px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
        .sum-val{font-size:16px;font-weight:900}
        @media print{.page{page-break-after:always}}
      </style></head><body>${cards.map(c => buildCard(c.data, filterExam)).join('')}</body></html>`);
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
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 56, display: 'block', marginBottom: 12, color: 'var(--border-strong)' }}>assignment_ind</span>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' }}>Report cards are available to class teachers only</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>You are not assigned as a class teacher. Contact your admin to update your role.</p>
        </div>
      )}

      {/* Loading teacher assignment */}
      {isTeacher && isClassTeacher === null && (
        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading your class assignment…</div>
      )}

      {/* Filters bar — shown for admin/super_admin and class teachers */}
      {(!isTeacher || isClassTeacher === true) && isClassTeacher !== null && (
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        {/* Class selector — only for admin/super_admin; teachers have their class auto-selected */}
        {!isTeacher && (
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Class</label>
            <select value={filterClass} onChange={e => { setFilterClass(e.target.value); setSelectedStudent(null); setCardData(null); }}
              style={{ padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 140 }}>
              <option value="">— Select class —</option>
              {visibleClasses.map(c => (
                <option key={c.id} value={c.id}>{c.name}{c.section ? ` - ${c.section}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {/* Exam type */}
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Exam Type</label>
          <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 150 }}>
            <option value="">All Exam Types</option>
            {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
          </select>
        </div>

        {/* OR search student — admin/super_admin only */}
        {!isTeacher && (
          <div style={{ position: 'relative' }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Or search student</label>
            <input value={studentSearch} onChange={e => setStudentSearch(e.target.value)} placeholder="Name or admission no…"
              style={{ padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', width: 200 }} />
            {searching && <span style={{ position: 'absolute', right: 10, top: 32, fontSize: 11, color: 'var(--text-muted)' }}>Searching…</span>}
            {searchResults.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, maxHeight: 200, overflowY: 'auto' }}>
                {searchResults.map(s => (
                  <div key={s.id} onMouseDown={() => selectStudent(s)}
                    style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 13 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                    <div style={{ fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.className}{s.section ? ` - ${s.section}` : ''} · Roll: {s.rollNumber}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {(selectedStudent || (!isTeacher && filterClass)) && (
          <button onClick={() => { setSelectedStudent(null); if (!isTeacher) setFilterClass(''); setCardData(null); setClassStudents([]); setStudentSearch(''); }}
            style={{ padding: '8px 14px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)', marginTop: 18 }}>
            {isTeacher ? 'Back to class' : 'Clear'}
          </button>
        )}
      </div>
      )}

      {/* Class student list */}
      {filterClass && !selectedStudent && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: 'var(--surface-alt)', borderBottom: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>Students in class</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{loadingClass ? 'Loading…' : `${classStudents.length} students`}</span>
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
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
          ) : classStudents.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>No students found</div>
          ) : (
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              {classStudents.map((s, i) => (
                <div key={s.studentId} onClick={() => selectClassStudent(s)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#eef2ff'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)'}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    {(s.name || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Roll: {s.rollNumber} · Adm: {s.admissionNumber || '—'}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
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
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, background: 'var(--surface)', fontSize: 12, fontWeight: 600, cursor: 'pointer', color: 'var(--text-secondary)' }}>
              <span className="material-icons" style={{ fontSize: 16 }}>arrow_back</span>
              {filterClass ? 'Back to class' : 'Clear'}
            </button>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{selectedStudent.name}</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading report card…</div>
          ) : (
            <ProfessionalReportCard data={cardData} gradeScale={gradeScale} examFilter={filterExam} onPrint={handlePrint} />
          )}
        </div>
      )}

      {/* Empty state — only for admin/super_admin (teachers auto-load their class) */}
      {!isTeacher && !filterClass && !selectedStudent && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <span className="material-icons" style={{ fontSize: 56, display: 'block', marginBottom: 12, color: 'var(--border-strong)' }}>school</span>
          <p style={{ fontSize: 15, fontWeight: 600 }}>Select a class or search for a student to view report cards</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Use the class dropdown to browse all students, or type a name to search directly</p>
        </div>
      )}
    </Layout>
  );
}
