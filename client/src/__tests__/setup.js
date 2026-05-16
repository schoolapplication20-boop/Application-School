import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia (not available in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock navigator.serviceWorker
Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: {
    register: vi.fn().mockResolvedValue({ scope: '/' }),
    ready: Promise.resolve({ scope: '/' }),
  },
});

// Mock navigator.standalone (iOS PWA check)
Object.defineProperty(navigator, 'standalone', {
  writable: true,
  value: undefined,
});

// Silence console.error for expected React warnings in tests
const originalError = console.error;
beforeEach(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOM.render'))
    ) return;
    originalError(...args);
  };
});

afterEach(() => {
  console.error = originalError;
  vi.restoreAllMocks();
  sessionStorage.clear();
  localStorage.clear();
});
