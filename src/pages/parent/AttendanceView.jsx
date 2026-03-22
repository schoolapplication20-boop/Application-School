import React, { useState } from 'react';
import Layout from '../../components/Layout';
import LineChartComponent from '../../components/Charts/LineChartComponent';

const attendanceTrend = [
  { name: 'Oct', attendance: 92 },
  { name: 'Nov', attendance: 88 },
  { name: 'Dec', attendance: 94 },
  { name: 'Jan', attendance: 90 },
  { name: 'Feb', attendance: 95 },
  { name: 'Mar', attendance: 92 },
];

const attendanceRecords = [
  { id: 1, date: '17 Mar 2026', day: 'Monday', status: 'PRESENT', subject: 'Mathematics' },
  { id: 2, date: '16 Mar 2026', day: 'Sunday', status: 'HOLIDAY', subject: '-' },
  { id: 3, date: '15 Mar 2026', day: 'Saturday', status: 'HOLIDAY', subject: '-' },
  { id: 4, date: '14 Mar 2026', day: 'Friday', status: 'PRESENT', subject: 'All Subjects' },
  { id: 5, date: '13 Mar 2026', day: 'Thursday', status: 'ABSENT', subject: 'All Subjects' },
  { id: 6, date: '12 Mar 2026', day: 'Wednesday', status: 'PRESENT', subject: 'All Subjects' },
  { id: 7, date: '11 Mar 2026', day: 'Tuesday', status: 'LATE', subject: 'All Subjects' },
  { id: 8, date: '10 Mar 2026', day: 'Monday', status: 'PRESENT', subject: 'All Subjects' },
  { id: 9, date: '07 Mar 2026', day: 'Friday', status: 'PRESENT', subject: 'All Subjects' },
  { id: 10, date: '06 Mar 2026', day: 'Thursday', status: 'PRESENT', subject: 'All Subjects' },
];

const AttendanceView = () => {
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('March');

  const filtered = attendanceRecords.filter(r => !filterStatus || r.status === filterStatus);

  const presentCount = attendanceRecords.filter(r => r.status === 'PRESENT').length;
  const absentCount = attendanceRecords.filter(r => r.status === 'ABSENT').length;
  const lateCount = attendanceRecords.filter(r => r.status === 'LATE').length;
  const totalWorkingDays = attendanceRecords.filter(r => r.status !== 'HOLIDAY').length;
  const attendancePct = Math.round((presentCount / totalWorkingDays) * 100);

  const statusColors = { 'PRESENT': '#76C442', 'ABSENT': '#e53e3e', 'LATE': '#ed8936', 'HOLIDAY': '#a0aec0' };
  const statusBadge = { 'PRESENT': 'status-present', 'ABSENT': 'status-absent', 'LATE': 'status-late', 'HOLIDAY': '' };

  return (
    <Layout pageTitle="Attendance">
      <div className="page-header">
            <h1>Attendance Records</h1>
            <p>View Arjun's attendance history for Class 10-A</p>
          </div>

          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            {[
              { label: 'Overall %', value: attendancePct + '%', color: '#76C442', icon: 'fact_check' },
              { label: 'Days Present', value: presentCount, color: '#3182ce', icon: 'check_circle' },
              { label: 'Days Absent', value: absentCount, color: '#e53e3e', icon: 'cancel' },
              { label: 'Days Late', value: lateCount, color: '#ed8936', icon: 'schedule' },
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
              <LineChartComponent data={attendanceTrend} height={200} />
            </div>

            <div className="chart-card">
              <div className="chart-card-title" style={{ marginBottom: '16px' }}>This Month</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { label: 'Present', count: presentCount, color: '#76C442', icon: 'check_circle' },
                  { label: 'Absent', count: absentCount, color: '#e53e3e', icon: 'cancel' },
                  { label: 'Late', count: lateCount, color: '#ed8936', icon: 'schedule' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="material-icons" style={{ color: item.color, fontSize: '20px' }}>{item.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#4a5568', fontWeight: 500 }}>{item.label}</span>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: item.color }}>{item.count} days</span>
                      </div>
                      <div className="progress-bar-custom">
                        <div className="progress-fill" style={{ width: `${(item.count / totalWorkingDays) * 100}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}cc)` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '20px', padding: '14px', background: attendancePct >= 75 ? '#f0fff4' : '#fff5f5', borderRadius: '10px', textAlign: 'center' }}>
                <span className="material-icons" style={{ color: attendancePct >= 75 ? '#76C442' : '#e53e3e', fontSize: '28px' }}>
                  {attendancePct >= 75 ? 'check_circle' : 'warning'}
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: attendancePct >= 75 ? '#276749' : '#c53030', marginTop: '4px' }}>
                  {attendancePct >= 75 ? `Good Attendance! ${attendancePct}%` : `Low Attendance: ${attendancePct}%`}
                </div>
                <div style={{ fontSize: '11px', color: '#718096', marginTop: '2px' }}>Minimum required: 75%</div>
              </div>
            </div>
          </div>

          <div className="data-table-card">
            <div className="search-filter-bar">
              <div className="data-table-title" style={{ flex: 1 }}>Detailed Records - {selectedMonth} 2026</div>
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Status</option>
                <option value="PRESENT">Present</option>
                <option value="ABSENT">Absent</option>
                <option value="LATE">Late</option>
                <option value="HOLIDAY">Holiday</option>
              </select>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Day</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ background: r.status === 'ABSENT' ? '#fff5f5' : 'transparent' }}>
                      <td style={{ fontSize: '13px', fontWeight: 600 }}>{r.date}</td>
                      <td style={{ fontSize: '13px', color: '#718096' }}>{r.day}</td>
                      <td>
                        <span className={`status-badge ${statusBadge[r.status]}`} style={r.status === 'HOLIDAY' ? { background: '#f7fafc', color: '#a0aec0' } : {}}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '12px', color: '#a0aec0' }}>{r.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      </div>
    </Layout>
  );
};

export default AttendanceView;
