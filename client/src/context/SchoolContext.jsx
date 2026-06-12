import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const SchoolContext = createContext(null);

const DEFAULT_PRIMARY   = '#F97316';
const DEFAULT_SECONDARY = '#EA6C0A';

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
    // All 13 module keys
    students: true, teachers: true, classes: true, applications: true,
    fees: true, collectFee: true, salaries: true, salary: true,
    expenses: true, leave: true, transport: true, attendance: true,
    timetable: true, examination: true,
    // Legacy keys
    diary: true, announcements: true, messages: true,
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
  root.style.setProperty('--primary-color',    primaryColor   || DEFAULT_PRIMARY);
  root.style.setProperty('--secondary-color',  secondaryColor || DEFAULT_SECONDARY);
  root.style.setProperty('--primary',          primaryColor   || DEFAULT_PRIMARY);
  root.style.setProperty('--primary-green',    primaryColor   || DEFAULT_PRIMARY);
  root.style.setProperty('--primary-green-dark', secondaryColor || DEFAULT_SECONDARY);
};

export const SchoolProvider = ({ children }) => {
  const { registerSchoolSetter, registerSchoolLoader, user, isLoading: authLoading } = useAuth();
  const [school,      setSchoolState] = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [logoVersion, setLogoVersion] = useState(() => Date.now());

  // ── Hydrate from login response (called by AuthContext right after login) ──
  const setSchool = useCallback((schoolData) => {
    if (!schoolData) { setSchoolState(null); return; }
    const enriched = {
      ...schoolData,
      features: parseFeatures(schoolData.features),
    };
    setSchoolState(enriched);
    setLogoVersion(Date.now());
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

  // Register loadSchool with AuthContext so session restore can refetch school
  useEffect(() => {
    if (registerSchoolLoader) registerSchoolLoader(loadSchool);
  }, [registerSchoolLoader, loadSchool]);

  // Safety net: if the user is authenticated but school hasn't been loaded yet
  // (e.g. the login response didn't carry school data, or a stub school had
  // schoolId=null so findBySchoolId returned null), fetch it proactively.
  // Only runs once per authenticated session — guarded by the loading flag.
  useEffect(() => {
    if (!authLoading && user && user.role !== 'APPLICATION_OWNER' && !school && !loading) {
      loadSchool();
    }
  }, [authLoading, user, school, loading, loadSchool]);

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

  // Re-fetch school features when the tab regains focus or every 60 s.
  // This ensures module permission changes made by the app owner are picked
  // up by existing sessions without requiring a re-login.
  useEffect(() => {
    if (!user || user.role === 'APPLICATION_OWNER') return;
    const refresh = () => { if (!document.hidden) loadSchool(); };
    document.addEventListener('visibilitychange', refresh);
    const interval = setInterval(refresh, 60000);
    return () => {
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(interval);
    };
  }, [user, loadSchool]);

  const value = {
    school,
    loading,
    logoVersion,
    setSchool,
    loadSchool,
    loadSchoolById,
    clearSchool,
    /** Convenience: is a feature enabled for this school? */
    hasFeature: (key) => school?.features?.[key] !== false,
    /**
     * Is `key` enabled for `role` (TEACHER/STUDENT)?
     * Checks the school-wide toggle first (master switch), then an optional
     * per-role override map (school.features.teacherModules / .studentModules).
     * Missing role-map entries default to enabled, so schools without these
     * maps configured behave exactly as before.
     */
    hasRoleModule: (role, key) => {
      if (school?.features?.[key] === false) return false;
      const roleMap = role === 'TEACHER' ? school?.features?.teacherModules
        : role === 'STUDENT' ? school?.features?.studentModules
        : null;
      return roleMap?.[key] !== false;
    },
  };

  return (
    <SchoolContext.Provider value={value}>
      {children}
    </SchoolContext.Provider>
  );
};

export default SchoolContext;
