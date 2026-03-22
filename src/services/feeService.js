/**
 * feeService.js
 * API-only CRUD for fees. No mock fallback — only real DB data is shown.
 */
import { adminAPI } from './api';

export const fetchFees = async () => {
  try {
    const res = await adminAPI.getFees();
    const data = res.data?.data?.content ?? res.data?.data ?? res.data?.content ?? [];
    if (Array.isArray(data) && data.length > 0) { return data; }
    return [];
  } catch {
    return [];
  }
};

export const createFee = async (data) => {
  try {
    const res = await adminAPI.createFee(data);
    return { success: true, data: res.data?.data ?? res.data, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to create fee record. Please try again.';
    return { success: false, message: msg };
  }
};

export const updateFee = async (id, data) => {
  try {
    const res = await adminAPI.updateFee(id, data);
    return { success: true, data: res.data?.data ?? res.data, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to update fee record. Please try again.';
    return { success: false, message: msg };
  }
};

export default { fetchFees, createFee, updateFee };
