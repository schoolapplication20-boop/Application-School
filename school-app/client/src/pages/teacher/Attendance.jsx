import React, { useState } from 'react';
import Sidebar from '../../components/Sidebar';
import Navbar from '../../components/Navbar';
import '../../styles/sidebar.css';
import '../../styles/dashboard.css';

const classes = ['10-A', '9-B', '10-B', '8-A'];

const classStudents = {
  '10-A': [
    { id: 1, name: 'Arjun Patel', rollNo: 'S001' },
    { id: 2, name: 'Sneha Gupta', rollNo: 'S002' },
    { id: 3, name: 'Ravi Kumar', rollNo: 'S003' },
    { id: 4, name: 'Ananya Singh', rollNo: 'S004' },
    { id: 5, name: 'Kiran Reddy', rollNo: 'S005' },
    { id: 6, name: 'Priya Sharma', rollNo: 'S006' },
    { id: 7, name: 'Aditya Nair', rollNo: 'S007' },
    { id: 8, name: 'Deepika Joshi', rollNo: 'S008' },
  ],
  '9-B': [
    { id: 9, name: 'Rahul Mehta', rollNo: 'S009' },
    { id: 10, name: 'Simran Kaur', rollNo: 'S010' },
    { id: 11, name: 'Varun Sharma', rollNo: 'S011' },
    { id: 12, name: 'Nisha Patel', rollNo: 'S012' },
  ],
  '10-B': [
    { id: 13, name: 'Rohit Singh', rollNo: 'S013' },
    { id: 14, name: 'Kavya Rao', rollNo: 'S014' },
    { id: 15, name: 'Suresh Kumar', rollNo: 'S015' },
  ],
  '8-A': [
    { id: 16, name: 'Pooja Gupta', rollNo: 'S016' },
    { id: 17, name: 'Manish Jain', rollNo: 'S017' },
    { id: 18, name: 'Asha Reddy', rollNo: 'S018' },
  ],
};

const attendanceHistory = [
  { id: 1, date: '17 Mar 2026', class: '10-A', present: 36, absent: 2, late: 0, markedAt: '09:15 AM' },
  { id: 2, date: '17 Mar 2026', class: '9-B', present: 30, absent: 3, late: 1, markedAt: '10:45 AM' },
  { id: 3, date: '16 Mar 2026', class: '10-A', present: 35, absent: 2, late: 1, markedAt: '09:10 AM' },
  { id: 4, date: '16 Mar 2026', class: '9-B', present: 32, absent: 2, late: 0, markedAt: '10:40 AM' },
  { id: 5, date: '15 Mar 2026', class: '10-A', present: 38, absent: 0, late: 0, markedAt: '09:05 AM' },
];

