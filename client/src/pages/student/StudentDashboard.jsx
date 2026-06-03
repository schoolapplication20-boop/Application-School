import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import StatCard from '../../components/StatCard';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import { useAuth } from '../../context/AuthContext';
import { studentAPI } from '../../services/api';
import { SkeletonDashboard } from '../../components/SkeletonLoader';
import SEOMeta from '../../components/SEOMeta';

const gradeBg    = { 'A+': '#f0fff4', 'A': '#f0fff4', 'B+': '#ebf8ff', 'B': '#ebf8ff', 'C': '#fffaf0', 'F': '#fff5f5' };
const gradeColor = { 'A+': '#276749', 'A': '#276749', 'B+': '#2b6cb0', 'B': '#2b6cb0', 'C': '#c05621', 'F': '#c53030' };

const getInitials = (name = '') => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';


export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [profile,    setProfile]    = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [marks,      setMarks]      = useState([]);
  const [feeData,    setFeeData]    = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    const today     = new Date();
    // Use Date constructor month arithmetic — negative month values wrap correctly across years
    const twoMonthsAgo = new Date(today);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    twoMonthsAgo.setDate(1);
    const startDate = twoMonthsAgo.toISOString().split('T')[0];
    const endDate   = today.toISOString().split('T')[0];

    Promise.all([
      studentAPI.getMyProfile().catch(() => ({ data: { data: null } })),
      studentAPI.getMyAttendance({ startDate, endDate }).catch(() => ({ data: { data: [] } })),
      studentAPI.getMyMarks().catch(() => ({ data: { data: [] } })),
      studentAPI.getMyFees().catch(() => ({ data: { data: null } })),
    ]).then(([profileRes, attRes, marksRes, feesRes]) => {
      setProfile(profileRes.data?.data ?? null);
      setAttendance(attRes.data?.data  ?? []);
      setMarks(marksRes.data?.data     ?? []);
      setFeeData(feesRes.data?.data    ?? null);
    }).finally(() => setLoading(false));
  }, []);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const presentDays   = attendance.filter(a => a.status === 'PRESENT').length;
  const workingDays   = attendance.filter(a => a.status !== 'HOLIDAY').length;
  const attendancePct = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

  const feeSummary = feeData?.summary ?? {};
  const totalFee   = Number(feeSummary.totalFee  || 0);
  const paidFee    = Number(feeSummary.paidAmount || 0);
  const pendingFee = Number(feeSummary.dueAmount  || 0);
  // Next due: first PENDING installment by due date
  const pendingInstallments = (feeData?.installments ?? []).filter(i => String(i.status || '').toUpperCase() !== 'PAID' && i.dueDate);
  pendingInstallments.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const nextDue = pendingInstallments[0] ?? null;

  const recentMarks = [...marks].sort((a, b) => new Date(b.examDate || 0) - new Date(a.examDate || 0)).slice(0, 5);

  const trendMap = {};
  attendance.forEach(a => {
    if (!a.date) return;
    const key = new Date(a.date).toLocaleDateString('en-IN', { month: 'short' });
    if (!trendMap[key]) trendMap[key] = { present: 0, total: 0 };
    if (a.status !== 'HOLIDAY') trendMap[key].total++;
    if (a.status === 'PRESENT') trendMap[key].present++;
  });
  const attendanceTrend = Object.entries(trendMap).map(([name, v]) => ({
    name,
    attendance: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0,
  }));

  const overallGrade = (() => {
    const validMarks = marks.filter(m => m.maxMarks > 0);
    if (!validMarks.length) return '—';
    const avg = validMarks.reduce((s, m) => s + (m.marks / m.maxMarks) * 100, 0) / validMarks.length;
    if (avg >= 90) return 'A+';
    if (avg >= 80) return 'A';
    if (avg >= 70) return 'B+';
    if (avg >= 60) return 'B';
    return 'C';
  })();

  // Display name and info — fall back to user object if profile not loaded yet
  const displayName  = profile?.name || user?.name || 'Student';
  const classSection = profile
    ? `${(profile.className || '').replace(/^class\s+/i, '')}${profile.section ? `-${profile.section}` : ''}`.trim() || '—'
    : '—';

  if (loading) {
    return (
      <Layout pageTitle="Student Dashboard">
        <SEOMeta title="Student Dashboard" description="View your attendance, marks, fees and schedule." />
        <SkeletonDashboard />
      </Layout>
    );
  }

  const greeting = () => {
    const h = parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }), 10);
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const gradeGrad = {
    'A+': 'linear-gradient(135deg,#134e4a,#0d9488)',
    'A':  'linear-gradient(135deg,#14532d,#16a34a)',
    'B+': 'linear-gradient(135deg,#1e3a8a,#2563eb)',
    'B':  'linear-gradient(135deg,#1e40af,#3b82f6)',
    'C':  'linear-gradient(135deg,#78350f,#d97706)',
    '—':  'linear-gradient(135deg,#1e293b,#475569)',
  };

  return (
    <Layout pageTitle="Student Dashboard">
      <SEOMeta title="Student Dashboard" description="View your attendance, marks, fees and schedule." />

      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0c1445 0%, #1e3a8a 50%, #1d4ed8 100%)',
        borderRadius: 18, padding: '28px 32px', marginBottom: 24, color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 120, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
              {getInitials(displayName)}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                {greeting()}
              </div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{displayName}</h1>
              <div style={{ marginTop: 6, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                  {classSection !== '—' ? `Class ${classSection}` : 'Class not assigned'}
                </span>
                {profile?.bloodGroup && (
                  <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
                    Blood: {profile.bloodGroup}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Overall grade badge */}
          <div style={{ background: gradeGrad[overallGrade] || gradeGrad['—'], borderRadius: 14, padding: '12px 18px', textAlign: 'center', border: '2px solid rgba(255,255,255,0.2)', flexShrink: 0 }}>
            <div style={{ fontSize: 34, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{overallGrade}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overall</div>
          </div>
        </div>

        {/* Banner stats row */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'Attendance', value: `${attendancePct}%`, icon: 'fact_check', color: '#67e8f9' },
            { label: 'Days Present', value: presentDays, icon: 'check_circle', color: '#86efac' },
            { label: 'Fee Due', value: `₹${pendingFee.toLocaleString()}`, icon: 'payments', color: '#fca5a5' },
          ].map(b => (
            <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-icons" style={{ fontSize: 16, color: b.color }}>{b.icon}</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{b.value}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <StatCard title="Attendance" value={attendancePct} suffix="%" icon="fact_check" color="#0de1e8" />
        <StatCard title="Days Present" value={presentDays} icon="check_circle" color="#3182ce" />
        <StatCard title="Fee Due" value={pendingFee} prefix="₹" icon="payments" color="#e53e3e" />
        <StatCard
          title="Total Marks"
          value={marks.length > 0 ? `${marks.reduce((s,m)=>s+m.marks,0)}/${marks.reduce((s,m)=>s+m.maxMarks,0)}` : '—'}
          icon="grade"
          color="#805ad5"
        />
      </div>

      <div className="grid-3-2">
        {/* Attendance Chart */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '22px 24px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#0de1e8,#3182ce)', borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Attendance Trend</div>
                <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 1 }}>Monthly attendance percentage</div>
              </div>
            </div>
            <span style={{ padding: '4px 12px', background: '#0de1e818', color: '#0891b2', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
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
          {/* Fee card */}
          <div style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', borderRadius: 18, padding: '22px 24px', color: '#fff', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="material-icons" style={{ fontSize: 20, color: '#c4b5fd' }}>receipt_long</span>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Fee Summary</div>
            </div>
            <div style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1 }}>₹{totalFee.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 4, marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Fees</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
              <span>Paid</span>
              <span style={{ fontWeight: 700 }}>₹{paidFee.toLocaleString()}</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.2)' }}>
              <div style={{ height: '100%', borderRadius: 3, background: '#fff', width: `${totalFee > 0 ? Math.min((paidFee / totalFee) * 100, 100) : 0}%` }} />
            </div>
          </div>

          {/* Next due */}
          <div style={{ background: '#fff', borderRadius: 18, padding: '20px 24px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ width: 4, height: 18, background: 'linear-gradient(180deg,#e53e3e,#fc8181)', borderRadius: 2 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#2d3748' }}>Next Payment Due</div>
            </div>
            {nextDue ? (
              <>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#e53e3e', marginBottom: 4 }}>₹{nextDue.amount?.toLocaleString()}</div>
                <div style={{ fontSize: 13, color: '#718096', marginBottom: 16 }}>Due: {nextDue.dueDate || '—'}</div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span className="material-icons" style={{ color: '#16a34a', fontSize: 20 }}>check_circle</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#16a34a' }}>All fees paid!</span>
              </div>
            )}
            <button onClick={() => navigate('/student/fees')} style={{ display: 'block', width: '100%', padding: '10px', background: 'linear-gradient(135deg,#0de1e8,#0369a1)', border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              {nextDue ? 'Pay Now' : 'View Fees'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid-1-1" style={{ marginTop: 24 }}>
        {/* Recent Marks */}
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#805ad5,#4361ee)', borderRadius: 2 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Recent Marks</span>
          </div>
          {recentMarks.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: '#a0aec0', fontSize: 13 }}>
              <span className="material-icons" style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>grade</span>
              No marks recorded yet
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f7fafc' }}>
                  {['Subject', 'Exam', 'Score', 'Grade'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#4a5568', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentMarks.map((m, i) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #f0f4f8', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#2d3748' }}>{m.subject}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: '#718096' }}>{m.examType || '—'}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#1a202c' }}>{m.marks}/{m.maxMarks}</td>
                    <td style={{ padding: '12px 16px' }}>
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
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#0de1e8,#3182ce)', borderRadius: 2 }} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Quick Access</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { label: 'View Attendance', icon: 'fact_check',    path: '/student/attendance',   color: '#0de1e8' },
              { label: 'My Marks',        icon: 'grade',          path: '/student/marks',        color: '#805ad5' },
              { label: 'Report Card',     icon: 'description',    path: '/student/report-card',  color: '#276749' },
              { label: 'Pay Fees',        icon: 'payments',       path: '/student/fees',         color: '#e53e3e' },
              { label: 'Leave Request',   icon: 'event_busy',     path: '/student/leave',        color: '#ed8936' },
              { label: 'Hall Ticket',     icon: 'verified',       path: '/student/examination',  color: '#3182ce' },
              { label: 'Class Diary',     icon: 'photo_library',  path: '/student/diary',        color: '#38b2ac' },
            ].map((item, i) => (
              <div key={item.path} onClick={() => navigate(item.path)} style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
                borderBottom: i < 6 ? '1px solid #f0f4f8' : 'none', cursor: 'pointer', transition: 'background 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.background = item.color + '08'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${item.color}20,${item.color}38)`, border: `1.5px solid ${item.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="material-icons" style={{ fontSize: 18, color: item.color }}>{item.icon}</span>
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#2d3748', flex: 1 }}>{item.label}</span>
                <span className="material-icons" style={{ fontSize: 16, color: '#cbd5e0' }}>chevron_right</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
