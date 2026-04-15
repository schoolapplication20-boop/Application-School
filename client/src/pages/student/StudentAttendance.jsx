import React, { useState, useEffect, useMemo } from 'react';
import Layout from '../../components/Layout';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import { studentAPI } from '../../services/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = [
  'January','February','March','April','May',
  'June','July','August','September','October','November','December',
];

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', color: '#76C442', light: '#f0fff4', text: '#276749', icon: 'check_circle'  },
  ABSENT:  { label: 'Absent',  color: '#e53e3e', light: '#fff5f5', text: '#c53030', icon: 'cancel'        },
  LEAVE:   { label: 'Leave',   color: '#ed8936', light: '#fffaf0', text: '#c05621', icon: 'event_busy'    },
  LATE:    { label: 'Late',    color: '#f6ad55', light: '#fffaf0', text: '#c05621', icon: 'schedule'      },
  OTHERS:  { label: 'Others',  color: '#805ad5', light: '#faf5ff', text: '#553c9a', icon: 'more_horiz'    },
  HOLIDAY: { label: 'Holiday', color: '#a0aec0', light: '#f7fafc', text: '#4a5568', icon: 'beach_access'  },
};

const fmtDate    = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const getDayName = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
const pctColor   = (p) => p >= 90 ? '#276749' : p >= 75 ? '#c05621' : '#c53030';
const pctBg      = (p) => p >= 90 ? '#f0fff4' : p >= 75 ? '#fffaf0' : '#fff5f5';

// ── Component ─────────────────────────────────────────────────────────────────

