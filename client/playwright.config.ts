import { defineConfig, devices } from '@playwright/test';

/**
 * Set PLAYWRIGHT_BASE_URL to point at a running frontend (default: local Vite dev server).
 * Set PLAYWRIGHT_API_URL to point at the backend (default: local Spring Boot).
 *
 * For production smoke tests:
 *   PLAYWRIGHT_BASE_URL=https://myskoolz.vercel.app
 *   PLAYWRIGHT_API_URL=https://myskoolz.onrender.com
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,       // run sequentially so setup flows don't race
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'tests/playwright-report', open: 'never' }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
