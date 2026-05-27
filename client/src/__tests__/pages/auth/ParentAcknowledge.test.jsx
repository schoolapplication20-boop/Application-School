import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
}));

import axios from 'axios';
import ParentAcknowledge from '../../../pages/auth/ParentAcknowledge.jsx';

function renderWithToken(token) {
  const search = token ? `?token=${token}` : '';
  return render(
    <MemoryRouter initialEntries={[`/leave/parent-ack${search}`]}>
      <Routes>
        <Route path="/leave/parent-ack" element={<ParentAcknowledge />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ParentAcknowledge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    axios.get.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithToken('abc123');
    expect(screen.getByText(/processing/i)).toBeInTheDocument();
  });

  it('shows Invalid Link when no token in URL', async () => {
    renderWithToken(null);
    await waitFor(() => {
      expect(screen.getByText(/invalid link/i)).toBeInTheDocument();
    });
  });

  it('shows success state with student name and dates after valid token', async () => {
    axios.get.mockResolvedValueOnce({
      data: { studentName: 'John Doe', fromDate: '2026-06-01', toDate: '2026-06-03' },
    });
    renderWithToken('valid-token');
    await waitFor(() => {
      expect(screen.getByText(/leave acknowledged/i)).toBeInTheDocument();
      expect(screen.getByText(/john doe/i)).toBeInTheDocument();
      expect(screen.getByText(/2026-06-01/)).toBeInTheDocument();
    });
  });

  it('shows Already Acknowledged when API returns already-acknowledged message', async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { message: 'Already acknowledged.' } },
    });
    renderWithToken('used-token');
    await waitFor(() => {
      expect(screen.getByText(/already acknowledged/i)).toBeInTheDocument();
    });
  });

  it('shows error state on generic API failure', async () => {
    axios.get.mockRejectedValueOnce({
      response: { data: { message: 'Server error' } },
    });
    renderWithToken('bad-token');
    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});
