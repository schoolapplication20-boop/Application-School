import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import ProfessionalReportCard from '../../components/ProfessionalReportCard';
import { reportCardAPI, adminAPI, teacherAPI, gradeScaleAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../services/api';
import { sortClasses } from '../../utils/classOrder';
import { printSingleCard, printAllCards } from '../../utils/reportCardPrint';

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
  const [isClassTeacher, setIsClassTeacher] = useState(null);
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
      teacherAPI.getClassTeacherAssignment()
        .then(res => {
          const assignment = res.data?.data;
          if (assignment?.isClassTeacher && assignment?.classId) {
            setIsClassTeacher(true);
            setClasses([{
              id:      assignment.classId,
              name:    assignment.className,
              section: assignment.section,
            }]);
            setFilterClass(String(assignment.classId));
          } else {
            setIsClassTeacher(false);
            setClasses([]);
          }
        })
        .catch(() => { setIsClassTeacher(false); setClasses([]); });
    } else {
      setIsClassTeacher(false);
      adminAPI.getClasses()
        .then(res => {
          const rooms = res.data?.data ?? [];
          if (rooms.length > 0) {
            setClasses(rooms.slice().sort(sortClasses));
          } else {
            return adminAPI.getDistinctStudentClasses()
              .then(r2 => {
                const fromStudents = (r2.data?.data ?? []).map((c) => ({
                  id:      `${c.name}||${c.section || ''}`,
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

  // Load report card for selected student
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

  // Student name search — admin/super_admin only
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

  // Single student — open dedicated print window (no portal CSS interference, no cropping)
  const handlePrint = () => {
    if (cardData) printSingleCard(cardData, filterExam);
  };

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
      printAllCards(cards, filterExam);
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

      {/* Filters bar */}
      {(!isTeacher || isClassTeacher === true) && isClassTeacher !== null && (
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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

        <div>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: 4 }}>Exam Type</label>
          <select value={filterExam} onChange={e => setFilterExam(e.target.value)}
            style={{ padding: '8px 12px', border: '1.5px solid var(--border-strong)', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 150 }}>
            <option value="">All Exam Types</option>
            {examTypes.map(et => <option key={et} value={et}>{et}</option>)}
          </select>
        </div>

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

      {/* Empty state */}
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
