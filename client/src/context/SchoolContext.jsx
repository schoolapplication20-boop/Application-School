import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SchoolContext = createContext(null);

const DEFAULT_PRIMARY   = '#76C442';
const DEFAULT_SECONDARY = '#5fa832';

export const useSchool = () => {
  const ctx = useContext(SchoolContext);
  if (!ctx) throw new Error('useSchool must be used within a SchoolProvider');
  return ctx;
};

/**
 * Parses the features JSON string into an object.
 * Returns a fully-populated object with all keys defaulting to true
 * so existing code never has to guard for undefined.
 */
const parseFeatures = (raw) => {
  const defaults = {
    attendance: true, transport: true, fees: true,
    salary: true, examination: true, diary: true,
    announcements: true, messages: true,
  };
  if (!raw) return defaults;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
};

/**
 * Applies school colours as CSS custom properties on :root.
 * Every component that uses var(--primary) / var(--secondary) reacts automatically.
 */
const applyTheme = (primaryColor, secondaryColor) => {
  const root = document.documentElement;
  root.style.setProperty('--school-primary',   primaryColor   || DEFAULT_PRIMARY);
  root.style.setProperty('--school-secondary', secondaryColor || DEFAULT_SECONDARY);
  // Keep backwards-compat aliases used elsewhere in the stylesheet
  root.style.setProperty('--primary-color',    primaryColor   || DEFAULT_PRIMARY);
  root.style.setProperty('--secondary-color',  secondaryColor || DEFAULT_SECONDARY);
};

export const SchoolProvider = ({ children }) => {
  const { registerSchoolSetter } = useAuth();
  const [school,   setSchoolState] = useState(null);
  const [loading,  setLoading]     = useState(false);

  // ── Hydrate from login response (called by AuthContext right after login) ──
  const setSchool = useCallback((schoolData) => {
    if (!schoolData) { setSchoolState(null); return; }
    const enriched = {
      ...schoolData,
      features: parseFeatures(schoolData.features),
    };
    setSchoolState(enriched);
    applyTheme(schoolData.primaryColor, schoolData.secondaryColor);
  }, []);

  // ── Fetch school from API (by-admin endpoint) ─────────────────────────────
  const loadSchool = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await api.get('/api/schools/by-admin');
      const data = res.data?.data;
      if (data) setSchool(data);
    } catch {
      // User may not have a school linked yet — fail silently
    } finally {
      setLoading(false);
    }
  }, [setSchool]);

  // ── Fetch school by explicit ID ───────────────────────────────────────────
  const loadSchoolById = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    try {
      const res  = await api.get(`/api/schools/${id}`);
      const data = res.data?.data;
      if (data) setSchool(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [setSchool]);

  // ── Clear school on logout ────────────────────────────────────────────────
  const clearSchool = useCallback(() => {
    setSchoolState(null);
    applyTheme(DEFAULT_PRIMARY, DEFAULT_SECONDARY);
  }, []);

  // Register setSchool with AuthContext so login can push school data in
  useEffect(() => {
    if (registerSchoolSetter) registerSchoolSetter(setSchool);
  }, [registerSchoolSetter, setSchool]);

  // Re-apply theme whenever school changes (e.g. after update)
  useEffect(() => {
    if (school) applyTheme(school.primaryColor, school.secondaryColor);
  }, [school]);

  // Listen for auth logout event
  useEffect(() => {
    const handler = () => clearSchool();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [clearSchool]);

  const value = {
    school,
    loading,
    setSchool,
    loadSchool,
    loadSchoolById,
    clearSchool,
    /** Convenience: is a feature enabled for this school? */
    hasFeature: (key) => school?.features?.[key] !== false,
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
};

export default SchoolContext;
