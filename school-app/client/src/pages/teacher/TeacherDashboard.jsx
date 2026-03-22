import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/StatCard';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const attendanceTrend = [
  { name: 'Week 1', attendance: 88 },
  { name: 'Week 2', attendance: 91 },
  { name: 'Week 3', attendance: 85 },
  { name: 'Week 4', attendance: 94 },
  { name: 'Week 5', attendance: 89 },
  { name: 'Week 6', attendance: 92 },
];

const todayClasses = [
  { time: '09:00 AM', subject: 'Mathematics', class: '10-A', room: '101', students: 38, type: 'Lecture' },
  { time: '10:30 AM', subject: 'Mathematics', class: '9-B', room: '201', students: 34, type: 'Lecture' },
  { time: '12:30 PM', subject: 'Mathematics', class: '10-B', room: '102', students: 36, type: 'Lab' },
  { time: '02:00 PM', subject: 'Mathematics', class: '8-A', room: '301', students: 32, type: 'Tutorial' },
];

const recentAttendance = [
  { id: 1, date: '17 Mar 2026', class: '10-A', present: 36, absent: 2, percentage: 94.7 },
  { id: 2, date: '17 Mar 2026', class: '9-B', present: 30, absent: 4, percentage: 88.2 },
  { id: 3, date: '16 Mar 2026', class: '10-A', present: 35, absent: 3, percentage: 92.1 },
  { id: 4, date: '16 Mar 2026', class: '9-B', present: 32, absent: 2, percentage: 94.1 },
  { id: 5, date: '15 Mar 2026', class: '10-A', present: 38, absent: 0, percentage: 100 },
];

const assignments = [
  { id: 1, title: 'Quadratic Equations Practice', class: '10-A', dueDate: '20 Mar 2026', submitted: 30, total: 38, status: 'Active' },
  { id: 2, title: 'Trigonometry Worksheet', class: '9-B', dueDate: '22 Mar 2026', submitted: 18, total: 34, status: 'Active' },
  { id: 3, title: 'Algebra Test Revision', class: '10-B', dueDate: '18 Mar 2026', submitted: 36, total: 36, status: 'Completed' },
  { id: 4, title: 'Geometry Proofs', class: '8-A', dueDate: '25 Mar 2026', submitted: 5, total: 32, status: 'Active' },
];

const TeacherDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [activeClass, setActiveClass] = useState('10-A');
  const [attendanceDate] = useState('17 Mar 2026');

  const stats = [
    { title: 'Total Classes', value: 4, icon: 'class', color: '#76C442' },
    { title: 'Total Students', value: 140, icon: 'school', color: '#3182ce' },
    { title: 'Pending Assignments', value: 3, icon: 'assignment_late', color: '#ed8936' },
    { title: 'Avg Attendance', value: 91, icon: 'fact_check', color: '#805ad5', suffix: '%' },
  ];

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Teacher Dashboard" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header">
            <h1>Teacher Dashboard</h1>
            <p>Welcome back! Here's your schedule and activity for today.</p>
          </div>

          <div className="stats-grid">
            {stats.map((s, i) => <StatCard key={i} {...s} />)}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
            {/* Today's Schedule */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Today's Schedule</div>
                  <div className="chart-card-subtitle">Monday, 17 March 2026</div>
                </div>
                <span style={{ padding: '4px 12px', background: '#76C44220', color: '#76C442', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                  {todayClasses.length} Classes
                </span>
              </div>
              <div>
                {todayClasses.map((c, i) => (
                  <div key={i} className="schedule-item" style={{ padding: '14px 0', borderBottom: i < todayClasses.length - 1 ? '1px solid #f7fafc' : 'none' }}>
                    <div style={{ minWidth: '80px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: '#a0aec0' }}>{c.time}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', margin: '0 12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#76C442' }} />
                      {i < todayClasses.length - 1 && <div style={{ width: '2px', height: '28px', background: '#e2e8f0' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>{c.subject}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '3px' }}>
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>Class {c.class}</span>
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>•</span>
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>Room {c.room}</span>
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>•</span>
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>{c.students} students</span>
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                      background: c.type === 'Lecture' ? '#76C44215' : c.type === 'Lab' ? '#3182ce15' : '#ed893615',
                      color: c.type === 'Lecture' ? '#76C442' : c.type === 'Lab' ? '#3182ce' : '#ed8936'
                    }}>
                      {c.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Attendance Trend */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Attendance Trend</div>
                  <div className="chart-card-subtitle">Weekly attendance overview</div>
                </div>
              </div>
              <LineChartComponent
                data={attendanceTrend}
                lines={[{ key: 'attendance', name: 'Attendance %', color: '#76C442' }]}
                height={200}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Recent Attendance */}
            <div className="data-table-card">
              <div className="data-table-header">
                <span className="data-table-title">Recent Attendance Records</span>
                <a href="/teacher/attendance" className="btn-view-all">View All →</a>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Present</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map(a => (
                    <tr key={a.id}>
                      <td style={{ fontSize: '12px', color: '#718096' }}>{a.date}</td>
                      <td><span style={{ fontWeight: 700 }}>{a.class}</span></td>
                      <td style={{ fontSize: '13px' }}>{a.present}/{a.present + a.absent}</td>
                      <td>
                        <span style={{
                          fontWeight: 700, fontSize: '13px',
                          color: a.percentage >= 90 ? '#76C442' : a.percentage >= 75 ? '#ed8936' : '#e53e3e'
                        }}>
                          {a.percentage}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Assignments */}
            <div className="data-table-card">
              <div className="data-table-header">
                <span className="data-table-title">Assignments</span>
                <a href="/teacher/assignments" className="btn-view-all">View All →</a>
              </div>
              {assignments.map(a => (
                <div key={a.id} style={{ padding: '14px 0', borderBottom: '1px solid #f7fafc', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: a.status === 'Completed' ? '#76C44215' : '#ed893615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="material-icons" style={{ fontSize: '20px', color: a.status === 'Completed' ? '#76C442' : '#ed8936' }}>
                      {a.status === 'Completed' ? 'assignment_turned_in' : 'assignment'}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                    <div style={{ fontSize: '11px', color: '#a0aec0' }}>Class {a.class} • Due {a.dueDate}</div>
                    <div style={{ marginTop: '4px' }}>
                      <div className="progress-bar-custom">
                        <div className="progress-fill" style={{ width: `${Math.round((a.submitted / a.total) * 100)}%` }} />
                      </div>
                      <span style={{ fontSize: '10px', color: '#a0aec0', marginTop: '2px', display: 'block' }}>{a.submitted}/{a.total} submitted</span>
                    </div>
                  </div>
                  <span className={`status-badge ${a.status === 'Completed' ? 'status-paid' : 'status-pending'}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
