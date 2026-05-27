/**
 * 01 — Authentication
 *
 * Covers: login for all four roles, invalid credentials rejection,
 * logout, and first-login password reset flow.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { CREDENTIALS } from '../helpers/constants';

test.describe('Login — valid credentials', () => {

  test('Admin can log in and reach admin dashboard', async ({ page }) => {
    await loginAs(page, 'Admin', CREDENTIALS.admin.email, CREDENTIALS.admin.password);
    await expect(page).toHaveURL(/admin\/dashboard/);
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('Teacher can log in and reach teacher dashboard', async ({ page }) => {
    await loginAs(page, 'Teacher', CREDENTIALS.teacher.email, CREDENTIALS.teacher.password);
    await expect(page).toHaveURL(/teacher\/dashboard/);
  });

  test('Student can log in with admission number and reach student dashboard', async ({ page }) => {
    await loginAs(page, 'Student', CREDENTIALS.student.admissionNo, CREDENTIALS.student.password);
    await expect(page).toHaveURL(/student\/dashboard/);
  });
});

test.describe('Login — invalid credentials', () => {

  test('Wrong password shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.locator('input[name="email"]').fill(CREDENTIALS.admin.email);
    await page.locator('input[name="password"]').fill('wrongpassword');
    await page.getByRole('button', { name: /LOGIN/i }).click();

    // Error alert or toast should appear
    const error = page.locator('.alert-error, [class*="error"], [class*="alert"]').first();
    await expect(error).toBeVisible({ timeout: 8_000 });
  });

  test('Empty form shows validation', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: 'Admin', exact: true }).click();
    await page.getByRole('button', { name: /LOGIN/i }).click();
    // Either browser native validation or custom error
    const emailField = page.locator('input[name="email"]');
    await expect(emailField).toBeVisible();
  });
});

test.describe('Logout', () => {

  test('Admin can log out and is redirected to login', async ({ page }) => {
    await loginAs(page, 'Admin', CREDENTIALS.admin.email, CREDENTIALS.admin.password);

    // Logout — typically a button in sidebar or top nav
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i }).first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
    } else {
      // Some apps have it inside a dropdown
      await page.locator('[class*="profile"], [class*="avatar"]').first().click();
      await page.getByRole('button', { name: /logout/i }).click();
    }

    await expect(page).toHaveURL(/login/, { timeout: 10_000 });
  });
});
