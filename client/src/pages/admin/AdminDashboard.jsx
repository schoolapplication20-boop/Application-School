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
import SEOMeta from '../../components/SEOMeta';

const EMPTY_REVENUE_DATA = [
  { name: 'Jan', revenue: 0, expenses: 0 }, { name: 'Feb', revenue: 0, expenses: 0 },
  { name: 'Mar', revenue: 0, expenses: 0 }, { name: 'Apr', revenue: 0, expenses: 0 },
  { name: 'May', revenue: 0, expenses: 0 }, { name: 'Jun', revenue: 0, expenses: 0 },
  { name: 'Jul', revenue: 0, expenses: 0 }, { name: 'Aug', revenue: 0, expenses: 0 },
  { name: 'Sep', revenue: 0, expenses: 0 }, { name: 'Oct', revenue: 0, expenses: 0 },
  { name: 'Nov', revenue: 0, expenses: 0 }, { name: 'Dec', revenue: 0, expenses: 0 },
];

const attendanceData = [
  { name: 'Jan', attendance: 88 }, { name: 'Feb', attendance: 85 },
  { name: 'Mar', attendance: 90 }, { name: 'Apr', attendance: 87 },
  { name: 'May', attendance: 92 }, { name: 'Jun', attendance: 89 },
  { name: 'Jul', attendance: 86 }, { name: 'Aug', attendance: 91 },
  { name: 'Sep', attendance: 94 }, { name: 'Oct', attendance: 93 },
  { name: 'Nov', attendance: 90 }, { name: 'Dec', attendance: 88 },
];

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const greeting = () => {
  const h = parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }), 10);
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const QUICK_ACTIONS = [
  { label: 'Add Student',   icon: 'person_add',            path: '/admin/students',     grad: 'linear-gradient(135deg,#0de1e8,#0369a1)' },
  { label: 'Add Teacher',   icon: 'school',                path: '/admin/teachers',     grad: 'linear-gradient(135deg,#667eea,#764ba2)' },
  { label: 'Collect Fee',   icon: 'point_of_sale',         path: '/admin/collect-fee',  grad: 'linear-gradient(135deg,#f6ad55,#dd6b20)' },
  { label: 'Applications',  icon: 'assignment_ind',        path: '/admin/applications', grad: 'linear-gradient(135deg,#805ad5,#553c9a)' },
  { label: 'View Reports',  icon: 'bar_chart',             path: '/admin/fees',         grad: 'linear-gradient(135deg,#17a2b8,#0f6674)' },
  { label: 'Pay Salaries',  icon: 'account_balance_wallet',path: '/admin/salaries',     grad: 'linear-gradient(135deg,#38a169,#276749)' },
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [chartPeriod, setChartPeriod] = useState('12M');
  const [toast, setToast] = useState(null);
  const [applications,     setApplications]     = useState([]);
  const [appsLoading,      setAppsLoading]      = useState(true);
  const [recentFees,       setRecentFees]       = useState([]);
  const [feesLoading,      setFeesLoading]      = useState(true);
  const [dbStats,          setDbStats]          = useState(null);
  const [statsLoading,     setStatsLoading]     = useState(true);
  const [statsError,       setStatsError]       = useState(null);
  const [lastRefresh,      setLastRefresh]      = useState(null);
  const [refreshing,       setRefreshing]       = useState(false);

  const fetchDashboardStats = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true); else setStatsLoading(true);
    setStatsError(null);
    try {
      const res = await adminAPI.getDashboardStats();
      setDbStats(res.data?.data ?? res.data ?? {});
      setLastRefresh(new Date());
    } catch (err) {
      setStatsError(err?.response?.data?.message || 'Failed to load dashboard data');
    } finally { setStatsLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchDashboardStats();
    const t = setInterval(() => fetchDashboardStats(true), 60000);
    return () => clearInterval(t);
  }, [fetchDashboardStats]);

  useEffect(() => {
    setAppsLoading(true);
    applicationAPI.getAll()
      .then(res => {
        const list = res.data?.data ?? res.data ?? [];
        setApplications([...(Array.isArray(list) ? list : [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5));
      })
      .catch(() => setApplications([]))
      .finally(() => setAppsLoading(false));
  }, []);

  useEffect(() => {
    setFeesLoading(true);
    adminAPI.getAllFeePayments()
      .then(res => {
        const list = res.data?.data ?? res.data ?? [];
        setRecentFees([...(Array.isArray(list) ? list : [])].sort((a, b) => new Date(b.createdAt || b.paymentDate) - new Date(a.createdAt || a.paymentDate)).slice(0, 5));
      })
      .catch(() => setRecentFees([]))
      .finally(() => setFeesLoading(false));
  }, []);

  const [admins, setAdmins] = useState([]);
  const [logs,   setLogs]   = useState([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    superAdminAPI.getAdmins().then(res => setAdmins(res.data?.data ?? [])).catch(() => setAdmins([]));
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
      fetchDashboardStats(true);
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
    { title: 'Total Students', value: statsLoading ? '…' : (dbStats?.totalStudents ?? 0),                        icon: 'school',          color: '#0de1e8' },
    { title: 'Total Teachers', value: statsLoading ? '…' : (dbStats?.totalTeachers ?? 0),                        icon: 'person',          color: '#667eea' },
    { title: 'Total Classes',  value: statsLoading ? '…' : (dbStats?.totalClasses ?? 0),                         icon: 'class',           color: '#805ad5' },
    { title: 'Total Exams',    value: statsLoading ? '…' : (dbStats?.totalExams ?? 0),                           icon: 'event_note',      color: '#f6ad55' },
    { title: 'Total Revenue',  value: statsLoading ? '…' : Math.round(Number(dbStats?.totalRevenue ?? 0)),        icon: 'payments',        color: '#38a169', prefix: '₹' },
    { title: 'Total Expenses', value: statsLoading ? '…' : Math.round(Number(dbStats?.totalExpenses ?? 0)),       icon: 'receipt_long',    color: '#e53e3e', prefix: '₹' },
  ];

  const statusBadge = (status) => {
    const cfg = { APPROVED: ['#f0fff4','#276749'], PENDING: ['#fffaf0','#c05621'], REJECTED: ['#fff5f5','#c53030'] };
    const key = String(status || '').toUpperCase();
    const [bg, clr] = cfg[key] || ['#f7fafc','#4a5568'];
    return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color: clr }}>{status}</span>;
  };

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

  return (
    <Layout pageTitle="Dashboard">
      <SEOMeta title="Admin Dashboard" description="School administration overview — students, teachers, fees and attendance at a glance." />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Welcome Banner ─────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 55%, #312e81 100%)',
        borderRadius: 20, padding: '28px 32px', marginBottom: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
        color: '#fff', position: 'relative', overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(30,58,138,0.35)',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -50, right: 80, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />
        <div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            {today}
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}>
            {greeting()}, {user?.name?.split(' ')[0] || 'Admin'}! 👋
          </div>
          <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)' }}>
            Here's what's happening in your school today.
            {lastRefresh && <span style={{ marginLeft: 10, fontSize: 11, opacity: 0.6 }}>Updated {lastRefresh.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' })}</span>}
          </div>
        </div>
        <div className="dashboard-banner-stats">
          {[
            { label: 'Students', val: dbStats?.totalStudents ?? '—', icon: 'school' },
            { label: 'Teachers', val: dbStats?.totalTeachers ?? '—', icon: 'person' },
            { label: 'Pending', val: dbStats?.pendingApplications ?? '—', icon: 'pending_actions' },
          ].map(b => (
            <div key={b.label} style={{ textAlign: 'center', background: 'rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 20px', backdropFilter: 'blur(4px)' }}>
              <span className="material-icons" style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: 4 }}>{b.icon}</span>
              <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{statsLoading ? '…' : b.val}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 3 }}>{b.label}</div>
            </div>
          ))}
          <button onClick={() => fetchDashboardStats(true)} disabled={refreshing || statsLoading}
            style={{ alignSelf: 'center', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: (refreshing || statsLoading) ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, backdropFilter: 'blur(4px)' }}>
            <span className="material-icons" style={{ fontSize: 16, transition: 'transform 0.4s', transform: refreshing ? 'rotate(360deg)' : 'none' }}>refresh</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* API Error Banner */}
      {statsError && (
        <div style={{ background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 12, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="material-icons" style={{ color: '#c53030', fontSize: 20 }}>error_outline</span>
          <span style={{ color: '#c53030', fontSize: 13, fontWeight: 600, flex: 1 }}>{statsError}</span>
          <button onClick={() => fetchDashboardStats()} style={{ padding: '5px 14px', borderRadius: 8, border: 'none', background: '#c53030', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Retry</button>
        </div>
      )}

      {/* ── Stat Cards ────────────────────────────────────────────────────────── */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {stats.map((s, i) => <StatCard key={i} {...s} />)}
      </div>

      {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 4, height: 20, borderRadius: 4, background: 'linear-gradient(180deg,#0de1e8,#0369a1)' }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Quick Actions</span>
        </div>
        <div className="quick-actions-grid">
          {QUICK_ACTIONS.map(action => (
            <div key={action.label} onClick={() => navigate(action.path)}
              style={{ background: '#fff', borderRadius: 16, padding: '18px 12px', textAlign: 'center', cursor: 'pointer', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #f0f4f8', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 28px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: action.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                <span className="material-icons" style={{ color: '#fff', fontSize: 24 }}>{action.icon}</span>
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#2d3748', lineHeight: 1.3 }}>{action.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Super Admin: Admin Overview + Activity Log ────────────────────────── */}
      {isSuperAdmin && (
        <div className="grid-3-2">
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 20, borderRadius: 4, background: 'linear-gradient(180deg,#0de1e8,#0369a1)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c', flex: 1 }}>Admin Overview</span>
              <span style={{ background: '#0de1e820', color: '#0369a1', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{admins.length} admins</span>
            </div>
            {admins.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>
                <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.4 }}>manage_accounts</span>
                No admins yet.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table">
                  <thead><tr><th>Admin</th><th>Status</th><th>Permissions</th></tr></thead>
                  <tbody>
                    {admins.map(a => (
                      <tr key={a.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg,#0de1e8,#0369a1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                              {a.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                              <div style={{ fontSize: 11, color: '#a0aec0' }}>{a.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: (a.isActive ?? true) ? '#f0fff4' : '#fff5f5', color: (a.isActive ?? true) ? '#276749' : '#e53e3e' }}>
                            {(a.isActive ?? true) ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: '#718096' }}>
                          {a.permissions ? `${Object.values(a.permissions).filter(Boolean).length} modules` : 'Full Access'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 20, borderRadius: 4, background: 'linear-gradient(180deg,#667eea,#764ba2)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Recent Activity</span>
            </div>
            {logs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>
                <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.4 }}>timeline</span>
                No recent activity
              </div>
            ) : (
              <div style={{ padding: '8px 0' }}>
                {logs.map((log, i) => (
                  <div key={log.id} style={{ display: 'flex', gap: 12, padding: '10px 22px', borderBottom: i < logs.length - 1 ? '1px solid #f7fafc' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#667eea18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span className="material-icons" style={{ fontSize: 14, color: '#667eea' }}>history</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, color: '#2d3748', fontWeight: 500, lineHeight: 1.4 }}>{log.action}</div>
                      <div style={{ fontSize: 10, color: '#a0aec0', marginTop: 2, display: 'flex', gap: 6 }}>
                        <span style={{ background: '#f7fafc', padding: '1px 6px', borderRadius: 8 }}>{log.module}</span>
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

      {/* ── Charts Section ─────────────────────────────────────────────────────── */}
      <div className="charts-inline-grid">
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                <div style={{ width: 4, height: 18, borderRadius: 4, background: 'linear-gradient(180deg,#38a169,#0de1e8)' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Revenue vs Expenses</span>
              </div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginLeft: 12 }}>Monthly financial overview</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['3M','6M','12M'].map(p => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  style={{ padding: '4px 12px', borderRadius: 8, border: `1.5px solid ${chartPeriod === p ? '#0de1e8' : '#e2e8f0'}`, background: chartPeriod === p ? '#0de1e8' : '#fff', color: chartPeriod === p ? '#fff' : '#718096', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: '16px 8px 8px' }}>
            {(() => {
              const revenueData = (dbStats?.monthlyData && dbStats.monthlyData.length === 12)
                ? dbStats.monthlyData.map(m => ({ name: m.name, revenue: Number(m.revenue || 0), expenses: Number(m.expenses || 0) }))
                : EMPTY_REVENUE_DATA;
              const sliced = chartPeriod === '3M' ? revenueData.slice(-3) : chartPeriod === '6M' ? revenueData.slice(-6) : revenueData;
              return (
                <BarChartComponent
                  data={sliced}
                  bars={[{ key: 'revenue', name: 'Revenue', color: '#0de1e8' }, { key: 'expenses', name: 'Expenses', color: '#e53e3e' }]}
                  height={260}
                />
              );
            })()}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            { title: 'Active Classes',    value: statsLoading ? '…' : (dbStats?.totalClasses ?? 0),        icon: 'class',              grad: 'linear-gradient(135deg,#0de1e8,#0369a1)',  light: '#ebf8ff' },
            { title: 'Exams Scheduled',   value: statsLoading ? '…' : (dbStats?.totalExams ?? 0),          icon: 'event_note',         grad: 'linear-gradient(135deg,#667eea,#764ba2)',  light: '#e9d8fd' },
            { title: 'Pending Apps',      value: statsLoading ? '…' : (dbStats?.pendingApplications ?? 0), icon: 'pending_actions',    grad: 'linear-gradient(135deg,#f6ad55,#e53e3e)',  light: '#fff5f5' },
            { title: 'Hall Tickets',      value: statsLoading ? '…' : (dbStats?.totalHallTickets ?? 0),    icon: 'confirmation_number',grad: 'linear-gradient(135deg,#805ad5,#553c9a)',  light: '#faf5ff' },
          ].map(item => (
            <div key={item.title} style={{ background: '#fff', borderRadius: 16, padding: '16px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid #f0f4f8' }}>
              <div style={{ width: 46, height: 46, borderRadius: 13, background: item.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 10px rgba(0,0,0,0.12)' }}>
                <span className="material-icons" style={{ color: '#fff', fontSize: 22 }}>{item.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#1a202c', lineHeight: 1 }}>
                  {typeof item.value === 'number' ? item.value.toLocaleString('en-IN') : item.value}
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#718096', marginTop: 3 }}>{item.title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Attendance Chart ──────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', overflow: 'hidden', marginBottom: 28 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 4, height: 20, borderRadius: 4, background: 'linear-gradient(180deg,#38b2ac,#0de1e8)' }} />
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Student Attendance Trend</div>
            <div style={{ fontSize: 12, color: '#a0aec0' }}>Monthly attendance percentage</div>
          </div>
        </div>
        <div style={{ padding: '16px 8px 8px' }}>
          <LineChartComponent data={attendanceData} lines={[{ key: 'attendance', name: 'Attendance %', color: '#0de1e8' }]} height={220} />
        </div>
      </div>

      {/* ── Bottom Tables ────────────────────────────────────────────────────── */}
      <div className="tables-section">
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 20, borderRadius: 4, background: 'linear-gradient(180deg,#805ad5,#553c9a)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Recent Applications</span>
            </div>
            <button onClick={() => navigate('/admin/applications')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#805ad5', fontWeight: 700, fontSize: 13 }}>View All →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {appsLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 28, display: 'block', marginBottom: 6, opacity: 0.4 }}>hourglass_top</span>
                Loading…
              </div>
            ) : applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 6, color: '#e2e8f0' }}>assignment_ind</span>
                No applications yet
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Student</th><th>Class</th><th>Parent</th><th>Status</th><th>Actions</th></tr></thead>
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
                        {String(a.status || '').toUpperCase() === 'PENDING' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleApprove(a.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#f0fff4', color: '#276749', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Approve</button>
                            <button onClick={() => handleReject(a.id)} style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#fff5f5', color: '#c53030', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Reject</button>
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

        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 20, borderRadius: 4, background: 'linear-gradient(180deg,#38a169,#0de1e8)' }} />
              <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Recent Fee Collections</span>
            </div>
            <button onClick={() => navigate('/admin/collect-fee')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#38a169', fontWeight: 700, fontSize: 13 }}>Collect Fee →</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            {feesLoading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 28, display: 'block', marginBottom: 6, opacity: 0.4 }}>hourglass_top</span>
                Loading…
              </div>
            ) : recentFees.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#a0aec0', fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 32, display: 'block', marginBottom: 6, color: '#e2e8f0' }}>payments</span>
                No fee collections yet
              </div>
            ) : (
              <table className="data-table">
                <thead><tr><th>Student</th><th>Amount</th><th>Method</th><th>Type</th></tr></thead>
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
                      <td style={{ fontWeight: 700, color: '#276749', fontSize: 14 }}>₹{Number(f.amountPaid || 0).toLocaleString('en-IN')}</td>
                      <td><span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: '#e8f4fd', color: '#2c5282' }}>{f.paymentMode || '—'}</span></td>
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
