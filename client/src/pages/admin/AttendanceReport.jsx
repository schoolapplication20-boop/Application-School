import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
} from 'recharts';
import Layout from '../../components/Layout';
import Toast from '../../components/Toast';
import { adminAPI } from '../../services/api';
import { exportCSV, exportPrintReport } from '../../services/attendanceStore';

const TODAY = new Date().toISOString().split('T')[0];

const fmtDate  = (d) => { if (!d) return '—'; const s = typeof d === 'string' ? d : String(d); return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };
const pctColor = (p) => p >= 90 ? '#76C442' : p >= 75 ? '#ed8936' : '#e53e3e';
const pctBg    = (p) => p >= 90 ? '#f0fff4' : p >= 75 ? '#fffaf0' : '#fff5f5';
const pctText  = (p) => p >= 90 ? '#276749' : p >= 75 ? '#c05621' : '#c53030';

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

export default function AttendanceReport() {
  const [activeTab, setActiveTab]     = useState('overview');
  const [loading, setLoading]         = useState(false);
  const [toast, setToast]             = useState(null);

  // Real API data
  const [summaries, setSummaries]     = useState([]);   // class-wise summary for selected date
  const [classes, setClasses]         = useState([]);   // all classes list

  // Filters
  const [filterDate,  setFilterDate]  = useState(TODAY);
  const [filterClass, setFilterClass] = useState('');
  const [absenteeThreshold, setAbsenteeThreshold] = useState(3);

  // Detail drill-down
  const [detailClass, setDetailClass]   = useState(null);
  const [detailRecords, setDetailRecords] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const showToast = (msg, type = 'success') => { setToast({ message: msg, type }); setTimeout(() => setToast(null), 3500); };

  // ── Load all classes once ─────────────────────────────────────────────────
  useEffect(() => {
    adminAPI.getClasses()
      .then(res => setClasses(res.data?.data ?? []))
      .catch(() => {});
  }, []);

  // ── Load attendance summaries when date changes ───────────────────────────
  const loadSummaries = useCallback(() => {
    setLoading(true);
    adminAPI.getClassAttendanceSummaries(filterDate)
      .then(res => setSummaries(res.data?.data ?? []))
      .catch(() => showToast('Failed to load attendance data', 'error'))
      .finally(() => setLoading(false));
  }, [filterDate]);

  useEffect(() => { loadSummaries(); }, [loadSummaries]);

  // ── Filtered summaries ────────────────────────────────────────────────────
  const filteredSummaries = useMemo(() =>
    summaries.filter(s => !filterClass || String(s.classId) === filterClass),
    [summaries, filterClass]
  );

  // ── Aggregate stats ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalPresent = filteredSummaries.reduce((a, s) => a + (s.present || 0), 0);
    const totalStudents = filteredSummaries.reduce((a, s) => a + (s.total || 0), 0);
    const totalAbsent = filteredSummaries.reduce((a, s) => a + (s.absent || 0), 0);
    const longAbs = filteredSummaries.filter(s => {
      const pct = s.total ? Math.round((s.present / s.total) * 100) : 100;
      return pct < 75;
    }).length;
    return {
      overallPct: totalStudents ? Math.round((totalPresent / totalStudents) * 100) : 0,
      todayPresent: totalPresent,
      todayAbsent: totalAbsent,
      lowAttendanceClasses: longAbs,
    };
  }, [filteredSummaries]);

  // ── Class-wise chart data ─────────────────────────────────────────────────
  const classChartData = useMemo(() =>
    filteredSummaries.map(s => ({
      name: `${s.className}${s.section ? '-' + s.section : ''}`,
      Present: s.present || 0,
      Absent:  s.absent  || 0,
      Leave:   s.leave   || 0,
      Others:  s.others  || 0,
      '%':     s.total   ? Math.round(((s.present || 0) / s.total) * 100) : 0,
    })),
    [filteredSummaries]
  );

  // ── Long absentees = classes with < threshold % attendance ───────────────
  const longAbsentClasses = useMemo(() =>
    filteredSummaries.filter(s => {
      const pct = s.total ? Math.round(((s.present || 0) / s.total) * 100) : 100;
      return s.total > 0 && pct < (100 - absenteeThreshold * 10);
    }).map(s => ({
      ...s,
      pct: s.total ? Math.round(((s.present || 0) / s.total) * 100) : 0,
    })),
    [filteredSummaries, absenteeThreshold]
  );

  // ── Notifications ─────────────────────────────────────────────────────────
  const notifications = useMemo(() => {
    const notifs = [];
    filteredSummaries.forEach(s => {
      const pct = s.total ? Math.round(((s.present || 0) / s.total) * 100) : 100;
      const label = `${s.className}${s.section ? '-' + s.section : ''}`;
      if (s.total > 0 && pct < 60) {
        notifs.push({ id: `crit-${s.classId}`, severity: 'critical', icon: 'warning', color: '#e53e3e', bg: '#fff5f5', title: `Critical: ${label} attendance at ${pct}%`, body: `${s.absent} absent out of ${s.total} students on ${fmtDate(filterDate)}` });
      } else if (s.total > 0 && pct < 75) {
        notifs.push({ id: `warn-${s.classId}`, severity: 'warning', icon: 'error_outline', color: '#ed8936', bg: '#fffaf0', title: `Low attendance: ${label} at ${pct}%`, body: `${s.absent} absent out of ${s.total} students on ${fmtDate(filterDate)}` });
      }
    });
    return notifs;
  }, [filteredSummaries, filterDate]);

  // ── Load class details ────────────────────────────────────────────────────
  const handleViewDetails = async (classId, className, section) => {
    setDetailClass({ classId, className, section });
    setDetailLoading(true);
    try {
      const res = await adminAPI.getClassAttendanceDetails(classId, filterDate);
      setDetailRecords(res.data?.data?.records ?? []);
    } catch {
      showToast('Failed to load class details', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Export handlers ───────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const rows = filteredSummaries.map(s => {
      const pct = s.total ? Math.round(((s.present || 0) / s.total) * 100) : 0;
      return {
        Date: fmtDate(filterDate),
        Class: `${s.className}${s.section ? '-' + s.section : ''}`,
        Teacher: s.teacherName || '—',
        Present: s.present || 0,
        Absent: s.absent || 0,
        Leave: s.leave || 0,
        Others: s.others || 0,
        Total: s.total || 0,
        'Attendance %': `${pct}%`,
      };
    });
    exportCSV(rows, `attendance_report_${filterDate}.csv`);
    showToast('CSV report downloaded');
  };

  const handleExportPDF = () => {
    const tableRows = filteredSummaries.map(s => {
      const pct = s.total ? Math.round(((s.present || 0) / s.total) * 100) : 0;
      const cls = pct >= 90 ? 'green' : pct >= 75 ? 'orange' : 'red';
      const label = `${s.className}${s.section ? '-' + s.section : ''}`;
      return `<tr><td>${label}</td><td>${s.teacherName || '—'}</td><td><span class="green">${s.present || 0}</span></td><td><span class="red">${s.absent || 0}</span></td><td>${s.leave || 0}</td><td>${s.total || 0}</td><td><span class="${cls}">${pct}%</span></td></tr>`;
    }).join('');
    const html = `
      <h1>Attendance Report</h1>
      <p class="sub">Date: ${fmtDate(filterDate)} | Class: ${filterClass ? classes.find(c => String(c.id) === filterClass)?.name || 'Selected' : 'All'}</p>
      <table><thead><tr><th>Class</th><th>Teacher</th><th>Present</th><th>Absent</th><th>Leave</th><th>Total</th><th>%</th></tr></thead><tbody>${tableRows}</tbody></table>`;
    exportPrintReport('Attendance Report – Schoolers', html);
    showToast('PDF report opened for printing');
  };

  const STATUS_COLORS = { PRESENT: '#76C442', ABSENT: '#e53e3e', LEAVE: '#ed8936', OTHERS: '#805ad5' };

  const TABS = [
    { key: 'overview',    label: 'Overview',      icon: 'dashboard'   },
    { key: 'classreport', label: 'Class Report',   icon: 'table_chart' },
    { key: 'absentees',   label: 'Low Attendance', icon: 'person_off'  },
    { key: 'notifs',      label: 'Notifications',  icon: 'notifications', badge: notifications.filter(n => n.severity === 'critical').length },
  ];

  return (
    <Layout pageTitle="Attendance Report">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Attendance Dashboard</h1>
          <p>Class-wise attendance marked by teachers, updated in real time</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#276749', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <span className="material-icons" style={{ fontSize: 16 }}>table_chart</span> Export CSV
          </button>
          <button onClick={handleExportPDF} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#e53e3e', border: 'none', borderRadius: 9, color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <span className="material-icons" style={{ fontSize: 16 }}>picture_as_pdf</span> Export PDF
          </button>
          <button onClick={loadSummaries} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: '#ebf8ff', border: '1.5px solid #3182ce40', borderRadius: 9, color: '#2b6cb0', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
            <span className="material-icons" style={{ fontSize: 16, animation: loading ? 'spin 1s linear infinite' : 'none' }}>refresh</span> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '14px 20px', marginBottom: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <label className="form-label fw-medium small mb-1">Date</label>
          <input type="date" className="filter-select" value={filterDate} max={TODAY}
            onChange={e => setFilterDate(e.target.value)} />
        </div>
        <div>
          <label className="form-label fw-medium small mb-1">Class</label>
          <select className="filter-select" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => (
              <option key={c.id} value={String(c.id)}>{c.name}{c.section ? `-${c.section}` : ''}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="form-label fw-medium small mb-1">Low Attendance Rule</label>
          <select className="filter-select" value={absenteeThreshold} onChange={e => setAbsenteeThreshold(+e.target.value)}>
            <option value={3}>Below 70%</option>
            <option value={5}>Below 50%</option>
            <option value={7}>Below 30%</option>
          </select>
        </div>
        <button onClick={() => { setFilterDate(TODAY); setFilterClass(''); setAbsenteeThreshold(3); }}
          style={{ padding: '9px 14px', border: '1.5px solid #e2e8f0', borderRadius: 9, background: '#f7fafc', color: '#718096', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
          Reset
        </button>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Overall Attendance', value: `${stats.overallPct}%`,           icon: 'percent',       color: pctColor(stats.overallPct) },
          { label: 'Present Today',      value: stats.todayPresent,               icon: 'check_circle',  color: '#76C442'                  },
          { label: 'Absent Today',       value: stats.todayAbsent,                icon: 'cancel',        color: '#e53e3e'                  },
          { label: 'Low Attendance Classes', value: stats.lowAttendanceClasses,   icon: 'person_off',    color: '#805ad5'                  },
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

      {loading && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8, animation: 'spin 1s linear infinite' }}>refresh</span>
          Loading attendance data…
        </div>
      )}

      {!loading && (
        <>
          {/* ══════════════ OVERVIEW ══════════════ */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <ChartCard title="Class-wise Attendance" subtitle={`${fmtDate(filterDate)} — Present / Absent / Leave breakdown`}>
                {classChartData.length === 0 ? (
                  <div className="empty-state"><span className="material-icons">bar_chart</span><h3>No data for this date</h3><p>Teachers haven't marked attendance yet</p></div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={classChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Present" fill="#76C442" radius={[3,3,0,0]} />
                      <Bar dataKey="Absent"  fill="#e53e3e" radius={[3,3,0,0]} />
                      <Bar dataKey="Leave"   fill="#ed8936" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>

              <ChartCard title="Attendance % by Class" subtitle="Percentage of students present per class">
                {classChartData.length === 0 ? (
                  <div className="empty-state"><span className="material-icons">bar_chart</span><h3>No data for this date</h3></div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={classChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0,100]} tick={{ fontSize: 11 }} unit="%" />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="%" fill="#76C442" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </ChartCard>
            </div>
          )}

          {/* ══════════════ CLASS REPORT ══════════════ */}
          {activeTab === 'classreport' && (
            <div className="data-table-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#2d3748' }}>
                  Class-wise Attendance — {fmtDate(filterDate)}
                </h3>
                <span style={{ fontSize: 13, color: '#a0aec0' }}>{filteredSummaries.length} classes</span>
              </div>

              {filteredSummaries.length === 0 ? (
                <div className="empty-state">
                  <span className="material-icons">event_busy</span>
                  <h3>No attendance marked for {fmtDate(filterDate)}</h3>
                  <p>Teachers need to submit attendance from their dashboard</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Teacher</th>
                        <th style={{ color: '#76C442' }}>Present</th>
                        <th style={{ color: '#e53e3e' }}>Absent</th>
                        <th style={{ color: '#ed8936' }}>Leave</th>
                        <th style={{ color: '#805ad5' }}>Others</th>
                        <th>Total</th>
                        <th>Attendance %</th>
                        <th>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSummaries.map(s => {
                        const pct = s.total ? Math.round(((s.present || 0) / s.total) * 100) : 0;
                        const label = `${s.className}${s.section ? '-' + s.section : ''}`;
                        return (
                          <tr key={s.classId}>
                            <td style={{ fontWeight: 700 }}>{label}</td>
                            <td style={{ color: '#718096', fontSize: 12 }}>{s.teacherName || '—'}</td>
                            <td><span style={{ fontWeight: 700, color: '#76C442' }}>{s.present || 0}</span></td>
                            <td><span style={{ fontWeight: 700, color: '#e53e3e' }}>{s.absent  || 0}</span></td>
                            <td><span style={{ fontWeight: 700, color: '#ed8936' }}>{s.leave   || 0}</span></td>
                            <td><span style={{ fontWeight: 700, color: '#805ad5' }}>{s.others  || 0}</span></td>
                            <td style={{ fontWeight: 600 }}>{s.total || 0}</td>
                            <td>
                              {s.total > 0 ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <div style={{ width: 60, height: 7, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: pctColor(pct), borderRadius: 4 }} />
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: 13, color: pctColor(pct), background: pctBg(pct), padding: '2px 8px', borderRadius: 10 }}>{pct}%</span>
                                </div>
                              ) : <span style={{ color: '#a0aec0', fontSize: 12 }}>Not marked</span>}
                            </td>
                            <td>
                              {s.total > 0 && (
                                <button
                                  onClick={() => handleViewDetails(s.classId, s.className, s.section)}
                                  style={{ padding: '5px 12px', background: '#ebf8ff', border: '1.5px solid #3182ce30', borderRadius: 8, color: '#2b6cb0', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                                  View
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Class Detail Panel */}
              {detailClass && (
                <div style={{ marginTop: 24, background: '#f7fafc', borderRadius: 12, padding: 20, border: '1.5px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#2d3748' }}>
                      {detailClass.className}{detailClass.section ? `-${detailClass.section}` : ''} — Student Details ({fmtDate(filterDate)})
                    </h4>
                    <button onClick={() => setDetailClass(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#a0aec0' }}>
                      <span className="material-icons">close</span>
                    </button>
                  </div>
                  {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: 20, color: '#a0aec0' }}>Loading…</div>
                  ) : detailRecords.length === 0 ? (
                    <p style={{ color: '#a0aec0', fontSize: 13, textAlign: 'center' }}>No records found</p>
                  ) : (
                    <table className="data-table" style={{ fontSize: 12 }}>
                      <thead>
                        <tr>
                          <th>Roll No</th>
                          <th>Student Name</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailRecords.map(r => {
                          const color = STATUS_COLORS[r.status] || '#718096';
                          return (
                            <tr key={r.id || r.studentId}>
                              <td style={{ fontFamily: 'monospace', color: '#718096' }}>{r.rollNumber || '—'}</td>
                              <td style={{ fontWeight: 600 }}>{r.studentName || `Student #${r.studentId}`}</td>
                              <td>
                                <span style={{ background: color + '18', color, border: `1.5px solid ${color}40`, borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                                  {r.status}
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
          )}

          {/* ══════════════ LOW ATTENDANCE ══════════════ */}
          {activeTab === 'absentees' && (
            <div className="data-table-card">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 16 }}>
                Classes with Low Attendance — {fmtDate(filterDate)}
              </h3>
              {longAbsentClasses.length === 0 ? (
                <div className="empty-state">
                  <span className="material-icons" style={{ color: '#76C442' }}>check_circle</span>
                  <h3>All classes have good attendance!</h3>
                  <p>No classes below the threshold for {fmtDate(filterDate)}</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Class</th>
                        <th>Teacher</th>
                        <th>Present</th>
                        <th>Absent</th>
                        <th>Total</th>
                        <th>Attendance %</th>
                        <th>Alert</th>
                      </tr>
                    </thead>
                    <tbody>
                      {longAbsentClasses.map(s => {
                        const label = `${s.className}${s.section ? '-' + s.section : ''}`;
                        const isCritical = s.pct < 60;
                        return (
                          <tr key={s.classId}>
                            <td style={{ fontWeight: 700 }}>{label}</td>
                            <td style={{ color: '#718096', fontSize: 12 }}>{s.teacherName || '—'}</td>
                            <td><span style={{ fontWeight: 700, color: '#76C442' }}>{s.present || 0}</span></td>
                            <td><span style={{ fontWeight: 700, color: '#e53e3e' }}>{s.absent  || 0}</span></td>
                            <td>{s.total}</td>
                            <td>
                              <span style={{ fontWeight: 700, color: pctColor(s.pct), background: pctBg(s.pct), padding: '3px 10px', borderRadius: 10, fontSize: 13 }}>{s.pct}%</span>
                            </td>
                            <td>
                              <span style={{ background: isCritical ? '#fff5f5' : '#fffaf0', color: isCritical ? '#e53e3e' : '#ed8936', border: `1.5px solid ${isCritical ? '#e53e3e' : '#ed8936'}40`, borderRadius: 10, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                                {isCritical ? 'Critical' : 'Warning'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ══════════════ NOTIFICATIONS ══════════════ */}
          {activeTab === 'notifs' && (
            <div className="data-table-card">
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#2d3748', marginBottom: 16 }}>
                Attendance Alerts — {fmtDate(filterDate)}
              </h3>
              {notifications.length === 0 ? (
                <div className="empty-state">
                  <span className="material-icons" style={{ color: '#76C442' }}>notifications_active</span>
                  <h3>No alerts for {fmtDate(filterDate)}</h3>
                  <p>All classes have acceptable attendance</p>
                </div>
              ) : (
                notifications.map(n => (
                  <AlertCard key={n.id} icon={n.icon} title={n.title} body={n.body} color={n.color} bg={n.bg} />
                ))
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
