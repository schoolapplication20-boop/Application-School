/**
 * classService.js
 * API-only CRUD for classes. No mock fallback — only real DB data is shown.
 */
import { adminAPI } from './api';

export const fetchClasses = async () => {
  try {
    const res = await adminAPI.getClasses();
    const data = res.data?.data ?? res.data?.content ?? [];
    if (Array.isArray(data) && data.length > 0) { return data; }
    return [];
  } catch {
    return [];
  }
};

export const createClass = async (data) => {
  try {
    const res = await adminAPI.createClass(data);
    return { success: true, data: res.data?.data ?? res.data, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to create class. Please try again.';
    return { success: false, message: msg };
  }
};

export const updateClass = async (id, data) => {
  try {
    const res = await adminAPI.updateClass(id, data);
    return { success: true, data: res.data?.data ?? res.data, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to update class. Please try again.';
    return { success: false, message: msg };
  }
};

export const deleteClass = async (id) => {
  try { await adminAPI.deleteClass(id); return true; }
  catch { return false; }
};

export default { fetchClasses, createClass, updateClass, deleteClass };
