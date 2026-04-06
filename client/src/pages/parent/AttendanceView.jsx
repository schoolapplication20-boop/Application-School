import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import { useAuth } from '../../context/AuthContext';
import { parentAPI } from '../../services/api';

const STATUS_CONFIG = {
  PRESENT: { label: 'Present', badge: 'status-present', color: '#76C442' },
  ABSENT:  { label: 'Absent',  badge: 'status-absent',  color: '#e53e3e' },
  LEAVE:   { label: 'Leave',   badge: 'status-pending',  color: '#ed8936' },
  LATE:    { label: 'Late',    badge: 'status-late',     color: '#ed8936' },
  OTHERS:  { label: 'Others',  badge: '',                color: '#805ad5' },
  HOLIDAY: { label: 'Holiday', badge: '',                color: '#a0aec0' },
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmtDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d + 'T00:00:00');
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};
const getDayName = (d) => new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long' });

export default function AttendanceView() {
  const { user } = useAuth();

  const [child,         setChild]         = useState(null);
  const [attendance,    setAttendance]    = useState([]);
  const [filterStatus,  setFilterStatus]  = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [loading,       setLoading]       = useState(true);

  // Load child then attendance
  useEffect(() => {
    if (!user?.id) return;
    parentAPI.getMyChildren()
      .then(res => {
        const list = res.data?.data ?? [];
        const c = list[0] ?? null;
        setChild(c);
        if (!c?.id) { setLoading(false); return; }

        const year      = new Date().getFullYear();
        const startDate = `${year}-01-01`;
        const endDate   = new Date().toISOString().split('T')[0];

        return parentAPI.getChildAttendance(c.id, { startDate, endDate });
      })
      .then(res => {
        if (res) setAttendance(res.data?.data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Filter by selected month
  const monthRecords = attendance.filter(a => {
    if (!a.date) return false;
    return new Date(a.date + 'T00:00:00').getMonth() === selectedMonth;
  });

  const filtered = monthRecords.filter(r => !filterStatus || r.status === filterStatus);

  const workingDays = monthRecords.filter(r => r.status !== 'HOLIDAY').length;
  const presentCount = monthRecords.filter(r => r.status === 'PRESENT').length;
  const absentCount  = monthRecords.filter(r => r.status === 'ABSENT').length;
  const lateCount    = monthRecords.filter(r => r.status === 'LATE' || r.status === 'LEAVE' || r.status === 'OTHERS').length;
  const attendancePct = workingDays > 0 ? Math.round((presentCount / workingDays) * 100) : 0;

  // Monthly trend from all attendance data
  const trendMap = {};
  attendance.forEach(a => {
    if (!a.date) return;
    const d = new Date(a.date + 'T00:00:00');
    const key = d.toLocaleDateString('en-IN', { month: 'short' });
    if (!trendMap[key]) trendMap[key] = { present: 0, total: 0 };
    if (a.status !== 'HOLIDAY') trendMap[key].total++;
    if (a.status === 'PRESENT') trendMap[key].present++;
  });
  const attendanceTrend = Object.entries(trendMap).map(([name, v]) => ({
    name,
    attendance: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));

  if (loading) {
    return (
      <Layout pageTitle="Attendance">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
          Loading…
        </div>
      </Layout>
    );
  }

  if (!child) {
    return (
      <Layout pageTitle="Attendance">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span className="material-icons" style={{ fontSize: 64, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>child_care</span>
          <p style={{ color: '#a0aec0', fontSize: 13 }}>No child linked to your account.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Attendance">
      <div className="page-header">
        <h1>Attendance Records</h1>
        <p>View {child.name}'s attendance for Class {child.className}{child.section ? `-${child.section}` : ''}</p>
      </div>

      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { label: 'Overall %',   value: attendancePct + '%', color: '#76C442', icon: 'fact_check' },
          { label: 'Days Present', value: presentCount,        color: '#3182ce', icon: 'check_circle' },
          { label: 'Days Absent',  value: absentCount,         color: '#e53e3e', icon: 'cancel' },
          { label: 'Other',        value: lateCount,           color: '#ed8936', icon: 'schedule' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: s.color + '15' }}>
              <span className="material-icons" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        <div className="chart-card">
          <div className="chart-card-header">
            <div className="chart-card-title">Monthly Attendance</div>
          </div>
          {attendanceTrend.length > 0
            ? <LineChartComponent data={attendanceTrend} lines={[{ key: 'attendance', name: 'Attendance %', color: '#76C442' }]} height={200} />
            : <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>No attendance data yet</div>
          }
        </div>

        <div className="chart-card">
          <div className="chart-card-title" style={{ marginBottom: '16px' }}>
            {MONTHS[selectedMonth]} Summary
          </div>
          {workingDays === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>No records for this month</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { label: 'Present', count: presentCount, color: '#76C442', icon: 'check_circle' },
                { label: 'Absent',  count: absentCount,  color: '#e53e3e', icon: 'cancel'       },
                { label: 'Other',   count: lateCount,    color: '#ed8936', icon: 'schedule'     },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-icons" style={{ color: item.color, fontSize: '20px' }}>{item.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#4a5568', fontWeight: 500 }}>{item.label}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.count} days</span>
                    </div>
                    <div className="progress-bar-custom">
                      <div className="progress-fill" style={{ width: `${workingDays > 0 ? (item.count / workingDays) * 100 : 0}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)` }} />
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '8px', padding: '14px', background: attendancePct >= 75 ? '#f0fff4' : '#fff5f5', borderRadius: '10px', textAlign: 'center' }}>
                <span className="material-icons" style={{ color: attendancePct >= 75 ? '#76C442' : '#e53e3e', fontSize: '28px' }}>
                  {attendancePct >= 75 ? 'check_circle' : 'warning'}
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: attendancePct >= 75 ? '#276749' : '#c53030', marginTop: '4px' }}>
                  {attendancePct >= 75 ? `Good Attendance! ${attendancePct}%` : `Low Attendance: ${attendancePct}%`}
                </div>
                <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Minimum required: 75%</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="data-table-card">
        <div className="search-filter-bar">
          <div className="data-table-title" style={{ flex: 1 }}>
            Detailed Records — {MONTHS[selectedMonth]}
          </div>
          <select className="filter-select" value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
            No records for selected filters
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Day</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {[...filtered].sort((a, b) => b.date.localeCompare(a.date)).map(r => {
                  const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.OTHERS;
                  return (
                    <tr key={r.id} style={{ background: r.status === 'ABSENT' ? '#fff5f515' : 'transparent' }}>
                      <td style={{ fontSize: '13px', fontWeight: 600 }}>{fmtDate(r.date)}</td>
                      <td style={{ fontSize: '13px', color: '#718096' }}>{getDayName(r.date)}</td>
                      <td>
                        <span className={`status-badge ${cfg.badge}`} style={!cfg.badge ? { background: '#f7fafc', color: '#a0aec0' } : {}}>
                          {cfg.label}
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
    </Layout>
  );
}
