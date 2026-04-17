import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { teacherAPI } from '../../services/api';
import { exportCSV } from '../../services/attendanceStore';

const TODAY = new Date().toISOString().split('T')[0];

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', short: 'P', bg: '#76C442', light: '#f0fff4', text: '#276749', icon: 'check_circle' },
  ABSENT:  { label: 'Absent',  short: 'A', bg: '#e53e3e', light: '#fff5f5', text: '#c53030', icon: 'cancel'       },
  LEAVE:   { label: 'Leave',   short: 'L', bg: '#ed8936', light: '#fffaf0', text: '#c05621', icon: 'event_busy'   },
  OTHERS:  { label: 'Others',  short: 'O', bg: '#805ad5', light: '#faf5ff', text: '#553c9a', icon: 'more_horiz'   },
};

const getInitials = (name) => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const fmtDate    = (d) => { if (!d) return '—'; return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const pctColor   = (p) => p >= 90 ? '#276749' : p >= 75 ? '#c05621' : '#c53030';
const classLabel = (cls) => cls ? `${cls.name}${cls.section ? '-' + cls.section : ''}` : '';

export default function Attendance() {
  const [activeTab, setActiveTab]           = useState('mark');
  const [classes, setClasses]               = useState([]);
  const [selectedClass, setSelectedClass]   = useState(null);
  const [selectedDate, setSelectedDate]     = useState(TODAY);
  const [students, setStudents]             = useState([]);
  const [attendanceMap, setAttendanceMap]   = useState({});
  const [alreadyMarked, setAlreadyMarked]   = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [primaryClass, setPrimaryClass]     = useState(null);   // teacher's designated class
  const [noClassAssigned, setNoClassAssigned] = useState(false);
  const [toast, setToast]                   = useState(null);

  // History state
  const [historyDates, setHistoryDates]     = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [expandedDate, setExpandedDate]     = useState(null);
  const [expandedStudents, setExpandedStudents] = useState([]);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Load teacher profile + assigned classes on mount ──────────────────────
  useEffect(() => {
    setLoadingClasses(true);
    Promise.all([
      teacherAPI.getMyProfile().catch(() => null),
      teacherAPI.getMyClasses().catch(() => null),
    ]).then(([profileRes, classesRes]) => {
      const profile = profileRes?.data?.data ?? null;
      const list    = classesRes?.data?.data  ?? [];

      setClasses(list);

      if (!list.length) {
        setNoClassAssigned(true);
        return;
      }

      // Resolve primary class: prefer teacher.primaryClassId, else first in list
      const primaryId = profile?.primaryClassId ?? profile?.primaryClass?.id ?? null;
      const primary   = primaryId ? (list.find(c => c.id === primaryId) ?? list[0]) : list[0];

      setPrimaryClass(primary);
      setSelectedClass(primary);
    }).finally(() => setLoadingClasses(false));
  }, []);

  // ── When class or date changes → load students + existing attendance ──────
  useEffect(() => {
    if (!selectedClass) return;
    setLoadingStudents(true);
    setStudents([]);
    setAttendanceMap({});
    setAlreadyMarked(false);

    Promise.all([
      teacherAPI.getClassStudents(selectedClass.id),
      teacherAPI.getAttendance(selectedClass.id, selectedDate),
    ])
      .then(([studRes, attRes]) => {
        const roster  = studRes.data?.data ?? [];
        const attList = attRes.data?.data  ?? [];

        setStudents(roster);

        const map = {};
        roster.forEach(s => { map[s.id] = { status: 'PRESENT', note: '' }; });
        if (attList.length) {
          attList.forEach(a => { map[a.studentId] = { status: a.status, note: '' }; });
          setAlreadyMarked(true);
        }
        setAttendanceMap(map);
      })
      .catch(() => showToast('Failed to load class data', 'error'))
      .finally(() => setLoadingStudents(false));
  }, [selectedClass, selectedDate]);

  // ── Load history dates when switching to history tab ──────────────────────
  useEffect(() => {
    if (activeTab !== 'history' || !selectedClass) return;
    setLoadingHistory(true);
    teacherAPI.getAttendanceDates(selectedClass.id)
      .then(res => setHistoryDates(res.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [activeTab, selectedClass]);

  const setStatus = (id, status) => setAttendanceMap(m => ({ ...m, [id]: { ...m[id], status } }));
  const setNote   = (id, note)   => setAttendanceMap(m => ({ ...m, [id]: { ...m[id], note   } }));

  const markAll = (status) => {
    const map = {};
    students.forEach(s => { map[s.id] = { status, note: '' }; });
    setAttendanceMap(map);
  };

  const countByStatus = (st) =>
    students.filter(s => (attendanceMap[s.id]?.status || 'PRESENT') === st).length;

  // ── Save attendance ───────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedClass || !students.length) return;
    setSaving(true);
    const payload = students.map(s => ({
      studentId: s.id,
      classId:   selectedClass.id,
      className: classLabel(selectedClass),
      date:      selectedDate,
      status:    attendanceMap[s.id]?.status || 'PRESENT',
    }));
    try {
      await teacherAPI.markAttendance(payload);
      setAlreadyMarked(true);
      showToast(`Attendance ${alreadyMarked ? 'updated' : 'saved'} for ${classLabel(selectedClass)} — ${fmtDate(selectedDate)}`);
    } catch {
      showToast('Failed to save attendance. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Expand a date to show student-level detail ────────────────────────────
  const handleExpandDate = async (date) => {
    if (expandedDate === date) { setExpandedDate(null); setExpandedStudents([]); return; }
    try {
      const res = await teacherAPI.getAttendance(selectedClass.id, date);
      setExpandedStudents(res.data?.data ?? []);
      setExpandedDate(date);
    } catch {
      showToast('Failed to load details', 'error');
    }
  };

  // ── Export history as CSV ─────────────────────────────────────────────────
  const handleExportCSV = async () => {
    const rows = [];
    for (const date of historyDates) {
      try {
        const res  = await teacherAPI.getAttendance(selectedClass.id, date);
        const list = res.data?.data ?? [];
        const p = list.filter(a => a.status === 'PRESENT').length;
        const a = list.filter(a => a.status === 'ABSENT').length;
        const l = list.filter(a => a.status === 'LEAVE').length;
        const o = list.filter(a => a.status === 'OTHERS').length;
        const t = list.length;
        rows.push({ Date: fmtDate(date), Class: classLabel(selectedClass), Present: p, Absent: a, Leave: l, Others: o, Total: t, 'Attendance%': t ? `${Math.round((p / t) * 100)}%` : '0%' });
      } catch { /* skip */ }
    }
    exportCSV(rows, `attendance_${selectedClass.name}_${TODAY}.csv`);
  };

  const TABS = [
    { key: 'mark',    label: 'Mark Attendance', icon: 'edit_note' },
    { key: 'history', label: 'History',          icon: 'history'   },
  ];

  // ── No class assigned — show informative state ────────────────────────────
  if (!loadingClasses && noClassAssigned) {
    return (
      <Layout pageTitle="Attendance">
        <div className="page-header">
          <h1>Attendance Management</h1>
          <p>Mark and track student attendance for your assigned classes</p>
        </div>
        <div className="data-table-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
          <span className="material-icons" style={{ fontSize: 52, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>class</span>
          <h3 style={{ color: '#4a5568', marginBottom: 8 }}>No Class Assigned</h3>
          <p style={{ color: '#718096', fontSize: 14, maxWidth: 400, margin: '0 auto' }}>
            You have not been assigned as a class teacher yet. Please contact the administrator to assign you to a class and section.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Attendance">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Attendance Management</h1>
          <p>Mark and track student attendance for your assigned classes</p>
        </div>
        {/* Class Teacher Badge */}
        {primaryClass && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'linear-gradient(135deg, #76C44215, #76C44230)',
            border: '1.5px solid #76C44250', borderRadius: 12,
            padding: '10px 18px',
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: '#76C442', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span className="material-icons" style={{ color: '#fff', fontSize: 18 }}>school</span>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Class Teacher</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#276749' }}>
                {classLabel(primaryClass)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, background: '#fff', borderRadius: 12, padding: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', width: 'fit-content' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: activeTab === t.key ? '#76C442' : 'transparent',
            color:      activeTab === t.key ? '#fff'    : '#718096',
            transition: 'all 0.2s',
          }}>
            <span className="material-icons" style={{ fontSize: 17 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ MARK ATTENDANCE ════════════════ */}
      {activeTab === 'mark' && (
        <>
          {/* Controls */}
          <div className="data-table-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1', minWidth: 180 }}>
                <label className="form-label fw-medium small">Class</label>
                <select className="form-select form-select-sm"
                  value={selectedClass?.id || ''}
                  onChange={e => {
                    const cls = classes.find(c => String(c.id) === e.target.value);
                    setSelectedClass(cls || null);
                  }}>
                  {classes.length === 0 && <option value="">No classes assigned</option>}
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{classLabel(c)}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: '1', minWidth: 160 }}>
                <label className="form-label fw-medium small">Date</label>
                <input type="date" className="form-control form-control-sm"
                  value={selectedDate} max={TODAY}
                  onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => markAll('PRESENT')} style={{ padding: '8px 12px', background: '#76C44218', border: '1.5px solid #76C44250', borderRadius: 8, color: '#276749', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-icons" style={{ fontSize: 15 }}>done_all</span> All Present
                </button>
                <button onClick={() => markAll('ABSENT')} style={{ padding: '8px 12px', background: '#e53e3e18', border: '1.5px solid #e53e3e50', borderRadius: 8, color: '#c53030', fontWeight: 600, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-icons" style={{ fontSize: 15 }}>remove_done</span> All Absent
                </button>
              </div>
            </div>

            {/* Summary Strip */}
            <div style={{ display: 'flex', gap: 10, marginTop: 16, padding: '12px 14px', background: '#f7fafc', borderRadius: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: cfg.light, borderRadius: 20, border: `1.5px solid ${cfg.bg}30` }}>
                  <span className="material-icons" style={{ color: cfg.bg, fontSize: 15 }}>{cfg.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 17, color: cfg.bg }}>{countByStatus(st)}</span>
                  <span style={{ fontSize: 12, color: cfg.text, fontWeight: 600 }}>{cfg.label}</span>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 7, padding: '5px 12px', background: '#ebf8ff', borderRadius: 20, border: '1.5px solid #3182ce30' }}>
                <span className="material-icons" style={{ color: '#3182ce', fontSize: 15 }}>people</span>
                <span style={{ fontWeight: 800, fontSize: 17, color: '#3182ce' }}>{students.length}</span>
                <span style={{ fontSize: 12, color: '#2b6cb0', fontWeight: 600 }}>Total</span>
              </div>
              {alreadyMarked && (
                <span style={{ background: '#f0fff4', border: '1.5px solid #9ae6b4', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#276749', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="material-icons" style={{ fontSize: 13 }}>check_circle</span> Already marked
                </span>
              )}
            </div>
          </div>

          {/* Student List */}
          <div className="data-table-card">
            {loadingStudents ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>
                <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>refresh</span>
                Loading students…
              </div>
            ) : students.length === 0 ? (
              <div className="empty-state">
                <span className="material-icons">people</span>
                <h3>No students found{selectedClass ? ` for ${classLabel(selectedClass)}` : ''}</h3>
                <p>
                  {selectedClass
                    ? `No students are assigned to ${classLabel(selectedClass)} yet. Add students via Admin → Students.`
                    : 'Students assigned to this class will appear here.'}
                </p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>#</th>
                        <th>Student</th>
                        <th>Roll No</th>
                        <th style={{ minWidth: 280 }}>Attendance Status</th>
                        <th style={{ minWidth: 200 }}>Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, idx) => {
                        const entry  = attendanceMap[s.id] || { status: 'PRESENT', note: '' };
                        const status = entry.status;
                        const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.PRESENT;
                        const rowBg  = status === 'ABSENT' ? '#fff5f515' : status === 'LEAVE' ? '#fffaf015' : status === 'OTHERS' ? '#faf5ff15' : 'transparent';

                        return (
                          <tr key={s.id} style={{ background: rowBg, transition: 'background 0.2s' }}>
                            <td style={{ color: '#a0aec0', fontSize: 12 }}>{idx + 1}</td>
                            <td>
                              <div className="student-cell">
                                <div className="student-avatar-sm" style={{ background: cfg.bg, color: '#fff' }}>
                                  {getInitials(s.name)}
                                </div>
                                <div>
                                  <span className="student-name">{s.name}</span>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#718096', fontWeight: 600 }}>{s.rollNumber}</td>
                            <td>
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {Object.entries(STATUS_CONFIG).map(([st, c]) => (
                                  <button key={st} onClick={() => setStatus(s.id, st)} style={{
                                    padding: '6px 12px', border: `2px solid ${status === st ? c.bg : '#e2e8f0'}`,
                                    borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                    background:  status === st ? c.bg    : '#f7fafc',
                                    color:       status === st ? '#fff'  : '#a0aec0',
                                    transition: 'all 0.15s',
                                    display: 'flex', alignItems: 'center', gap: 4,
                                  }}>
                                    <span className="material-icons" style={{ fontSize: 13 }}>{c.icon}</span>
                                    {c.label}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td>
                              {(status === 'ABSENT' || status === 'LEAVE' || status === 'OTHERS') ? (
                                <input
                                  type="text"
                                  className="form-control form-control-sm"
                                  placeholder={status === 'ABSENT' ? 'Reason for absence…' : status === 'LEAVE' ? 'Leave reason…' : 'Specify…'}
                                  value={entry.note}
                                  onChange={e => setNote(s.id, e.target.value)}
                                  style={{ border: `1.5px solid ${cfg.bg}60`, background: cfg.light }}
                                />
                              ) : (
                                <span style={{ fontSize: 12, color: '#cbd5e0' }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f0f4f8', marginTop: 12, gap: 10 }}>
                  <button onClick={handleSave} disabled={saving} style={{
                    padding: '12px 32px', background: saving ? '#a0aec0' : '#76C442', border: 'none', borderRadius: 10,
                    color: '#fff', fontWeight: 700, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    boxShadow: saving ? 'none' : '0 4px 12px rgba(118,196,66,0.35)',
                    transition: 'all 0.2s',
                  }}>
                    <span className="material-icons" style={{ fontSize: 18 }}>{saving ? 'hourglass_empty' : 'save'}</span>
                    {saving ? 'Saving…' : alreadyMarked ? 'Update Attendance' : 'Submit Attendance'}
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ════════════════ HISTORY ════════════════ */}
      {activeTab === 'history' && (
        <div className="data-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select className="form-select form-select-sm" style={{ width: 'auto' }}
                value={selectedClass?.id || ''}
                onChange={e => { const cls = classes.find(c => String(c.id) === e.target.value); setSelectedClass(cls || null); }}>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{classLabel(c)}</option>
                ))}
              </select>
              <span style={{ fontSize: 13, color: '#a0aec0' }}>{historyDates.length} recorded days</span>
            </div>
            <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#276749', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <span className="material-icons" style={{ fontSize: 16 }}>download</span> Export CSV
            </button>
          </div>

          {loadingHistory ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#a0aec0' }}>Loading history…</div>
          ) : historyDates.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">history</span>
              <h3>No attendance records yet</h3>
              <p>Mark attendance first to see history here</p>
            </div>
          ) : (
            <div>
              {historyDates.map(date => (
                <HistoryRow
                  key={date}
                  date={date}
                  classId={selectedClass?.id}
                  expanded={expandedDate === date}
                  expandedStudents={expandedStudents}
                  onToggle={() => handleExpandDate(date)}
                  clsLabel={classLabel(selectedClass)}
                  students={students}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </Layout>
  );
}

// ── History Row ───────────────────────────────────────────────────────────────
function HistoryRow({ date, classId, expanded, expandedStudents, onToggle, clsLabel, students = [] }) {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!classId) return;
    teacherAPI.getAttendanceSummary(classId, date)
      .then(res => setSummary(res.data?.data ?? null))
      .catch(() => {});
  }, [classId, date]);

  const pct = summary && summary.total > 0
    ? Math.round((summary.present / summary.total) * 100)
    : null;

  return (
    <div style={{ borderBottom: '1px solid #f0f4f8' }}>
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 4px', cursor: 'pointer', userSelect: 'none' }}>
        <span className="material-icons" style={{ fontSize: 16, color: '#a0aec0', transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'none' }}>chevron_right</span>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#2d3748', minWidth: 110 }}>{new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          <span style={{ background: '#76C44215', color: '#276749', padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>{clsLabel}</span>

          {summary ? (
            <>
              {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', background: cfg.light, borderRadius: 14, border: `1px solid ${cfg.bg}30` }}>
                  <span style={{ fontWeight: 800, fontSize: 13, color: cfg.bg }}>{summary[st.toLowerCase()] ?? 0}</span>
                  <span style={{ fontSize: 11, color: cfg.text, fontWeight: 600 }}>{cfg.label}</span>
                </div>
              ))}
              {pct !== null && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <div style={{ width: 50, height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: pct >= 90 ? '#76C442' : pct >= 75 ? '#ed8936' : '#e53e3e', borderRadius: 4 }} />
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 13, color: pctColor(pct) }}>{pct}%</span>
                </div>
              )}
            </>
          ) : (
            <span style={{ fontSize: 12, color: '#a0aec0' }}>Loading…</span>
          )}
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 16px 36px' }}>
          {expandedStudents.length === 0 ? (
            <p style={{ color: '#a0aec0', fontSize: 13 }}>No records found for this date.</p>
          ) : (
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr><th>#</th><th>Student Name</th><th>Roll No</th><th>Status</th></tr>
              </thead>
              <tbody>
                {expandedStudents.map((a, idx) => {
                  const cfg     = STATUS_CONFIG[a.status] || STATUS_CONFIG.PRESENT;
                  const student = students.find(s => s.id === a.studentId);
                  return (
                    <tr key={a.id}>
                      <td style={{ color: '#a0aec0' }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600, color: '#2d3748' }}>{student?.name || `Student #${a.studentId}`}</td>
                      <td style={{ fontFamily: 'monospace', color: '#718096' }}>{student?.rollNumber || '—'}</td>
                      <td>
                        <span style={{ background: cfg.light, color: cfg.bg, border: `1.5px solid ${cfg.bg}40`, borderRadius: 12, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
