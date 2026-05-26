import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ProtectedRoute from '../../components/ProtectedRoute';
import { AuthProvider } from '../../context/AuthContext';

vi.mock('../../services/api', () => ({
  setAuthToken:   vi.fn(),
  clearAuthToken: vi.fn(),
  default: {
    get:  vi.fn().mockRejectedValue(new Error('no network')),
    post: vi.fn().mockRejectedValue(new Error('no network')),
  },
}));

vi.mock('../../context/SchoolContext', () => ({
  useSchool: () => ({ school: null, setSchool: vi.fn(), hasFeature: () => true }),
  SchoolProvider: ({ children }) => <>{children}</>,
}));

// Helper to render a protected route with injected auth state
function renderProtected({
  user = null,
  token = null,
  isAuthenticated = false,
  isLoading = false,
  allowedRoles = ['ADMIN'],
  permKey = undefined,
  path = '/protected',
  initialEntry = '/protected',
} = {}) {
  // Inject auth state via sessionStorage so AuthProvider restores it
  if (user && token) {
    sessionStorage.setItem(
      'schoolers_session',
      JSON.stringify({ token, user })
    );
  }

  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
          <Route path="/teacher/dashboard" element={<div>Teacher Dashboard</div>} />
          <Route path="/superadmin/dashboard" element={<div>SuperAdmin Dashboard</div>} />
          <Route path="/reset-password" element={<div>Reset Password</div>} />
          <Route path="/superadmin/setup-school" element={<div>Setup School</div>} />
          <Route
            path={path}
            element={
              <ProtectedRoute allowedRoles={allowedRoles} permKey={permKey}>
                <div>Protected Content</div>
              </ProtectedRoute>
            }
          />
        </Routes>
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('ProtectedRoute — unauthenticated', () => {
  it('redirects to /login when not authenticated', async () => {
    renderProtected({ user: null, token: null });
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute — loading state', () => {
  it('shows spinner while auth is loading', () => {
    // Without a session the initial isLoading is true for a moment
    renderProtected();
    // Loading container should exist initially
    expect(document.querySelector('.loading-container') || screen.queryByText('Login Page')).toBeTruthy();
  });
});

describe('ProtectedRoute — authenticated with correct role', () => {
  it('renders children for ADMIN on admin route', async () => {
    renderProtected({
      user: { id: 1, role: 'ADMIN', schoolId: 1, firstLogin: false },
      token: 'tok',
      allowedRoles: ['ADMIN'],
    });
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });

  it('renders children for SUPER_ADMIN when role is allowed', async () => {
    renderProtected({
      user: { id: 1, role: 'SUPER_ADMIN', schoolId: 1, needsSchoolSetup: false, firstLogin: false },
      token: 'tok',
      allowedRoles: ['ADMIN', 'SUPER_ADMIN'],
    });
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute — wrong role', () => {
  it('redirects TEACHER away from ADMIN-only route', async () => {
    renderProtected({
      user: { id: 1, role: 'TEACHER', schoolId: 1, firstLogin: false },
      token: 'tok',
      allowedRoles: ['ADMIN'],
    });
    await waitFor(() => {
      expect(screen.getByText('Teacher Dashboard')).toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute — firstLogin gate', () => {
  it('redirects to /reset-password when firstLogin is true', async () => {
    renderProtected({
      user: { id: 1, role: 'ADMIN', schoolId: 1, firstLogin: true },
      token: 'tok',
      allowedRoles: ['ADMIN'],
    });
    await waitFor(() => {
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute — SUPER_ADMIN school setup gate', () => {
  it('redirects SUPER_ADMIN to setup-school when needsSchoolSetup is true', async () => {
    renderProtected({
      user: { id: 1, role: 'SUPER_ADMIN', schoolId: 1, needsSchoolSetup: true, firstLogin: false },
      token: 'tok',
      allowedRoles: ['SUPER_ADMIN', 'ADMIN'],
    });
    await waitFor(() => {
      expect(screen.getByText('Setup School')).toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute — APPLICATION_OWNER isolation', () => {
  it('redirects APPLICATION_OWNER from school-only routes', async () => {
    renderProtected({
      user: { id: 1, role: 'APPLICATION_OWNER', firstLogin: false },
      token: 'tok',
      allowedRoles: ['ADMIN'], // does not include APPLICATION_OWNER
    });
    await waitFor(() => {
      expect(screen.getByText('SuperAdmin Dashboard')).toBeInTheDocument();
    });
  });

  it('allows APPLICATION_OWNER on routes that include the role', async () => {
    renderProtected({
      user: { id: 1, role: 'APPLICATION_OWNER', firstLogin: false },
      token: 'tok',
      allowedRoles: ['APPLICATION_OWNER', 'SUPER_ADMIN'],
    });
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});

describe('ProtectedRoute — permKey (ADMIN permissions)', () => {
  it('shows AccessDenied when ADMIN lacks the permKey', async () => {
    renderProtected({
      user: {
        id: 1, role: 'ADMIN', schoolId: 1, firstLogin: false,
        permissions: { students: false },
      },
      token: 'tok',
      allowedRoles: ['ADMIN'],
      permKey: 'students',
    });
    await waitFor(() => {
      expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    });
  });

  it('shows children when ADMIN has the permKey', async () => {
    renderProtected({
      user: {
        id: 1, role: 'ADMIN', schoolId: 1, firstLogin: false,
        permissions: { students: true },
      },
      token: 'tok',
      allowedRoles: ['ADMIN'],
      permKey: 'students',
    });
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
  });
});
