// ─── Shared Attendance Data Store ────────────────────────────────────────────
// Used by both Teacher (mark attendance) and Admin (view reports/charts)
import { teacherAPI } from './api';

// Fallback student roster
const DEFAULT_CLASS_STUDENTS = {
  '10-A': [
    { id: 1, name: 'Arjun Patel',   rollNo: 'S001' },
    { id: 2, name: 'Sneha Gupta',   rollNo: 'S002' },
    { id: 3, name: 'Ravi Kumar',    rollNo: 'S003' },
    { id: 4, name: 'Ananya Singh',  rollNo: 'S004' },
    { id: 5, name: 'Kiran Reddy',   rollNo: 'S005' },
    { id: 6, name: 'Priya Sharma',  rollNo: 'S006' },
    { id: 7, name: 'Aditya Nair',   rollNo: 'S007' },
    { id: 8, name: 'Deepika Joshi', rollNo: 'S008' },
  ],
  '9-B': [
    { id: 9,  name: 'Rahul Mehta',   rollNo: 'S009' },
    { id: 10, name: 'Simran Kaur',   rollNo: 'S010' },
    { id: 11, name: 'Varun Sharma',  rollNo: 'S011' },
    { id: 12, name: 'Nisha Patel',   rollNo: 'S012' },
  ],
  '10-B': [
    { id: 13, name: 'Rohit Singh',   rollNo: 'S013' },
    { id: 14, name: 'Kavya Rao',     rollNo: 'S014' },
    { id: 15, name: 'Suresh Kumar',  rollNo: 'S015' },
  ],
  '8-A': [
    { id: 16, name: 'Pooja Gupta',   rollNo: 'S016' },
    { id: 17, name: 'Manish Jain',   rollNo: 'S017' },
    { id: 18, name: 'Asha Reddy',    rollNo: 'S018' },
  ],
};

const ABSENCE_REASONS = [
  'Fever', 'Family function', 'Medical appointment',
  'Travel', 'Not well', 'Personal reasons', 'Festival',
];

// Deterministic pseudo-random (no Math.random so seed data is stable)
const pseudoRand = (seed) => { const x = Math.sin(seed + 1) * 10000; return x - Math.floor(x); };

// Generate last N working days (Mon–Fri)
const pastWorkDays = (count) => {
  const dates = [];
  const d = new Date();
  d.setDate(d.getDate() - 1);
  while (dates.length < count) {
    if (d.getDay() !== 0 && d.getDay() !== 6) dates.push(d.toISOString().split('T')[0]);
    d.setDate(d.getDate() - 1);
  }
  return dates;
};

// Build 15-day seed records for demo charts and long-absentee detection
const buildSeedRecords = () => {
  const classes = Object.keys(DEFAULT_CLASS_STUDENTS);
  const days    = pastWorkDays(15);
  const records = [];

  days.forEach((date, dIdx) => {
    classes.forEach((classKey, cIdx) => {
      const students = DEFAULT_CLASS_STUDENTS[classKey];
      const studentRecords = students.map((s, sIdx) => {
        const r = pseudoRand(dIdx * 1000 + cIdx * 100 + sIdx);
        let status = 'PRESENT', reason = '';
        if      (r > 0.92) { status = 'LATE'; }
        else if (r > 0.82) { status = 'ABSENT'; reason = ABSENCE_REASONS[Math.floor(pseudoRand(dIdx + sIdx) * ABSENCE_REASONS.length)]; }
        return { ...s, status, reason };
      });
      records.push({
        id:       `${classKey}-${date}`,
        classKey,
        date,
        markedBy: 'Teacher',
        markedAt: `09:${String(10 + cIdx * 5).padStart(2, '0')} AM`,
        students: studentRecords,
      });
    });
  });

  // Demo: Ravi Kumar (id=3, 10-A) absent 5 consecutive days → long absentee
  days.slice(0, 5).forEach(date => {
    const rec = records.find(r => r.classKey === '10-A' && r.date === date);
    if (rec) { const s = rec.students.find(s => s.id === 3); if (s) { s.status = 'ABSENT'; s.reason = 'Prolonged illness'; } }
  });

  // Demo: Nisha Patel (id=12, 9-B) absent 4 consecutive days
  days.slice(0, 4).forEach(date => {
    const rec = records.find(r => r.classKey === '9-B' && r.date === date);
    if (rec) { const s = rec.students.find(s => s.id === 12); if (s) { s.status = 'ABSENT'; s.reason = 'Family illness'; } }
  });

  return records;
};

// ─── API helpers ──────────────────────────────────────────────────────────────

/**
 * Mark attendance via backend API.
 * @param {Array} records - [{ studentId, classId, className, date, status }]
 */
export const markAttendanceAPI = async (records) => {
  try {
    await teacherAPI.markAttendance(records);
    return true;
  } catch {
    return false;
  }
};

