import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import {
  getAll, getClassKeys, detectLongAbsentees, exportCSV, exportPrintReport,
} from '../../services/attendanceStore';

const TODAY = new Date().toISOString().split('T')[0];

const fmtDate  = (d) => { if (!d) return '—'; return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const pctColor = (p) => p >= 90 ? '#76C442' : p >= 75 ? '#ed8936' : '#e53e3e';
const pctBg    = (p) => p >= 90 ? '#f0fff4' : p >= 75 ? '#fffaf0' : '#fff5f5';
const pctText  = (p) => p >= 90 ? '#276749' : p >= 75 ? '#c05621' : '#c53030';

// ─── Custom Tooltip for charts ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f4f8', borderRadius: 10, padding: '12px 16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}>
      <p style={{ fontWeight: 700, color: '#2d3748', marginBottom: 8 }}>{label}</p>
      {payload.map(e => (
        <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: e.color }} />
          <span style={{ color: '#718096' }}>{e.name}:</span>
          <span style={{ fontWeight: 600, color: '#2d3748' }}>{e.name.includes('%') ? `${e.value}%` : e.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Card wrapper ──────────────────────────────────────────────────────────────
const ChartCard = ({ title, subtitle, children, action }) => (
  <div className="chart-card">
    <div className="chart-card-header">
      <div>
        <div className="chart-card-title">{title}</div>
        {subtitle && <div className="chart-card-subtitle">{subtitle}</div>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

// ─── Notification Alert Card ──────────────────────────────────────────────────
const AlertCard = ({ icon, title, body, color, bg }) => (
  <div style={{ display: 'flex', gap: 14, padding: '14px 18px', background: bg, border: `1.5px solid ${color}30`, borderRadius: 12, marginBottom: 10 }}>
    <div style={{ width: 36, height: 36, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span className="material-icons" style={{ color, fontSize: 20 }}>{icon}</span>
    </div>
    <div>
      <div style={{ fontWeight: 700, fontSize: 14, color: '#2d3748', marginBottom: 2 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#718096' }}>{body}</div>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AttendanceReport() {
  const [activeTab, setActiveTab]     = useState('overview');
  const [records, setRecords]         = useState([]);
  const [classKeys, setClassKeys]     = useState([]);
  const [toast, setToast]             = useState(null);

  // Filters (shared across tabs)
  const [filterClass, setFilterClass] = useState('');
  const [filterFrom,  setFilterFrom]  = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0]; });
  const [filterTo,    setFilterTo]    = useState(TODAY);
  const [absenteeThreshold, setAbsenteeThreshold] = useState(3);

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  useEffect(() => {
    setRecords(getAll());
    setClassKeys(getClassKeys());
  }, []);

  // ── Filtered records based on tab filters ─────────────────────────────────
  const filteredRecords = useMemo(() => records.filter(r => {
    if (filterClass && r.classKey !== filterClass) return false;
    if (filterFrom  && r.date < filterFrom)         return false;
    if (filterTo    && r.date > filterTo)            return false;
    return true;
  }), [records, filterClass, filterFrom, filterTo]);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const todayRecs  = records.filter(r => r.date === TODAY);
    const allStudents = filteredRecords.flatMap(r => r.students);
    const totalP = allStudents.filter(s => s.status === 'PRESENT').length;
    const totalN = allStudents.length;
    const todayP = todayRecs.flatMap(r => r.students).filter(s => s.status === 'PRESENT').length;
    const todayA = todayRecs.flatMap(r => r.students).filter(s => s.status === 'ABSENT').length;
    const longAbs = detectLongAbsentees(records, absenteeThreshold);
    return {
      overallPct: totalN ? Math.round((totalP / totalN) * 100) : 0,
      todayPresent: todayP,
      todayAbsent:  todayA,
      longAbsentees: longAbs.length,
    };
  }, [filteredRecords, records, absenteeThreshold]);

  // ── Class-wise chart data ─────────────────────────────────────────────────
  const classChartData = useMemo(() => {
    const map = {};
    filteredRecords.forEach(r => {
      if (!map[r.classKey]) map[r.classKey] = { present: 0, absent: 0, late: 0, total: 0 };
      r.students.forEach(s => {
        map[r.classKey].total++;
        if (s.status === 'PRESENT') map[r.classKey].present++;
        else if (s.status === 'ABSENT') map[r.classKey].absent++;
        else if (s.status === 'LATE')   map[r.classKey].late++;
      });
    });
    return Object.entries(map).map(([cls, d]) => ({
      name: `Cl. ${cls}`,
      Present: d.present,
      Absent:  d.absent,
      Late:    d.late,
      '%':     d.total ? Math.round((d.present / d.total) * 100) : 0,
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredRecords]);

  // ── Trend chart data (daily overall % for visible range) ──────────────────
  const trendChartData = useMemo(() => {
    const grouped = {};
    filteredRecords.forEach(r => {
      if (!grouped[r.date]) grouped[r.date] = { p: 0, t: 0 };
      r.students.forEach(s => {
        grouped[r.date].t++;
        if (s.status === 'PRESENT') grouped[r.date].p++;
      });
    });
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([date, d]) => ({
      name: new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      'Attendance %': d.t ? Math.round((d.p / d.t) * 100) : 0,
    }));
  }, [filteredRecords]);

  // ── Long absentees ────────────────────────────────────────────────────────
  const longAbsentees = useMemo(() => detectLongAbsentees(records, absenteeThreshold), [records, absenteeThreshold]);

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifications = useMemo(() => {
    const notifs = [];
    // Critical: 5+ consecutive days absent
    longAbsentees.filter(x => x.consecutiveDays >= 5).forEach(x => {
      notifs.push({ id: `crit-${x.id}`, severity: 'critical', icon: 'warning', color: '#e53e3e', bg: '#fff5f5', title: `🚨 Critical: ${x.name} (Class ${x.classKey}) absent for ${x.consecutiveDays} consecutive days`, body: `Since ${fmtDate(x.absentSince)} • Last reason: ${x.lastReason}` });
    });
    // Warning: 3-4 consecutive days absent
    longAbsentees.filter(x => x.consecutiveDays >= 3 && x.consecutiveDays < 5).forEach(x => {
      notifs.push({ id: `warn-${x.id}`, severity: 'warning', icon: 'error_outline', color: '#ed8936', bg: '#fffaf0', title: `⚠️ ${x.name} (Class ${x.classKey}) absent for ${x.consecutiveDays} consecutive days`, body: `Since ${fmtDate(x.absentSince)} • Total absences: ${x.totalAbsent}` });
    });
    // Class-level low attendance
    classChartData.filter(c => c['%'] < 75).forEach(c => {
      notifs.push({ id: `class-${c.name}`, severity: 'info', icon: 'class', color: '#3182ce', bg: '#ebf8ff', title: `Low attendance in ${c.name}: ${c['%']}%`, body: `${c.Absent} students absent out of ${c.Present + c.Absent + c.Late}` });
    });
    return notifs;
  }, [longAbsentees, classChartData]);

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const rows = filteredRecords.flatMap(r => {
      const p = r.students.filter(s => s.status === 'PRESENT').length;
      const a = r.students.filter(s => s.status === 'ABSENT').length;
      const l = r.students.filter(s => s.status === 'LATE').length;
      const t = r.students.length;
      return [{ Date: fmtDate(r.date), Class: r.classKey, Present: p, Absent: a, Late: l, Total: t, 'Attendance %': t ? `${Math.round((p/t)*100)}%` : '0%', 'Marked By': r.markedBy }];
    });
    exportCSV(rows, `attendance_report_${TODAY}.csv`);
    showToast('CSV report downloaded');
  };

  const handleExportStudentCSV = () => {
    const rows = filteredRecords.flatMap(r =>
      r.students.map(s => ({ Date: fmtDate(r.date), Class: r.classKey, 'Roll No': s.rollNo, Name: s.name, Status: s.status, Reason: s.reason || '' }))
    );
    exportCSV(rows, `student_attendance_${TODAY}.csv`);
    showToast('Student attendance CSV downloaded');
  };

  const handleExportPDF = () => {
    const rows = filteredRecords.sort((a, b) => b.date.localeCompare(a.date));
    const tableRows = rows.map(r => {
      const p = r.students.filter(s => s.status === 'PRESENT').length;
      const a = r.students.filter(s => s.status === 'ABSENT').length;
      const l = r.students.filter(s => s.status === 'LATE').length;
      const t = r.students.length;
      const pct = t ? Math.round((p/t)*100) : 0;
      const cls = pct >= 90 ? 'green' : pct >= 75 ? 'orange' : 'red';
      return `<tr><td>${fmtDate(r.date)}</td><td>${r.classKey}</td><td><span class="green">${p}</span></td><td><span class="red">${a}</span></td><td><span class="orange">${l}</span></td><td>${t}</td><td><span class="${cls}">${pct}%</span></td></tr>`;
    }).join('');
    const html = `
      <h1>Attendance Report</h1>
      <p class="sub">Generated on ${fmtDate(TODAY)} &nbsp;|&nbsp; Period: ${fmtDate(filterFrom)} – ${fmtDate(filterTo)} &nbsp;|&nbsp; Class: ${filterClass || 'All'}</p>
      <table><thead><tr><th>Date</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Total</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    exportPrintReport('Attendance Report – Schoolers', html);
    showToast('PDF report opened for printing');
  };

  const TABS = [
    { key: 'overview',   label: 'Overview',       icon: 'dashboard'       },
    { key: 'classreport',label: 'Class Report',    icon: 'table_chart'     },
    { key: 'absentees',  label: 'Long Absentees',  icon: 'person_off'      },
    { key: 'notifs',     label: 'Notifications',   icon: 'notifications', badge: notifications.filter(n => n.severity === 'critical').length },
  ];

  return (
    <Layout pageTitle="Attendance Report">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Attendance Dashboard</h1>
          <p>Class-wise charts, long absentees, and notification alerts</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#276749', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <span className="material-icons" style={{ fontSize: 16 }}>table_chart</span> Export CSV
          </button>
          <button onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#e53e3e', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <span className="material-icons" style={{ fontSize: 16 }}>picture_as_pdf</span> Export PDF
          </button>
        </div>
      </div>

      {/* Global Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label fw-medium small mb-1">From Date</label>
          <input type="date" className="filter-select" value={filterFrom} max={filterTo} onChange={e => setFilterFrom(e.target.value)} />
        </div>
        <div>
          <label className="form-label fw-medium small mb-1">To Date</label>
          <input type="date" className="filter-select" value={filterTo}  min={filterFrom} max={TODAY} onChange={e => setFilterTo(e.target.value)} />
        </div>
        <div>
          <label className="form-label fw-medium small mb-1">Class</label>
          <select className="filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classKeys.map(k => <option key={k} value={k}>Class {k}</option>)}
          </select>
        </div>
        <div>
          <label className="form-label fw-medium small mb-1">Long Absence Rule</label>
          <select className="filter-select" value={absenteeThreshold} onChange={e => setAbsenteeThreshold(+e.target.value)}>
            <option value={3}>3+ consecutive days</option>
            <option value={5}>5+ consecutive days</option>
            <option value={7}>7+ consecutive days</option>
          </select>
        </div>
        <button onClick={() => { setFilterFrom((() => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; })()); setFilterTo(TODAY); setFilterClass(''); }} style={{ padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#f7fafc', color: '#718096', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Reset
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Overall Attendance', value: `${stats.overallPct}%`, icon: 'percent',     color: pctColor(stats.overallPct) },
          { label: 'Today Present',      value: stats.todayPresent,    icon: 'check_circle', color: '#76C442'                  },
          { label: 'Today Absent',       value: stats.todayAbsent,     icon: 'cancel',       color: '#e53e3e'                  },
          { label: 'Long Absentees',     value: stats.longAbsentees,   icon: 'person_off',   color: '#805ad5'                  },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: c.color + '18' }}>
              <span className="material-icons" style={{ color: c.color }}>{c.icon}</span>
            </div>
            <div className="stat-value">{c.value}</div>
            <div className="stat-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#fff', borderRadius: 12, padding: 6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', position: 'relative',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap',
            background: activeTab === t.key ? '#76C442' : 'transparent',
            color:      activeTab === t.key ? '#fff'    : '#718096',
            transition: 'all 0.2s',
          }}>
            <span className="material-icons" style={{ fontSize: 17 }}>{t.icon}</span>
            {t.label}
            {t.badge > 0 && (
              <span style={{ background: '#e53e3e', color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 800, padding: '1px 6px', marginLeft: 2 }}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ══════════════════════ OVERVIEW ══════════════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Charts Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* Class-wise Stacked Bar Chart */}
            <ChartCard title="Class-wise Attendance" subtitle="Present vs Absent vs Late per class">
              {classChartData.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}><span className="material-icons">bar_chart</span><h3>No data</h3></div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={classChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }} barCategoryGap="30%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a0aec0' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#a0aec0' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={8} />
                    <Bar dataKey="Present" stackId="a" fill="#76C442" radius={[0,0,0,0]} name="Present" maxBarSize={44} />
                    <Bar dataKey="Late"    stackId="a" fill="#ed8936" radius={[0,0,0,0]} name="Late"    maxBarSize={44} />
                    <Bar dataKey="Absent"  stackId="a" fill="#e53e3e" radius={[6,6,0,0]} name="Absent"  maxBarSize={44} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Trend Line Chart */}
            <ChartCard title="Attendance Trend" subtitle="Daily overall attendance % over selected period">
              {trendChartData.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px 0' }}><span className="material-icons">show_chart</span><h3>No data</h3></div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#76C442" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#76C442" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#a0aec0' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={[60, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#a0aec0' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} iconType="circle" iconSize={8} />
                    <Area type="monotone" dataKey="Attendance %" stroke="#76C442" strokeWidth={2.5} fill="url(#attGrad)"
                      dot={{ r: 4, fill: '#76C442', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, fill: '#76C442' }} name="Attendance %" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          </div>

          {/* Class-wise % Summary Table */}
          <div className="data-table-card">
            <div className="data-table-header">
              <span className="data-table-title">Class-wise Attendance Summary</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Total</th><th>Attendance %</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {classChartData.length === 0 ? (
                    <tr><td colSpan={7}><div className="empty-state"><span className="material-icons">class</span><h3>No records in this range</h3></div></td></tr>
                  ) : classChartData.map(c => {
                    const pct = c['%'];
                    return (
                      <tr key={c.name}>
                        <td>
                          <span style={{ background: '#76C44215', color: '#276749', padding: '3px 12px', borderRadius: 12, fontWeight: 700, fontSize: 13 }}>
                            {c.name.replace('Cl. ', 'Class ')}
                          </span>
                        </td>
                        <td><span className="status-badge status-present">{c.Present}</span></td>
                        <td><span className="status-badge status-absent">{c.Absent}</span></td>
                        <td><span className="status-badge status-late">{c.Late}</span></td>
                        <td style={{ fontWeight: 700, color: '#4a5568' }}>{c.Present + c.Absent + c.Late}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 80, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pctColor(pct), borderRadius: 4 }} />
                            </div>
                            <span style={{ fontWeight: 800, fontSize: 14, color: pctColor(pct) }}>{pct}%</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ background: pctBg(pct), color: pctText(pct), padding: '3px 10px', borderRadius: 12, fontWeight: 600, fontSize: 11 }}>
                            {pct >= 90 ? 'Excellent' : pct >= 75 ? 'Average' : 'Low'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════ CLASS REPORT ══════════════════════ */}
      {activeTab === 'classreport' && (
        <div className="data-table-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span className="data-table-title">Daily Attendance Records ({filteredRecords.length} records)</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#276749', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                <span className="material-icons" style={{ fontSize: 15 }}>table_chart</span> Class CSV
              </button>
              <button onClick={handleExportStudentCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#3182ce', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                <span className="material-icons" style={{ fontSize: 15 }}>person</span> Student CSV
              </button>
              <button onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#e53e3e', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                <span className="material-icons" style={{ fontSize: 15 }}>picture_as_pdf</span> PDF
              </button>
            </div>
          </div>

          {filteredRecords.length === 0 ? (
            <div className="empty-state"><span className="material-icons">table_chart</span><h3>No records found</h3></div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Class</th><th>Present</th><th>Absent</th><th>Late</th><th>Total</th><th>Attendance %</th><th>Marked By</th><th>Time</th></tr>
                </thead>
                <tbody>
                  {[...filteredRecords].sort((a,b) => b.date.localeCompare(a.date)).map(r => {
                    const p = r.students.filter(s => s.status === 'PRESENT').length;
                    const a = r.students.filter(s => s.status === 'ABSENT').length;
                    const l = r.students.filter(s => s.status === 'LATE').length;
                    const t = r.students.length;
                    const pct = t ? Math.round((p/t)*100) : 0;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{fmtDate(r.date)}</td>
                        <td><span style={{ background: '#76C44215', color: '#276749', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>Class {r.classKey}</span></td>
                        <td><span className="status-badge status-present">{p}</span></td>
                        <td><span className="status-badge status-absent">{a}</span></td>
                        <td><span className="status-badge status-late">{l}</span></td>
                        <td style={{ fontWeight: 700, color: '#4a5568' }}>{t}</td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 60, height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pctColor(pct), borderRadius: 4 }} />
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 800, color: pctColor(pct) }}>{pct}%</span>
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
        </div>
      )}

      {/* ══════════════════════ LONG ABSENTEES ══════════════════════ */}
      {activeTab === 'absentees' && (
        <>
          {/* Rule info banner */}
          <div style={{ background: '#fffbeb', border: '1.5px solid #fcd34d', borderRadius: 12, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="material-icons" style={{ color: '#d97706', fontSize: 22 }}>info</span>
            <div>
              <strong style={{ fontSize: 14, color: '#92400e' }}>Long Absentee Rule: {absenteeThreshold}+ consecutive school days absent</strong>
              <div style={{ fontSize: 12, color: '#b45309', marginTop: 2 }}>Students who have been absent for {absenteeThreshold} or more consecutive recorded school days are listed below. Adjust rule using the filter above.</div>
            </div>
          </div>

          <div className="data-table-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span className="data-table-title">Long Absentees ({longAbsentees.length} students)</span>
              <button onClick={() => exportCSV(longAbsentees.map(x => ({ Name: x.name, 'Roll No': x.rollNo, Class: x.classKey, 'Consecutive Days': x.consecutiveDays, 'Absent Since': fmtDate(x.absentSince), 'Total Absences': x.totalAbsent, 'Last Reason': x.lastReason })), `long_absentees_${TODAY}.csv`)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#276749', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                <span className="material-icons" style={{ fontSize: 15 }}>download</span> Export CSV
              </button>
            </div>

            {longAbsentees.length === 0 ? (
              <div className="empty-state">
                <span className="material-icons" style={{ color: '#76C442' }}>check_circle</span>
                <h3 style={{ color: '#76C442' }}>No long absentees!</h3>
                <p>No students have been absent for {absenteeThreshold}+ consecutive days</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Student</th><th>Class</th><th>Consecutive Days</th><th>Absent Since</th><th>Last Absent</th><th>Total Absences</th><th>Last Reason</th><th>Alert</th></tr>
                  </thead>
                  <tbody>
                    {longAbsentees.map(x => (
                      <tr key={`${x.classKey}-${x.id}`} style={{ background: x.consecutiveDays >= 5 ? '#fff5f5' : x.consecutiveDays >= 3 ? '#fffaf0' : 'transparent' }}>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar-sm" style={{ background: x.consecutiveDays >= 5 ? '#e53e3e' : '#ed8936' }}>
                              {x.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                            </div>
                            <div>
                              <div className="student-name">{x.name}</div>
                              <div className="student-class">{x.rollNo}</div>
                            </div>
                          </div>
                        </td>
                        <td><span style={{ background: '#76C44215', color: '#276749', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>Class {x.classKey}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontWeight: 800, fontSize: 20, color: x.consecutiveDays >= 5 ? '#e53e3e' : '#ed8936' }}>{x.consecutiveDays}</span>
                            <span style={{ fontSize: 12, color: '#718096' }}>days</span>
                          </div>
                        </td>
                        <td style={{ fontSize: 13, fontWeight: 600, color: '#4a5568' }}>{fmtDate(x.absentSince)}</td>
                        <td style={{ fontSize: 13, color: '#718096' }}>{fmtDate(x.lastAbsent)}</td>
                        <td>
                          <span style={{ background: '#fff5f5', color: '#c53030', padding: '2px 10px', borderRadius: 12, fontWeight: 700, fontSize: 12 }}>
                            {x.totalAbsent} days
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#718096', maxWidth: 160 }}>{x.lastReason}</td>
                        <td>
                          <span style={{ background: x.consecutiveDays >= 5 ? '#fff5f5' : '#fffaf0', color: x.consecutiveDays >= 5 ? '#c53030' : '#c05621', padding: '3px 10px', borderRadius: 12, fontWeight: 700, fontSize: 11, border: `1px solid ${x.consecutiveDays >= 5 ? '#fed7d7' : '#fbd38d'}` }}>
                            {x.consecutiveDays >= 5 ? '🚨 Critical' : '⚠️ Warning'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════════════ NOTIFICATIONS ══════════════════════ */}
      {activeTab === 'notifs' && (
        <div>
          {notifications.length === 0 ? (
            <div className="data-table-card">
              <div className="empty-state">
                <span className="material-icons" style={{ color: '#76C442' }}>notifications_none</span>
                <h3 style={{ color: '#76C442' }}>All Clear!</h3>
                <p>No attendance alerts at this time</p>
              </div>
            </div>
          ) : (
            <>
              {/* Counts */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Critical',  count: notifications.filter(n => n.severity === 'critical').length, color: '#e53e3e', bg: '#fff5f5' },
                  { label: 'Warnings',  count: notifications.filter(n => n.severity === 'warning').length,  color: '#ed8936', bg: '#fffaf0' },
                  { label: 'Info',      count: notifications.filter(n => n.severity === 'info').length,     color: '#3182ce', bg: '#ebf8ff' },
                ].map(c => (
                  <div key={c.label} style={{ background: c.bg, border: `1.5px solid ${c.color}30`, borderRadius: 12, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.count}</span>
                    <span style={{ fontSize: 13, color: c.color, fontWeight: 600 }}>{c.label}</span>
                  </div>
                ))}
              </div>

              <div>
                {notifications.map(n => (
                  <AlertCard key={n.id} icon={n.icon} title={n.title} body={n.body} color={n.color} bg={n.bg} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </Layout>
  );
}
