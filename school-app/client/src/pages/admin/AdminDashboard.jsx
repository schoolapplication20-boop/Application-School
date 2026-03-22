import React, { useState, useEffect } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import StatCard from '../../components/StatCard';
import BarChartComponent from '../../components/Charts/BarChartComponent';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const revenueData = [
  { name: 'Jan', revenue: 125000, expenses: 48000 },
  { name: 'Feb', revenue: 118000, expenses: 52000 },
  { name: 'Mar', revenue: 132000, expenses: 44000 },
  { name: 'Apr', revenue: 141000, expenses: 56000 },
  { name: 'May', revenue: 138000, expenses: 50000 },
  { name: 'Jun', revenue: 155000, expenses: 62000 },
  { name: 'Jul', revenue: 148000, expenses: 58000 },
  { name: 'Aug', revenue: 162000, expenses: 64000 },
  { name: 'Sep', revenue: 175000, expenses: 70000 },
  { name: 'Oct', revenue: 169000, expenses: 67000 },
  { name: 'Nov', revenue: 182000, expenses: 72000 },
  { name: 'Dec', revenue: 195000, expenses: 78000 },
];

const attendanceData = [
  { name: 'Jan', attendance: 88 },
  { name: 'Feb', attendance: 85 },
  { name: 'Mar', attendance: 90 },
  { name: 'Apr', attendance: 87 },
  { name: 'May', attendance: 92 },
  { name: 'Jun', attendance: 89 },
  { name: 'Jul', attendance: 86 },
  { name: 'Aug', attendance: 91 },
  { name: 'Sep', attendance: 94 },
  { name: 'Oct', attendance: 93 },
  { name: 'Nov', attendance: 90 },
  { name: 'Dec', attendance: 88 },
];

const recentStudents = [
  { id: 1, name: 'Arjun Patel', rollNo: 'S001', class: '10-A', parent: 'Rajesh Patel', date: '12 Mar 2026', status: 'Active' },
  { id: 2, name: 'Sneha Gupta', rollNo: 'S002', class: '9-B', parent: 'Priya Gupta', date: '11 Mar 2026', status: 'Active' },
  { id: 3, name: 'Ravi Kumar', rollNo: 'S003', class: '8-C', parent: 'Suresh Kumar', date: '10 Mar 2026', status: 'Active' },
  { id: 4, name: 'Ananya Singh', rollNo: 'S004', class: '10-B', parent: 'Amit Singh', date: '09 Mar 2026', status: 'Active' },
  { id: 5, name: 'Kiran Reddy', rollNo: 'S005', class: '7-A', parent: 'Venkat Reddy', date: '08 Mar 2026', status: 'Active' },
];

const recentFees = [
  { id: 1, student: 'Arjun Patel', class: '10-A', amount: 15000, type: 'Tuition', date: '12 Mar 2026', status: 'PAID' },
  { id: 2, student: 'Sneha Gupta', class: '9-B', amount: 12000, type: 'Tuition', date: '11 Mar 2026', status: 'PAID' },
  { id: 3, student: 'Ravi Kumar', class: '8-C', amount: 12000, type: 'Tuition', date: '10 Mar 2026', status: 'PENDING' },
  { id: 4, student: 'Ananya Singh', class: '10-B', amount: 15000, type: 'Tuition', date: '05 Mar 2026', status: 'OVERDUE' },
  { id: 5, student: 'Kiran Reddy', class: '7-A', amount: 10000, type: 'Tuition', date: '08 Mar 2026', status: 'PAID' },
];