/**
 * Fetch attendance for a class + date from backend; returns null on failure.
 */
export const fetchAttendanceAPI = async (classId, date) => {
  try {
    const res = await teacherAPI.getAttendance(classId, date);
    return res.data?.data ?? res.data ?? null;
  } catch {
    return null;
  }
};

// ─── In-memory store ──────────────────────────────────────────────────────────
let _records = null;

const getInitialRecords = () => _records ?? (_records = buildSeedRecords());

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export const getAll = () => getInitialRecords();

export const saveAll = (records) => { _records = records; };

export const getRecord = (classKey, date) => getAll().find(r => r.classKey === classKey && r.date === date) || null;

export const upsertRecord = (record) => {
  const all = getAll();
  const idx = all.findIndex(r => r.id === record.id);
  if (idx >= 0) all[idx] = record; else all.push(record);
  saveAll(all);
};

// ─── Student roster for a given classKey (e.g. "10-A") ───────────────────────
export const getStudentsForClass = (classKey, allStudents) => {
  const students = Array.isArray(allStudents) ? allStudents : [];
  const [cls, sec] = classKey.split('-');
  const filtered = students.filter(s =>
    String(s.class) === String(cls) && s.section === sec && s.status !== 'Inactive'
  );
  if (filtered.length > 0) return filtered.map(s => ({ id: s.id, name: s.name, rollNo: s.rollNo }));
  return DEFAULT_CLASS_STUDENTS[classKey] || [];
};

// ─── Class keys from a provided list ──────────────────────────────────────────
export const getClassKeys = (allClasses = []) => {
  if (allClasses.length > 0) return allClasses.map(c => `${c.name.replace('Class ', '')}-${c.section}`);
  return Object.keys(DEFAULT_CLASS_STUDENTS);
};

// ─── Long Absentee Detection ──────────────────────────────────────────────────
export const detectLongAbsentees = (records, threshold = 3) => {
  const classDates   = {}; // classKey → sorted date[]
  const classStudents = {}; // classKey → { studentId → { …, absentDates: Set } }

  records.forEach(rec => {
    if (!classDates[rec.classKey])    classDates[rec.classKey]    = new Set();
    if (!classStudents[rec.classKey]) classStudents[rec.classKey] = {};
    classDates[rec.classKey].add(rec.date);

    rec.students.forEach(s => {
      if (!classStudents[rec.classKey][s.id])
        classStudents[rec.classKey][s.id] = { id: s.id, name: s.name, rollNo: s.rollNo, absentDates: new Set(), reasons: [] };
      if (s.status === 'ABSENT') {
        classStudents[rec.classKey][s.id].absentDates.add(rec.date);
        if (s.reason) classStudents[rec.classKey][s.id].reasons.push(s.reason);
      }
    });
  });

  const result = [];

  Object.entries(classStudents).forEach(([classKey, students]) => {
    const allDates = [...(classDates[classKey] || [])].sort();

    Object.values(students).forEach(stu => {
      let maxStreak = 0, cur = 0, streakStart = null, maxStart = null, maxEnd = null;

      allDates.forEach(date => {
        if (stu.absentDates.has(date)) {
          if (cur === 0) streakStart = date;
          cur++;
          if (cur > maxStreak) { maxStreak = cur; maxStart = streakStart; maxEnd = date; }
        } else { cur = 0; streakStart = null; }
      });

      if (maxStreak >= threshold) {
        result.push({
          id: stu.id, name: stu.name, rollNo: stu.rollNo, classKey,
          consecutiveDays: maxStreak,
          absentSince: maxStart,
          lastAbsent:  maxEnd,
          totalAbsent: stu.absentDates.size,
          lastReason:  stu.reasons[stu.reasons.length - 1] || '—',
        });
      }
    });
  });

  return result.sort((a, b) => b.consecutiveDays - a.consecutiveDays);
};

// ─── Export utilities ─────────────────────────────────────────────────────────
export const exportCSV = (rows, filename = 'attendance_report.csv') => {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
};

export const exportPrintReport = (title, html) => {
  const w = window.open('', '_blank');
  w.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
    <style>
      body{font-family:'Segoe UI',sans-serif;padding:24px;color:#2d3748}
      h1{font-size:20px;margin-bottom:4px}
      p.sub{font-size:12px;color:#718096;margin-bottom:20px}
      table{width:100%;border-collapse:collapse;font-size:13px}
      th{background:#f7fafc;padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.5px;color:#718096;border-bottom:2px solid #e2e8f0}
      td{padding:10px 12px;border-bottom:1px solid #f0f4f8}
      .green{color:#276749;background:#f0fff4;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
      .red{color:#c53030;background:#fff5f5;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
      .orange{color:#c05621;background:#fffaf0;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:700}
      @media print{body{padding:0}}
    </style></head><body>${html}</body></html>`);
  w.document.close();
  setTimeout(() => w.print(), 500);
};
