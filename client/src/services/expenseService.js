/**
 * expenseService.js
 * API-only CRUD for expenses. No mock fallback — only real DB data is shown.
 */
import { adminAPI } from './api';

export const fetchExpenses = async () => {
  try {
    const res = await adminAPI.getExpenses();
    const data = res.data?.data?.content ?? res.data?.data ?? res.data?.content ?? [];
    if (Array.isArray(data) && data.length > 0) { return data; }
    return [];
  } catch {
    return [];
  }
};

export const createExpense = async (data) => {
  try {
    const res = await adminAPI.createExpense(data);
    return { success: true, data: res.data?.data ?? res.data, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to create expense. Please try again.';
    return { success: false, message: msg };
  }
};

export const updateExpense = async (id, data) => {
  try {
    const res = await adminAPI.updateExpense(id, data);
    return { success: true, data: res.data?.data ?? res.data, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to update expense. Please try again.';
    return { success: false, message: msg };
  }
};

export const deleteExpense = async (id) => {
  try { await adminAPI.deleteExpense(id); return true; }
  catch { return false; }
};

export default { fetchExpenses, createExpense, updateExpense, deleteExpense };
