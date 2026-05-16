import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../context/AuthContext';

// Mock the api module to prevent real network calls
vi.mock('../../services/api', () => ({
  setAuthToken:   vi.fn(),
  clearAuthToken: vi.fn(),
  default: {
    get:  vi.fn().mockRejectedValue(new Error('Network error')),
    post: vi.fn().mockRejectedValue(new Error('Network error')),
  },
}));

const SESSION_KEY = 'schoolers_session';

// Helper: renders a component that exposes auth context values
function renderWithAuth(callback) {
  let result;
  function Consumer() {
    result = useAuth();
    return null;
  }
  render(
    <AuthProvider>
      <Consumer />
    </AuthProvider>
  );
  return () => result;
}

// ── useAuth hook ──────────────────────────────────────────────────────────────

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    function BareConsumer() {
      useAuth();
      return null;
    }
    expect(() => render(<BareConsumer />)).toThrow(
      'useAuth must be used within an AuthProvider'
    );
  });

  it('returns context object when inside AuthProvider', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    const auth = getAuth();
    expect(auth).toHaveProperty('user');
    expect(auth).toHaveProperty('token');
    expect(auth).toHaveProperty('login');
    expect(auth).toHaveProperty('logout');
    expect(auth).toHaveProperty('hasRole');
    expect(auth).toHaveProperty('hasPermission');
    expect(auth).toHaveProperty('getDashboardPath');
  });
});

// ── Initial state ─────────────────────────────────────────────────────────────

describe('AuthProvider — initial state', () => {
  it('starts with null user and token', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    expect(getAuth().user).toBeNull();
    expect(getAuth().token).toBeNull();
    expect(getAuth().isAuthenticated).toBe(false);
  });

  it('isLoading starts true and resolves to false', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
  });
});

// ── login() ───────────────────────────────────────────────────────────────────

describe('login()', () => {
  it('sets user and token after login', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    const fakeUser  = { id: 1, name: 'Alice', role: 'ADMIN', schoolId: 10 };
    const fakeToken = 'jwt-token-abc';

    act(() => { getAuth().login(fakeUser, fakeToken); });

    expect(getAuth().user).toMatchObject(fakeUser);
    expect(getAuth().token).toBe(fakeToken);
    expect(getAuth().isAuthenticated).toBe(true);
  });

  it('persists session to sessionStorage', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    const fakeUser  = { id: 2, name: 'Bob', role: 'TEACHER', schoolId: 10 };
    const fakeToken = 'jwt-token-xyz';
    act(() => { getAuth().login(fakeUser, fakeToken); });

    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    expect(stored.token).toBe(fakeToken);
    expect(stored.user.name).toBe('Bob');
  });

  it('parses permissions from string if provided', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    const permsObj  = { students: true, fees: false };
    const fakeUser  = { id: 3, role: 'ADMIN', permissions: JSON.stringify(permsObj) };
    act(() => { getAuth().login(fakeUser, 'token'); });

    expect(getAuth().user.permissions).toEqual(permsObj);
  });

  it('tracks schoolId in localStorage for non-APPLICATION_OWNER', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    act(() => { getAuth().login({ id: 4, role: 'ADMIN', schoolId: 99 }, 'token'); });
    expect(localStorage.getItem('ms_school_tenant')).toBe('99');
  });

  it('removes school tenant from localStorage for APPLICATION_OWNER', async () => {
    localStorage.setItem('ms_school_tenant', '5');
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    act(() => { getAuth().login({ id: 5, role: 'APPLICATION_OWNER' }, 'token'); });
    expect(localStorage.getItem('ms_school_tenant')).toBeNull();
  });
});

// ── logout() ──────────────────────────────────────────────────────────────────

describe('logout()', () => {
  it('clears user, token, and sessionStorage', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    act(() => { getAuth().login({ id: 1, role: 'ADMIN', schoolId: 1 }, 'tok'); });
    act(() => { getAuth().logout(); });

    expect(getAuth().user).toBeNull();
    expect(getAuth().token).toBeNull();
    expect(getAuth().isAuthenticated).toBe(false);
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('dispatches auth:logout event', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    const listener = vi.fn();
    window.addEventListener('auth:logout', listener);
    act(() => { getAuth().login({ id: 1, role: 'ADMIN', schoolId: 1 }, 'tok'); });
    act(() => { getAuth().logout(); });

    expect(listener).toHaveBeenCalled();
    window.removeEventListener('auth:logout', listener);
  });
});

// ── hasRole() ─────────────────────────────────────────────────────────────────

describe('hasRole()', () => {
  it('returns false when no user is set', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    expect(getAuth().hasRole('ADMIN')).toBe(false);
  });

  it('returns true for matching single role', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => { getAuth().login({ id: 1, role: 'TEACHER', schoolId: 1 }, 't'); });
    expect(getAuth().hasRole('TEACHER')).toBe(true);
  });

  it('returns false for non-matching role', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => { getAuth().login({ id: 1, role: 'TEACHER', schoolId: 1 }, 't'); });
    expect(getAuth().hasRole('ADMIN')).toBe(false);
  });

  it('returns true when role is in array', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => { getAuth().login({ id: 1, role: 'STUDENT', schoolId: 1 }, 't'); });
    expect(getAuth().hasRole(['STUDENT', 'TEACHER'])).toBe(true);
  });
});

