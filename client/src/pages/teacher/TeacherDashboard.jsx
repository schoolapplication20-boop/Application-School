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
import SEOMeta from '../../components/SEOMeta';

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SUBJECT_COLOR = {
  Mathematics: '#4361ee', Science: '#38b2ac', English: '#805ad5',
  'Social Studies': '#e53e3e', Hindi: '#ed8936', 'Computer Science': '#009688',
  Biology: '#d69e2e', Chemistry: '#e91e63', Physics: '#667eea',
  Accountancy: '#48bb78', Economics: '#ed64a6', Commerce: '#f6ad55',
  'Physical Education': '#0de1e8', Art: '#dd6b20',
};

const subjectColor = (subject) => SUBJECT_COLOR[subject] || '#0de1e8';

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

  const [teacherProfile,      setTeacherProfile]      = useState(null);
  const [assignedClasses,     setAssignedClasses]     = useState([]);
  const [classTeacherInfo,    setClassTeacherInfo]    = useState(null); // from dedicated endpoint
  const [classStudents,         setClassStudents]         = useState([]);
  const [primaryClassStudents,  setPrimaryClassStudents]  = useState([]);
  const [todaySchedule,         setTodaySchedule]         = useState([]);
  const [todayAttendance,       setTodayAttendance]       = useState(null);

  // ── Load teacher data on mount ───────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    Promise.all([
      fetchTeachers(),
      fetchStudents(),
      fetchTimetable(),
      teacherAPI.getMyClasses().catch(() => null),
      teacherAPI.getClassTeacherAssignment().catch(() => null),
      teacherAPI.getMyProfile().catch(() => null),
    ]).then(([allTeachers, allStudents, allEntries, classRes, ctRes, profileRes]) => {
      // 1. Find teacher profile — prefer the dedicated teacher profile endpoint
      //    (admin endpoint /api/admin/teachers returns 403 for teacher role)
      const ownProfile = profileRes?.data?.data ?? null;
      const profile =
        ownProfile ||
        allTeachers.find(t => t.userId === user.id) ||
        allTeachers.find(t => t.email?.toLowerCase() === user.email?.toLowerCase()) ||
        null;
      setTeacherProfile(profile);

      // 2. Class teacher assignment (dedicated endpoint — most reliable)
      const ctData = ctRes?.data?.data ?? null;
      setClassTeacherInfo(ctData);

      // 3. Real assigned classrooms
      const realClasses = classRes?.data?.data ?? [];
      setAssignedClasses(realClasses);

      // 4. Filter students in assigned classes
      if (realClasses.length > 0) {
        const mine = allStudents.filter(s =>
          realClasses.some(c =>
            c.name?.toLowerCase() === s.class?.toLowerCase() &&
            (c.section || '').toUpperCase() === (s.section || '').toUpperCase()
          )
        );
        setClassStudents(mine);
      } else {
        const classes = profile ? parseClasses(profile.classes) : [];
        if (classes.length > 0) {
          setClassStudents(allStudents.filter(s => classes.includes(studentClassKey(s))));
        }
      }

      // 5. Today's timetable
      const teacherEntries = getTimetableForTeacher(user.id, allEntries);
      const today = teacherEntries
        .filter(e => e.day === todayName)
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      setTodaySchedule(today);
    });
  }, [user]);

  // ── Fetch today's attendance for assigned classes ────────────────────────────
  useEffect(() => {
    if (!assignedClasses.length) return;
    const today = new Date().toISOString().split('T')[0];
    Promise.all(
      assignedClasses.map(cls =>
        teacherAPI.getAttendanceSummary(cls.id, today).catch(() => null)
      )
    ).then(results => {
      let totalPresent = 0, totalStudents = 0, hasData = false;
      results.forEach(res => {
        const s = res?.data?.data;
        if (s && s.total > 0) {
          hasData = true;
          totalPresent += (s.present || 0);
          totalStudents += (s.total || 0);
        }
      });
      if (hasData) setTodayAttendance({ present: totalPresent, total: totalStudents });
      else setTodayAttendance(null);
    });
  }, [assignedClasses]);

  // ── Fetch students for the primary class (class teachers only) ───────────────
  useEffect(() => {
    if (!classTeacherInfo?.isClassTeacher || !classTeacherInfo?.classId) return;
    teacherAPI.getClassStudents(classTeacherInfo.classId)
      .then(res => {
        const raw = res?.data?.data ?? [];
        setPrimaryClassStudents(
          raw.map(s => ({
            id:      s.id,
            name:    s.name    ?? '',
            class:   s.className ?? s.class ?? '',
            section: s.section ?? '',
            rollNo:  s.rollNumber ?? s.rollNo ?? '',
            status:  s.isActive === false ? 'Inactive' : 'Active',
          }))
        );
      })
      .catch(() => {});
  }, [classTeacherInfo]);

  // ── Fetch students for ALL assigned classes via teacher endpoint ───────────
  // /api/admin/students is admin-only; use /api/teacher/class/:id/students instead
  useEffect(() => {
    if (!assignedClasses.length) return;
    Promise.all(
      assignedClasses.map(cls =>
        teacherAPI.getClassStudents(cls.id)
          .then(res => (res?.data?.data ?? []).map(s => ({
            id:      s.id,
            name:    s.name    ?? '',
            class:   s.className ?? s.class ?? '',
            section: s.section ?? '',
            rollNo:  s.rollNumber ?? s.rollNo ?? '',
            status:  s.isActive === false ? 'Inactive' : 'Active',
          })))
          .catch(() => [])
      )
    ).then(results => setClassStudents(results.flat()));
  }, [assignedClasses]);

  // ── Derived from dedicated class-teacher endpoint ─────────────────────────────
  const isClassTeacher  = classTeacherInfo?.isClassTeacher === true;
  const primaryClassLabel = isClassTeacher && classTeacherInfo?.label ? classTeacherInfo.label : null;
  const primaryClassId    = isClassTeacher ? classTeacherInfo?.classId : null;
  // teacherType: prefer API result, fall back to profile, default SUBJECT_TEACHER
  const teacherType = classTeacherInfo?.teacherType || teacherProfile?.teacherType || 'SUBJECT_TEACHER';
  const isSubjectTeacherOnly = !isClassTeacher && teacherType !== 'BOTH';

  const primaryClass = useMemo(() => {
    if (!isClassTeacher || !primaryClassId) return null;
    return assignedClasses.find(c => Number(c.id) === Number(primaryClassId)) ?? null;
  }, [isClassTeacher, primaryClassId, assignedClasses]);

  const roleLabel = teacherType === 'BOTH'
    ? 'Class Teacher + Subject Teacher'
    : teacherType === 'CLASS_TEACHER'
      ? 'Class Teacher'
      : 'Subject Teacher';

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const stats = useMemo(() => [
    {
      title: isClassTeacher && primaryClassLabel ? primaryClassLabel : isSubjectTeacherOnly ? 'My Role' : 'Assigned Classes',
      value: isClassTeacher && primaryClassLabel ? roleLabel : isSubjectTeacherOnly ? 'Subject Teacher' : assignedClasses.length,
      icon: 'assignment_ind',
      color: isClassTeacher && primaryClassLabel ? '#276749' : isSubjectTeacherOnly ? '#805ad5' : '#276749',
      isText: !!(isClassTeacher && primaryClassLabel) || isSubjectTeacherOnly,
    },
    {
      title: todayAttendance ? 'Present Today' : 'My Students',
      value: todayAttendance
        ? `${todayAttendance.present}/${todayAttendance.total}`
        : classStudents.filter(s => s.status !== 'Inactive').length,
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
  ], [assignedClasses, classStudents, todaySchedule, teacherProfile, user, todayAttendance, isClassTeacher, primaryClassLabel, classTeacherInfo, isSubjectTeacherOnly, roleLabel]);

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

  const greeting = () => {
    const h = parseInt(new Date().toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }), 10);
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const QUICK_ACTIONS = [
    { label: 'Mark Attendance', icon: 'fact_check',     path: '/teacher/attendance', color: '#0de1e8', grad: 'linear-gradient(135deg,#0de1e822,#0de1e840)' },
    { label: 'My Schedule',     icon: 'calendar_today', path: '/teacher/schedule',   color: '#4361ee', grad: 'linear-gradient(135deg,#4361ee22,#4361ee40)' },
    { label: 'Student Marks',   icon: 'grade',           path: '/teacher/marks',      color: '#805ad5', grad: 'linear-gradient(135deg,#805ad522,#805ad540)' },
    { label: 'Homework',        icon: 'menu_book',       path: '/teacher/homework',   color: '#ed8936', grad: 'linear-gradient(135deg,#ed893622,#ed893640)' },
    { label: 'Leave Request',   icon: 'event_busy',      path: '/teacher/leave',      color: '#e53e3e', grad: 'linear-gradient(135deg,#e53e3e22,#e53e3e40)' },
    { label: 'Class Diary',     icon: 'photo_library',   path: '/teacher/diary',      color: '#38b2ac', grad: 'linear-gradient(135deg,#38b2ac22,#38b2ac40)' },
  ];

  const bannerGrad = isClassTeacher && primaryClassLabel
    ? 'linear-gradient(135deg, #134e4a 0%, #0f766e 50%, #0d9488 100%)'
    : isSubjectTeacherOnly
      ? 'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #5b21b6 100%)'
      : 'linear-gradient(135deg, #0c1445 0%, #1e3a8a 50%, #1d4ed8 100%)';

  const bannerAccent = isClassTeacher && primaryClassLabel ? '#5eead4'
    : isSubjectTeacherOnly ? '#c4b5fd'
    : '#93c5fd';

  return (
    <Layout pageTitle="Teacher Dashboard">
      <SEOMeta title="Teacher Dashboard" description="Your daily schedule, class attendance, and student overview." />

      {/* Welcome Banner */}
      <div style={{
        background: bannerGrad,
        borderRadius: 18, padding: '28px 32px', marginBottom: 24, color: '#fff',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -60, right: 80, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              {greeting()}
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>
              {teacherProfile?.name || user?.name || 'Teacher'}
            </h1>
            <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600 }}>
                {roleLabel}
              </span>
              {(teacherProfile?.subject || user?.subject) && (
                <span style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)', borderRadius: 20, padding: '3px 12px', fontSize: 12 }}>
                  {teacherProfile?.subject || user?.subject}
                </span>
              )}
            </div>
          </div>

          {/* Banner stats */}
          <div className="dashboard-banner-stats">
            {[
              { label: "Today's Classes", value: todaySchedule.length, icon: 'today' },
              { label: 'My Students', value: classStudents.filter(s => s.status !== 'Inactive').length, icon: 'school' },
              { label: 'Assigned Classes', value: assignedClasses.length, icon: 'class' },
            ].map(b => (
              <div key={b.label} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: '12px 18px', textAlign: 'center', flex: '1 1 80px', border: '1px solid rgba(255,255,255,0.15)' }}>
                <span className="material-icons" style={{ fontSize: 18, color: bannerAccent, display: 'block', marginBottom: 4 }}>{b.icon}</span>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{b.value}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 3, fontWeight: 600 }}>{b.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Class teacher / subject teacher tag line */}
        {classTeacherInfo !== null && isClassTeacher && primaryClassLabel && (
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="material-icons" style={{ fontSize: 18, color: bannerAccent }}>assignment_ind</span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>
              Class Teacher of{' '}
              <span style={{ color: '#fff', fontWeight: 800 }}>
                {classTeacherInfo.className}{classTeacherInfo.section ? ` – Section ${classTeacherInfo.section}` : ''}
              </span>
              {' '}·{' '}
              <span style={{ color: bannerAccent }}>{primaryClassStudents.filter(s => s.status !== 'Inactive').length} active students</span>
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {stats.map((s, i) => (
          s.isText ? (
            <div key={i} style={{
              background: '#fff', borderRadius: 18, padding: '22px 20px 18px',
              boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -24, right: -24, width: 90, height: 90, borderRadius: '50%', background: s.color + '14', pointerEvents: 'none' }} />
              <div style={{ width: 50, height: 50, borderRadius: 14, background: `linear-gradient(135deg,${s.color}22,${s.color}40)`, border: `1.5px solid ${s.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <span className="material-icons" style={{ color: s.color, fontSize: 26 }}>{s.icon}</span>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#1a202c', lineHeight: 1.2, marginBottom: 6, letterSpacing: '-0.3px', fontFamily: 'Poppins,sans-serif' }}>{s.value}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#8a99b0', letterSpacing: '0.02em' }}>{s.title}</div>
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: `linear-gradient(90deg,${s.color},${s.color}50)`, borderRadius: '0 0 18px 18px' }} />
            </div>
          ) : (
            <StatCard key={i} {...s} />
          )
        ))}
      </div>

      {/* Quick Actions */}
      <div style={{ background: '#fff', borderRadius: 18, padding: '22px 24px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#0de1e8,#4361ee)', borderRadius: 2 }} />
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Quick Actions</span>
        </div>
        <div className="quick-actions-grid">
          {QUICK_ACTIONS.map(action => (
            <div
              key={action.label}
              onClick={() => navigate(action.path)}
              style={{ borderRadius: 14, padding: '16px 12px', cursor: 'pointer', background: '#fafbfc', border: '1.5px solid #f0f4f8', textAlign: 'center', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 24px ${action.color}28`; e.currentTarget.style.borderColor = action.color + '50'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = '#f0f4f8'; }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 13, background: action.grad, border: `1.5px solid ${action.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                <span className="material-icons" style={{ fontSize: 24, color: action.color }}>{action.icon}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#2d3748', lineHeight: 1.3 }}>{action.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main 2-column grid */}
      <div className="grid-1-1" style={{ marginBottom: '24px' }}>

        {/* Today's Schedule */}
        <div style={{ background: '#fff', borderRadius: 18, padding: '22px 24px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#4361ee,#0de1e8)', borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Today's Schedule</div>
                <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 1 }}>{todayName} · {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}</div>
              </div>
            </div>
            <span style={{ padding: '4px 12px', background: '#4361ee18', color: '#4361ee', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
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
        <div style={{ background: '#fff', borderRadius: 18, padding: '22px 24px', boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#0de1e8,#38b2ac)', borderRadius: 2 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>Attendance Trend</div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 1 }}>Weekly attendance overview</div>
            </div>
          </div>
          <LineChartComponent
            data={attendanceTrend}
            lines={[{ key: 'attendance', name: 'Attendance %', color: '#0de1e8' }]}
            height={200}
          />
        </div>
      </div>

      {/* Assigned Classes */}
      <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8', marginBottom: 24 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#276749,#38a169)', borderRadius: 2 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>My Assigned Classes</div>
              <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>
                {assignedClasses.length > 0
                  ? `${assignedClasses.length} class${assignedClasses.length > 1 ? 'es' : ''} · ${classStudents.filter(s => s.status !== 'Inactive').length} active students`
                  : 'No classes assigned yet'}
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/teacher/attendance')}
            style={{ background: 'linear-gradient(135deg,#0de1e822,#0de1e840)', border: '1.5px solid #0de1e835', borderRadius: 8, cursor: 'pointer', color: '#0891b2', fontWeight: 700, fontSize: 12, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span className="material-icons" style={{ fontSize: 15 }}>fact_check</span>
            Mark Attendance
          </button>
        </div>

        {assignedClasses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#a0aec0' }}>
            <span className="material-icons" style={{ fontSize: 48, display: 'block', marginBottom: 10 }}>class</span>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No classes assigned</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Ask your admin to assign classes to your profile</div>
          </div>
        ) : (
          <div className="teacher-classes-grid">
            {assignedClasses.map((cls) => {
              const clsKey = `${cls.name}-${cls.section || 'A'}`;
              const clsStudents = studentsByClass[clsKey] || [];
              const active = clsStudents.filter(s => s.status !== 'Inactive');
              const isPrimary = isClassTeacher && primaryClass && Number(cls.id) === Number(primaryClass.id);
              const color = isPrimary ? '#276749' : subjectColor(teacherProfile?.subject);
              return (
                <div key={cls.id} style={{
                  border: `1.5px solid ${color}${isPrimary ? '60' : '30'}`,
                  borderRadius: 12, padding: '16px 18px',
                  background: isPrimary ? 'linear-gradient(135deg, #f0fff4, #e6fffa)' : color + '08',
                  position: 'relative', overflow: 'hidden',
                }}>
                  {isPrimary && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      background: '#276749', color: '#fff',
                      fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 10,
                    }}>
                      CLASS TEACHER
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color, lineHeight: 1, marginBottom: 2 }}>Class</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: '#1a202c', lineHeight: 1.1 }}>
                        {cls.name}{cls.section ? `-${cls.section}` : ''}
                      </div>
                    </div>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: color + '20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className="material-icons" style={{ color, fontSize: 22 }}>{isPrimary ? 'assignment_ind' : 'groups'}</span>
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
        <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 2px 14px rgba(0,0,0,0.07)', border: '1px solid #f0f4f8' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 4, height: 20, background: 'linear-gradient(180deg,#3182ce,#0de1e8)', borderRadius: 2 }} />
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1a202c' }}>My Students</div>
                <div style={{ fontSize: 12, color: '#a0aec0', marginTop: 2 }}>Students in your assigned classes</div>
              </div>
            </div>
            <button onClick={() => navigate('/teacher/attendance')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0de1e8', fontWeight: 600, fontSize: 13 }}>
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
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#0de1e820', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#276749' }}>
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
                <button onClick={() => navigate('/teacher/attendance')} style={{ background: 'none', border: 'none', color: '#0de1e8', fontWeight: 600, cursor: 'pointer', fontSize: 12 }}>
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
