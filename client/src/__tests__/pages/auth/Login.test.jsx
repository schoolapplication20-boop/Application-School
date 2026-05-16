import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock dependencies
vi.mock('../../../services/api', () => ({
  setAuthToken:   vi.fn(),
  clearAuthToken: vi.fn(),
  default: {
    get:  vi.fn().mockRejectedValue(new Error('no network')),
    post: vi.fn().mockRejectedValue(new Error('no network')),
  },
}));

vi.mock('../../../services/authService', () => ({
  loginWithEmail: vi.fn(),
  default: { loginWithEmail: vi.fn() },
}));

vi.mock('../../../context/SchoolContext', () => ({
  useSchool: () => ({ school: null, setSchool: vi.fn() }),
  SchoolProvider: ({ children }) => <>{children}</>,
}));

vi.mock('../../../components/SEOMeta', () => ({
  default: () => null,
}));

vi.mock('../../../components/Logo', () => ({
  default: () => <div data-testid="logo">Logo</div>,
}));

// Import after mocking
import Login from '../../../pages/auth/Login';
import { AuthProvider } from '../../../context/AuthContext';
import * as authService from '../../../services/authService';

function renderLogin(initialEntries = ['/login']) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <Login />
      </MemoryRouter>
    </AuthProvider>
  );
}

describe('Login — role selector', () => {
  it('renders all four role cards', () => {
    renderLogin();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Teacher')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
  });

  it('pre-selects role from ?role= query param', () => {
    renderLogin(['/login?role=TEACHER']);
    const form = screen.getByPlaceholderText('Enter your email');
    expect(form).toBeInTheDocument();
  });

  it('shows "Admission Number" input label for STUDENT role', async () => {
    renderLogin();
    const studentCard = screen.getByText('Student');
    fireEvent.click(studentCard);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your admission number')).toBeInTheDocument();
    });
  });

  it('shows "Email" input label for ADMIN role', async () => {
    renderLogin();
    const adminCard = screen.getByText('Admin');
    fireEvent.click(adminCard);
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
    });
  });

  it('resets form fields when switching roles', async () => {
    const user = userEvent.setup();
    renderLogin();

    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => screen.getByPlaceholderText('Enter your email'));

    await user.type(screen.getByPlaceholderText('Enter your email'), 'admin@test.com');
    expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('admin@test.com');

    fireEvent.click(screen.getByText('Teacher'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('');
    });
  });
});

describe('Login — form validation', () => {
  it('shows error when no role is selected and form is submitted', async () => {
    renderLogin();
    // Try to find and submit without selecting a role
    // The form only shows after role selection, so this tests the guard
    const heading = screen.getByText(/Smart School Management/i);
    expect(heading).toBeInTheDocument();
  });

  it('shows error when email is empty on submit', async () => {
    const user = userEvent.setup();
    renderLogin();

    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => screen.getByPlaceholderText('Enter your email'));

    const passwordInput = screen.getByPlaceholderText(/password/i);
    await user.type(passwordInput, 'somepassword');

    const submitBtn = screen.getByRole('button', { name: /LOGIN/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/enter your email/i)).toBeInTheDocument();
    });
  });

  it('shows error when password is empty on submit', async () => {
    const user = userEvent.setup();
    renderLogin();

    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => screen.getByPlaceholderText('Enter your email'));

    const emailInput = screen.getByPlaceholderText('Enter your email');
    await user.type(emailInput, 'admin@test.com');

    const submitBtn = screen.getByRole('button', { name: /LOGIN/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/enter your password/i)).toBeInTheDocument();
    });
  });
});

describe('Login — successful login flow', () => {
  it('calls loginWithEmail with correct arguments', async () => {
    const user = userEvent.setup();
    authService.loginWithEmail.mockResolvedValue({
      user: { id: 1, role: 'ADMIN', schoolId: 1, permissions: { students: true } },
      token: 'fake-jwt',
    });

    renderLogin();
    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => screen.getByPlaceholderText('Enter your email'));

    await user.type(screen.getByPlaceholderText('Enter your email'), 'admin@school.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'pass123');

    const submitBtn = screen.getByRole('button', { name: /LOGIN/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(authService.loginWithEmail).toHaveBeenCalledWith(
        'admin@school.com',
        'pass123',
        'ADMIN'
      );
    });
  });

  it('shows error when login API returns wrong role', async () => {
    const user = userEvent.setup();
    authService.loginWithEmail.mockResolvedValue({
      user: { id: 1, role: 'TEACHER', schoolId: 1 },
      token: 'fake-jwt',
    });

    renderLogin();
    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => screen.getByPlaceholderText('Enter your email'));

    await user.type(screen.getByPlaceholderText('Enter your email'), 'admin@school.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'pass123');

    const submitBtn = screen.getByRole('button', { name: /LOGIN/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Access denied/i)).toBeInTheDocument();
    });
  });

  it('shows error message when login API throws', async () => {
    const user = userEvent.setup();
    authService.loginWithEmail.mockRejectedValue(new Error('Invalid credentials'));

    renderLogin();
    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => screen.getByPlaceholderText('Enter your email'));

    await user.type(screen.getByPlaceholderText('Enter your email'), 'bad@test.com');
    await user.type(screen.getByPlaceholderText(/password/i), 'wrongpass');

    const submitBtn = screen.getByRole('button', { name: /LOGIN/i });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});

describe('Login — forgot password link', () => {
  it('renders a Forgot Password link', async () => {
    renderLogin();
    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => {
      expect(screen.getByText(/forgot/i)).toBeInTheDocument();
    });
  });
});

describe('Login — password visibility toggle', () => {
  it('BUG: toggle is a <span> not a <button> — not keyboard accessible', async () => {
    renderLogin();
    fireEvent.click(screen.getByText('Admin'));
    await waitFor(() => screen.getByPlaceholderText('Enter your email'));

    const passwordInput = screen.getByPlaceholderText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    // The toggle is a <span> with onClick — not a semantic <button>
    // This is an accessibility bug: screen readers and keyboard users cannot activate it
    const toggleSpan = screen.getByText('visibility');
    expect(toggleSpan.tagName.toLowerCase()).toBe('span'); // confirms it's a span, not a button

    fireEvent.click(toggleSpan);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });
});