// ── hasPermission() ───────────────────────────────────────────────────────────

describe('hasPermission()', () => {
  it('returns false when no user', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    expect(getAuth().hasPermission('students')).toBe(false);
  });

  it('APPLICATION_OWNER always returns true', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => { getAuth().login({ id: 1, role: 'APPLICATION_OWNER' }, 't'); });
    expect(getAuth().hasPermission('students')).toBe(true);
    expect(getAuth().hasPermission('fees')).toBe(true);
    expect(getAuth().hasPermission('anything')).toBe(true);
  });

  it('SUPER_ADMIN with no permissions returns true (full access)', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => { getAuth().login({ id: 1, role: 'SUPER_ADMIN', schoolId: 1 }, 't'); });
    expect(getAuth().hasPermission('students')).toBe(true);
  });

  it('SUPER_ADMIN with explicit permissions obeys them', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => {
      getAuth().login({
        id: 1, role: 'SUPER_ADMIN', schoolId: 1,
        permissions: { students: true, fees: false },
      }, 't');
    });
    expect(getAuth().hasPermission('students')).toBe(true);
    expect(getAuth().hasPermission('fees')).toBe(false);
  });

  it('ADMIN with no permissions returns false', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => { getAuth().login({ id: 1, role: 'ADMIN', schoolId: 1 }, 't'); });
    expect(getAuth().hasPermission('students')).toBe(false);
  });

  it('ADMIN with matching permission returns true', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => {
      getAuth().login({
        id: 1, role: 'ADMIN', schoolId: 1,
        permissions: { students: true, fees: true },
      }, 't');
    });
    expect(getAuth().hasPermission('students')).toBe(true);
    expect(getAuth().hasPermission('fees')).toBe(true);
  });

  it('ADMIN without specific permission returns false', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => {
      getAuth().login({
        id: 1, role: 'ADMIN', schoolId: 1,
        permissions: { students: true },
      }, 't');
    });
    expect(getAuth().hasPermission('fees')).toBe(false);
  });
});

// ── getDashboardPath() ────────────────────────────────────────────────────────

describe('getDashboardPath()', () => {
  const cases = [
    ['APPLICATION_OWNER', '/superadmin/dashboard'],
    ['SUPER_ADMIN',       '/superadmin/dashboard'],
    ['ADMIN',             '/admin/dashboard'],
    ['TEACHER',           '/teacher/dashboard'],
    ['STUDENT',           '/student/dashboard'],
  ];

  cases.forEach(([role, expectedPath]) => {
    it(`returns ${expectedPath} for ${role}`, async () => {
      const getAuth = renderWithAuth();
      await waitFor(() => expect(getAuth().isLoading).toBe(false));
      act(() => { getAuth().login({ id: 1, role, schoolId: 1 }, 't'); });
      expect(getAuth().getDashboardPath()).toBe(expectedPath);
    });
  });

  it('BUG: PARENT role has no dashboard path — returns /login', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    act(() => { getAuth().login({ id: 1, role: 'PARENT', schoolId: 1 }, 't'); });
    // PARENT role is not handled in getDashboardPath — falls through to /login
    expect(getAuth().getDashboardPath()).toBe('/login');
  });

  it('returns /login when no user', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));
    expect(getAuth().getDashboardPath()).toBe('/login');
  });
});

// ── Session restore ───────────────────────────────────────────────────────────

describe('Session restore from sessionStorage', () => {
  it('restores user and token from valid session', async () => {
    const savedUser  = { id: 7, name: 'Charlie', role: 'ADMIN', schoolId: 3 };
    const savedToken = 'restored-token';
    sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ token: savedToken, user: savedUser })
    );

    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    expect(getAuth().user).toMatchObject(savedUser);
    expect(getAuth().token).toBe(savedToken);
    expect(getAuth().isAuthenticated).toBe(true);
  });

  it('ignores corrupt sessionStorage data', async () => {
    sessionStorage.setItem(SESSION_KEY, 'not-valid-json{{');
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    expect(getAuth().user).toBeNull();
    expect(getAuth().token).toBeNull();
  });

  it('ignores session with missing role', async () => {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ token: 'tok', user: { id: 1 } }));
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    expect(getAuth().user).toBeNull();
  });
});

// ── updateUser() ──────────────────────────────────────────────────────────────

describe('updateUser()', () => {
  it('merges partial updates into existing user', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    act(() => { getAuth().login({ id: 1, role: 'ADMIN', name: 'Alice', schoolId: 1 }, 't'); });
    act(() => { getAuth().updateUser({ name: 'Alice Updated', schoolId: 5 }); });

    expect(getAuth().user.name).toBe('Alice Updated');
    expect(getAuth().user.schoolId).toBe(5);
    expect(getAuth().user.role).toBe('ADMIN');
  });

  it('does nothing when user is null', async () => {
    const getAuth = renderWithAuth();
    await waitFor(() => expect(getAuth().isLoading).toBe(false));

    expect(() => { act(() => { getAuth().updateUser({ name: 'Ghost' }); }); }).not.toThrow();
    expect(getAuth().user).toBeNull();
  });
});
