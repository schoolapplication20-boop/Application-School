import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// We re-import the component fresh each test so module-level state is reset
let InstallPrompt;

// Helper to reset module and re-import
async function loadComponent(overrides = {}) {
  vi.resetModules();
  // Patch navigator.userAgent for iOS detection
  if (overrides.userAgent !== undefined) {
    Object.defineProperty(navigator, 'userAgent', {
      writable: true,
      value: overrides.userAgent,
    });
  }
  // Patch matchMedia for standalone detection
  if (overrides.standalone !== undefined) {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query === '(display-mode: standalone)' ? overrides.standalone : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  }
  const mod = await import('../../components/InstallPrompt.jsx');
  InstallPrompt = mod.default;
}

const DISMISSED_KEY = 'myskoolz_install_dismissed';

describe('InstallPrompt — not shown when already standalone', () => {
  it('renders nothing in standalone mode', async () => {
    await loadComponent({ standalone: true });
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });
});

describe('InstallPrompt — not shown when dismissed', () => {
  it('renders nothing if sessionStorage has dismissed flag', async () => {
    await loadComponent({ standalone: false });
    sessionStorage.setItem(DISMISSED_KEY, '1');
    const { container } = render(<InstallPrompt />);
    expect(container.firstChild).toBeNull();
  });
});

describe('InstallPrompt — iOS instructions', () => {
  it('shows iOS share instructions on iPhone Safari', async () => {
    await loadComponent({
      standalone: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    render(<InstallPrompt />);
    await waitFor(() => {
      expect(screen.getByText(/Share/i)).toBeInTheDocument();
      expect(screen.getByText(/Add to Home Screen/i)).toBeInTheDocument();
    });
  });

  it('shows app title on iOS banner', async () => {
    await loadComponent({
      standalone: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    render(<InstallPrompt />);
    await waitFor(() => {
      expect(screen.getByText('Install My-Skoolz')).toBeInTheDocument();
    });
  });
});

describe('InstallPrompt — Android install prompt', () => {
  it('shows Install button after beforeinstallprompt fires', async () => {
    await loadComponent({ standalone: false, userAgent: 'Android Chrome' });
    render(<InstallPrompt />);

    const mockPrompt = {
      preventDefault: vi.fn(),
      prompt: vi.fn().mockResolvedValue(undefined),
      userChoice: Promise.resolve({ outcome: 'accepted' }),
    };

    await waitFor(() => {
      fireEvent(window, new CustomEvent('beforeinstallprompt'));
    });

    // Dispatch the real event with the mock prompt
    const event = new Event('beforeinstallprompt');
    Object.assign(event, mockPrompt);
    await waitFor(() => fireEvent(window, event));

    await waitFor(() => {
      expect(screen.queryByText('Install')).toBeInTheDocument();
    });
  });
});

describe('InstallPrompt — dismiss button', () => {
  it('hides the banner on iOS when ✕ is clicked', async () => {
    await loadComponent({
      standalone: false,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
    });
    const { container } = render(<InstallPrompt />);

    await waitFor(() => {
      expect(screen.getByText('Install My-Skoolz')).toBeInTheDocument();
    });

    const closeBtn = screen.getByText('✕');
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
    expect(sessionStorage.getItem(DISMISSED_KEY)).toBe('1');
  });
});
