import { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import { useAuth } from '../../context/AuthContext';
import { fetchTimetable, getTimetableForTeacher, formatTime } from '../../services/timetableService';

// ─── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SUBJECT_COLOR = {
  Mathematics: { bg: '#e8f4fd', border: '#4361ee', text: '#4361ee' },
  Science:       { bg: '#e0f7f6', border: '#38b2ac', text: '#285e61' },
  English:       { bg: '#f3e8ff', border: '#805ad5', text: '#553c9a' },
  'Social Studies': { bg: '#fff5f5', border: '#e53e3e', text: '#c53030' },
  Hindi:         { bg: '#fff3e0', border: '#ed8936', text: '#c05621' },
  'Computer Science': { bg: '#e0f7f1', border: '#009688', text: '#00544c' },
  Biology:       { bg: '#fffff0', border: '#d69e2e', text: '#975a16' },
  Chemistry:     { bg: '#fff0f6', border: '#e91e63', text: '#880e4f' },
  Physics:       { bg: '#eef2ff', border: '#667eea', text: '#434190' },
  Accountancy:   { bg: '#f0fff4', border: '#48bb78', text: '#276749' },
  Economics:     { bg: '#fff0f9', border: '#ed64a6', text: '#97266d' },
  Commerce:      { bg: '#fffaf0', border: '#f6ad55', text: '#c05621' },
  'Physical Education': { bg: '#f0fff4', border: '#76C442', text: '#276749' },
  Art:           { bg: '#fff8f0', border: '#dd6b20', text: '#c05621' },
};

const getColor = (subject) =>
  SUBJECT_COLOR[subject] || { bg: '#f7fafc', border: '#a0aec0', text: '#4a5568' };

const DAY_BG = {
  Monday: '#4361ee', Tuesday: '#38b2ac', Wednesday: '#805ad5',
  Thursday: '#ed8936', Friday: '#e53e3e', Saturday: '#76C442',
};

const todayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][new Date().getDay()];
const todayInWeek = DAYS.includes(todayName) ? todayName : null;

// ─── Component ─────────────────────────────────────────────────────────────────

