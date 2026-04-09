import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import StatCard from '../../components/StatCard';
import BarChartComponent from '../../components/Charts/BarChartComponent';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import Toast from '../../components/Toast';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, superAdminAPI, applicationAPI } from '../../services/api';
import { getLogs } from '../../services/activityLog';

const revenueData = [
  { name: 'Jan', revenue: 0, expenses: 0 },
  { name: 'Feb', revenue: 0, expenses: 0 },
  { name: 'Mar', revenue: 0, expenses: 0 },
  { name: 'Apr', revenue: 0, expenses: 0 },
  { name: 'May', revenue: 0, expenses: 0 },
  { name: 'Jun', revenue: 0, expenses: 0 },
  { name: 'Jul', revenue: 0, expenses: 0 },
  { name: 'Aug', revenue: 0, expenses: 0 },
  { name: 'Sep', revenue: 0, expenses: 0 },
  { name: 'Oct', revenue: 0, expenses: 0 },
  { name: 'Nov', revenue: 0, expenses: 0 },
  { name: 'Dec', revenue: 0, expenses: 0 },
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

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [chartPeriod, setChartPeriod] = useState('12M');
  const [toast, setToast] = useState(null);

  // ── Recent Applications (real DB) ──
  const [applications,     setApplications]     = useState([]);
  const [appsLoading,      setAppsLoading]      = useState(true);

  // ── Recent Fee Payments (real DB) ──
  const [recentFees,       setRecentFees]       = useState([]);
  const [feesLoading,      setFeesLoading]      = useState(true);

  // ── Real-time dashboard counts from backend ──
  const [dbStats,    setDbStats]    = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError,   setStatsError]   = useState(null);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [refreshing,   setRefreshing]   = useState(false);

  const fetchDashboardStats = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await adminAPI.getDashboardStats();
      const data = res.data?.data ?? res.data ?? {};
      setDbStats(data);
      setLastRefresh(new Date());
    } catch (err) {
      setStatsError(err?.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setStatsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    // Auto-refresh every 60 s
    const timer = setInterval(() => fetchDashboardStats(true), 60000);
    return () => clearInterval(timer);
  }, [fetchDashboardStats]);

  // ── Fetch recent applications ──────────────────────────────────────────────
  useEffect(() => {
    setAppsLoading(true);
    applicationAPI.getAll()
      .then(res => {
        const list = res.data?.data ?? res.data ?? [];
        // Sort by createdAt descending, take latest 5
        const sorted = [...(Array.isArray(list) ? list : [])]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5);
        setApplications(sorted);
      })
      .catch(() => setApplications([]))
      .finally(() => setAppsLoading(false));
  }, []);

  // ── Fetch recent fee payments ──────────────────────────────────────────────
  useEffect(() => {
    setFeesLoading(true);
    adminAPI.getAllFeePayments()
      .then(res => {
        const list = res.data?.data ?? res.data ?? [];
        const sorted = [...(Array.isArray(list) ? list : [])]
          .sort((a, b) => new Date(b.createdAt || b.paymentDate) - new Date(a.createdAt || a.paymentDate))
          .slice(0, 5);
        setRecentFees(sorted);
      })
      .catch(() => setRecentFees([]))
      .finally(() => setFeesLoading(false));
  }, []);

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

  const handleApprove = async (id) => {
    try {
      await applicationAPI.updateStatus(id, { status: 'APPROVED' });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'APPROVED' } : a));
      fetchDashboardStats(true); // refresh pending count
      showToast('Application approved successfully');
    } catch { showToast('Failed to approve application', 'error'); }
  };

  const handleReject = async (id) => {
    try {
      await applicationAPI.updateStatus(id, { status: 'REJECTED' });
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: 'REJECTED' } : a));
      fetchDashboardStats(true);
      showToast('Application rejected', 'warning');
    } catch { showToast('Failed to reject application', 'error'); }
  };

  const stats = [
    {
      title: 'Total Students',
      value: statsLoading ? '…' : (dbStats?.totalStudents ?? 0),
      icon: 'school', color: '#76C442',
    },
    {
      title: 'Total Teachers',
      value: statsLoading ? '…' : (dbStats?.totalTeachers ?? 0),
      icon: 'person', color: '#3182ce',
    },
    {
      title: 'Total Classes',
      value: statsLoading ? '…' : (dbStats?.totalClasses ?? 0),
      icon: 'class', color: '#805ad5',
    },
    {
      title: 'Total Exams',
      value: statsLoading ? '…' : (dbStats?.totalExams ?? 0),
      icon: 'event_note', color: '#dd6b20',
    },
    {
      title: 'Total Revenue',
      value: statsLoading ? '…' : Math.round(Number(dbStats?.totalRevenue ?? 0)),
      icon: 'payments', color: '#38a169',
      prefix: '₹',
    },
    {
      title: 'Total Expenses',
      value: statsLoading ? '…' : Math.round(Number(dbStats?.totalExpenses ?? 0)),
      icon: 'receipt_long', color: '#e53e3e',
      prefix: '₹',
    },
  ];

  const statusBadge = (status) => {
    const map = { APPROVED: 'success', PENDING: 'warning', REJECTED: 'danger', Approved: 'success', Pending: 'warning', Rejected: 'danger' };
    const label = { APPROVED: 'Approved', PENDING: 'Pending', REJECTED: 'Rejected' };
    return <span className={`badge bg-${map[status] || 'secondary'}`}>{label[status] || status}</span>;
  };

  return (
    <Layout pageTitle="Admin Dashboard">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1>Dashboard Overview</h1>
          <p>
            Welcome back! Here's what's happening with your school today.
            {lastRefresh && (
              <span style={{ marginLeft: 10, fontSize: 11, color: '#a0aec0', fontWeight: 400 }}>
                Last updated: {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => fetchDashboardStats(true)}
          disabled={refreshing || statsLoading}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#4a5568', cursor: (refreshing || statsLoading) ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
          <span className="material-icons" style={{ fontSize: 16, transition: 'transform 0.3s', transform: refreshing ? 'rotate(360deg)' : 'none' }}>refresh</span>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* API Error Banner */}
      {statsError && (
        <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-icons" style={{ color: '#c53030', fontSize: 20 }}>error_outline</span>
          <span style={{ color: '#c53030', fontSize: 13, fontWeight: 600, flex: 1 }}>{statsError}</span>
          <button onClick={() => fetchDashboardStats()} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: '#c53030', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
            Retry
          </button>
        </div>
      )}

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
            { title: 'Total Classes',   value: statsLoading ? '…' : (dbStats?.totalClasses ?? 0),             icon: 'class',          color: '#76C442', desc: 'Active classrooms' },
            { title: 'Total Exams',     value: statsLoading ? '…' : (dbStats?.totalExams ?? 0),               icon: 'event_note',     color: '#3182ce', desc: 'Exam schedules' },
            { title: 'Pending Apps',    value: statsLoading ? '…' : (dbStats?.pendingApplications ?? 0),      icon: 'pending_actions',color: '#e53e3e', desc: 'Awaiting review' },
            { title: 'Hall Tickets',    value: statsLoading ? '…' : (dbStats?.totalHallTickets ?? 0),         icon: 'confirmation_number', color: '#805ad5', desc: 'Generated' },
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
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#2d3748' }}>
                    {typeof item.value === 'number' ? item.value.toLocaleString('en-IN') : item.value}
                  </div>
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
        {/* Recent Applications — real DB data */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">Recent Applications</span>
            <button className="btn-view-all" onClick={() => navigate('/admin/applications')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76C442', fontWeight: 600 }}>View All →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {appsLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 28, display: 'block', marginBottom: 6, opacity: 0.4 }}>hourglass_top</span>
                Loading applications…
              </div>
            ) : applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 6, color: '#e2e8f0' }}>assignment_ind</span>
                No applications yet
              </div>
            ) : (
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
                  {applications.map(a => (
                    <tr key={a.id}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar-sm">{getInitials(a.studentName || '')}</div>
                          <div>
                            <div className="student-name">{a.studentName}</div>
                            <div className="student-class">{fmtDate(a.createdAt)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: 13, fontWeight: 600 }}>Class {a.classApplied}</td>
                      <td style={{ fontSize: 13, color: '#718096' }}>{a.fatherName || a.guardianName || '—'}</td>
                      <td>{statusBadge(a.status)}</td>
                      <td>
                        {(a.status === 'PENDING' || a.status === 'Pending') && (
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
            )}
          </div>
        </div>

        {/* Recent Fee Collections — real DB data */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">Recent Fee Collections</span>
            <button className="btn-view-all" onClick={() => navigate('/admin/collect-fee')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76C442', fontWeight: 600 }}>Collect Fee →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {feesLoading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 28, display: 'block', marginBottom: 6, opacity: 0.4 }}>hourglass_top</span>
                Loading payments…
              </div>
            ) : recentFees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 6, color: '#e2e8f0' }}>payments</span>
                No fee collections yet
              </div>
            ) : (
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
                          <div className="student-avatar-sm">{getInitials(f.studentName || '')}</div>
                          <div>
                            <div className="student-name">{f.studentName}</div>
                            <div className="student-class">{f.className || fmtDate(f.paymentDate)}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: '#2d3748' }}>
                        ₹{Number(f.amountPaid || 0).toLocaleString('en-IN')}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark" style={{ fontSize: 11 }}>{f.paymentMode || '—'}</span>
                      </td>
                      <td style={{ fontSize: 13, color: '#718096' }}>{f.feeType || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
