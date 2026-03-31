import React from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import LineChartComponent from '../../components/Charts/LineChartComponent';

const childInfo = {
  name: 'Arjun Patel',
  class: 'Class 10 - Section A',
  rollNo: 'S001',
  dob: '15 Jan 2010',
  school: 'Schoolers Academy',
  overallGrade: 'A',
  bloodGroup: 'B+',
};

const attendanceTrend = [
  { name: 'Jan', attendance: 92 },
  { name: 'Feb', attendance: 88 },
  { name: 'Mar', attendance: 94 },
  { name: 'Apr', attendance: 90 },
  { name: 'May', attendance: 96 },
  { name: 'Jun', attendance: 85 },
];

const recentMarks = [
  { id: 1, subject: 'Mathematics', exam: 'Unit Test 1', marks: 42, max: 50, grade: 'A', date: '15 Feb 2025' },
  { id: 2, subject: 'Science', exam: 'Unit Test 1', marks: 38, max: 50, grade: 'B', date: '15 Feb 2025' },
  { id: 3, subject: 'English', exam: 'Mid Term', marks: 82, max: 100, grade: 'A+', date: '10 Jan 2025' },
  { id: 4, subject: 'Social Studies', exam: 'Unit Test 1', marks: 40, max: 50, grade: 'A', date: '16 Feb 2025' },
  { id: 5, subject: 'Hindi', exam: 'Unit Test 1', marks: 35, max: 50, grade: 'B', date: '16 Feb 2025' },
];

const upcomingAssignments = [
  { id: 1, title: 'Quadratic Equations Practice', subject: 'Mathematics', dueDate: '20 Mar 2025', status: 'Pending' },
  { id: 2, title: 'History Essay - Mughal Empire', subject: 'Social Studies', dueDate: '22 Mar 2025', status: 'Submitted' },
  { id: 3, title: 'Science Lab Report', subject: 'Science', dueDate: '25 Mar 2025', status: 'Pending' },
];

const feeDetails = { totalFee: 45000, paid: 30000, pending: 15000, nextDue: '10 Apr 2025', nextAmount: 15000 };

const gradeBg = { 'A+': '#f0fff4', 'A': '#f0fff4', 'B+': '#ebf8ff', 'B': '#ebf8ff', 'C': '#fffaf0', 'F': '#fff5f5' };
const gradeColor = { 'A+': '#276749', 'A': '#276749', 'B+': '#2b6cb0', 'B': '#2b6cb0', 'C': '#c05621', 'F': '#c53030' };

const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

