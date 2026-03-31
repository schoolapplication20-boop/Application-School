/**
 * feeService.js
 * API-only CRUD for fees. No mock fallback — only real DB data is shown.
 */
import { adminAPI } from './api';

export const fetchFees = async () => {
  try {
    const res = await adminAPI.getFees();
    const data = res.data?.data ?? res.data ?? [];
    return Array.isArray(data) ? data : [];
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

export const deleteFee = async (id) => {
  try {
    const res = await adminAPI.deleteFee(id);
    return { success: true, message: res.data?.message };
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to delete fee record. Please try again.';
    return { success: false, message: msg };
  }
};

export default { fetchFees, createFee, updateFee, deleteFee };
