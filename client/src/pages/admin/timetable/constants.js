import { formatTime } from '../../../services/timetableService';

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const DAY_COLOR = {
  Monday: '#4361ee', Tuesday: '#38b2ac', Wednesday: '#805ad5',
  Thursday: '#ed8936', Friday: '#e53e3e', Saturday: '#0de1e8',
};

const PALETTE = [
  '#4361ee','#38b2ac','#805ad5','#e53e3e','#ed8936','#009688',
  '#d69e2e','#e91e63','#667eea','#48bb78','#ed64a6','#dd6b20','#0de1e8','#2b6cb0',
];
export const subjectColor = (name = '') => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
};

export const PREDEFINED_PERIODS = [
  { label: 'Period 1', startTime: '08:00', endTime: '08:45' },
  { label: 'Period 2', startTime: '08:45', endTime: '09:30' },
  { label: 'Period 3', startTime: '09:45', endTime: '10:30' },
  { label: 'Period 4', startTime: '10:30', endTime: '11:15' },
  { label: 'Period 5', startTime: '11:30', endTime: '12:15' },
  { label: 'Period 6', startTime: '12:15', endTime: '13:00' },
  { label: 'Period 7', startTime: '13:45', endTime: '14:30' },
  { label: 'Period 8', startTime: '14:30', endTime: '15:15' },
];

export const EMPTY_FORM = {
  teacherId: '', classSection: '', subject: '',
  days: [], startTime: '', endTime: '',
};

export const toMin = (t) => {
  if (!t || typeof t !== 'string') return 0;
  const [h, m] = t.split(':').map(Number);
  return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
};

/**
 * Returns a conflict description string or null.
 * Checks candidate against existing DB entries AND batch entries before it.
 */
export const getEntryConflict = (candidate, existingEntries, batchEntries, idx) => {
  const ns = toMin(candidate.startTime);
  const ne = toMin(candidate.endTime);
  const timeOverlap = (s, e) => ns < toMin(e) && ne > toMin(s);

  // Teacher overlap vs DB
  const teacherConflict = existingEntries.find(e =>
    String(e.teacherId) === String(candidate.teacherId) &&
    e.day === candidate.day &&
    timeOverlap(e.startTime, e.endTime)
  );
  if (teacherConflict)
    return `Teacher overlap: ${teacherConflict.subject} (${teacherConflict.classSection}) ${formatTime(teacherConflict.startTime)}–${formatTime(teacherConflict.endTime)}`;

  // Class-section overlap vs DB
  const classConflict = existingEntries.find(e =>
    e.classSection === candidate.classSection &&
    e.day === candidate.day &&
    timeOverlap(e.startTime, e.endTime)
  );
  if (classConflict)
    return `Class conflict: ${classConflict.classSection} already has ${classConflict.subject} at ${formatTime(classConflict.startTime)}–${formatTime(classConflict.endTime)}`;

  // Room overlap vs DB
  if (candidate.room) {
    const roomConflict = existingEntries.find(e =>
      e.room && e.room === candidate.room &&
      e.day === candidate.day &&
      timeOverlap(e.startTime, e.endTime)
    );
    if (roomConflict)
      return `Room ${candidate.room} already booked: ${roomConflict.subject} (${roomConflict.classSection})`;
  }

  // Teacher / class-section / room overlap within batch
  for (let i = 0; i < batchEntries.length; i++) {
    if (i === idx) continue;
    const other = batchEntries[i];
    if (other.day !== candidate.day) continue;
    if (!timeOverlap(other.startTime, other.endTime)) continue;

    if (String(other.teacherId) === String(candidate.teacherId))
      return `Batch teacher conflict: ${other.subject} (${other.classSection}) on ${other.day}`;

    if (other.classSection === candidate.classSection)
      return `Batch class conflict: ${candidate.classSection} already has ${other.subject} on ${other.day}`;

    if (candidate.room && other.room === candidate.room)
      return `Batch room conflict: Room ${candidate.room} used by ${other.subject} (${other.classSection})`;
  }

  return null;
};

export const inputStyle = (hasErr) => ({
  width: '100%', padding: '9px 12px', fontSize: '13px',
  border: `1.5px solid ${hasErr ? '#e53e3e' : '#e2e8f0'}`, borderRadius: '8px',
  outline: 'none', background: '#fff', fontFamily: 'Poppins, sans-serif',
  boxSizing: 'border-box',
});

export const labelStyle = { fontSize: '12px', fontWeight: 600, color: '#4a5568', marginBottom: '4px', display: 'block' };
export const errStyle   = { fontSize: '11px', color: '#e53e3e', marginTop: '3px' };
