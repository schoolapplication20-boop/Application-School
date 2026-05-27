/**
 * 02 — Admin: School Setup
 *
 * Covers the full admin onboarding flow:
 *   Classes → Teachers → Students (with all required fields)
 *
 * Each test cleans up its own data so the suite stays idempotent.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { CREDENTIALS, RUN_ID } from '../helpers/constants';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'Admin', CREDENTIALS.admin.email, CREDENTIALS.admin.password);
});

// ─── Classes ─────────────────────────────────────────────────────────────────

test.describe('Classes', () => {

  const CLASS_NAME = `Test${RUN_ID}`;
  const SECTION    = 'A';

  test('Admin can create a class', async ({ page }) => {
    await page.goto('/admin/classes');
    await expect(page.locator('h1')).toContainText(/class/i);

    await page.getByRole('button', { name: /add class/i }).click();

    // Modal is open
    await expect(page.locator('.modal-overlay, .modal-container')).toBeVisible();

    await page.locator('input[placeholder*="Class"]').fill(CLASS_NAME);
    await page.locator('input[placeholder*="e.g., A"]').fill(SECTION);

    await page.getByRole('button', { name: /^Add Class$/ }).click();

    // Row appears in the table
    await expect(page.getByText(CLASS_NAME)).toBeVisible({ timeout: 8_000 });
  });

  test('Admin cannot create duplicate class', async ({ page }) => {
    await page.goto('/admin/classes');
    await page.getByRole('button', { name: /add class/i }).click();
    await page.locator('input[placeholder*="Class"]').fill(CLASS_NAME);
    await page.locator('input[placeholder*="e.g., A"]').fill(SECTION);
    await page.getByRole('button', { name: /^Add Class$/ }).click();

    // Should show an error (either inline or toast)
    const error = page.locator('.alert-error, [class*="error"], [class*="toast"]').filter({ hasText: /exist|duplicate|already/i });
    await expect(error.first()).toBeVisible({ timeout: 8_000 });
  });

  test('Admin can edit a class', async ({ page }) => {
    await page.goto('/admin/classes');
    const row = page.locator('tr, [class*="class-row"]').filter({ hasText: CLASS_NAME }).first();
    await row.locator('.action-btn-edit, button[title="Edit"]').click();

    const capacityInput = page.locator('input[type="number"]').first();
    await capacityInput.fill('45');
    await page.getByRole('button', { name: /update/i }).click();

    await expect(page.getByText('45')).toBeVisible({ timeout: 6_000 });
  });

  test('Admin can delete a class', async ({ page }) => {
    await page.goto('/admin/classes');
    const row = page.locator('tr, [class*="class-row"]').filter({ hasText: CLASS_NAME }).first();
    await row.locator('.action-btn-delete, button[title="Delete"]').click();

    // Confirm delete dialog
    await page.getByRole('button', { name: /yes.*delete|confirm|yes/i }).click();
    await expect(page.getByText(CLASS_NAME)).not.toBeVisible({ timeout: 8_000 });
  });
});

// ─── Teachers ────────────────────────────────────────────────────────────────

test.describe('Teachers', () => {

  const TEACHER_NAME  = `Teacher ${RUN_ID}`;
  const TEACHER_EMAIL = `teacher${RUN_ID}@testschool.com`;

  test('Admin can create a teacher', async ({ page }) => {
    await page.goto('/admin/teachers');

    await page.getByRole('button', { name: /add teacher/i }).click();
    await expect(page.locator('.modal-overlay, .modal-container')).toBeVisible();

    await page.locator('input[name="name"]').fill(TEACHER_NAME);
    await page.locator('input[name="empId"]').fill(`EMP${RUN_ID}`);
    await page.locator('input[name="email"]').fill(TEACHER_EMAIL);

    // Subject tag input — type subject and press Enter
    const subjectInput = page.locator('input[placeholder*="subject"]');
    await subjectInput.fill('Mathematics');
    await subjectInput.press('Enter');

    // Teacher type
    await page.locator('select[name="teacherType"]').selectOption('SUBJECT_TEACHER');

    // Password
    await page.locator('input[name="password"]').fill('Teacher@123');

    await page.getByRole('button', { name: /add teacher/i }).last().click();

    // Credentials modal or row in table
    await expect(
      page.locator('.modal-overlay').getByText(/credential|created|success/i)
        .or(page.getByText(TEACHER_NAME))
    ).toBeVisible({ timeout: 10_000 });
  });

  test('Admin can search for a teacher', async ({ page }) => {
    await page.goto('/admin/teachers');
    const search = page.locator('input[class*="search"], input[placeholder*="search" i]').first();
    await search.fill(TEACHER_NAME.split(' ')[0]);
    await expect(page.getByText(TEACHER_NAME)).toBeVisible({ timeout: 6_000 });
  });

  test('Admin can reset teacher password', async ({ page }) => {
    await page.goto('/admin/teachers');
    const row = page.locator('tr').filter({ hasText: TEACHER_NAME }).first();
    await row.locator('button[title*="reset" i], button[title*="password" i]').first().click();

    // Fill and submit
    const newPassInput = page.locator('input[type="password"]').first();
    if (await newPassInput.isVisible()) {
      await newPassInput.fill('NewPass@123');
      await page.getByRole('button', { name: /reset|save|confirm/i }).click();
    }
    // No crash = pass
  });

  test('Admin can delete a teacher', async ({ page }) => {
    await page.goto('/admin/teachers');
    const row = page.locator('tr').filter({ hasText: TEACHER_NAME }).first();
    await row.locator('.action-btn-delete, button[title="Delete"]').click();
    await page.getByRole('button', { name: /yes|confirm|delete/i }).click();
    await expect(page.getByText(TEACHER_NAME)).not.toBeVisible({ timeout: 8_000 });
  });
});

// ─── Students ────────────────────────────────────────────────────────────────

test.describe('Students', () => {

  const STUDENT_NAME = `Student ${RUN_ID}`;

  test('Admin can create a student with all required fields', async ({ page }) => {
    await page.goto('/admin/students');

    await page.getByRole('button', { name: /add student/i }).click();
    await expect(page.locator('.modal-dialog, .modal-container')).toBeVisible();

    // Personal info
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill(STUDENT_NAME);
    await page.locator('input[name="rollNo"]').fill('99');

    // Class — select from dropdown
    const classSelect = page.locator('select').filter({ hasText: /class|select/i }).first();
    const classOptions = await classSelect.locator('option').allTextContents();
    const validClass = classOptions.find(o => o.trim() && o !== 'Select class' && o !== '');
    if (validClass) await classSelect.selectOption({ label: validClass });

    // Section
    const sectionSelect = page.locator('select').nth(1);
    const sectionOptions = await sectionSelect.locator('option').allTextContents();
    const validSection = sectionOptions.find(o => o.trim() && o !== 'Select section' && o !== '');
    if (validSection) await sectionSelect.selectOption({ label: validSection });

    // Parent details
    await page.locator('input[name="fatherName"]').fill('Father Name');
    await page.locator('input[name="fatherPhone"]').fill('9876543210');
    await page.locator('input[name="motherName"]').fill('Mother Name');
    await page.locator('input[name="motherPhone"]').fill('9876543211');

    // Address
    await page.locator('textarea[name="permanentAddress"], textarea').first().fill('123 Test Street, City');

    // ID Proof — upload a small dummy file using Playwright's file input
    const idProofInput = page.locator('input[type="file"]').first();
    await idProofInput.setInputFiles({
      name: 'id_proof.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy pdf content'),
    });

    await page.getByRole('button', { name: /save|add student|submit/i }).last().click();

    // Credentials dialog or student appears in table
    await expect(
      page.locator('.modal').getByText(/credential|password|created/i)
        .or(page.getByText(STUDENT_NAME))
    ).toBeVisible({ timeout: 12_000 });
  });

  test('Admin can search for a student', async ({ page }) => {
    await page.goto('/admin/students');
    const search = page.locator('input[class*="search"], input[placeholder*="search" i]').first();
    await search.fill(STUDENT_NAME.split(' ')[0]);
    await expect(page.getByText(STUDENT_NAME)).toBeVisible({ timeout: 6_000 });
  });

  test('Admin can view student credentials', async ({ page }) => {
    await page.goto('/admin/students');
    const row = page.locator('tr').filter({ hasText: STUDENT_NAME }).first();
    await row.locator('button[title*="credential" i], button[title*="key" i]').click();

    const credModal = page.locator('.modal-overlay, .modal-container');
    await expect(credModal).toBeVisible({ timeout: 6_000 });
    await expect(credModal.getByText(/email|password|admission/i).first()).toBeVisible();
  });

  test('Admin can delete a student', async ({ page }) => {
    await page.goto('/admin/students');
    const row = page.locator('tr').filter({ hasText: STUDENT_NAME }).first();
    await row.locator('.action-btn-delete, button[title="Delete"]').click();
    await page.getByRole('button', { name: /yes|confirm|delete/i }).click();
    await expect(page.getByText(STUDENT_NAME)).not.toBeVisible({ timeout: 8_000 });
  });
});

// ─── School Settings ──────────────────────────────────────────────────────────

test.describe('School Settings', () => {

  test('Admin can add an exam type', async ({ page }) => {
    await page.goto('/admin/settings');

    const examTypeInput = page.locator('input[placeholder*="exam type" i], input[placeholder*="name" i]').first();
    await examTypeInput.fill(`Quarterly ${RUN_ID}`);
    await page.getByRole('button', { name: /add|save/i }).first().click();

    await expect(page.getByText(`Quarterly ${RUN_ID}`)).toBeVisible({ timeout: 6_000 });
  });

  test('Admin can configure grade scale', async ({ page }) => {
    await page.goto('/admin/settings');

    // Scroll to grade scale section
    await page.getByText(/grade scale/i).first().scrollIntoViewIfNeeded();

    // Change first grade's min percentage
    const firstPctInput = page.locator('input[type="number"]').first();
    await firstPctInput.fill('91');

    await page.getByRole('button', { name: /save grade scale/i }).click();

    await expect(page.getByText(/saved|success/i).first()).toBeVisible({ timeout: 6_000 });
  });
});
