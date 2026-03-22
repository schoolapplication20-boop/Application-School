/**
 * leaveService.js
 * API-first CRUD for leave requests.
 */
import { leaveAPI } from './api';

// ─── Student leaves ───────────────────────────────────────────────────────────

export const fetchStudentLeaves = async () => {
  try {
    const res = await leaveAPI.getStudentLeaves();
    const data = res.data?.data ?? res.data ?? [];
    if (Array.isArray(data)) { return data; }
  } catch {}
  return [];
};

export const deleteStudentLeave = async (id) => {
  try { await leaveAPI.deleteLeave(id); } catch {}
  return id;
};

export const updateStudentLeaveStatus = async (id, status, comment = '') => {
  try {
    const res = await leaveAPI.updateStatus(id, { status, adminComment: comment });
    const data = res.data?.data ?? res.data;
    if (data?.id) { return data; }
  } catch {}
  return { id, status, adminComment: comment, reviewedAt: new Date().toISOString() };
};

export const createStudentLeave = async (data) => {
  try {
    const res = await leaveAPI.createLeave({ ...data, requesterType: 'STUDENT' });
    const saved = res.data?.data ?? res.data;
    if (saved?.id) { return saved; }
  } catch {}
  return { ...data, id: Date.now(), status: 'PENDING', createdAt: new Date().toISOString() };
};

// ─── Teacher leaves ───────────────────────────────────────────────────────────

export const fetchTeacherLeaves = async () => {
  try {
    const res = await leaveAPI.getTeacherLeaves();
    const data = res.data?.data ?? res.data ?? [];
    if (Array.isArray(data)) { return data; }
  } catch {}
  return [];
};

export const deleteTeacherLeave = async (id) => {
  try { await leaveAPI.deleteLeave(id); } catch {}
  return id;
};

export const updateTeacherLeaveStatus = async (id, status) => {
  try {
    const res = await leaveAPI.updateStatus(id, { status });
    const data = res.data?.data ?? res.data;
    if (data?.id) { return data; }
  } catch {}
  return { id, status, reviewedAt: new Date().toISOString() };
};

export const createTeacherLeave = async (data) => {
  try {
    const res = await leaveAPI.createLeave({ ...data, requesterType: 'TEACHER' });
    const saved = res.data?.data ?? res.data;
    if (saved?.id) { return saved; }
  } catch {}
  return { ...data, id: Date.now(), status: 'PENDING', createdAt: new Date().toISOString() };
};

export default {
  fetchStudentLeaves, deleteStudentLeave, updateStudentLeaveStatus, createStudentLeave,
  fetchTeacherLeaves, deleteTeacherLeave, updateTeacherLeaveStatus, createTeacherLeave,
};
