import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import StatCard from '../../components/StatCard';
import BarChartComponent from '../../components/Charts/BarChartComponent';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { superAdminAPI } from '../../services/api';
import { getLogs } from '../../services/activityLog';

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

const initialApplications = [
  { id: 1, name: 'Aarav Sharma', class: 'Class 6', parent: 'Ramesh Sharma', mobile: '9876543210', date: '14 Mar 2025', status: 'Pending' },
  { id: 2, name: 'Priya Nair', class: 'Class 9', parent: 'Sunil Nair', mobile: '9876543211', date: '13 Mar 2025', status: 'Pending' },
  { id: 3, name: 'Karthik Reddy', class: 'Class 11', parent: 'Venkat Reddy', mobile: '9876543212', date: '12 Mar 2025', status: 'Approved' },
  { id: 4, name: 'Divya Menon', class: 'Class 7', parent: 'Anil Menon', mobile: '9876543213', date: '11 Mar 2025', status: 'Pending' },
  { id: 5, name: 'Rohan Gupta', class: 'Class 10', parent: 'Vikram Gupta', mobile: '9876543214', date: '10 Mar 2025', status: 'Rejected' },
];

const recentFees = [
  { id: 1, student: 'Arjun Patel', class: '10-A', amount: 15000, type: 'Tuition', date: '15 Mar 2025', method: 'UPI' },
  { id: 2, student: 'Sneha Gupta', class: '9-B', amount: 12000, type: 'Tuition', date: '15 Mar 2025', method: 'Cash' },
  { id: 3, student: 'Ravi Kumar', class: '8-C', amount: 8500, type: 'Transport', date: '14 Mar 2025', method: 'Bank Transfer' },
  { id: 4, student: 'Ananya Singh', class: '10-B', amount: 15000, type: 'Tuition', date: '14 Mar 2025', method: 'Cheque' },
  { id: 5, student: 'Kiran Reddy', class: '7-A', amount: 10000, type: 'Tuition', date: '13 Mar 2025', method: 'UPI' },
];

