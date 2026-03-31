import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../../components/Layout';
import StatCard from '../../components/StatCard';
import LineChartComponent from '../../components/Charts/LineChartComponent';
import { useAuth } from '../../context/AuthContext';
import { fetchTeachers } from '../../services/teacherService';
import { fetchStudents } from '../../services/studentService';
import { fetchTimetable, getTimetableForTeacher, formatTime } from '../../services/timetableService';
import { teacherAPI } from '../../services/api';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SUBJECT_COLOR = {
  Mathematics: '#4361ee', Science: '#38b2ac', English: '#805ad5',
  'Social Studies': '#e53e3e', Hindi: '#ed8936', 'Computer Science': '#009688',
  Biology: '#d69e2e', Chemistry: '#e91e63', Physics: '#667eea',
  Accountancy: '#48bb78', Economics: '#ed64a6', Commerce: '#f6ad55',
  'Physical Education': '#76C442', Art: '#dd6b20',
};

const subjectColor = (subject) => SUBJECT_COLOR[subject] || '#76C442';

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const todayName = DAYS[new Date().getDay()];

/** Parse teacher's classes string "10-A, 9-B" → ["10-A","9-B"] */
const parseClasses = (classesField) => {
  if (!classesField) return [];
  if (Array.isArray(classesField)) return classesField.map(c => c.trim()).filter(Boolean);
  return classesField.split(',').map(c => c.trim()).filter(Boolean);
};

/** Students class key: "10-A" from { class: "10", section: "A" } */
const studentClassKey = (s) => `${s.class}-${s.section}`;

