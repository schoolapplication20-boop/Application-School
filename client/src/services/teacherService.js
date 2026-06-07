/**
 * teacherService.js
 * API-only CRUD for teachers. No mock fallback — only real DB data is shown.
 */
import { adminAPI } from './api';

const normalizeTeacher = (t) => ({
  id:               t.id,
  userId:           t.user?.id   || t.userId,
  name:             t.user?.name || t.name || '',
  email:            t.user?.email || t.email || '',
  mobile:           t.user?.mobile || t.mobile || '',
  empId:            t.employeeId || t.empId || '',
  subject:          t.subject || '',
  department:       t.department || '',
  classes:          t.classes || '',
  qualification:    t.qualification || '',
  experience:       t.experience || '',
  joining:          t.joiningDate || t.joining || '',
  createdAt:        t.createdAt   || '',
  status:           t.isActive === false ? 'Inactive' : (t.status || 'Active'),
  teacherType:      t.teacherType || 'SUBJECT_TEACHER',
  primaryClassId:   t.primaryClassId ?? null,
  primaryClassName: t.primaryClassName || null,
});

export const fetchTeachers = async () => {
  try {
    const res = await adminAPI.getTeachers();
    const data = res.data?.data ?? [];
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normalizeTeacher);
    }
    return [];
  } catch (err) {
    console.error('[teacherService] fetchTeachers failed:', err?.response?.status, err?.message);
    return [];
  }
};

export const createTeacher = async (data) => {
  try {
    const res         = await adminAPI.createTeacher(data);
    const backendData = res.data?.data ?? {};
    return {
      success: true,
      data:    backendData,
      message: res.data?.message,
    };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to save teacher. Please try again.';
    return { success: false, message: msg };
  }
};

export const updateTeacher = async (id, data) => {
  try {
    const res = await adminAPI.updateTeacher(id, data);
    const raw = res.data?.data;
    return { success: true, data: raw ? normalizeTeacher(raw) : raw, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to update teacher. Please try again.';
    return { success: false, message: msg };
  }
};

export const resetTeacherPassword = async (id, password) => {
  try {
    const res = await adminAPI.resetTeacherPassword(id, password);
    return { success: true, newPassword: res.data?.data ?? password, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to reset password. Please try again.';
    return { success: false, message: msg };
  }
};

export const deleteTeacher = async (id) => {
  try {
    await adminAPI.deleteTeacher(id);
    return { success: true };
  } catch (err) {
    return { success: false, message: err.response?.data?.message || 'Failed to delete teacher. Please try again.' };
  }
};

export default { fetchTeachers, createTeacher, updateTeacher, resetTeacherPassword, deleteTeacher };