export default function ParentDashboard() {
  const navigate = useNavigate();

  return (
    <Layout pageTitle="Parent Dashboard">
      <div className="page-header">
        <h1>My Child's Overview</h1>
        <p>Track your child's academic progress, attendance and more</p>
      </div>

      {/* Child Info Card */}
      <div className="child-info-card">
        <div className="child-photo">{getInitials(childInfo.name)}</div>
        <div className="child-details">
          <h2>{childInfo.name}</h2>
          <div className="child-class">{childInfo.class}</div>
          <div className="child-tags">
            <span className="child-tag">Roll No: {childInfo.rollNo}</span>
            <span className="child-tag">DOB: {childInfo.dob}</span>
            <span className="child-tag">Blood: {childInfo.bloodGroup}</span>
            <span className="child-tag">{childInfo.school}</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto', textAlign: 'center', background: 'rgba(255,255,255,0.2)', borderRadius: '16px', padding: '16px 24px' }}>
          <div style={{ fontSize: '42px', fontWeight: 800, lineHeight: 1 }}>{childInfo.overallGrade}</div>
          <div style={{ fontSize: '12px', opacity: 0.85, marginTop: '4px' }}>Overall Grade</div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        {[
          { title: 'Attendance', value: '92', suffix: '%', icon: 'fact_check', color: '#76C442', change: 2, changeType: 'positive' },
          { title: 'Pending Assignments', value: 2, icon: 'assignment_late', color: '#ed8936' },
          { title: 'Fee Due', value: '₹15,000', icon: 'payments', color: '#e53e3e' },
          { title: 'Class Rank', value: '5th', icon: 'leaderboard', color: '#805ad5' },
        ].map((s, i) => (
          <div key={i} className="stat-card card-hover">
            <div className="stat-icon" style={{ backgroundColor: s.color + '15' }}>
              <span className="material-icons" style={{ color: s.color }}>{s.icon}</span>
            </div>
            <div className="stat-value">{s.value}{s.suffix}</div>
            <div className="stat-label">{s.title}</div>
            {s.change && (
              <div className={`stat-change ${s.changeType}`}>
                <span className="material-icons" style={{ fontSize: '14px', verticalAlign: 'middle' }}>trending_up</span>
                {' '}{s.change}% vs last month
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Notifications */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <h6 className="fw-bold mb-3">
            <span className="material-icons" style={{ fontSize: 18, verticalAlign: 'middle', marginRight: 6, color: '#ed8936' }}>notifications</span>
            Notifications
          </h6>
          <div className="d-flex flex-column gap-2">
            {[
              { text: 'Exam fee of ₹1,500 is overdue. Please pay immediately.', type: 'danger', icon: 'warning' },
              { text: 'Parent-Teacher meeting scheduled on 25 Mar 2025 at 10:00 AM.', type: 'info', icon: 'event' },
              { text: 'Arjun scored 94.7% attendance this month — excellent!', type: 'success', icon: 'check_circle' },
            ].map((n, i) => (
              <div key={i} className={`alert alert-${n.type} d-flex align-items-center gap-2 py-2 mb-0`} style={{ fontSize: 13 }}>
                <span className="material-icons" style={{ fontSize: 16 }}>{n.icon}</span>
                {n.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', marginBottom: '24px' }}>
        {/* Attendance Chart */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Attendance Trend</div>
              <div className="chart-card-subtitle">Monthly attendance percentage</div>
            </div>
            <span style={{ padding: '4px 12px', background: '#76C44220', color: '#76C442', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>92% Avg</span>
          </div>
          <LineChartComponent data={attendanceTrend} lines={[{ key: 'attendance', name: 'Attendance %', color: '#76C442' }]} height={200} />
        </div>

        {/* Fee Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="fee-summary">
            <h3>Annual Fee Summary</h3>
            <div className="amount">₹{feeDetails.totalFee.toLocaleString()}</div>
            <div className="due-date">Academic Year 2024-25</div>
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
                <span>Paid</span>
                <span style={{ fontWeight: 700 }}>₹{feeDetails.paid.toLocaleString()}</span>
              </div>
              <div className="progress-bar-custom" style={{ background: 'rgba(255,255,255,0.2)' }}>
                <div style={{ height: '6px', borderRadius: '3px', background: '#fff', width: `${(feeDetails.paid / feeDetails.totalFee) * 100}%` }} />
              </div>
            </div>
          </div>
          <div className="chart-card" style={{ padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748', marginBottom: '12px' }}>Next Payment Due</div>
            <div style={{ fontSize: '28px', fontWeight: 800, color: '#e53e3e', marginBottom: '4px' }}>₹{feeDetails.nextAmount.toLocaleString()}</div>
            <div style={{ fontSize: '13px', color: '#718096', marginBottom: '16px' }}>Due: {feeDetails.nextDue}</div>
            <button onClick={() => navigate('/parent/pay-fees')} style={{ display: 'block', width: '100%', padding: '10px', background: '#76C442', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>
              Pay Now
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Recent Marks */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">Recent Marks</span>
            <button className="btn-view-all" onClick={() => navigate('/parent/performance')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76C442', fontWeight: 600 }}>View All →</button>
          </div>
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
                  <td style={{ fontSize: '12px', color: '#718096' }}>{m.exam}</td>
                  <td style={{ fontSize: '13px', fontWeight: 700 }}>{m.marks}/{m.max}</td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, background: gradeBg[m.grade], color: gradeColor[m.grade] }}>
                      {m.grade}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Upcoming Assignments */}
        <div className="data-table-card">
          <div className="data-table-header">
            <span className="data-table-title">Assignments</span>
            <button className="btn-view-all" onClick={() => navigate('/parent/assignments')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76C442', fontWeight: 600 }}>View All →</button>
          </div>
          {upcomingAssignments.map(a => (
            <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: '1px solid #f7fafc' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: a.status === 'Submitted' ? '#76C44215' : '#ed893615', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span className="material-icons" style={{ fontSize: '20px', color: a.status === 'Submitted' ? '#76C442' : '#ed8936' }}>
                  {a.status === 'Submitted' ? 'assignment_turned_in' : 'assignment'}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#2d3748', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                <div style={{ fontSize: '11px', color: '#a0aec0' }}>{a.subject} • Due {a.dueDate}</div>
              </div>
              <span className={`status-badge ${a.status === 'Submitted' ? 'status-paid' : 'status-pending'}`}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
