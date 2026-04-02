/**
 * transportService.js
 * API-first CRUD for all transport entities (buses, routes, drivers, stops, students, fees).
 */
import { transportAPI } from './api';

// ─── Buses ────────────────────────────────────────────────────────────────────

export const fetchBuses = async () => {
  try {
    const res = await transportAPI.getBuses();
    return res.data?.content ?? res.data ?? [];
  } catch { return []; }
};

export const createBus = async (data) => {
  try { const res = await transportAPI.createBus(data); return res.data; }
  catch (e) { throw e; }
};

export const updateBus = async (id, data) => {
  try { const res = await transportAPI.updateBus(id, data); return res.data; }
  catch (e) { throw e; }
};

export const deleteBus = async (id) => {
  try { await transportAPI.deleteBus(id); return true; }
  catch (e) { throw e; }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

export const fetchRoutes = async () => {
  try {
    const res = await transportAPI.getRoutes();
    return res.data?.content ?? res.data ?? [];
  } catch { return []; }
};

export const createRoute = async (data) => {
  try { const res = await transportAPI.createRoute(data); return res.data; }
  catch (e) { throw e; }
};

export const updateRoute = async (id, data) => {
  try { const res = await transportAPI.updateRoute(id, data); return res.data; }
  catch (e) { throw e; }
};

export const deleteRoute = async (id) => {
  try { await transportAPI.deleteRoute(id); return true; }
  catch (e) { throw e; }
};

// ─── Drivers ──────────────────────────────────────────────────────────────────

export const fetchDrivers = async () => {
  try {
    const res = await transportAPI.getDrivers();
    return res.data?.content ?? res.data ?? [];
  } catch { return []; }
};

export const createDriver = async (data) => {
  try { const res = await transportAPI.createDriver(data); return res.data; }
  catch (e) { throw e; }
};

export const updateDriver = async (id, data) => {
  try { const res = await transportAPI.updateDriver(id, data); return res.data; }
  catch (e) { throw e; }
};

export const deleteDriver = async (id) => {
  try { await transportAPI.deleteDriver(id); return true; }
  catch (e) { throw e; }
};

// ─── Student Assignments ──────────────────────────────────────────────────────

export const fetchStudentAssignments = async () => {
  try {
    const res = await transportAPI.getStudentAssignments();
    return res.data?.content ?? res.data ?? [];
  } catch { return []; }
};

export const assignStudent = async (data) => {
  try { const res = await transportAPI.assignStudent(data); return res.data; }
  catch (e) { throw e; }
};

export const updateStudentAssignment = async (id, data) => {
  try { const res = await transportAPI.updateStudentAssignment(id, data); return res.data; }
  catch (e) { throw e; }
};

export const removeStudentAssignment = async (id) => {
  try { await transportAPI.removeStudentAssignment(id); return true; }
  catch (e) { throw e; }
};

// ─── Stops ────────────────────────────────────────────────────────────────────

export const fetchStops = async () => {
  try {
    const res = await transportAPI.getStops();
    return res.data?.content ?? res.data ?? [];
  } catch { return []; }
};

export const createStop = async (data) => {
  try { const res = await transportAPI.createStop(data); return res.data; }
  catch (e) { throw e; }
};

export const updateStop = async (id, data) => {
  try { const res = await transportAPI.updateStop(id, data); return res.data; }
  catch (e) { throw e; }
};

export const deleteStop = async (id) => {
  try { await transportAPI.deleteStop(id); return true; }
  catch (e) { throw e; }
};

// ─── Transport Fees ───────────────────────────────────────────────────────────

export const fetchTransportFees = async () => {
  try {
    const res = await transportAPI.getTransportFees();
    return res.data?.content ?? res.data ?? [];
  } catch { return []; }
};

export const createTransportFee = async (data) => {
  try { const res = await transportAPI.createTransportFee(data); return res.data; }
  catch (e) { throw e; }
};

export const updateTransportFee = async (id, data) => {
  try { const res = await transportAPI.updateTransportFee(id, data); return res.data; }
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