const Attendance = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState('10-A');
  const [selectedDate, setSelectedDate] = useState('2026-03-17');
  const [attendanceMap, setAttendanceMap] = useState({});
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState('mark'); // 'mark' or 'history'

  const students = classStudents[selectedClass] || [];

  const initAttendance = () => {
    const init = {};
    students.forEach(s => { init[s.id] = attendanceMap[s.id] || 'PRESENT'; });
    return init;
  };

  const toggleAttendance = (id, status) => {
    setAttendanceMap(prev => ({ ...prev, [id]: status }));
    setSaved(false);
  };

  const markAll = (status) => {
    const newMap = {};
    students.forEach(s => { newMap[s.id] = status; });
    setAttendanceMap(newMap);
    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const getAttendanceStatus = (id) => attendanceMap[id] || 'PRESENT';

  const countByStatus = (status) => students.filter(s => getAttendanceStatus(s.id) === status).length;
  const presentCount = countByStatus('PRESENT');
  const absentCount = countByStatus('ABSENT');
  const lateCount = countByStatus('LATE');

  const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="app-layout">
      <Sidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} mobileOpen={mobileSidebarOpen} />
      {mobileSidebarOpen && <div className="sidebar-overlay visible" onClick={() => setMobileSidebarOpen(false)} />}

      <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Navbar pageTitle="Attendance" onMenuToggle={() => {
          if (window.innerWidth <= 1024) setMobileSidebarOpen(!mobileSidebarOpen);
          else setSidebarCollapsed(!sidebarCollapsed);
        }} />

        <div className="page-content">
          <div className="page-header">
            <h1>Attendance Management</h1>
            <p>Mark and track student attendance for your classes</p>
          </div>

          {/* Tab Toggle */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
            {[{ key: 'mark', label: 'Mark Attendance', icon: 'edit' }, { key: 'history', label: 'History', icon: 'history' }].map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
                padding: '10px 20px', border: 'none', borderRadius: '10px', cursor: 'pointer',
                background: activeTab === t.key ? '#76C442' : '#fff',
                color: activeTab === t.key ? '#fff' : '#718096',
                fontWeight: 600, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
              }}>
                <span className="material-icons" style={{ fontSize: '18px' }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'mark' ? (
            <>
              {/* Filters */}
              <div className="data-table-card" style={{ marginBottom: '20px', padding: '20px' }}>
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label className="form-label">Select Class</label>
                    <select className="filter-select" style={{ width: '100%', padding: '12px' }} value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setAttendanceMap({}); }}>
                      {classes.map(c => <option key={c} value={c}>Class {c}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: '150px' }}>
                    <label className="form-label">Date</label>
                    <input type="date" className="form-control" style={{ padding: '12px', border: '1.5px solid #e2e8f0', borderRadius: '10px', fontSize: '14px' }}
                      value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => markAll('PRESENT')} style={{ padding: '10px 16px', background: '#76C44215', border: '1px solid #76C44240', borderRadius: '8px', color: '#76C442', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>All Present</button>
                    <button onClick={() => markAll('ABSENT')} style={{ padding: '10px 16px', background: '#e53e3e15', border: '1px solid #e53e3e40', borderRadius: '8px', color: '#e53e3e', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>All Absent</button>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '16px', marginTop: '16px', padding: '14px', background: '#f7fafc', borderRadius: '10px' }}>
                  {[
                    { label: 'Present', count: presentCount, color: '#76C442', icon: 'check_circle' },
                    { label: 'Absent', count: absentCount, color: '#e53e3e', icon: 'cancel' },
                    { label: 'Late', count: lateCount, color: '#ed8936', icon: 'schedule' },
                    { label: 'Total', count: students.length, color: '#3182ce', icon: 'people' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-icons" style={{ color: s.color, fontSize: '18px' }}>{s.icon}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: s.color }}>{s.count}</span>
                      <span style={{ fontSize: '13px', color: '#718096' }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Student List */}
              <div className="data-table-card">
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student</th>
                        <th>Roll No</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((s, i) => {
                        const status = getAttendanceStatus(s.id);
                        return (
                          <tr key={s.id} style={{ background: status === 'ABSENT' ? '#fff5f5' : status === 'LATE' ? '#fffaf0' : 'transparent' }}>
                            <td style={{ color: '#a0aec0', fontSize: '13px' }}>{i + 1}</td>
                            <td>
                              <div className="student-cell">
                                <div className="student-avatar-sm" style={{ background: status === 'ABSENT' ? '#e53e3e' : status === 'LATE' ? '#ed8936' : '#76C442' }}>
                                  {getInitials(s.name)}
                                </div>
                                <div className="student-name">{s.name}</div>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'monospace', fontSize: '12px', color: '#718096' }}>{s.rollNo}</td>
                            <td>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {['PRESENT', 'ABSENT', 'LATE'].map(st => (
                                  <button key={st} onClick={() => toggleAttendance(s.id, st)} style={{
                                    padding: '5px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: 600, transition: 'all 0.2s',
                                    background: status === st
                                      ? st === 'PRESENT' ? '#76C442' : st === 'ABSENT' ? '#e53e3e' : '#ed8936'
                                      : '#f7fafc',
                                    color: status === st ? '#fff' : '#a0aec0',
                                  }}>
                                    {st === 'PRESENT' ? 'P' : st === 'ABSENT' ? 'A' : 'L'}
                                  </button>
                                ))}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div style={{ padding: '16px 0 0', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid #f0f4f8', marginTop: '12px' }}>
                  {saved && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#76C442', fontWeight: 600, fontSize: '14px' }}>
                      <span className="material-icons" style={{ fontSize: '18px' }}>check_circle</span>
                      Attendance saved successfully!
                    </div>
                  )}
                  <button onClick={handleSave} style={{ padding: '12px 28px', background: '#76C442', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
                    Save Attendance
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="data-table-card">
              <div className="data-table-header">
                <span className="data-table-title">Attendance History</span>
              </div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Late</th>
                    <th>Percentage</th>
                    <th>Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map(a => {
                    const total = a.present + a.absent + a.late;
                    const pct = Math.round((a.present / total) * 100);
                    return (
                      <tr key={a.id}>
                        <td style={{ fontSize: '13px' }}>{a.date}</td>
                        <td><span style={{ fontWeight: 700 }}>{a.class}</span></td>
                        <td><span className="status-badge status-present">{a.present}</span></td>
                        <td><span className="status-badge status-absent">{a.absent}</span></td>
                        <td><span className="status-badge status-late">{a.late}</span></td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px' }}>
                              <div className="progress-bar-custom">
                                <div className="progress-fill" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: pct >= 90 ? '#76C442' : pct >= 75 ? '#ed8936' : '#e53e3e' }}>{pct}%</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '12px', color: '#a0aec0' }}>{a.markedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Attendance;