const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [chartPeriod, setChartPeriod] = useState('12M');
  const [applications, setApplications] = useState(initialApplications);
  const [toast, setToast] = useState(null);

  // Super Admin only state
  const [admins, setAdmins] = useState([]);
  const [logs,   setLogs]   = useState([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    superAdminAPI.getAdmins()
      .then(res => setAdmins(res.data?.data ?? []))
      .catch(() => setAdmins([]));
    setLogs(getLogs().slice(0, 8));
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const refresh = () => setLogs(getLogs().slice(0, 8));
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [isSuperAdmin]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = (id) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'Approved' } : a));
    showToast('Application approved successfully');
  };

  const handleReject = (id) => {
    setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'Rejected' } : a));
    showToast('Application rejected', 'warning');
  };

  const stats = [
    { title: 'Total Students', value: 1284, icon: 'school', color: '#76C442', change: 8, changeType: 'positive' },
    { title: 'Total Teachers', value: 48, icon: 'person', color: '#3182ce', change: 4, changeType: 'positive' },
    { title: 'Pending Applications', value: applications.filter(a => a.status === 'Pending').length, icon: 'assignment_ind', color: '#805ad5', change: 3, changeType: 'positive' },
    { title: 'Monthly Revenue', value: 195000, icon: 'payments', color: '#38a169', change: 12, changeType: 'positive', prefix: '₹' },
    { title: 'Fee Collection Today', value: 60500, icon: 'point_of_sale', color: '#dd6b20', change: 0, changeType: 'neutral', prefix: '₹' },
    { title: 'Monthly Expenses', value: 78000, icon: 'receipt_long', color: '#e53e3e', change: 5, changeType: 'negative', prefix: '₹' },
  ];

  const statusBadge = (status) => {
    const map = { Approved: 'success', Pending: 'warning', Rejected: 'danger' };
    return <span className={`badge bg-${map[status] || 'secondary'}`}>{status}</span>;
  };

  return (
    <Layout pageTitle="Admin Dashboard">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

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

      {/* Super Admin: Admin Overview + Activity Log */}
      {isSuperAdmin && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '24px', marginBottom: '24px' }}>
          {/* Admin Overview */}
          <div className="data-table-card">
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons" style={{ color: '#76C442', fontSize: '20px' }}>manage_accounts</span>
              Admin Overview
              <span style={{ marginLeft: 'auto', background: '#76C44220', color: '#276749', padding: '2px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>{admins.length} admins</span>
            </div>
            {admins.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>manage_accounts</span>
                <p style={{ color: '#a0aec0', margin: 0 }}>No admins yet. Click "Add Admin" to create one.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead>
                    <tr><th>Admin</th><th>Status</th><th>Permissions</th></tr>
                  </thead>
                  <tbody>
                    {admins.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#76C442,#5fa832)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                              {a.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '13px' }}>{a.name}</div>
                              <div style={{ fontSize: '11px', color: '#a0aec0' }}>{a.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: !(a.isActive ?? true) ? '#fff5f5' : '#f0fff4', color: !(a.isActive ?? true) ? '#e53e3e' : '#76C442' }}>
                            {(a.isActive ?? true) ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: '#718096' }}>
                          {a.permissions
                            ? `${Object.values(a.permissions).filter(Boolean).length} modules`
                            : 'Full Access'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Activity Log */}
          <div className="data-table-card">
            <div style={{ fontWeight: 700, fontSize: '15px', color: '#2d3748', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="material-icons" style={{ color: '#3182ce', fontSize: '20px' }}>timeline</span>
              Recent Activity
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <span className="material-icons" style={{ fontSize: 40, color: '#e2e8f0', display: 'block', marginBottom: 8 }}>timeline</span>
                <p style={{ color: '#a0aec0', margin: 0 }}>No recent activity yet. Actions like creating or updating admins will appear here.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {logs.map((log, i) => (
                  <div key={log.id} style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: i < logs.length - 1 ? '1px solid #f7fafc' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#3182ce18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-icons" style={{ fontSize: '14px', color: '#3182ce' }}>history</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: '#2d3748', fontWeight: 500, lineHeight: 1.4 }}>{log.action}</div>
                      <div style={{ fontSize: '10px', color: '#a0aec0', marginTop: '2px', display: 'flex', gap: '6px' }}>
                        <span style={{ background: '#f7fafc', padding: '1px 6px', borderRadius: '8px' }}>{log.module}</span>
                        <span>{log.timestamp}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <h6 className="fw-bold mb-3">Quick Actions</h6>
          <div className="d-flex gap-2 flex-wrap">
            {[
              { label: 'Add Student', icon: 'person_add', path: '/admin/students', color: '#76C442' },
              { label: 'Add Teacher', icon: 'person', path: '/admin/teachers', color: '#4361ee' },
              { label: 'Collect Fee', icon: 'point_of_sale', path: '/admin/collect-fee', color: '#dd6b20' },
              { label: 'Applications', icon: 'assignment_ind', path: '/admin/applications', color: '#805ad5' },
              { label: 'View Reports', icon: 'bar_chart', path: '/admin/fees', color: '#17a2b8' },
              { label: 'Pay Salaries', icon: 'account_balance_wallet', path: '/admin/salaries', color: '#38a169' },
            ].map(action => (
              <button
                key={action.label}
                className="btn btn-light btn-sm d-flex align-items-center gap-2"
                onClick={() => navigate(action.path)}
                style={{ borderRadius: 8, padding: '8px 14px' }}
              >
                <span className="material-icons" style={{ fontSize: 18, color: action.color }}>{action.icon}</span>
                <span className="fw-medium" style={{ fontSize: 13 }}>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
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

      {/* Bottom Tables */}
      <div className="tables-section">
        {/* Recent Applications */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">Recent Applications</span>
            <button className="btn-view-all" onClick={() => navigate('/admin/applications')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76C442', fontWeight: 600 }}>View All →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Class</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.slice(0, 5).map(a => (
                  <tr key={a.id}>
                    <td>
                      <div className="student-cell">
                        <div className="student-avatar-sm">{getInitials(a.name)}</div>
                        <div>
                          <div className="student-name">{a.name}</div>
                          <div className="student-class">{a.date}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 13, fontWeight: 600 }}>{a.class}</td>
                    <td style={{ fontSize: 13, color: '#718096' }}>{a.parent}</td>
                    <td>{statusBadge(a.status)}</td>
                    <td>
                      {a.status === 'Pending' && (
                        <div className="d-flex gap-1">
                          <button className="btn btn-success btn-sm py-0 px-2" style={{ fontSize: 11 }} onClick={() => handleApprove(a.id)}>Approve</button>
                          <button className="btn btn-danger btn-sm py-0 px-2" style={{ fontSize: 11 }} onClick={() => handleReject(a.id)}>Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Fee Collections */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">Fee Collections Today</span>
            <button className="btn-view-all" onClick={() => navigate('/admin/collect-fee')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76C442', fontWeight: 600 }}>Collect Fee →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Type</th>
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
                    <td>
                      <span className="badge bg-light text-dark" style={{ fontSize: 11 }}>{f.method}</span>
                    </td>
                    <td style={{ fontSize: 13, color: '#718096' }}>{f.type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
