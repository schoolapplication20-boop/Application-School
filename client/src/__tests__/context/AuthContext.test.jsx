import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// ── mock the api module ───────────────────────────────────────────────────────
vi.mock('../../services/api', () => {
  const mockApi = {
    post: vi.fn().mockResolvedValue({ data: {} }),
    get:  vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request:  { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default:        mockApi,
    setAuthToken:   vi.fn(),
    clearAuthToken: vi.fn(),
  };
});

// ── AuthConsumer: assigns the latest auth value to a ref on every render ──────
// This avoids stale-closure bugs: auth callbacks are memoized with [user] as
// a dependency, so after login() the ref's methods reflect the new user state.
function AuthConsumer({ authRef }) {
  const auth = useAuth();
  authRef.current = auth; // synchronous assignment during render — always fresh
  return (
    <div>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <span data-testid="role">{auth.user?.role ?? 'none'}</span>
      <span data-testid="email">{auth.user?.email ?? 'none'}</span>
    </div>
  );
}

function renderWithAuth(authRef) {
  return render(
    <AuthProvider>
      <AuthConsumer authRef={authRef} />
    </AuthProvider>
  );
}

function makeAuthRef() { return { current: null }; }

// ── common fixtures ───────────────────────────────────────────────────────────
const ADMIN_USER = {
  id: 1, name: 'Admin', email: 'admin@school.com',
  role: 'ADMIN', schoolId: 5,
  permissions: { students: true, fees: false },
};
const TOKEN = 'test-jwt-token';

// ─────────────────────────────────────────────────────────────────────────────

describe('AuthContext', () => {

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  // ── useAuth guard ──────────────────────────────────────────────────────────

  it('throws when useAuth is called outside AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const ref = makeAuthRef();
    expect(() => render(<AuthConsumer authRef={ref} />))
      .toThrow('useAuth must be used within an AuthProvider');
    spy.mockRestore();
  });

  // ── initial state ──────────────────────────────────────────────────────────

  it('starts unauthenticated with no user', async () => {
    const ref = makeAuthRef();
    renderWithAuth(ref);
    await waitFor(() => expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(screen.getByTestId('role').textContent).toBe('none');
  });

  // ── login() ───────────────────────────────────────────────────────────────

  it('login() sets user and token, marking session as authenticated', async () => {
    const ref = makeAuthRef();
    renderWithAuth(ref);

    await act(async () => { ref.current.login(ADMIN_USER, TOKEN); });

    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('true'));
    expect(screen.getByTestId('role').textContent).toBe('ADMIN');
    expect(screen.getByTestId('email').textContent).toBe('admin@school.com');
  });

  it('login() persists the session to sessionStorage', async () => {
    const ref = makeAuthRef();
    renderWithAuth(ref);

    await act(async () => { ref.current.login(ADMIN_USER, TOKEN); });

    const stored = JSON.parse(sessionStorage.getItem('schoolers_session'));
    expect(stored.token).toBe(TOKEN);
    expect(stored.user.email).toBe('admin@school.com');
  });

  it('login() writes ms_school_tenant to localStorage for school users', async () => {
    const ref = makeAuthRef();
    renderWithAuth(ref);

    await act(async () => { ref.current.login(ADMIN_USER, TOKEN); });

    expect(localStorage.getItem('ms_school_tenant')).toBe('5');
  });

  it('login() removes ms_school_tenant for APPLICATION_OWNER (no schoolId)', async () => {
    localStorage.setItem('ms_school_tenant', '5');
    const ref = makeAuthRef();
    renderWithAuth(ref);

    const ownerUser = { id: 99, name: 'Owner', email: 'owner@app.com',
                        role: 'APPLICATION_OWNER', schoolId: null };
    await act(async () => { ref.current.login(ownerUser, TOKEN); });

    expect(localStorage.getItem('ms_school_tenant')).toBeNull();
  });

  // ── logout() ──────────────────────────────────────────────────────────────

  it('logout() clears user, token, and sessionStorage', async () => {
    const ref = makeAuthRef();
    renderWithAuth(ref);

    await act(async () => { ref.current.login(ADMIN_USER, TOKEN); });
    await act(async () => { ref.current.logout(); });

    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(sessionStorage.getItem('schoolers_session')).toBeNull();
  });

  // ── session restore from sessionStorage ───────────────────────────────────

  it('restores session from sessionStorage on remount', async () => {
    sessionStorage.setItem('schoolers_session',
      JSON.stringify({ token: TOKEN, user: ADMIN_USER }));

    const ref = makeAuthRef();
    renderWithAuth(ref);

    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('true'));
    expect(screen.getByTestId('role').textContent).toBe('ADMIN');
  });

  it('clears corrupt sessionStorage data rather than crashing', async () => {
    sessionStorage.setItem('schoolers_session', '{invalid-json}');

    const ref = makeAuthRef();
    renderWithAuth(ref);

    await waitFor(() =>
      expect(screen.getByTestId('authenticated').textContent).toBe('false'));
    expect(sessionStorage.getItem('schoolers_session')).toBeNull();
  });

  // ── hasRole() ─────────────────────────────────────────────────────────────

  describe('hasRole()', () => {

    it('returns true when the user role matches the string argument', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      await act(async () => { ref.current.login({ ...ADMIN_USER, role: 'ADMIN' }, TOKEN); });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasRole('ADMIN')).toBe(true);
    });

    it('returns false when the user role does not match', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      await act(async () => { ref.current.login({ ...ADMIN_USER, role: 'ADMIN' }, TOKEN); });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasRole('TEACHER')).toBe(false);
    });

    it('returns true when the user role is in the provided array', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      await act(async () => {
        ref.current.login({ ...ADMIN_USER, role: 'SUPER_ADMIN' }, TOKEN);
      });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasRole(['ADMIN', 'SUPER_ADMIN', 'APPLICATION_OWNER'])).toBe(true);
    });

    it('returns false when no user is logged in', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      await waitFor(() => expect(ref.current).not.toBeNull());
      // isLoading = false after restore attempt completes
      await waitFor(() => expect(ref.current.isLoading).toBe(false));
      expect(ref.current.hasRole('ADMIN')).toBe(false);
    });
  });

  // ── hasPermission() ───────────────────────────────────────────────────────

  describe('hasPermission()', () => {

    it('APPLICATION_OWNER always returns true regardless of permission key', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      const ownerUser = { id: 99, email: 'o@app.com', role: 'APPLICATION_OWNER', schoolId: null };
      await act(async () => { ref.current.login(ownerUser, TOKEN); });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasPermission('students')).toBe(true);
      expect(ref.current.hasPermission('nonExistentModule')).toBe(true);
    });

    it('SUPER_ADMIN returns true when no permissions object is set (full access)', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      const sa = { id: 2, email: 'sa@school.com', role: 'SUPER_ADMIN', schoolId: 5, permissions: null };
      await act(async () => { ref.current.login(sa, TOKEN); });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasPermission('students')).toBe(true);
    });

    it('ADMIN with permission key=true returns true', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      const adminUser = { ...ADMIN_USER, permissions: { students: true, fees: false } };
      await act(async () => { ref.current.login(adminUser, TOKEN); });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasPermission('students')).toBe(true);
    });

    it('ADMIN with permission key=false returns false', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      const adminUser = { ...ADMIN_USER, permissions: { students: true, fees: false } };
      await act(async () => { ref.current.login(adminUser, TOKEN); });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasPermission('fees')).toBe(false);
    });

    it('ADMIN with no permissions object returns false for every key', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      const adminUser = { ...ADMIN_USER, permissions: null };
      await act(async () => { ref.current.login(adminUser, TOKEN); });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasPermission('students')).toBe(false);
    });

    it('TEACHER always returns false (not an admin role)', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      const teacher = { id: 3, email: 't@school.com', role: 'TEACHER', schoolId: 5 };
      await act(async () => { ref.current.login(teacher, TOKEN); });
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));
      expect(ref.current.hasPermission('students')).toBe(false);
    });
  });

  // ── getDashboardPath() ────────────────────────────────────────────────────

  describe('getDashboardPath()', () => {
    const cases = [
      ['APPLICATION_OWNER', '/owner/dashboard'],
      ['SUPER_ADMIN',       '/superadmin/dashboard'],
      ['ADMIN',             '/admin/dashboard'],
      ['TEACHER',           '/teacher/dashboard'],
      ['STUDENT',           '/student/dashboard'],
    ];

    it.each(cases)('%s → %s', async (role, expectedPath) => {
      const ref = makeAuthRef();
      renderWithAuth(ref);

      const userForRole = {
        id: 1, email: 'u@s.com', role,
        schoolId: role === 'APPLICATION_OWNER' ? null : 5,
      };
      await act(async () => { ref.current.login(userForRole, TOKEN); });
      // Wait until the context has re-rendered with the new user
      await waitFor(() => expect(ref.current.isAuthenticated).toBe(true));

      expect(ref.current.getDashboardPath()).toBe(expectedPath);
    });

    it('returns /login when no user is authenticated', async () => {
      const ref = makeAuthRef();
      renderWithAuth(ref);
      await waitFor(() => expect(ref.current.isLoading).toBe(false));
      expect(ref.current.getDashboardPath()).toBe('/login');
    });
  });

  // ── updateUser() ──────────────────────────────────────────────────────────

  it('updateUser() merges fields and keeps sessionStorage in sync', async () => {
    const ref = makeAuthRef();
    renderWithAuth(ref);

    await act(async () => { ref.current.login(ADMIN_USER, TOKEN); });
    await act(async () => { ref.current.updateUser({ name: 'Updated Name' }); });

    await waitFor(() => {
      const stored = JSON.parse(sessionStorage.getItem('schoolers_session'));
      expect(stored?.user?.name).toBe('Updated Name');
    });
    const stored = JSON.parse(sessionStorage.getItem('schoolers_session'));
    expect(stored.user.email).toBe('admin@school.com'); // original fields preserved
  });
});
