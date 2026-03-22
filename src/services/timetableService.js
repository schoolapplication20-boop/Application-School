/**
 * timetableService.js
 * API-first CRUD for timetable entries.
 *
 * Timetable entry shape:
 * {
 *   id: number,
 *   teacherId: number,
 *   teacherName: string,
 *   classSection: string,   // e.g. "10-A"
 *   subject: string,
 *   day: string,            // "Monday" – "Saturday"
 *   startTime: string,      // "09:00" (24-hr HH:MM)
 *   endTime: string,        // "10:00"
 *   room: string,
 * }
 */
import { timetableAPI } from './api';

/** Convert "HH:MM" to total minutes */
const toMin = (t) => {
  const [h, m] = (t || '00:00').split(':').map(Number);
  return h * 60 + m;
};

/** Fetch all entries — tries API first, returns empty array on failure */
export const fetchTimetable = async (params) => {
  try {
    const res = await timetableAPI.getAll(params);
    const data = res.data?.data ?? res.data ?? [];
    if (Array.isArray(data)) { return data; }
    return [];
  } catch {
    return [];
  }
};

/** Get entries for a specific teacher from a provided list */
export const getTimetableForTeacher = (teacherId, allEntries = []) =>
  allEntries.filter(e => String(e.teacherId) === String(teacherId));

export const createTimetableEntry = async (entry) => {
  try {
    const res = await timetableAPI.create(entry);
    const saved = res.data?.data ?? res.data;
    if (saved?.id) { return saved; }
  } catch {}
  return { ...entry, id: Date.now() };
};

export const updateTimetableEntry = async (id, updates) => {
  try {
    const res = await timetableAPI.update(id, updates);
    const saved = res.data?.data ?? res.data;
    if (saved?.id) { return saved; }
  } catch {}
  return { id, ...updates };
};

export const deleteTimetableEntry = async (id) => {
  try { await timetableAPI.delete(id); } catch {}
};

/**
 * Check if a candidate entry overlaps existing entries for the same teacher + day.
 * Operates against a provided list for instant UI feedback.
 */
export const checkOverlap = (candidate, allEntries = [], excludeId = null) => {
  const same = allEntries.filter(
    e => e.id !== excludeId &&
         String(e.teacherId) === String(candidate.teacherId) &&
         e.day === candidate.day
  );
  const ns = toMin(candidate.startTime);
  const ne = toMin(candidate.endTime);
  return same.find(e => ns < toMin(e.endTime) && ne > toMin(e.startTime)) || null;
};

/** Format "HH:MM" → "9:00 AM" */
export const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
};

export default {
  fetchTimetable,
  getTimetableForTeacher,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  checkOverlap,
  formatTime,
};
