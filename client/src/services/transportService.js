/**
 * transportService.js
 * API-first CRUD for all transport entities (buses, routes, drivers, stops, students, fees).
 */
import { transportAPI } from './api';

// ─── Helper: extract array from ApiResponse wrapper ───────────────────────────
// Backend returns { success, message, data: [...] }  (ApiResponse<List<T>>)
// Axios wraps that again: response.data = ApiResponse JSON
// So: res.data.data = the actual list
const unwrapList = (res) => {
  const body = res.data;
  if (Array.isArray(body)) return body;                // plain array (future-proof)
  if (Array.isArray(body?.data)) return body.data;    // ApiResponse wrapper
  if (Array.isArray(body?.content)) return body.content; // Spring Page wrapper
  return [];
};

const unwrapItem = (res) => {
  const body = res.data;
  if (body?.data !== undefined) return body.data;     // ApiResponse wrapper
  return body;
};

// ─── Buses ────────────────────────────────────────────────────────────────────

export const fetchBuses = async () => {
  try { return unwrapList(await transportAPI.getBuses()); }
  catch { return []; }
};

export const createBus = async (data) => {
  try { return unwrapItem(await transportAPI.createBus(data)); }
  catch (e) { throw e; }
};

export const updateBus = async (id, data) => {
  try { return unwrapItem(await transportAPI.updateBus(id, data)); }
  catch (e) { throw e; }
};

export const deleteBus = async (id) => {
  try { await transportAPI.deleteBus(id); return true; }
  catch (e) { throw e; }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

export const fetchRoutes = async () => {
  try { return unwrapList(await transportAPI.getRoutes()); }
  catch { return []; }
};

export const createRoute = async (data) => {
  try { return unwrapItem(await transportAPI.createRoute(data)); }
  catch (e) { throw e; }
};

export const updateRoute = async (id, data) => {
  try { return unwrapItem(await transportAPI.updateRoute(id, data)); }
  catch (e) { throw e; }
};

export const deleteRoute = async (id) => {
  try { await transportAPI.deleteRoute(id); return true; }
  catch (e) { throw e; }
};

// ─── Drivers ──────────────────────────────────────────────────────────────────

export const fetchDrivers = async () => {
  try { return unwrapList(await transportAPI.getDrivers()); }
  catch { return []; }
};

export const createDriver = async (data) => {
  try { return unwrapItem(await transportAPI.createDriver(data)); }
  catch (e) { throw e; }
};

export const updateDriver = async (id, data) => {
  try { return unwrapItem(await transportAPI.updateDriver(id, data)); }
  catch (e) { throw e; }
};

export const deleteDriver = async (id) => {
  try { await transportAPI.deleteDriver(id); return true; }
  catch (e) { throw e; }
};

// ─── Student Assignments ──────────────────────────────────────────────────────

export const fetchStudentAssignments = async () => {
  try { return unwrapList(await transportAPI.getStudentAssignments()); }
  catch { return []; }
};

export const assignStudent = async (data) => {
  try { return unwrapItem(await transportAPI.assignStudent(data)); }
  catch (e) { throw e; }
};

export const updateStudentAssignment = async (id, data) => {
  try { return unwrapItem(await transportAPI.updateStudentAssignment(id, data)); }
  catch (e) { throw e; }
};

export const removeStudentAssignment = async (id) => {
  try { await transportAPI.removeStudentAssignment(id); return true; }
  catch (e) { throw e; }
};

// ─── Stops ────────────────────────────────────────────────────────────────────

export const fetchStops = async () => {
  try { return unwrapList(await transportAPI.getStops()); }
  catch { return []; }
};

export const createStop = async (data) => {
  try { return unwrapItem(await transportAPI.createStop(data)); }
  catch (e) { throw e; }
};

export const updateStop = async (id, data) => {
  try { return unwrapItem(await transportAPI.updateStop(id, data)); }
  catch (e) { throw e; }
};

export const deleteStop = async (id) => {
  try { await transportAPI.deleteStop(id); return true; }
  catch (e) { throw e; }
};

// ─── Transport Fees ───────────────────────────────────────────────────────────

export const fetchTransportFees = async () => {
  try { return unwrapList(await transportAPI.getTransportFees()); }
  catch { return []; }
};

export const createTransportFee = async (data) => {
  try { return unwrapItem(await transportAPI.createTransportFee(data)); }
  catch (e) { throw e; }
};

export const updateTransportFee = async (id, data) => {
  try { return unwrapItem(await transportAPI.updateTransportFee(id, data)); }
  catch (e) { throw e; }
};

export const deleteTransportFee = async (id) => {
  try { await transportAPI.deleteTransportFee(id); return true; }
  catch (e) { throw e; }
};

export const markTransportFeePaid = async (id) => {
  try { await transportAPI.markFeePaid(id); return true; }
  catch (e) { throw e; }
};

export default {
  fetchBuses, createBus, updateBus, deleteBus,
  fetchRoutes, createRoute, updateRoute, deleteRoute,
  fetchDrivers, createDriver, updateDriver, deleteDriver,
  fetchStudentAssignments, assignStudent, updateStudentAssignment, removeStudentAssignment,
  fetchStops, createStop, updateStop, deleteStop,
  fetchTransportFees, createTransportFee, updateTransportFee, deleteTransportFee, markTransportFeePaid,
};
