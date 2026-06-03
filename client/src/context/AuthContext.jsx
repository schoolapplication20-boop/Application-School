import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { setAuthToken, clearAuthToken } from '../services/api';
import api from '../services/api';

/** Decode the exp claim from a JWT (no signature verification — frontend only) */
const getTokenExpiry = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null; // convert to ms
  } catch { return null; }
};

const SESSION_KEY = 'schoolers_session';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/** Parse permissions from any format the backend might return */
const parsePermissions = (raw) => {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]                     = useState(null);
  const [token, setToken]                   = useState(null);
  const [isLoading, setIsLoading]           = useState(true); // true during session restore
  const [sessionExpired, setSessionExpired] = useState(false); // show session-expired modal

  const expiryTimerRef = useRef(null);

  // schoolRef allows SchoolContext to register itself so AuthContext can
  // push school data on login without creating a circular dependency.
  const schoolSetterRef    = useRef(null);
  const schoolLoaderRef    = useRef(null);
  const registerSchoolSetter = useCallback((fn) => { schoolSetterRef.current = fn; }, []);
  const registerSchoolLoader = useCallback((fn) => { schoolLoaderRef.current = fn; }, []);

  // ── Proactive token expiry: schedule auto-logout 60s before JWT expires ─
  useEffect(() => {
    if (expiryTimerRef.current) clearTimeout(expiryTimerRef.current);
    if (!token) return;
    const expMs = getTokenExpiry(token);
    if (!expMs) return;
    const msUntilExpiry = expMs - Date.now() - 60_000; // 60s early warning
    if (msUntilExpiry <= 0) {
      setSessionExpired(true);
      return;
    }
    expiryTimerRef.current = setTimeout(() => setSessionExpired(true), msUntilExpiry);
    return () => clearTimeout(expiryTimerRef.current);
  }, [token]);

  // ── Listen for 401 fired by api.js interceptor ──────────────────────────
  useEffect(() => {
    const onExpired = () => setSessionExpired(true);
    window.addEventListener('auth:session-expired', onExpired);
    return () => window.removeEventListener('auth:session-expired', onExpired);
  }, []);

  // ── Cross-tab logout sync via localStorage ───────────────────────────────
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === SESSION_KEY && e.newValue === null) {
        // Another tab cleared the session (logged out) — clear this tab too
        setUser(null);
        setToken(null);
        clearAuthToken();
        setSessionExpired(false);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // ── Restore session from sessionStorage on first mount ──────────────────
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const { token: savedToken, user: savedUser } = JSON.parse(raw);
        if (savedToken && savedUser?.role) {
          setAuthToken(savedToken);
          setUser(savedUser);
          setToken(savedToken);
          // School data will be re-fetched by SchoolContext once it registers
          // its loader (happens synchronously during render, before this effect)
          if (schoolLoaderRef.current) schoolLoaderRef.current();
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback((userData, authToken) => {
    setAuthToken(authToken);

    // Parse permissions immediately if the login response includes them
    const permissions = parsePermissions(userData?.permissions);
    const finalUser   = permissions ? { ...userData, permissions } : userData;

    setUser(finalUser);
    setToken(authToken);

    // Persist session so page refresh doesn't log the user out
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: authToken, user: finalUser }));
    } catch { /* storage full or blocked — continue without persistence */ }

    // Hydrate school branding from login response (school field on the user DTO)
    if (userData?.school && schoolSetterRef.current) {
      schoolSetterRef.current(userData.school);
    }

    // Always fetch fresh school data (catches missing logoUrl / branding changes).
    // APPLICATION_OWNER has no school, so skip for that role.
    if (userData?.role !== 'APPLICATION_OWNER' && schoolLoaderRef.current) {
      schoolLoaderRef.current();
    }

    // Track whether the current browser has a school user session.
    // Used by the login page to hide the App Owner role card.
    if (userData?.role === 'APPLICATION_OWNER') {
      localStorage.removeItem('ms_school_tenant');
    } else if (userData?.schoolId) {
      localStorage.setItem('ms_school_tenant', String(userData.schoolId));
    }

    // Write a sentinel value to localStorage so the cross-tab storage event
    // fires reliably when logout removes it (storage events only fire for
    // localStorage, not sessionStorage, and only when a value actually changes).
    localStorage.setItem(SESSION_KEY, 'active');
  }, []);

  const logout = useCallback(() => {
    // Best-effort: revoke the token server-side so it can't be replayed
    // even before its natural 2-hour expiry. Fire-and-forget — don't await.
    try { api.post('/api/auth/logout').catch(() => {}); } catch {}

    setUser(null);
    setToken(null);
    clearAuthToken();
    setSessionExpired(false);
    sessionStorage.removeItem(SESSION_KEY);
    // Removing SESSION_KEY from sessionStorage triggers 'storage' event in other
    // tabs that also have the app open, causing them to clear their session.
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('ms_school_tenant');
    localStorage.removeItem('ms_last_activity');
    window.dispatchEvent(new Event('auth:logout'));
  }, []);

  const updateUser = useCallback((updatedData) => {
    setUser(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updatedData };
      // Keep sessionStorage in sync so page refresh sees the latest user data
      // (e.g. schoolId update from the setup wizard)
      try {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (raw) {
          const session = JSON.parse(raw);
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, user: updated }));
        }
      } catch { /* ignore storage errors */ }
      return updated;
    });
  }, []);

  /**
   * Tries several backend endpoints to load the admin's permissions.
   * Called right after login() for ADMIN accounts.
   * Tries endpoints in order and stops at the first that returns permissions.
   */
  const refreshPermissions = useCallback(async () => {
    setIsLoading(true);
    const candidates = [
      '/api/admin/permissions',   // dedicated permissions endpoint
      '/api/user/profile',        // generic profile fallback
    ];

    try {
      for (const url of candidates) {
        try {
          const res  = await api.get(url);
          const data = res.data?.data ?? res.data;

          // Case 1: { permissions: ... } nested inside data
          if (data?.permissions !== undefined) {
            const perms = parsePermissions(data.permissions);
            if (perms && typeof perms === 'object') {
              setUser(prev => {
                if (!prev) return prev;
                const updated = { ...prev, permissions: perms };
                try {
                  const raw = sessionStorage.getItem(SESSION_KEY);
                  if (raw) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...JSON.parse(raw), user: updated }));
                } catch { /* ignore */ }
                return updated;
              });
              return;
            }
          }

          // Case 2: data is the permissions object directly (no name/email fields)
          if (data && typeof data === 'object' && !data.name && !data.email && !Array.isArray(data)) {
            const perms = parsePermissions(data);
            if (perms && Object.keys(perms).length > 0) {
              setUser(prev => {
                if (!prev) return prev;
                const updated = { ...prev, permissions: perms };
                try {
                  const raw = sessionStorage.getItem(SESSION_KEY);
                  if (raw) sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...JSON.parse(raw), user: updated }));
                } catch { /* ignore */ }
                return updated;
              });
              return;
            }
          }
        } catch {
          // try next endpoint
        }
      }
      // If all endpoints fail, permissions remain as set by login()
    } finally {
      setIsLoading(false);
    }
  }, []);

  const isAuthenticated = !!token && !!user;

  const hasRole = useCallback((role) => {
    if (!user) return false;
    if (Array.isArray(role)) return role.includes(user.role);
    return user.role === role;
  }, [user]);

  const getDashboardPath = useCallback(() => {
    if (!user) return '/login';
    switch (user.role) {
      // APPLICATION_OWNER → platform dashboard (all schools overview)
      case 'APPLICATION_OWNER': return '/owner/dashboard';
      // SUPER_ADMIN → school-level dashboard (filtered to their school)
      case 'SUPER_ADMIN':       return '/superadmin/dashboard';
      case 'ADMIN':             return '/admin/dashboard';
      case 'TEACHER':           return '/teacher/dashboard';
      case 'STUDENT':           return '/student/dashboard';
      default:                  return '/login';
    }
  }, [user]);

  /**
   * Permission check per role:
   *
   * APPLICATION_OWNER — platform-level, always has full access to every module.
   * SUPER_ADMIN       — school-level owner; full access unless specific module
   *                     permissions were assigned by APPLICATION_OWNER.
   * ADMIN             — must have the specific permKey set to true.
   *                     ADMIN with no permissions object gets NO access.
   */
  const hasPermission = useCallback((permKey) => {
    if (!user) return false;
    // Platform owner has unrestricted access to everything
    if (user.role === 'APPLICATION_OWNER') return true;
    // School owner has full access unless module permissions were explicitly assigned
    if (user.role === 'SUPER_ADMIN') {
      const perms = parsePermissions(user.permissions);
      if (!perms || Object.keys(perms).length === 0) return true;
      return perms[permKey] === true;
    }
    // School admin: must have explicit permission for each module
    if (user.role === 'ADMIN') {
      const perms = parsePermissions(user.permissions);
      if (!perms) return false;
      return perms[permKey] === true;
    }
    return false;
  }, [user]);

  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false);
    window.location.href = '/login';
  }, []);

  const value = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    refreshPermissions,
    hasRole,
    getDashboardPath,
    hasPermission,
    registerSchoolSetter,
    registerSchoolLoader,
    sessionExpired,
    dismissSessionExpired,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* Session-expired overlay — shown when JWT expires mid-session.
          Lets the user save any unsaved work before navigating to login. */}
      {sessionExpired && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 99999,
        }}>
          <div style={{
            background: '#fff', borderRadius: 18, padding: '36px 32px',
            maxWidth: 420, width: 'calc(100% - 40px)', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg,#e53e3e,#c53030)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 18px',
            }}>
              <span className="material-icons" style={{ color: '#fff', fontSize: 32 }}>lock_clock</span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a202c', marginBottom: 10 }}>
              Session Expired
            </h2>
            <p style={{ fontSize: 14, color: '#718096', lineHeight: 1.6, marginBottom: 24 }}>
              Your login session has expired for security reasons.
              Please save any unsaved work before returning to the login page.
            </p>
            <button
              onClick={dismissSessionExpired}
              style={{
                padding: '12px 32px', background: 'linear-gradient(135deg,#0de1e8,#0369a1)',
                color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700,
                fontSize: 14, cursor: 'pointer', width: '100%',
              }}
            >
              Go to Login
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export default AuthContext;
