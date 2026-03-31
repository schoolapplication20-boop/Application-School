/**
 * transportService.js
 * API-first CRUD for transport (buses, routes, drivers).
 */
import { transportAPI } from './api';

const SEEDS = {
  buses: [
    { id: 1, busNo: 'KA01-AB-1234', capacity: 40, currentStudents: 35, driver: 'Ramu Naidu',    conductor: 'Siva Kumar', route: 'Route A', status: 'Active' },
    { id: 2, busNo: 'KA01-CD-5678', capacity: 40, currentStudents: 28, driver: 'Suresh Babu',   conductor: 'Mohan Rao',  route: 'Route B', status: 'Active' },
    { id: 3, busNo: 'KA01-EF-9012', capacity: 35, currentStudents: 30, driver: 'Venkat Reddy',  conductor: 'Ramesh P',   route: 'Route C', status: 'Active' },
    { id: 4, busNo: 'KA01-GH-3456', capacity: 35, currentStudents: 12, driver: 'Krishna Murthy',conductor: 'Ganesh K',   route: 'Route D', status: 'Maintenance' },
  ],
  routes: [
    { id: 1, name: 'Route A', area: 'Koramangala – MG Road',    stops: 6, distance: '12 km', pickupTime: '07:30 AM', dropTime: '04:30 PM', buses: 1 },
    { id: 2, name: 'Route B', area: 'HSR Layout – Marathahalli', stops: 8, distance: '18 km', pickupTime: '07:15 AM', dropTime: '04:45 PM', buses: 1 },
    { id: 3, name: 'Route C', area: 'Whitefield – ITPL',          stops: 10,distance: '22 km', pickupTime: '07:00 AM', dropTime: '05:00 PM', buses: 1 },
    { id: 4, name: 'Route D', area: 'Electronic City',            stops: 5, distance: '25 km', pickupTime: '06:45 AM', dropTime: '05:15 PM', buses: 1 },
  ],
  drivers: [
    { id: 1, name: 'Ramu Naidu',     license: 'KA0120180012345', mobile: '9876501001', bus: 'KA01-AB-1234', experience: '8 years',  status: 'Active' },
    { id: 2, name: 'Suresh Babu',    license: 'KA0120190023456', mobile: '9876501002', bus: 'KA01-CD-5678', experience: '6 years',  status: 'Active' },
    { id: 3, name: 'Venkat Reddy',   license: 'KA0120160034567', mobile: '9876501003', bus: 'KA01-EF-9012', experience: '11 years', status: 'Active' },
    { id: 4, name: 'Krishna Murthy', license: 'KA0120210045678', mobile: '9876501004', bus: 'KA01-GH-3456', experience: '3 years',  status: 'Active' },
  ],
};

// ─── Buses ────────────────────────────────────────────────────────────────────

export const fetchBuses = async () => {
  try {
    const res = await transportAPI.getBuses();
    const data = res.data?.content ?? res.data ?? [];
    if (Array.isArray(data) && data.length > 0) { return data; }
    return SEEDS.buses;
  } catch { return SEEDS.buses; }
};

export const createBus = async (data) => {
  try { const res = await transportAPI.createBus(data); return res.data; }
  catch { return { ...data, id: Date.now() }; }
};

export const updateBus = async (id, data) => {
  try { const res = await transportAPI.updateBus(id, data); return res.data; }
  catch { return { id, ...data }; }
};

export const deleteBus = async (id) => {
  try { await transportAPI.deleteBus(id); return true; }
  catch { return true; }
};

// ─── Routes ───────────────────────────────────────────────────────────────────

export const fetchRoutes = async () => {
  try {
    const res = await transportAPI.getRoutes();
    const data = res.data?.content ?? res.data ?? [];
    if (Array.isArray(data) && data.length > 0) { return data; }
    return SEEDS.routes;
  } catch { return SEEDS.routes; }
};

export const createRoute = async (data) => {
  try { const res = await transportAPI.createRoute(data); return res.data; }
  catch { return { ...data, id: Date.now() }; }
};

export const updateRoute = async (id, data) => {
  try { const res = await transportAPI.updateRoute(id, data); return res.data; }
  catch { return { id, ...data }; }
};

export const deleteRoute = async (id) => {
  try { await transportAPI.deleteRoute(id); return true; }
  catch { return true; }
};

// ─── Drivers ──────────────────────────────────────────────────────────────────

export const fetchDrivers = async () => {
  try {
    const res = await transportAPI.getDrivers();
    const data = res.data?.content ?? res.data ?? [];
    if (Array.isArray(data) && data.length > 0) { return data; }
    return SEEDS.drivers;
  } catch { return SEEDS.drivers; }
};

export const createDriver = async (data) => {
  try { const res = await transportAPI.createDriver(data); return res.data; }
  catch { return { ...data, id: Date.now() }; }
};

export const updateDriver = async (id, data) => {
  try { const res = await transportAPI.updateDriver(id, data); return res.data; }
  catch { return { id, ...data }; }
};

export const deleteDriver = async (id) => {
  try { await transportAPI.deleteDriver(id); return true; }
  catch { return true; }
};

export default { fetchBuses, createBus, updateBus, deleteBus, fetchRoutes, createRoute, updateRoute, deleteRoute, fetchDrivers, createDriver, updateDriver, deleteDriver };