export default function StudentAttendance() {
  const [records,       setRecords]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [filterStatus,  setFilterStatus]  = useState('');
  const [activeTab,     setActiveTab]     = useState('overview');

  // ── Fetch full-year attendance once ─────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    studentAPI.getMyFullAttendance()
      .then(res => setRecords(res.data?.data ?? []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false));
  }, []);

  // ── Stats for selected month ────────────────────────────────────────────────
  const monthRecords = useMemo(
    () => records.filter(r => r.date && new Date(r.date + 'T00:00:00').getMonth() === selectedMonth),
    [records, selectedMonth],
  );

  const workingDays   = monthRecords.filter(r => r.status !== 'HOLIDAY').length;
  const presentDays   = monthRecords.filter(r => r.status === 'PRESENT').length;
  const absentDays    = monthRecords.filter(r => r.status === 'ABSENT').length;
  const leaveDays     = monthRecords.filter(r => ['LEAVE','LATE','OTHERS'].includes(r.status)).length;
  const monthPct      = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

  // ── Overall stats (whole year loaded) ──────────────────────────────────────
  const overallWorking = records.filter(r => r.status !== 'HOLIDAY').length;
  const overallPresent = records.filter(r => r.status === 'PRESENT').length;
  const overallPct     = overallWorking > 0 ? Math.round((overallPresent / overallWorking) * 100) : 0;

  // ── Monthly trend data for chart ────────────────────────────────────────────
  const trendData = useMemo(() => {
    const map = {};
    records.forEach(r => {
      if (!r.date) return;
      const m = new Date(r.date + 'T00:00:00').getMonth();
      if (!map[m]) map[m] = { present: 0, total: 0 };
      if (r.status !== 'HOLIDAY') map[m].total++;
      if (r.status === 'PRESENT') map[m].present++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([m, v]) => ({
        name: MONTHS[Number(m)].slice(0, 3),
        'Attendance %': v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
      }));
  }, [records]);

  // ── Filtered records for table ──────────────────────────────────────────────
  const tableRecords = useMemo(() => {
    const base = activeTab === 'month' ? monthRecords : records;
    const filtered = filterStatus ? base.filter(r => r.status === filterStatus) : base;
    return [...filtered].sort((a, b) => b.date.localeCompare(a.date));
  }, [activeTab, monthRecords, records, filterStatus]);

  // ── Calendar grid for selected month ───────────────────────────────────────
  const calendarData = useMemo(() => {
    const year = new Date().getFullYear();
    const firstDay = new Date(year, selectedMonth, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
    const dateMap = {};
    monthRecords.forEach(r => {
      const day = new Date(r.date + 'T00:00:00').getDate();
      dateMap[day] = r.status;
    });
    return { firstDay, daysInMonth, dateMap };
  }, [monthRecords, selectedMonth]);

  const TABS = [
    { key: 'overview', label: 'Overview',  icon: 'dashboard'   },
    { key: 'month',    label: 'By Month',  icon: 'calendar_month' },
    { key: 'all',      label: 'All Records', icon: 'table_rows' },
  ];

  if (loading) {
    return (
      <Layout pageTitle="My Attendance">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12, animation: 'spin 1s linear infinite' }}>refresh</span>
          Loading attendance…
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="My Attendance">
      <div className="page-header">
        <h1>My Attendance</h1>
        <p>Track your attendance, view monthly summaries and stay on top of your record</p>
      </div>

      {/* ── Top Stats ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Overall %',     value: `${overallPct}%`,   icon: 'percent',      color: pctColor(overallPct) },
          { label: 'Total Present', value: overallPresent,      icon: 'check_circle', color: '#76C442'            },
          { label: 'Total Absent',  value: records.filter(r => r.status === 'ABSENT').length, icon: 'cancel', color: '#e53e3e' },
          { label: 'Working Days',  value: overallWorking,      icon: 'today',        color: '#3182ce'            },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: s.color + '18' }}>
              <span className="material-icons" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Status bar ───────────────────────────────────────────────────────── */}
      <div style={{
        background: overallPct >= 75 ? '#f0fff4' : '#fff5f5',
        border: `1.5px solid ${overallPct >= 75 ? '#9ae6b4' : '#feb2b2'}`,
        borderRadius: 12, padding: '14px 20px', marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span className="material-icons" style={{ color: overallPct >= 75 ? '#76C442' : '#e53e3e', fontSize: 26 }}>
          {overallPct >= 75 ? 'verified' : 'warning'}
        </span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: overallPct >= 75 ? '#276749' : '#c53030' }}>
            {overallPct >= 75
              ? `Good standing — ${overallPct}% attendance`
              : `Low attendance — ${overallPct}% (minimum 75% required)`}
          </div>
          <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>
            {overallPresent} present out of {overallWorking} working days this year
          </div>
        </div>
        {/* Inline progress bar */}
        <div style={{ marginLeft: 'auto', width: 160 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#718096', marginBottom: 4 }}>
            <span>0%</span><span>75%</span><span>100%</span>
          </div>
          <div style={{ height: 8, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
            {/* 75% threshold marker */}
            <div style={{ position: 'absolute', left: '75%', top: 0, bottom: 0, width: 2, background: '#718096', zIndex: 1 }} />
            <div style={{ height: '100%', width: `${overallPct}%`, background: overallPct >= 75 ? '#76C442' : '#e53e3e', borderRadius: 6, transition: 'width 0.6s ease' }} />
          </div>
        </div>
      </div>

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#fff', borderRadius: 12, padding: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', width: 'fit-content' }}>
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

      {/* ════════════════ OVERVIEW ════════════════ */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
          {/* Trend chart */}
          <div className="chart-card">
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Monthly Attendance Trend</div>
                <div className="chart-card-subtitle">Attendance % per month this academic year</div>
              </div>
              <span style={{ padding: '4px 12px', background: '#76C44220', color: '#76C442', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                {overallPct}% Overall
              </span>
            </div>
            {trendData.length > 0 ? (
              <LineChartComponent
                data={trendData}
                lines={[{ key: 'Attendance %', name: 'Attendance %', color: '#76C442' }]}
                height={220}
              />
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
                No attendance data recorded yet
              </div>
            )}
          </div>

          {/* Status breakdown */}
          <div className="chart-card">
            <div className="chart-card-title" style={{ marginBottom: 16 }}>Full-Year Breakdown</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Object.entries(STATUS_CONFIG)
                .filter(([k]) => k !== 'HOLIDAY')
                .map(([status, cfg]) => {
                  const count = records.filter(r => r.status === status).length;
                  const pct   = overallWorking > 0 ? Math.round((count / overallWorking) * 100) : 0;
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#4a5568' }}>
                          <span className="material-icons" style={{ fontSize: 15, color: cfg.color }}>{cfg.icon}</span>
                          {cfg.label}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: 13, color: cfg.color }}>{count} days</span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: 4, transition: 'width 0.5s' }} />
                      </div>
                    </div>
                  );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ BY MONTH ════════════════ */}
      {activeTab === 'month' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: month selector + stats */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="data-table-card" style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>Select Month</span>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
                </select>
              </div>

              {/* Month stats */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                {[
                  { label: 'Working Days', value: workingDays, color: '#3182ce', icon: 'today'        },
                  { label: 'Present',      value: presentDays, color: '#76C442', icon: 'check_circle' },
                  { label: 'Absent',       value: absentDays,  color: '#e53e3e', icon: 'cancel'       },
                  { label: 'Leave/Others', value: leaveDays,   color: '#ed8936', icon: 'event_busy'   },
                ].map(s => (
                  <div key={s.label} style={{ background: s.color + '10', border: `1.5px solid ${s.color}30`, borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span className="material-icons" style={{ fontSize: 15, color: s.color }}>{s.icon}</span>
                      <span style={{ fontSize: 11, color: '#718096', fontWeight: 600 }}>{s.label}</span>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Month % gauge */}
              {workingDays > 0 ? (
                <div style={{ background: pctBg(monthPct), border: `1.5px solid ${pctColor(monthPct)}30`, borderRadius: 10, padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 36, fontWeight: 800, color: pctColor(monthPct), lineHeight: 1 }}>{monthPct}%</div>
                  <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                    {MONTHS[selectedMonth]} Attendance
                  </div>
                  <div style={{ height: 8, background: '#e2e8f0', borderRadius: 6, overflow: 'hidden', marginTop: 10 }}>
                    <div style={{ width: `${monthPct}%`, height: '100%', background: pctColor(monthPct), borderRadius: 6, transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ fontSize: 11, color: '#718096', marginTop: 6 }}>
                    {monthPct >= 75 ? 'Good standing' : 'Below 75% minimum'}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#a0aec0', fontSize: 13 }}>
                  No records for {MONTHS[selectedMonth]}
                </div>
              )}
            </div>
          </div>

          {/* Right: calendar grid */}
          <div className="data-table-card" style={{ padding: '16px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748', marginBottom: 12 }}>
              {MONTHS[selectedMonth]} Calendar
            </div>
            <CalendarGrid {...calendarData} />
            {/* Legend */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0f4f8' }}>
              {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: cfg.color }} />
                  <span style={{ color: '#718096' }}>{cfg.label}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, border: '1.5px solid #e2e8f0' }} />
                <span style={{ color: '#718096' }}>No record</span>
              </div>
            </div>
          </div>

          {/* Month detail table (full width below) */}
          {monthRecords.length > 0 && (
            <div className="data-table-card" style={{ gridColumn: '1 / -1' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#2d3748' }}>
                  {MONTHS[selectedMonth]} — Day-wise Records
                </span>
                <select className="form-select form-select-sm" style={{ width: 'auto' }}
                  value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                  <option value="">All Status</option>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <AttendanceTable records={tableRecords} />
            </div>
          )}
        </div>
      )}

      {/* ════════════════ ALL RECORDS ════════════════ */}
      {activeTab === 'all' && (
        <div className="data-table-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#2d3748' }}>
              All Attendance Records ({records.length} days)
            </span>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <select className="form-select form-select-sm" style={{ width: 'auto' }}
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>
          {records.length === 0 ? (
            <div className="empty-state">
              <span className="material-icons">event_busy</span>
              <h3>No attendance records yet</h3>
              <p>Attendance will appear here once your teacher marks it</p>
            </div>
          ) : (
            <AttendanceTable records={tableRecords} showMonth />
          )}
        </div>
      )}
    </Layout>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function AttendanceTable({ records, showMonth = false }) {
  if (records.length === 0) {
    return (
      <div style={{ padding: '32px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
        No records for the selected filter
      </div>
    );
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="data-table">
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Date</th>
            <th>Day</th>
            {showMonth && <th>Month</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {records.map((r, idx) => {
            const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.OTHERS;
            return (
              <tr key={r.id || r.date}
                style={{ background: r.status === 'ABSENT' ? '#fff5f515' : r.status === 'LEAVE' ? '#fffaf015' : 'transparent' }}>
                <td style={{ color: '#a0aec0', fontSize: 12 }}>{idx + 1}</td>
                <td style={{ fontWeight: 600, fontSize: 13 }}>{fmtDate(r.date)}</td>
                <td style={{ color: '#718096', fontSize: 12 }}>{getDayName(r.date)}</td>
                {showMonth && (
                  <td style={{ color: '#718096', fontSize: 12 }}>
                    {MONTHS[new Date(r.date + 'T00:00:00').getMonth()]}
                  </td>
                )}
                <td>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: cfg.light, color: cfg.color,
                    border: `1.5px solid ${cfg.color}40`,
                    borderRadius: 20, padding: '3px 10px',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    <span className="material-icons" style={{ fontSize: 13 }}>{cfg.icon}</span>
                    {cfg.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CalendarGrid({ firstDay, daysInMonth, dateMap }) {
  const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const cells = [];
  // Empty slots for days before the 1st
  for (let i = 0; i < firstDay; i++) {
    cells.push(<div key={`e-${i}`} />);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const status = dateMap[d];
    const cfg    = status ? STATUS_CONFIG[status] : null;
    cells.push(
      <div key={d} title={status ? STATUS_CONFIG[status]?.label : 'No record'} style={{
        height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
        background: cfg ? cfg.color : 'transparent',
        color:      cfg ? '#fff'    : '#a0aec0',
        border:     cfg ? 'none'    : '1.5px solid #e2e8f0',
        cursor:     'default',
      }}>
        {d}
      </div>
    );
  }
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {DAY_LABELS.map(l => (
          <div key={l} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: '#a0aec0', padding: '4px 0' }}>{l}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells}
      </div>
    </div>
  );
}
