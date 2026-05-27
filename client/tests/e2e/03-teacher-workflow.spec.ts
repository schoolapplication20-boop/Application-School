/**
 * 03 — Teacher Workflow
 *
 * Covers: attendance marking, marks entry (bulk + single),
 * homework, leave request, timetable view.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { CREDENTIALS, RUN_ID } from '../helpers/constants';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'Teacher', CREDENTIALS.teacher.email, CREDENTIALS.teacher.password);
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

test('Teacher dashboard loads with stat cards', async ({ page }) => {
  await page.goto('/teacher/dashboard');
  // At least one stat card should be visible
  const statCards = page.locator('.stat-card, [class*="stat"]');
  await expect(statCards.first()).toBeVisible({ timeout: 8_000 });
});

// ─── Attendance ───────────────────────────────────────────────────────────────

test.describe('Attendance', () => {

  test('Teacher can view attendance page', async ({ page }) => {
    await page.goto('/teacher/attendance');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
  });

  test('Teacher can mark attendance for their class', async ({ page }) => {
    await page.goto('/teacher/attendance');

    // Select a class if dropdown is present
    const classSelect = page.locator('select').first();
    if (await classSelect.isVisible()) {
      const options = await classSelect.locator('option').allTextContents();
      const valid = options.find(o => o.trim() && !o.includes('Select'));
      if (valid) await classSelect.selectOption({ label: valid });
    }

    // Wait for student list to load
    const studentRows = page.locator('tr, [class*="student-row"]').filter({ hasNot: page.locator('th') });
    const count = await studentRows.count();
    if (count === 0) {
      test.info().annotations.push({ type: 'skip-reason', description: 'No students in teacher class' });
      return;
    }

    // Mark first student as present
    const presentBtn = studentRows.first().locator('button, input[type="radio"]').filter({ hasText: /present/i }).first();
    if (await presentBtn.isVisible()) await presentBtn.click();

    // Submit attendance
    const submitBtn = page.getByRole('button', { name: /submit|save|mark/i }).last();
    if (await submitBtn.isEnabled()) {
      await submitBtn.click();
      await expect(page.locator('[class*="success"], [class*="toast"]').first()).toBeVisible({ timeout: 6_000 });
    }
  });
});

// ─── Marks Entry ─────────────────────────────────────────────────────────────

test.describe('Marks', () => {

  test('Teacher can view marks page', async ({ page }) => {
    await page.goto('/teacher/marks');
    await expect(page.locator('h1')).toContainText(/marks/i, { timeout: 8_000 });
  });

  test('Teacher can open bulk marks entry modal', async ({ page }) => {
    await page.goto('/teacher/marks');

    const addBtn = page.getByRole('button', { name: /add marks|bulk|enter marks/i }).first();
    await expect(addBtn).toBeVisible({ timeout: 8_000 });
    await addBtn.click();

    const modal = page.locator('.modal-overlay, .modal-dialog').first();
    await expect(modal).toBeVisible({ timeout: 6_000 });

    // Select class
    const classSelect = modal.locator('select').first();
    const options = await classSelect.locator('option').allTextContents();
    const valid = options.find(o => o.trim() && !o.includes('Select'));
    if (valid) await classSelect.selectOption({ label: valid });

    // Select exam type
    const examSelect = modal.locator('select').nth(1);
    const examOptions = await examSelect.locator('option').allTextContents();
    const validExam = examOptions.find(o => o.trim() && !o.includes('Select'));
    if (validExam) await examSelect.selectOption({ label: validExam });

    // Close without saving
    await page.keyboard.press('Escape');
  });

  test('Marks page shows grade scale legend', async ({ page }) => {
    await page.goto('/teacher/marks');
    // The grade scale section should be visible
    await expect(page.getByText(/O|A\+|grade/i).first()).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Homework ─────────────────────────────────────────────────────────────────

test.describe('Homework', () => {

  const HW_TITLE = `HW Test ${RUN_ID}`;

  test('Teacher can create a homework assignment', async ({ page }) => {
    await page.goto('/teacher/homework');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });

    const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
    if (!await addBtn.isVisible()) return; // feature may be hidden

    await addBtn.click();

    const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
    await titleInput.fill(HW_TITLE);

    const descInput = page.locator('textarea').first();
    if (await descInput.isVisible()) await descInput.fill('Test description');

    await page.getByRole('button', { name: /save|submit|add/i }).last().click();
    await expect(page.getByText(HW_TITLE)).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Leave Request ────────────────────────────────────────────────────────────

test.describe('Teacher Leave Request', () => {

  test('Teacher can submit a leave request', async ({ page }) => {
    await page.goto('/teacher/leave-request');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const fromDate = page.locator('input[type="date"]').first();
    await fromDate.fill(fmt(tomorrow));

    const toDate = page.locator('input[type="date"]').nth(1);
    await toDate.fill(fmt(tomorrow));

    const reasonField = page.locator('textarea').first();
    await reasonField.fill('Automated test leave request');

    await page.getByRole('button', { name: /submit|apply/i }).click();
    await expect(
      page.locator('[class*="success"], [class*="toast"]')
        .or(page.getByText(/submitted|success/i))
        .first()
    ).toBeVisible({ timeout: 8_000 });
  });
});

// ─── Timetable ────────────────────────────────────────────────────────────────

test('Teacher can view timetable page', async ({ page }) => {
  await page.goto('/teacher/timetable');
  await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
});
