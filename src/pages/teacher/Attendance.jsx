import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import {
  getAll, upsertRecord, getRecord, getStudentsForClass, getClassKeys, exportCSV,
} from '../../services/attendanceStore';

const TODAY = new Date().toISOString().split('T')[0];

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', short: 'P', bg: '#76C442', light: '#f0fff4', text: '#276749', icon: 'check_circle'  },
  ABSENT:  { label: 'Absent',  short: 'A', bg: '#e53e3e', light: '#fff5f5', text: '#c53030', icon: 'cancel'        },
  LATE:    { label: 'Late',    short: 'L', bg: '#ed8936', light: '#fffaf0', text: '#c05621', icon: 'schedule'      },
};

const getInitials = (name) => (name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const fmtDate    = (d) => { if (!d) return '—'; return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const pctColor   = (p) => p >= 90 ? '#276749' : p >= 75 ? '#c05621' : '#c53030';

export default function Attendance() {
  const [activeTab, setActiveTab]       = useState('mark');
  const [classKeys, setClassKeys]       = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedDate, setSelectedDate]   = useState(TODAY);
  const [attendanceMap, setAttendanceMap] = useState({}); // { studentId: { status, reason } }
  const [students, setStudents]           = useState([]);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [toast, setToast]                 = useState(null);

  // History state
  const [allRecords, setAllRecords]       = useState([]);
  const [histClass,  setHistClass]        = useState('');
  const [histFrom,   setHistFrom]         = useState('');
  const [histTo,     setHistTo]           = useState(TODAY);

  // Load classes on mount
  useEffect(() => {
    const keys = getClassKeys();
    setClassKeys(keys);
    if (keys.length) setSelectedClass(keys[0]);
    setAllRecords(getAll());
  }, []);

  // When class or date changes → load students + existing attendance
  useEffect(() => {
    if (!selectedClass) return;
    const roster  = getStudentsForClass(selectedClass);
    setStudents(roster);

    const existing = getRecord(selectedClass, selectedDate);
    if (existing) {
      const map = {};
      existing.students.forEach(s => { map[s.id] = { status: s.status, reason: s.reason || '' }; });
      setAttendanceMap(map);
      setAlreadyMarked(true);
    } else {
      // default all PRESENT
      const map = {};
      roster.forEach(s => { map[s.id] = { status: 'PRESENT', reason: '' }; });
      setAttendanceMap(map);
      setAlreadyMarked(false);
    }
  }, [selectedClass, selectedDate]);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const setStatus = (id, status) => setAttendanceMap(m => ({ ...m, [id]: { ...m[id], status } }));
  const setReason = (id, reason) => setAttendanceMap(m => ({ ...m, [id]: { ...m[id], reason } }));

  const markAll = (status) => {
    const map = {};
    students.forEach(s => { map[s.id] = { status, reason: '' }; });
    setAttendanceMap(map);
  };

  const countByStatus = (st) => students.filter(s => (attendanceMap[s.id]?.status || 'PRESENT') === st).length;

  const handleSave = () => {
    if (!selectedClass || !students.length) return;
    const record = {
      id:       `${selectedClass}-${selectedDate}`,
      classKey: selectedClass,
      date:     selectedDate,
      markedBy: 'Teacher',
      markedAt: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      students: students.map(s => ({
        id:     s.id,
        name:   s.name,
        rollNo: s.rollNo,
        status: attendanceMap[s.id]?.status || 'PRESENT',
        reason: attendanceMap[s.id]?.reason || '',
      })),
    };
    upsertRecord(record);
    setAlreadyMarked(true);
    setAllRecords(getAll());
    showToast(`Attendance saved for Class ${selectedClass} — ${fmtDate(selectedDate)}`);
  };

  // ── History helpers ────────────────────────────────────────────────────────
  const histFiltered = allRecords.filter(r => {
    if (histClass && r.classKey !== histClass) return false;
    if (histFrom   && r.date < histFrom)        return false;
    if (histTo     && r.date > histTo)          return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const handleExportCSV = () => {
    const rows = histFiltered.map(r => {
      const p = r.students.filter(s => s.status === 'PRESENT').length;
      const a = r.students.filter(s => s.status === 'ABSENT').length;
      const l = r.students.filter(s => s.status === 'LATE').length;
      const t = r.students.length;
      return { Date: fmtDate(r.date), Class: r.classKey, Present: p, Absent: a, Late: l, Total: t, Percentage: t ? `${Math.round((p/t)*100)}%` : '0%', 'Marked By': r.markedBy, 'Marked At': r.markedAt };
    });
    exportCSV(rows, `attendance_${histClass || 'all'}_${TODAY}.csv`);
  };

  const handleExportStudentCSV = () => {
    const rows = [];
    histFiltered.forEach(r => {
      r.students.forEach(s => {
        rows.push({ Date: fmtDate(r.date), Class: r.classKey, 'Roll No': s.rollNo, Name: s.name, Status: s.status, Reason: s.reason || '' });
      });
    });
    exportCSV(rows, `student_attendance_${TODAY}.csv`);
  };

  const TABS = [
    { key: 'mark',    label: 'Mark Attendance', icon: 'edit_note' },
    { key: 'history', label: 'History',          icon: 'history'   },
  ];

  return (
    <Layout pageTitle="Attendance">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header">
        <h1>Attendance Management</h1>
        <p>Mark and track student attendance for your classes</p>
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

      {/* ══════════════════════ MARK ATTENDANCE ══════════════════════ */}
      {activeTab === 'mark' && (
        <>
          {/* Controls */}
          <div className="data-table-card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1', minWidth: 160 }}>
                <label className="form-label fw-medium small">Class</label>
                <select className="form-select form-select-sm"
                  value={selectedClass}
                  onChange={e => { setSelectedClass(e.target.value); }}>
                  {classKeys.map(k => <option key={k} value={k}>Class {k}</option>)}
                </select>
              </div>
              <div style={{ flex: '1', minWidth: 160 }}>
                <label className="form-label fw-medium small">Date</label>
                <input type="date" className="form-control form-control-sm"
                  value={selectedDate} max={TODAY}
                  onChange={e => setSelectedDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => markAll('PRESENT')} style={{ padding: '8px 14px', background: '#76C44218', border: '1.5px solid #76C44250', borderRadius: 8, color: '#276749', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>done_all</span> All Present
                </button>
                <button onClick={() => markAll('ABSENT')} style={{ padding: '8px 14px', background: '#e53e3e18', border: '1.5px solid #e53e3e50', borderRadius: 8, color: '#c53030', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-icons" style={{ fontSize: 16 }}>remove_done</span> All Absent
                </button>
              </div>
            </div>

            {/* Summary strip */}
            <div style={{ display: 'flex', gap: 12, marginTop: 16, padding: '14px 16px', background: '#f7fafc', borderRadius: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
                <div key={st} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: cfg.light, borderRadius: 20, border: `1.5px solid ${cfg.bg}30` }}>
                  <span className="material-icons" style={{ color: cfg.bg, fontSize: 16 }}>{cfg.icon}</span>
                  <span style={{ fontWeight: 800, fontSize: 18, color: cfg.bg }}>{countByStatus(st)}</span>
                  <span style={{ fontSize: 12, color: cfg.text, fontWeight: 600 }}>{cfg.label}</span>
                </div>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', background: '#ebf8ff', borderRadius: 20, border: '1.5px solid #3182ce30' }}>
                <span className="material-icons" style={{ color: '#3182ce', fontSize: 16 }}>people</span>
                <span style={{ fontWeight: 800, fontSize: 18, color: '#3182ce' }}>{students.length}</span>
                <span style={{ fontSize: 12, color: '#2b6cb0', fontWeight: 600 }}>Total</span>
              </div>
              {alreadyMarked && (
                <span style={{ marginLeft: 'auto', background: '#f0fff4', border: '1.5px solid #9ae6b4', borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, color: '#276749', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="material-icons" style={{ fontSize: 14 }}>check_circle</span> Already marked
                </span>
              )}
            </div>
          </div>

          {/* Student list */}
          <div className="data-table-card">
            {students.length === 0 ? (
              <div className="empty-state">
                <span className="material-icons">people</span>
                <h3>No students found for Class {selectedClass}</h3>
                <p>Add students from the Students module</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th style={{ minWidth: 200 }}>Status</th>
                      <th style={{ minWidth: 240 }}>Reason for Absence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s, idx) => {
                      const entry  = attendanceMap[s.id] || { status: 'PRESENT', reason: '' };
                      const status = entry.status;
                      const rowBg  = status === 'ABSENT' ? '#fff5f5' : status === 'LATE' ? '#fffbf0' : 'transparent';
                      return (
                        <tr key={s.id} style={{ background: rowBg, transition: 'background 0.2s' }}>
                          <td style={{ color: '#a0aec0', fontSize: 12 }}>{idx + 1}</td>
                          <td>
                            <div className="student-cell">
                              <div className="student-avatar-sm" style={{ background: STATUS_CONFIG[status].bg }}>
                                {getInitials(s.name)}
                              </div>
                              <span className="student-name">{s.name}</span>
                            </div>
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: 12, color: '#718096', fontWeight: 600 }}>{s.rollNo}</td>
                          <td>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {Object.entries(STATUS_CONFIG).map(([st, cfg]) => (
                                <button key={st} onClick={() => setStatus(s.id, st)} style={{
                                  width: 64, padding: '6px 0', border: `2px solid ${status === st ? cfg.bg : '#e2e8f0'}`,
                                  borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                                  background: status === st ? cfg.bg : '#f7fafc',
                                  color:      status === st ? '#fff'  : '#a0aec0',
                                  transition: 'all 0.15s',
                                }}>
                                  {cfg.short} — {cfg.label.slice(0,3)}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td>
                            {status === 'ABSENT' ? (
                              <input
                                type="text"
                                className="form-control form-control-sm"
                                placeholder="Enter reason (e.g. Fever, Family function…)"
                                value={entry.reason}
                                onChange={e => setReason(s.id, e.target.value)}
                                style={{ border: '1.5px solid #fed7d7', background: '#fff5f5' }}
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
            )}

            {students.length > 0 && (
              <div style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #f0f4f8', marginTop: 12, gap: 10 }}>
                <button onClick={handleSave} style={{
                  padding: '12px 32px', background: '#76C442', border: 'none', borderRadius: 10,
                  color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 4px 12px rgba(118,196,66,0.35)',
                }}>
                  <span className="material-icons" style={{ fontSize: 18 }}>save</span>
                  {alreadyMarked ? 'Update Attendance' : 'Save Attendance'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════ HISTORY ══════════════════════ */}
      {activeTab === 'history' && (
        <div className="data-table-card">
          {/* Filters + Export */}
          <div className="search-filter-bar" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 10, flex: 1, flexWrap: 'wrap', alignItems: 'center' }}>
              <div>
                <label className="form-label fw-medium small mb-1">From</label>
                <input type="date" className="filter-select" value={histFrom} onChange={e => setHistFrom(e.target.value)} />
              </div>
              <div>
                <label className="form-label fw-medium small mb-1">To</label>
                <input type="date" className="filter-select" value={histTo} max={TODAY} onChange={e => setHistTo(e.target.value)} />
              </div>
              <div>
                <label className="form-label fw-medium small mb-1">Class</label>
                <select className="filter-select" value={histClass} onChange={e => setHistClass(e.target.value)}>
                  <option value="">All Classes</option>
                  {classKeys.map(k => <option key={k} value={k}>Class {k}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#276749', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                <span className="material-icons" style={{ fontSize: 16 }}>table_chart</span> Export CSV
              </button>
              <button onClick={handleExportStudentCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#3182ce', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                <span className="material-icons" style={{ fontSize: 16 }}>person</span> Student CSV
              </button>
            </div>
          </div>

          {histFiltered.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">history</span>
              <h3>No records found</h3>
              <p>Try adjusting the filters or mark attendance first</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Total</th>
                    <th>Attendance %</th>
                    <th>Marked By</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {histFiltered.map(r => {
                    const p = r.students.filter(s => s.status === 'PRESENT').length;
                    const a = r.students.filter(s => s.status === 'ABSENT').length;
                    const l = r.students.filter(s => s.status === 'LATE').length;
                    const t = r.students.length;
                    const pct = t ? Math.round((p / t) * 100) : 0;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontSize: 13, fontWeight: 600 }}>{fmtDate(r.date)}</td>
                        <td>
                          <span style={{ background: '#76C44215', color: '#276749', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
                            Class {r.classKey}
                          </span>
                        </td>
                        <td><span className="status-badge status-present">{p}</span></td>
                        <td><span className="status-badge status-absent">{a}</span></td>
                        <td><span className="status-badge status-late">{l}</span></td>
                        <td style={{ fontWeight: 700, color: '#4a5568' }}>{t}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 56, height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pctColor(pct) === '#276749' ? '#76C442' : pctColor(pct) === '#c05621' ? '#ed8936' : '#e53e3e', borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: pctColor(pct) }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 12, color: '#718096' }}>{r.markedBy}</td>
                        <td style={{ fontSize: 12, color: '#a0aec0' }}>{r.markedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {histFiltered.length > 0 && (
            <div style={{ marginTop: 14, padding: '12px 16px', background: '#f7fafc', borderRadius: 10, fontSize: 13, color: '#718096', display: 'flex', gap: 20 }}>
              <span>Records shown: <strong style={{ color: '#2d3748' }}>{histFiltered.length}</strong></span>
              <span>Avg Attendance: <strong style={{ color: '#76C442' }}>
                {(() => {
                  const totals = histFiltered.reduce((acc, r) => {
                    const p = r.students.filter(s => s.status === 'PRESENT').length;
                    acc.p += p; acc.t += r.students.length; return acc;
                  }, { p: 0, t: 0 });
                  return totals.t ? `${Math.round((totals.p / totals.t) * 100)}%` : '—';
                })()}
              </strong></span>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