export default function Schedule() {
  const { user } = useAuth();

  const [view, setView]             = useState('timetable');
  const [selectedDay, setSelectedDay] = useState(todayInWeek || 'Monday');
  const [entries, setEntries]       = useState([]);

  // ── Load on mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    fetchTimetable().then(all => {
      setEntries(getTimetableForTeacher(user.id, all));
    });
  }, [user]);

  // ── Derived data ──────────────────────────────────────────────────────────────

  /** Map: day → sorted entries */
  const byDay = useMemo(() => {
    const map = {};
    DAYS.forEach(d => { map[d] = []; });
    entries.forEach(e => {
      if (map[e.day]) map[e.day].push(e);
    });
    DAYS.forEach(d => map[d].sort((a, b) => a.startTime.localeCompare(b.startTime)));
    return map;
  }, [entries]);

  /** Unique sorted time slots across all entries */
  const timeSlots = useMemo(() => {
    const seen = new Map();
    entries.forEach(e => {
      const key = `${e.startTime}-${e.endTime}`;
      if (!seen.has(key)) seen.set(key, { key, startTime: e.startTime, endTime: e.endTime });
    });
    return [...seen.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [entries]);

  /** Map: "day__startTime-endTime" → entry */
  const grid = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      map[`${e.day}__${e.startTime}-${e.endTime}`] = e;
    });
    return map;
  }, [entries]);

  const todayEntries = todayInWeek ? byDay[todayInWeek] : [];
  const selectedEntries = byDay[selectedDay] || [];

  const totalWeekly  = entries.length;
  const uniqueClasses = [...new Set(entries.map(e => e.classSection))].length;
  const uniqueSubjects = [...new Set(entries.map(e => e.subject))].length;

  const hasAnyEntries = entries.length > 0;

  // ─── Empty State ──────────────────────────────────────────────────────────────
  if (!hasAnyEntries) {
    return (
      <Layout pageTitle="My Schedule">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h4 className="fw-bold mb-0">My Schedule</h4>
            <small className="text-muted">
              Academic Year 2024–25 · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </small>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: '80px 20px', textAlign: 'center' }}>
          <span className="material-icons" style={{ fontSize: 72, color: '#e2e8f0', display: 'block', marginBottom: 16 }}>calendar_month</span>
          <h5 style={{ fontWeight: 700, color: '#4a5568', marginBottom: 8 }}>No schedule assigned yet</h5>
          <p style={{ color: '#a0aec0', fontSize: 14, maxWidth: 360, margin: '0 auto' }}>
            Your timetable hasn't been set up. Please contact your administrator to have your class schedule assigned.
          </p>
        </div>
      </Layout>
    );
  }

  // ─── Full Schedule View ────────────────────────────────────────────────────────
  return (
    <Layout pageTitle="My Schedule">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4" style={{ flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h4 className="fw-bold mb-0">My Schedule</h4>
          <small className="text-muted">
            Academic Year 2024–25 · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </small>
        </div>
        <div className="btn-group btn-group-sm">
          <button
            className={`btn ${view === 'timetable' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setView('timetable')}
          >
            <span className="material-icons" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 3 }}>grid_view</span>
            Weekly Grid
          </button>
          <button
            className={`btn ${view === 'today' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setView('today')}
          >
            <span className="material-icons" style={{ fontSize: 15, verticalAlign: 'middle', marginRight: 3 }}>today</span>
            Day View
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="row g-3 mb-4">
        {[
          { label: "Today's Classes",    value: todayEntries.length, icon: 'class',      color: '#4361ee' },
          { label: 'Total Weekly Periods', value: totalWeekly,       icon: 'event_note', color: '#76C442' },
          { label: 'Classes Assigned',   value: uniqueClasses,       icon: 'groups',     color: '#805ad5' },
          { label: 'Subjects',           value: uniqueSubjects,      icon: 'menu_book',  color: '#ed8936' },
        ].map((stat, i) => (
          <div className="col-6 col-md-3" key={i}>
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center gap-3 p-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center"
                     style={{ width: 48, height: 48, background: stat.color + '20', flexShrink: 0 }}>
                  <span className="material-icons" style={{ color: stat.color }}>{stat.icon}</span>
                </div>
                <div>
                  <div className="fw-bold fs-5">{stat.value}</div>
                  <div className="text-muted small">{stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Weekly Grid View — Days as rows, Time slots as columns ────────── */}
      {view === 'timetable' && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', maxHeight: '60vh' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8', flexShrink: 0 }}>
            <h6 style={{ margin: 0, fontWeight: 700 }}>Weekly Timetable</h6>
          </div>
          <div style={{ overflow: 'auto', flex: 1 }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, minWidth: 600 }}>
              <thead>
                <tr style={{ background: '#f7fafc' }}>
                  {/* DAY column header */}
                  <th style={{
                    padding: '14px 16px', textAlign: 'left', fontWeight: 700, fontSize: 12,
                    color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em',
                    borderBottom: '2px solid #e2e8f0', borderRight: '1px solid #e2e8f0',
                    minWidth: 130, position: 'sticky', left: 0, background: '#f7fafc', zIndex: 2,
                  }}>
                    Day
                  </th>
                  {/* Time slot columns */}
                  {timeSlots.map(slot => (
                    <th key={slot.key} style={{
                      padding: '12px 14px', textAlign: 'center', fontWeight: 700, fontSize: 12,
                      color: '#4a5568', borderBottom: '2px solid #e2e8f0',
                      borderRight: '1px solid #edf2f7', minWidth: 160,
                    }}>
                      <div style={{ color: '#2d3748' }}>{formatTime(slot.startTime)} – {formatTime(slot.endTime)}</div>
                      <div style={{ fontSize: 10, color: '#a0aec0', fontWeight: 400, marginTop: 2 }}>Time Slot</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((d, rowIdx) => {
                  const isToday = d === todayInWeek;
                  const color   = DAY_BG[d];
                  const count   = byDay[d].length;
                  return (
                    <tr key={d} style={{ background: rowIdx % 2 === 0 ? '#fff' : '#fcfdff' }}>
                      {/* Day label cell */}
                      <td style={{
                        padding: '14px 16px', borderBottom: '1px solid #edf2f7',
                        borderRight: '1px solid #e2e8f0', verticalAlign: 'middle',
                        position: 'sticky', left: 0,
                        background: isToday ? color + '10' : (rowIdx % 2 === 0 ? '#fff' : '#fcfdff'),
                        zIndex: 1,
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: isToday ? color : '#2d3748' }}>{d}</div>
                        {isToday && (
                          <span style={{ fontSize: 10, background: color, color: '#fff', borderRadius: 10, padding: '1px 7px', marginTop: 3, display: 'inline-block' }}>Today</span>
                        )}
                        <div style={{ fontSize: 11, color: '#a0aec0', marginTop: 3 }}>
                          {count} {count === 1 ? 'period' : 'periods'}
                        </div>
                      </td>
                      {/* Time slot cells */}
                      {timeSlots.map(slot => {
                        const entry = grid[`${d}__${slot.key}`];
                        const c = entry ? getColor(entry.subject) : null;
                        return (
                          <td key={slot.key} style={{
                            padding: '8px 10px', borderBottom: '1px solid #edf2f7',
                            borderRight: '1px solid #f1f5f9', verticalAlign: 'middle',
                            background: entry ? '#fff' : '#fafcff',
                          }}>
                            {entry ? (
                              <div style={{
                                background: c.bg, borderLeft: `3px solid ${c.border}`,
                                borderRadius: 8, padding: '9px 11px',
                              }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: c.text }}>{entry.subject}</div>
                                <div style={{ fontSize: 11, color: '#718096', marginTop: 3 }}>{entry.classSection}</div>
                              </div>
                            ) : (
                              <div style={{
                                minHeight: 56, borderRadius: 8, border: '1px dashed #e2e8f0',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 11, color: '#cbd5e0',
                              }}>
                                Free
                              </div>
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
        </div>
      )}

      {/* ── Day View ──────────────────────────────────────────────────────────── */}
      {view === 'today' && (
        <div>
          {/* Day selector */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {DAYS.map(d => {
              const isToday = d === todayInWeek;
              const active  = selectedDay === d;
              const color   = DAY_BG[d];
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  style={{
                    padding: '7px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    border: `1.5px solid ${active ? color : '#e2e8f0'}`,
                    background: active ? color : '#fff',
                    color: active ? '#fff' : '#4a5568',
                    transition: 'all 0.15s',
                    position: 'relative',
                  }}
                >
                  {d.slice(0, 3)}
                  {isToday && (
                    <span style={{
                      position: 'absolute', top: -6, right: -4,
                      width: 8, height: 8, borderRadius: '50%',
                      background: '#e53e3e', border: '2px solid #fff',
                    }} />
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h6 style={{ margin: 0, fontWeight: 700 }}>
              {selectedDay}'s Schedule
              {selectedDay === todayInWeek && (
                <span style={{ marginLeft: 8, fontSize: 11, background: '#76C44220', color: '#276749', padding: '2px 8px', borderRadius: 10 }}>Today</span>
              )}
            </h6>
            <span style={{ fontSize: 12, color: '#a0aec0' }}>
              {selectedEntries.length} {selectedEntries.length === 1 ? 'period' : 'periods'}
            </span>
          </div>

          {selectedEntries.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '60px 20px', textAlign: 'center' }}>
              <span className="material-icons" style={{ fontSize: 52, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>event_available</span>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#4a5568' }}>No classes on {selectedDay}</div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 4 }}>Enjoy your free day!</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
              {selectedEntries.map((entry, idx) => {
                const c = getColor(entry.subject);
                return (
                  <div key={entry.id} style={{
                    background: '#fff', borderRadius: 14,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                    borderLeft: `5px solid ${c.border}`,
                    overflow: 'hidden',
                  }}>
                    <div style={{ padding: '16px 18px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: c.bg, color: c.text, border: `1px solid ${c.border}40`,
                        }}>
                          Period {idx + 1}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#a0aec0', fontSize: 12 }}>
                          <span className="material-icons" style={{ fontSize: 14 }}>schedule</span>
                          {formatTime(entry.startTime)}
                        </div>
                      </div>

                      <h6 style={{ fontWeight: 700, color: c.text, margin: '0 0 8px', fontSize: 15 }}>{entry.subject}</h6>

                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, background: '#f7fafc',
                          color: '#4a5568', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <span className="material-icons" style={{ fontSize: 13 }}>groups</span>
                          Class {entry.classSection}
                        </span>
                        <span style={{
                          padding: '4px 10px', borderRadius: 8, fontSize: 12, background: '#f7fafc',
                          color: '#4a5568', display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <span className="material-icons" style={{ fontSize: 13 }}>schedule</span>
                          {formatTime(entry.startTime)} – {formatTime(entry.endTime)}
                        </span>
                        {entry.room && (
                          <span style={{
                            padding: '4px 10px', borderRadius: 8, fontSize: 12, background: '#f7fafc',
                            color: '#4a5568', display: 'flex', alignItems: 'center', gap: 4,
                          }}>
                            <span className="material-icons" style={{ fontSize: 13 }}>door_front</span>
                            {entry.room}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
