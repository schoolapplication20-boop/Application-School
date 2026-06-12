import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { studentAPI, examinationAPI, timetableAPI } from '../../services/api';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const fmtTime = (t) => {
  if (!t) return '—';
  try {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    return `${((h % 12) || 12)}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch { return t; }
};

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const DAY_COLOR = {
  Monday: '#4361ee', Tuesday: '#38b2ac', Wednesday: '#805ad5',
  Thursday: '#ed8936', Friday: '#e53e3e', Saturday: '#0de1e8',
};

const PALETTE = [
  '#4361ee','#38b2ac','#805ad5','#e53e3e','#ed8936','#009688',
  '#d69e2e','#e91e63','#667eea','#48bb78','#0de1e8','#2b6cb0',
];
const subjectColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

const EXAM_TYPE_COLOR = {
  MIDTERM:    { bg: '#ebf8ff', color: '#2b6cb0' },
  FINAL:      { bg: '#fff5f5', color: '#c53030' },
  UNIT_TEST:  { bg: '#f0fff4', color: '#276749' },
  QUARTERLY:  { bg: '#fffaf0', color: '#c05621' },
  HALFYEARLY: { bg: '#faf5ff', color: '#6b46c1' },
  ANNUAL:     { bg: '#fff5f5', color: '#9b2335' },
};

const EXAM_STATUS = {
  SCHEDULED: { bg: '#ebf8ff', color: '#2b6cb0', icon: 'event'        },
  ONGOING:   { bg: '#f0fff4', color: '#276749', icon: 'play_circle'   },
  COMPLETED: { bg: '#f7fafc', color: '#718096', icon: 'check_circle'  },
  CANCELLED: { bg: '#fff5f5', color: '#c53030', icon: 'cancel'        },
};

const typeLabel = (t) =>
  ({ MIDTERM:'Mid Term', FINAL:'Final', UNIT_TEST:'Unit Test',
     QUARTERLY:'Quarterly', HALFYEARLY:'Half Yearly', ANNUAL:'Annual' }[t] || t);

const toMin = (t) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

// ── Main Component ────────────────────────────────────────────────────────────

export default function StudentExams() {
  const [profile,    setProfile]    = useState(null);
  const [timetable,  setTimetable]  = useState([]);
  const [exams,      setExams]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState('timetable');
  const [examFilter, setExamFilter] = useState('');
  const [examSearch, setExamSearch] = useState('');
  const [classSection, setClassSection] = useState('');

  useEffect(() => {
    studentAPI.getMyProfile()
      .then(res => {
        const p = res.data?.data ?? null;
        setProfile(p);
        if (!p) return;

        const cls = p.className || p.class_name || '';
        const sec = p.section   || '';
        const cs  = sec ? `${cls}-${sec}` : cls;
        setClassSection(cs);

        return Promise.all([
          // Timetable uses combined "ClassName-Section" format
          timetableAPI.getAll({ classSection: cs }).catch(() => ({ data: { data: [] } })),
          // ExamSchedule stores className alone (section stored separately)
          examinationAPI.getSchedules({ className: cls }).catch(() => ({ data: { data: [] } })),
        ]).then(([ttRes, exRes]) => {
          const tt = ttRes?.data?.data ?? [];
          let   ex = exRes?.data?.data ?? [];
          // Keep exams with no section OR matching student's section
          if (sec) ex = ex.filter(e => !e.section || e.section === '' || e.section === sec);
          setTimetable(Array.isArray(tt) ? tt : []);
          setExams(Array.isArray(ex) ? ex.sort((a, b) => new Date(a.examDate) - new Date(b.examDate)) : []);
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Group timetable by day
  const timetableByDay = DAYS_ORDER.reduce((acc, day) => {
    acc[day] = timetable
      .filter(e => e.day?.toLowerCase() === day.toLowerCase() && e.isActive !== false)
      .sort((a, b) => toMin(a.startTime) - toMin(b.startTime));
    return acc;
  }, {});

  const activeDays = DAYS_ORDER.filter(d => timetableByDay[d].length > 0);

  // Collect all unique time slots across all days, sorted
  const allSlots = [...new Map(
    timetable
      .filter(e => e.isActive !== false)
      .map(e => [`${e.startTime}-${e.endTime}`, { startTime: e.startTime, endTime: e.endTime }])
  ).values()].sort((a, b) => toMin(a.startTime) - toMin(b.startTime));

  // For grid lookup: dayName + startTime -> entry
  const gridMap = {};
  timetable.filter(e => e.isActive !== false).forEach(e => {
    const key = `${e.day?.toLowerCase()}-${e.startTime}`;
    if (!gridMap[key]) gridMap[key] = e;
  });

  const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Filtered exams
  const filteredExams = exams.filter(e => {
    const matchType   = !examFilter || e.examType === examFilter;
    const matchSearch = !examSearch ||
      e.subject?.toLowerCase().includes(examSearch.toLowerCase()) ||
      e.examName?.toLowerCase().includes(examSearch.toLowerCase());
    return matchType && matchSearch;
  });

  const upcomingExams = exams.filter(e => e.status === 'SCHEDULED' || e.status === 'ONGOING').length;
  const displayClass  = classSection || '—';

  return (
    <Layout pageTitle="Schedule & Exams">
      <div className="page-header">
        <h1>Schedule &amp; Exams</h1>
        <p>Class timetable and exam schedule for {displayClass ? <strong>{displayClass}</strong> : 'your class'}</p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Subjects/Week', value: timetable.filter(e => e.isActive !== false).length, color: '#0de1e8', icon: 'menu_book'    },
          { label: 'Total Exams',   value: exams.length,                                         color: '#805ad5', icon: 'assignment'   },
          { label: 'Upcoming Exams',value: upcomingExams,                                         color: '#3182ce', icon: 'event'        },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '15' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { key: 'timetable', label: 'Class Timetable', icon: 'calendar_view_week' },
          { key: 'exams',     label: 'Exam Schedule',   icon: 'assignment'         },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8,
            background: tab === t.key ? '#0de1e8' : 'var(--surface-alt)',
            color:      tab === t.key ? '#fff'    : 'var(--text-secondary)',
            boxShadow:  tab === t.key ? '0 2px 8px rgba(118,196,66,0.3)' : 'none',
            transition: 'all 0.2s',
          }}>
            <span className="material-icons" style={{ fontSize: 18 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Timetable Tab ─────────────────────────────────────────────────────── */}
      {tab === 'timetable' && (
        <div className="data-table-card" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
              Loading timetable…
            </div>
          ) : activeDays.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <span className="material-icons" style={{ fontSize: 52, color: 'var(--border-strong)' }}>calendar_view_week</span>
              <h3 style={{ color: 'var(--text-muted)', marginTop: 14 }}>No timetable assigned for your class yet</h3>
              <p style={{ color: 'var(--text-muted)' }}>Your admin will schedule the class timetable soon.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                {/* Header row: DAY col + one col per time slot */}
                <thead>
                  <tr style={{ background: 'var(--surface-alt)' }}>
                    <th style={{
                      width: 180, minWidth: 160, padding: '14px 20px',
                      textAlign: 'left', fontSize: 12, fontWeight: 700,
                      color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase',
                      borderBottom: '2px solid var(--border-strong)', borderRight: '1px solid var(--border-strong)',
                    }}>
                      DAY
                    </th>
                    {allSlots.map(slot => (
                      <th key={`${slot.startTime}-${slot.endTime}`} style={{
                        padding: '12px 16px', textAlign: 'center',
                        borderBottom: '2px solid var(--border-strong)', borderRight: '1px solid var(--border-strong)',
                        minWidth: 160,
                      }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {fmtTime(slot.startTime)} – {fmtTime(slot.endTime)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Time Slot</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* One row per active day */}
                <tbody>
                  {activeDays.map((day, dayIdx) => {
                    const isToday = day.toLowerCase() === todayName.toLowerCase();
                    const periodCount = timetableByDay[day].length;
                    return (
                      <tr key={day} style={{
                        background: isToday ? '#f0f4ff' : dayIdx % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)',
                      }}>
                        {/* Day label cell */}
                        <td style={{
                          padding: '16px 20px', verticalAlign: 'middle',
                          borderBottom: '1px solid var(--border-strong)', borderRight: '1px solid var(--border-strong)',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: 15, color: isToday ? '#4361ee' : 'var(--text-primary)' }}>
                              {day}
                            </span>
                            {isToday && (
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: '2px 8px',
                                borderRadius: 10, background: '#4361ee', color: '#fff',
                              }}>
                                Today
                              </span>
                            )}
                          </div>
                        </td>

                        {/* One cell per time slot */}
                        {allSlots.map(slot => {
                          const key   = `${day.toLowerCase()}-${slot.startTime}`;
                          const entry = gridMap[key];
                          const color = entry ? subjectColor(entry.subject) : null;
                          return (
                            <td key={`${day}-${slot.startTime}`} style={{
                              padding: 10, verticalAlign: 'middle', textAlign: 'center',
                              borderBottom: '1px solid var(--border-strong)', borderRight: '1px solid var(--border-strong)',
                            }}>
                              {entry ? (
                                <div style={{
                                  borderRadius: 10, overflow: 'hidden',
                                  border: `1.5px solid ${color}30`,
                                  background: `${color}10`,
                                  textAlign: 'left',
                                }}>
                                  <div style={{ height: 4, background: color }} />
                                  <div style={{ padding: '10px 12px' }}>
                                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', marginBottom: 3 }}>
                                      {entry.subject}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                                      {entry.classSection}
                                    </div>
                                    {entry.teacherName && (
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                                        {entry.teacherName}
                                      </div>
                                    )}
                                    {entry.room && (
                                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Room {entry.room}</div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: 'var(--border-strong)' }}>—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Exam Schedule Tab ─────────────────────────────────────────────────── */}
      {tab === 'exams' && (
        <div className="data-table-card">
          <div className="search-filter-bar">
            <input
              className="search-input"
              placeholder="Search subject or exam name…"
              value={examSearch}
              onChange={e => setExamSearch(e.target.value)}
            />
            <select className="filter-select" value={examFilter} onChange={e => setExamFilter(e.target.value)}>
              <option value="">All Types</option>
              {[...new Set(exams.map(e => e.examType).filter(Boolean))].map(t => (
                <option key={t} value={t}>{typeLabel(t)}</option>
              ))}
            </select>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>autorenew</span>
              Loading exam schedule…
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="empty-state" style={{ padding: 48 }}>
              <span className="material-icons" style={{ fontSize: 52, color: 'var(--border-strong)' }}>event_note</span>
              <h3 style={{ color: 'var(--text-muted)', marginTop: 14 }}>
                {exams.length === 0 ? 'No exams scheduled for your class yet' : 'No exams match your filter'}
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>Check back later or clear the filter.</p>
            </div>
          ) : (
            <>
              {/* Upcoming exams — card grid */}
              {filteredExams.some(e => e.status === 'SCHEDULED' || e.status === 'ONGOING') && (
                <div>
                  <div style={{ padding: '12px 20px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Upcoming Exams
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px,1fr))', gap: 16, padding: '0 20px 20px' }}>
                    {filteredExams.filter(e => e.status === 'SCHEDULED' || e.status === 'ONGOING').map(e => (
                      <ExamCard key={e.id} exam={e} />
                    ))}
                  </div>
                </div>
              )}

              {/* Past exams — table */}
              {filteredExams.some(e => ['COMPLETED','CANCELLED'].includes(String(e.status || '').toUpperCase())) && (
                <div>
                  <div style={{ padding: '12px 20px 8px', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    Past Exams
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Exam</th><th>Subject</th><th>Date</th>
                          <th>Time</th><th>Max Marks</th><th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredExams.filter(e => ['COMPLETED','CANCELLED'].includes(String(e.status || '').toUpperCase())).map(e => {
                          const st = EXAM_STATUS[String(e.status || '').toUpperCase()] || EXAM_STATUS.COMPLETED;
                          const tc = EXAM_TYPE_COLOR[e.examType] || { bg: '#f7fafc', color: '#718096' };
                          return (
                            <tr key={e.id} style={{ opacity: 0.78 }}>
                              <td>
                                <div style={{ fontWeight: 600, fontSize: 13 }}>{e.examName}</div>
                                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                                  background: tc.bg, color: tc.color, textTransform: 'uppercase' }}>
                                  {typeLabel(e.examType)}
                                </span>
                              </td>
                              <td style={{ fontWeight: 600, fontSize: 13 }}>{e.subject}</td>
                              <td style={{ fontSize: 13 }}>{fmt(e.examDate)}</td>
                              <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{fmtTime(e.startTime)} – {fmtTime(e.endTime)}</td>
                              <td style={{ fontSize: 13, textAlign: 'center' }}>{e.maxMarks}</td>
                              <td>
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
                                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                  background: st.bg, color: st.color }}>
                                  <span className="material-icons" style={{ fontSize: 12 }}>{st.icon}</span>
                                  {e.status}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Layout>
  );
}

// ── Exam Card ─────────────────────────────────────────────────────────────────

function ExamCard({ exam }) {
  const tc  = EXAM_TYPE_COLOR[String(exam.examType || '').toUpperCase()] || { bg: '#f7fafc', color: '#718096' };
  const st  = EXAM_STATUS[String(exam.status || '').toUpperCase()]       || EXAM_STATUS.SCHEDULED;
  const today    = new Date(); today.setHours(0, 0, 0, 0);
  const examDate = new Date(exam.examDate);
  const diffDays = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
  const daysText = diffDays === 0 ? 'Today!'
    : diffDays === 1 ? 'Tomorrow'
    : diffDays > 0   ? `In ${diffDays} days`
    : null;

  return (
    <div style={{
      borderRadius: 12, border: '1.5px solid var(--border-strong)', background: 'var(--surface)',
      overflow: 'hidden',
      boxShadow: exam.status === 'ONGOING' ? '0 0 0 2px #0de1e840' : '0 1px 4px rgba(0,0,0,0.06)',
    }}>
      <div style={{ background: tc.bg, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
          background: 'rgba(255,255,255,0.6)', color: tc.color, textTransform: 'uppercase' }}>
          {typeLabel(exam.examType)}
        </span>
        {daysText && (
          <span style={{ fontSize: 11, fontWeight: 700,
            color:       diffDays <= 3 ? '#c53030'  : '#2b6cb0',
            background:  diffDays <= 3 ? '#fff5f5'  : '#ebf8ff',
            padding: '2px 8px', borderRadius: 10 }}>
            {daysText}
          </span>
        )}
      </div>

      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>{exam.subject}</div>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>{exam.examName}</div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', fontSize: 12 }}>
          {[
            ['calendar_today', 'Date',      fmt(exam.examDate)],
            ['schedule',       'Time',      `${fmtTime(exam.startTime)} – ${fmtTime(exam.endTime)}`],
            ['room',           'Hall',      exam.hallNumber],
            ['grade',          'Max Marks', exam.maxMarks],
          ].map(([icon, label, value]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span className="material-icons" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{icon}</span>
              <span style={{ color: 'var(--text-muted)' }}>{label}:</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value || '—'}</span>
            </div>
          ))}
        </div>

        {exam.instructions && (
          <div style={{ marginTop: 10, padding: '8px 10px', background: '#fffbeb',
            border: '1px solid #fbbf2440', borderRadius: 8, fontSize: 11, color: '#92400e' }}>
            <span className="material-icons" style={{ fontSize: 12, verticalAlign: 'middle', marginRight: 4 }}>info</span>
            {exam.instructions}
          </div>
        )}
      </div>

      <div style={{ padding: '8px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4,
          fontSize: 11, fontWeight: 700, color: st.color, background: st.bg,
          padding: '3px 10px', borderRadius: 12 }}>
          <span className="material-icons" style={{ fontSize: 12 }}>{st.icon}</span>
          {exam.status}
        </span>
      </div>
    </div>
  );
}
