/**
 * 04 — Student Workflow
 *
 * Covers: dashboard stats, marks view, report card, attendance,
 * leave request, fees view, school calendar.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { CREDENTIALS } from '../helpers/constants';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'Student', CREDENTIALS.student.admissionNo, CREDENTIALS.student.password);
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

test('Student dashboard loads stat cards and quick links', async ({ page }) => {
  await page.goto('/student/dashboard');

  // Stat cards
  await expect(page.locator('.stat-card').first()).toBeVisible({ timeout: 8_000 });

  // Quick access links
  await expect(page.getByText(/quick access/i)).toBeVisible({ timeout: 6_000 });
  await expect(page.getByText(/attendance/i).first()).toBeVisible();
});

test('Student dashboard shows grade badge', async ({ page }) => {
  await page.goto('/student/dashboard');
  // Overall grade badge (A+, B+, O, etc.) should be visible in info card
  await expect(page.locator('.child-info-card, [class*="info-card"]')).toBeVisible({ timeout: 8_000 });
});

// ─── Marks ────────────────────────────────────────────────────────────────────

test.describe('Student Marks', () => {

  test('Marks page loads with grade scale legend', async ({ page }) => {
    await page.goto('/student/marks');
    await expect(page.locator('h1')).toContainText(/marks/i, { timeout: 8_000 });

    // Grade scale legend should appear
    await expect(page.getByText(/grade scale/i)).toBeVisible({ timeout: 8_000 });
  });

  test('Student can switch between subject/exam/trend views', async ({ page }) => {
    await page.goto('/student/marks');

    // Tab buttons
    const tabs = page.locator('button').filter({ hasText: /subject|exam|trend/i });
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThan(0);

    if (tabCount >= 2) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveCSS('font-weight', /[6-9]00/); // active tab has bold weight
    }
  });

  test('Exam type filter chips are visible', async ({ page }) => {
    await page.goto('/student/marks');
    // Filter pills for All / Unit Test 1 etc.
    const filterArea = page.locator('button, span').filter({ hasText: /ALL|unit test|mid term/i }).first();
    await expect(filterArea).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Report Card ─────────────────────────────────────────────────────────────

test.describe('Report Card', () => {

  test('Report card page loads and shows exam dropdown', async ({ page }) => {
    await page.goto('/student/report-card');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });

    // Exam type dropdown should appear once filters load
    const dropdown = page.locator('select').first();
    await expect(dropdown).toBeVisible({ timeout: 10_000 });
  });

  test('Report card print button is present', async ({ page }) => {
    await page.goto('/student/report-card');
    const printBtn = page.getByRole('button', { name: /print/i });
    await expect(printBtn).toBeVisible({ timeout: 10_000 });
  });
});

// ─── Attendance ───────────────────────────────────────────────────────────────

test('Student can view their attendance calendar', async ({ page }) => {
  await page.goto('/student/attendance');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });

  // Calendar or stat cards should render
  const content = page.locator('.stat-card, [class*="calendar"], table').first();
  await expect(content).toBeVisible({ timeout: 8_000 });
});

// ─── Leave Request ────────────────────────────────────────────────────────────

test.describe('Student Leave Request', () => {

  test('Leave form is visible with required fields', async ({ page }) => {
    await page.goto('/student/leave');
    await expect(page.locator('h1, [class*="chart-card-title"]').first()).toBeVisible({ timeout: 8_000 });

    await expect(page.locator('select').first()).toBeVisible();         // leave type
    await expect(page.locator('input[type="date"]').first()).toBeVisible(); // from date
    await expect(page.locator('textarea').first()).toBeVisible();       // reason
  });

  test('Student cannot submit leave for a past date', async ({ page }) => {
    await page.goto('/student/leave');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    await page.locator('input[type="date"]').first().fill(fmt(yesterday));
    await page.locator('textarea').first().fill('Testing past date validation');
    await page.getByRole('button', { name: /submit/i }).click();

    // Should show validation error
    await expect(page.getByText(/past|cannot be in the past/i)).toBeVisible({ timeout: 6_000 });
  });

  test('Student can submit a valid future leave request', async ({ page }) => {
    await page.goto('/student/leave');

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    await page.locator('input[type="date"]').first().fill(fmt(nextWeek));
    await page.locator('input[type="date"]').nth(1).fill(fmt(nextWeek));
    await page.locator('textarea').first().fill('Automated E2E test leave');
    await page.getByRole('button', { name: /submit/i }).click();

    await expect(
      page.locator('[class*="success"]').or(page.getByText(/submitted|success/i)).first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Fees ─────────────────────────────────────────────────────────────────────

test('Student can view their fee summary', async ({ page }) => {
  await page.goto('/student/fees');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });

  // Fee amounts or "no fees" message should be visible
  const content = page.locator('[class*="fee"], [class*="amount"], table, p').first();
  await expect(content).toBeVisible({ timeout: 8_000 });
});

// ─── Calendar ────────────────────────────────────────────────────────────────

test('Student can view school calendar', async ({ page }) => {
  await page.goto('/school/calendar');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
});
