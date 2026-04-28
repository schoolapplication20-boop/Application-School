import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import { useAuth } from '../../context/AuthContext';
import { parentAPI } from '../../services/api';

const gradeBg    = { 'A+': '#f0fff4', 'A': '#f0fff4', 'B+': '#ebf8ff', 'B': '#ebf8ff', 'C': '#fffaf0', 'F': '#fff5f5' };
const gradeColor = { 'A+': '#276749', 'A': '#276749', 'B+': '#2b6cb0', 'B': '#2b6cb0', 'C': '#c05621', 'F': '#c53030' };

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

const fmtDate = (d) => {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return d; }
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [children,    setChildren]    = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [attendance,  setAttendance]  = useState([]);
  const [marks,       setMarks]       = useState([]);
  const [fees,        setFees]        = useState([]);
  const [loading,     setLoading]     = useState(true);

  // Load children on mount
  useEffect(() => {
    if (!user?.id) return;
    parentAPI.getMyChildren()
      .then(res => {
        const list = res.data?.data ?? [];
        setChildren(list);
      })
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const child = children[selectedIdx] ?? null;

  // Load child-specific data whenever selected child changes
  useEffect(() => {
    if (!child?.id) { setAttendance([]); setMarks([]); setFees([]); return; }

    const today     = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth() - 2, 1).toISOString().split('T')[0];
    const endDate   = today.toISOString().split('T')[0];

    Promise.all([
      parentAPI.getChildAttendance(child.id, { startDate, endDate }).catch(() => ({ data: { data: [] } })),
      parentAPI.getChildMarks(child.id).catch(() => ({ data: { data: [] } })),
      parentAPI.getChildFees(child.id).catch(() => ({ data: { data: [] } })),
    ]).then(([attRes, marksRes, feesRes]) => {
      setAttendance(attRes.data?.data  ?? []);
      setMarks(marksRes.data?.data     ?? []);
      setFees(feesRes.data?.data       ?? []);
    });
  }, [child?.id]);

  // ── Derived stats ───────────────────────────────────────────────────────────
  const presentDays = attendance.filter(a => a.status === 'PRESENT').length;
  const workingDays = attendance.filter(a => a.status !== 'HOLIDAY').length;
  const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

  const totalFee   = fees.reduce((s, f) => s + (f.amount || 0), 0);
  const paidFee    = fees.filter(f => f.status === 'PAID').reduce((s, f) => s + (f.amount || 0), 0);
  const pendingFee = fees.filter(f => f.status !== 'PAID').reduce((s, f) => s + (f.amount || 0), 0);
  const nextDue    = fees.filter(f => f.status !== 'PAID').sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0];

  const recentMarks = [...marks].sort((a, b) => new Date(b.examDate || 0) - new Date(a.examDate || 0)).slice(0, 5);

  // Build monthly attendance trend from last 3 months of data
  const trendMap = {};
  attendance.forEach(a => {
    if (!a.date) return;
    const d = new Date(a.date);
    const key = d.toLocaleDateString('en-IN', { month: 'short' });
    if (!trendMap[key]) trendMap[key] = { present: 0, total: 0 };
    if (a.status !== 'HOLIDAY') trendMap[key].total++;
    if (a.status === 'PRESENT') trendMap[key].present++;
  });
  const attendanceTrend = Object.entries(trendMap).map(([name, v]) => ({
    name,
    attendance: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));

  const overallGrade = (() => {
    if (!marks.length) return '—';
    const avg = marks.reduce((s, m) => s + (m.maxMarks > 0 ? (m.marks / m.maxMarks) * 100 : 0), 0) / marks.length;
    if (avg >= 90) return 'A+';
    if (avg >= 80) return 'A';
    if (avg >= 70) return 'B+';
    if (avg >= 60) return 'B';
    return 'C';
  })();

  if (loading) {
    return (
      <Layout pageTitle="Parent Dashboard">
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#a0aec0' }}>
          <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>hourglass_empty</span>
          Loading…
        </div>
      </Layout>
    );
  }

  if (!child) {
    return (
      <Layout pageTitle="Parent Dashboard">
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <span className="material-icons" style={{ fontSize: 64, color: '#e2e8f0', display: 'block', marginBottom: 12 }}>child_care</span>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4a5568' }}>No children linked to your account</h3>
          <p style={{ fontSize: 13, color: '#a0aec0', marginTop: 6 }}>
            Please contact the school admin to link your mobile number to your child's profile.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Parent Dashboard">
      <div className="page-header">
        <h1>My Child's Overview</h1>
        <p>Track your child's academic progress, attendance and more</p>
      </div>

      {/* Child selector (if multiple children) */}
      {children.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {children.map((c, i) => (
            <button key={c.id} onClick={() => setSelectedIdx(i)} style={{
              padding: '8px 18px', borderRadius: 20, border: `2px solid ${i === selectedIdx ? '#0de1e8' : '#e2e8f0'}`,
              background: i === selectedIdx ? '#0de1e820' : '#fff', color: i === selectedIdx ? '#276749' : '#718096',
              fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Child Info Card */}
      <div className="child-info-card">
        <div className="child-photo">{getInitials(child.name)}</div>
        <div className="child-details">
          <h2>{child.name}</h2>
          <div className="child-class">Class {child.className}{child.section ? `-${child.section}` : ''}</div>
          <div className="child-tags">
            <span className="child-tag">Roll No: {child.rollNumber || '—'}</span>
            {child.dateOfBirth && <span className="child-tag">DOB: {fmtDate(child.dateOfBirth)}</span>}
            {child.bloodGroup  && <span className="child-tag">Blood: {child.bloodGroup}</span>}
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'center', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '16px 24px' }}>
          <div style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1 }}>{overallGrade}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>Overall Grade</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { title: 'Attendance',  value: `${attendancePct}%`, icon: 'fact_check', color: '#0de1e8' },
          { title: 'Days Present', value: presentDays,         icon: 'check_circle', color: '#3182ce' },
          { title: 'Fee Due',     value: `₹${pendingFee.toLocaleString()}`, icon: 'payments', color: '#e53e3e' },
          { title: 'Total Marks', value: marks.length > 0 ? `${marks.reduce((s,m)=>s+m.marks,0)}/${marks.reduce((s,m)=>s+m.maxMarks,0)}` : '—', icon: 'grade', color: '#805ad5' },
        ].map((s, i) => (
          <div key={i} className="stat-card card-hover">
            <div className="stat-icon" style={{ backgroundColor: s.color + '15' }}>
              <span className="material-icons" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.title}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', marginBottom: '24px' }}>
        {/* Attendance Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Attendance Trend</div>
              <div className="chart-card-subtitle">Monthly attendance percentage</div>
            </div>
            <span style={{ padding: '4px 12px', background: '#0de1e820', color: '#0de1e8', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              {attendancePct}% Avg
            </span>
          </div>
          {attendanceTrend.length > 0
            ? <LineChartComponent data={attendanceTrend} lines={[{ key: 'attendance', name: 'Attendance %', color: '#0de1e8' }]} height={200} />
            : <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>No attendance data yet</div>
          }
        </div>

        {/* Fee Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="fee-summary">
            <h3>Fee Summary</h3>
            <div className="amount">₹{totalFee.toLocaleString()}</div>
            <div className="due-date">Total Fees</div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                <span>Paid</span>
                <span style={{ fontWeight: 700 }}>₹{paidFee.toLocaleString()}</span>
              </div>
              <div className="progress-bar-custom" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ height: '6px', borderRadius: '3px', background: '#fff', width: `${totalFee > 0 ? Math.min((paidFee / totalFee) * 100, 100) : 0}%` }} />
              </div>
            </div>
          </div>
          <div className="chart-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748', marginBottom: '12px' }}>Next Payment Due</div>
            {nextDue ? (
              <>
                <div style={{ fontSize: '28px', fontWeight: 800, color: '#e53e3e', marginBottom: '4px' }}>₹{nextDue.amount?.toLocaleString()}</div>
                <div style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>Due: {nextDue.dueDate || '—'}</div>
              </>
            ) : (
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0de1e8', marginBottom: '16px' }}>All fees paid!</div>
            )}
            <button onClick={() => navigate('/parent/pay-fees')} style={{ display: 'block', width: '100%', padding: '10px', background: '#0de1e8', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              {nextDue ? 'Pay Now' : 'View Fees'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Marks */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">Recent Marks</span>
            <button className="btn-view-all" onClick={() => navigate('/parent/performance')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0de1e8', fontWeight: 600 }}>View All →</button>
          </div>
          {recentMarks.length === 0 ? (
            <div style={{ padding: '32px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>No marks recorded yet</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Exam</th>
                  <th>Score</th>
                  <th>Grade</th>
                </tr>
              </thead>
              <tbody>
                {recentMarks.map(m => (
                  <tr key={m.id}>
                    <td style={{ fontSize: '13px', fontWeight: 600 }}>{m.subject}</td>
                    <td style={{ fontSize: '12px', color: '#718096' }}>{m.examType || '—'}</td>
                    <td style={{ fontSize: '13px', fontWeight: 700 }}>{m.marks}/{m.maxMarks}</td>
                    <td>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: gradeBg[m.grade] || '#f7fafc', color: gradeColor[m.grade] || '#4a5568' }}>
                        {m.grade || '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Quick Links */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">Quick Access</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '8px 0' }}>
            {[
              { label: 'View Attendance',   icon: 'fact_check',   path: '/parent/attendance',  color: '#0de1e8' },
              { label: 'Performance',       icon: 'grade',        path: '/parent/performance', color: '#805ad5' },
              { label: 'Pay Fees',          icon: 'payments',     path: '/parent/pay-fees',    color: '#e53e3e' },
              { label: 'Leave Request',     icon: 'event_busy',   path: '/parent/leave',       color: '#ed8936' },
              { label: 'Hall Ticket',       icon: 'verified',     path: '/parent/examination', color: '#3182ce' },
              { label: 'Class Diary',       icon: 'photo_library',path: '/parent/diary',       color: '#38b2ac' },
            ].map(item => (
              <div key={item.path} onClick={() => navigate(item.path)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 10, border: '1px solid #f0f4f8', cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = '#f7fafc'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 36, height: 36, borderRadius: 9, background: item.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-icons" style={{ fontSize: 18, color: item.color }}>{item.icon}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2d3748' }}>{item.label}</span>
                <span className="material-icons" style={{ fontSize: 16, color: '#cbd5e0', marginLeft: 'auto' }}>chevron_right</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