const attendanceTrend = [
  { name: 'Week 1', attendance: 88 },
  { name: 'Week 2', attendance: 91 },
  { name: 'Week 3', attendance: 85 },
  { name: 'Week 4', attendance: 94 },
  { name: 'Week 5', attendance: 89 },
  { name: 'Week 6', attendance: 92 },
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TeacherDashboard() {
  const navigate      = useNavigate();
  const { user }      = useAuth();

  const [teacherProfile,  setTeacherProfile]  = useState(null);
  const [assignedClasses, setAssignedClasses] = useState([]);   // ClassRoom objects from real API
  const [classStudents,   setClassStudents]   = useState([]);
  const [todaySchedule,   setTodaySchedule]   = useState([]);

  // ── Load teacher data on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    Promise.all([
      fetchTeachers(),
      fetchStudents(),
      fetchTimetable(),
      teacherAPI.getMyClasses().catch(() => ({ data: { data: [] } })),
    ]).then(([allTeachers, allStudents, allEntries, classRes]) => {
      // 1. Find teacher profile
      const profile =
        allTeachers.find(t => t.userId === user.id) ||
        allTeachers.find(t => t.email?.toLowerCase() === user.email?.toLowerCase()) ||
        null;

      setTeacherProfile(profile);

      // 2. Real assigned classrooms from API
      const realClasses = classRes?.data?.data ?? [];
      setAssignedClasses(realClasses);

      // 3. Filter students in those classes using real classroom names
      if (realClasses.length > 0) {
        const mine = allStudents.filter(s =>
          realClasses.some(c =>
            c.name?.toLowerCase() === s.class?.toLowerCase() &&
            (c.section || '').toUpperCase() === (s.section || '').toUpperCase()
          )
        );
        setClassStudents(mine);
      } else {
        // fallback: use free-text classes field from profile
        const classes = profile ? parseClasses(profile.classes) : [];
        if (classes.length > 0) {
          const mine = allStudents.filter(s => classes.includes(studentClassKey(s)));
          setClassStudents(mine);
        }
      }

      // 4. Today's timetable (match by auth user.id)
      const teacherEntries = getTimetableForTeacher(user.id, allEntries);
      const today = teacherEntries
        .filter(e => e.day === todayName)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTodaySchedule(today);
    });
  }, [user]);

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => [
    {
      title: assignedClasses.length === 1 && assignedClasses[0]
        ? `${assignedClasses[0].name}${assignedClasses[0].section ? '-' + assignedClasses[0].section : ''}`
        : 'Assigned Classes',
      value: assignedClasses.length === 1 ? 'Class Teacher' : assignedClasses.length,
      icon: 'class',
      color: '#76C442',
      isText: assignedClasses.length === 1,
    },
    {
      title: 'My Students',
      value: classStudents.filter(s => s.status !== 'Inactive').length,
      icon: 'school',
      color: '#3182ce',
    },
    {
      title: "Today's Periods",
      value: todaySchedule.length,
      icon: 'today',
      color: '#17a2b8',
    },
    {
      title: 'Subject',
      value: teacherProfile?.subject || user?.subject || '—',
      icon: 'menu_book',
      color: '#805ad5',
      isText: true,
    },
  ], [assignedClasses, classStudents, todaySchedule, teacherProfile, user]);

  // ── Students grouped by class ────────────────────────────────────────────────
  const studentsByClass = useMemo(() => {
    const map = {};
    assignedClasses.forEach(cls => {
      const key = `${cls.name}-${cls.section || 'A'}`;
      map[key] = [];
    });
    classStudents.forEach(s => {
      const key = studentClassKey(s);
      if (map[key]) map[key].push(s);
    });
    return map;
  }, [assignedClasses, classStudents]);

  return (
    <Layout pageTitle="Teacher Dashboard">
      {/* Page Header */}
      <div className="page-header">
        <h1>Teacher Dashboard</h1>
        <p>
          Welcome back, <strong>{user?.name}</strong>!
          {teacherProfile?.subject && ` · ${teacherProfile.subject}`}
          &nbsp;·&nbsp;{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          s.isText
            ? (
              <div key={i} style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: 12, background: s.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-icons" style={{ color: s.color, fontSize: 24 }}>{s.icon}</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c', lineHeight: 1.2 }}>{s.value}</div>
                  <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 3 }}>{s.title}</div>
                </div>
              </div>
            )
            : <StatCard key={i} {...s} />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="card border-0 shadow-sm mb-4">
        <div className="card-body p-3">
          <h6 className="fw-bold mb-3">Quick Actions</h6>
          <div className="d-flex gap-2 flex-wrap">
            {[
              { label: 'Mark Attendance', icon: 'fact_check',    path: '/teacher/attendance',  color: '#76C442' },
              { label: 'My Schedule',     icon: 'calendar_today', path: '/teacher/schedule',    color: '#4361ee' },
              { label: 'Assignments',     icon: 'assignment',     path: '/teacher/assignments', color: '#ed8936' },
              { label: 'Student Marks',   icon: 'grade',          path: '/teacher/marks',       color: '#805ad5' },
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

      {/* Main 2-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

        {/* Today's Schedule */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <div className="chart-card-title">Today's Schedule</div>
              <div className="chart-card-subtitle">
                {todayName} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
              </div>
            </div>
            <span style={{ padding: '4px 12px', background: '#76C44220', color: '#76C442', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
              {todaySchedule.length} {todaySchedule.length === 1 ? 'Class' : 'Classes'}
            </span>
          </div>

          {todaySchedule.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#a0aec0' }}>
              <span className="material-icons" style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>event_available</span>
              <div style={{ fontSize: 13, fontWeight: 600 }}>No schedule assigned yet</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                {todayName === 'Sunday' ? 'Enjoy your Sunday!' : 'Contact admin to get your timetable set up'}
              </div>
            </div>
          ) : (
            <div>
              {todaySchedule.map((entry, i) => {
                const color = subjectColor(entry.subject);
                return (
                  <div key={entry.id} style={{ padding: '14px 0', borderBottom: i < todaySchedule.length - 1 ? '1px solid #f7fafc' : 'none', display: 'flex', alignItems: 'flex-start' }}>
                    <div style={{ minWidth: '90px', fontSize: '12px', fontWeight: 600, color: '#a0aec0', paddingTop: 2 }}>
                      {formatTime(entry.startTime)}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', margin: '0 12px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color }} />
                      {i < todaySchedule.length - 1 && <div style={{ width: '2px', height: '28px', background: '#e2e8f0' }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#2d3748' }}>{entry.subject}</div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>Class {entry.classSection}</span>
                        {entry.room && (
                          <>
                            <span style={{ fontSize: '11px', color: '#a0aec0' }}>•</span>
                            <span style={{ fontSize: '11px', color: '#a0aec0' }}>Room {entry.room}</span>
                          </>
                        )}
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>•</span>
                        <span style={{ fontSize: '11px', color: '#a0aec0' }}>
                          Until {formatTime(entry.endTime)}
                        </span>
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                      background: color + '18', color,
                    }}>
                      {entry.subject.split(' ')[0]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
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

      {/* Assigned Classes */}
      <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>My Assigned Classes</div>
            <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>
              {assignedClasses.length > 0
                ? `${assignedClasses.length} class${assignedClasses.length > 1 ? 'es' : ''} · ${classStudents.filter(s => s.status !== 'Inactive').length} active students`
                : 'No classes assigned yet'}
            </div>
          </div>
          <button onClick={() => navigate('/teacher/attendance')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76C442', fontWeight: 600, fontSize: 13 }}>
            Mark Attendance →
          </button>
        </div>

        {assignedClasses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 10 }}>class</span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No classes assigned</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Ask your admin to assign classes to your profile</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, padding: 20 }}>
            {assignedClasses.map((cls) => {
              const clsKey = `${cls.name}-${cls.section || 'A'}`;
              const clsStudents = studentsByClass[clsKey] || [];
              const active = clsStudents.filter(s => s.status !== 'Inactive');
              const color = subjectColor(teacherProfile?.subject);
              return (
                <div key={cls.id} style={{ border: `1.5px solid ${color}30`, borderRadius: 12, padding: '16px 18px', background: color + '08' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color, lineHeight: 1, marginBottom: 2 }}>Class</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#1a202c', lineHeight: 1.1 }}>
                        {cls.name}{cls.section ? `-${cls.section}` : ''}
                      </div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-icons" style={{ color, fontSize: 22 }}>groups</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ fontSize: 12, color: '#4a5568' }}>
                      <span className="material-icons" style={{ fontSize: 14, verticalAlign: 'middle', marginRight: 4, color: '#a0aec0' }}>person</span>
                      <strong>{active.length}</strong> active students
                    </div>
                    <div style={{ fontSize: 12, color: '#a0aec0' }}>
                      {teacherProfile?.subject || 'Subject not set'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Students Table (first 8) */}
      {classStudents.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '18px 22px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>My Students</div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>Students in your assigned classes</div>
            </div>
            <button onClick={() => navigate('/teacher/attendance')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#76C442', fontWeight: 600, fontSize: 13 }}>
              View All →
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f7fafc' }}>
                  {['Student', 'Roll No', 'Class', 'Status'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontWeight: 700, color: '#4a5568', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classStudents.slice(0, 8).map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f0f4f8', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#76C44220', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#276749' }}>
                          {s.name.charAt(0)}
                        </div>
                        <span style={{ fontWeight: 600, color: '#2d3748' }}>{s.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#718096' }}>{s.rollNo || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', background: '#e8f4fd', color: '#2c5282', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                        {studentClassKey(s)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                        background: s.status === 'Active' ? '#f0fff4' : '#fff5f5',
                        color: s.status === 'Active' ? '#276749' : '#c53030',
                      }}>
                        {s.status || 'Active'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {classStudents.length > 8 && (
              <div style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12, color: '#a0aec0', borderTop: '1px solid #f0f4f8' }}>
                Showing 8 of {classStudents.length} students ·{' '}
                <button onClick={() => navigate('/teacher/attendance')} style={{ background: 'none', border: 'none', color: '#76C442', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
                  See all
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </Layout>
  );
}