const AdminDashboard = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [chartPeriod, setChartPeriod] = useState('12M');

  const stats = [
    { title: 'Total Students', value: 1284, icon: 'school', color: '#76C442', change: 8, changeType: 'positive' },
    { title: 'Total Teachers', value: 48, icon: 'person', color: '#3182ce', change: 4, changeType: 'positive' },
    { title: 'Monthly Revenue', value: 195000, icon: 'payments', color: '#805ad5', change: 12, changeType: 'positive', prefix: '₹' },
    { title: 'Monthly Expenses', value: 78000, icon: 'receipt_long', color: '#e53e3e', change: 5, changeType: 'negative', prefix: '₹' },
  ];

  const getStatusBadge = (status) => {
    const map = {
      'PAID': 'status-paid',
      'PENDING': 'status-pending',
      'OVERDUE': 'status-overdue',
      'Active': 'status-present',
    };
    return <span className={`status-badge ${map[status] || ''}`}>{status}</span>;
  };

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-layout">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileSidebarOpen}
      />
      {mobileSidebarOpen && (
        <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />
      )}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar
          pageTitle="Admin Dashboard"
          onMenuToggle={() => {
            if (window.innerWidth <= 1024) {
              setMobileSidebarOpen(!mobileSidebarOpen);
            } else {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
        />

        <div className="page-content">
          {/* Page Header */}
          <div className="page-header">
            <h1>Dashboard Overview</h1>
            <p>Welcome back! Here's what's happening with your school today.</p>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            {stats.map((stat, i) => (
              <StatCard key={i} {...stat} />
            ))}
          </div>

          {/* Charts Section */}
          <div className="charts-section">
            {/* Revenue vs Expenses Bar Chart */}
            <div className="chart-card">
              <div className="chart-card-header">
                <div>
                  <div className="chart-card-title">Revenue vs Expenses</div>
                  <div className="chart-card-subtitle">Monthly financial overview</div>
                </div>
                <div className="chart-card-actions">
                  {['3M', '6M', '12M'].map(p => (
                    <button
                      key={p}
                      className={`chart-period-btn ${chartPeriod === p ? 'active' : ''}`}
                      onClick={() => setChartPeriod(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
              <BarChartComponent
                data={chartPeriod === '3M' ? revenueData.slice(-3) : chartPeriod === '6M' ? revenueData.slice(-6) : revenueData}
                bars={[
                  { key: 'revenue', name: 'Revenue', color: '#76C442' },
                  { key: 'expenses', name: 'Expenses', color: '#e53e3e' },
                ]}
                height={280}
              />
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {[
                { title: 'Active Classes', value: '24', icon: 'class', color: '#76C442', desc: 'Across 8 grades' },
                { title: 'Avg Attendance', value: '91%', icon: 'fact_check', color: '#3182ce', desc: 'This month' },
                { title: 'Pending Fees', value: '₹2.4L', icon: 'pending_actions', color: '#e53e3e', desc: '34 students' },
                { title: 'New Admissions', value: '28', icon: 'person_add', color: '#805ad5', desc: 'This month' },
              ].map(item => (
                <div key={item.title} className="chart-card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <span className="material-icons" style={{ color: item.color, fontSize: '22px' }}>{item.icon}</span>
                    </div>
                    <div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748' }}>{item.value}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#4a5568' }}>{item.title}</div>
                      <div style={{ fontSize: '11px', color: '#a0aec0' }}>{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Chart */}
          <div className="chart-card" style={{ marginBottom: '24px' }}>
            <div className="chart-card-header">
              <div>
                <div className="chart-card-title">Student Attendance Trend</div>
                <div className="chart-card-subtitle">Monthly attendance percentage</div>
              </div>
            </div>
            <LineChartComponent
              data={attendanceData}
              lines={[{ key: 'attendance', name: 'Attendance %', color: '#76C442' }]}
              height={220}
            />
          </div>

          {/* Recent Tables */}
          <div className="tables-section">
            {/* Recent Students */}
            <div className="data-table-card">
              <div className="data-table-header">
                <span className="data-table-title">Recent Students</span>
                <a href="/admin/students" className="btn-view-all">View All →</a>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Roll No</th>
                      <th>Class</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentStudents.map(s => (
                      <tr key={s.id}>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar-sm">{getInitials(s.name)}</div>
                            <div>
                              <div className="student-name">{s.name}</div>
                              <div className="student-class">{s.date}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#718096' }}>{s.rollNo}</td>
                        <td><span style={{ fontSize: '13px', fontWeight: 600 }}>{s.class}</span></td>
                        <td>{getStatusBadge(s.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Fees */}
            <div className="data-table-card">
              <div className="data-table-header">
                <span className="data-table-title">Recent Fees</span>
                <a href="/admin/fees" className="btn-view-all">View All →</a>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentFees.map(f => (
                      <tr key={f.id}>
                        <td>
                          <div className="student-cell">
                            <div className="student-avatar-sm">{getInitials(f.student)}</div>
                            <div>
                              <div className="student-name">{f.student}</div>
                              <div className="student-class">{f.class}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#2d3748' }}>₹{f.amount.toLocaleString()}</td>
                        <td>{getStatusBadge(f.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
