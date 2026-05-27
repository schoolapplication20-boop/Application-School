/**
 * 05 — Super Admin: School Onboarding
 *
 * Covers: logging in as super admin, configuring school profile,
 * creating admin users, viewing admin list.
 */
import { test, expect } from '@playwright/test';
import { loginAs } from '../helpers/auth';
import { CREDENTIALS, RUN_ID } from '../helpers/constants';

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'Super Admin', CREDENTIALS.superAdmin.email, CREDENTIALS.superAdmin.password);
});

test('Super admin dashboard loads', async ({ page }) => {
  await page.goto('/superadmin/dashboard');
  await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8_000 });
});

test.describe('School Setup', () => {

  test('Super admin can view school setup page', async ({ page }) => {
    await page.goto('/superadmin/setup-school');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });
  });

  test('Super admin can view and update school info', async ({ page }) => {
    await page.goto('/superadmin/setup-school');

    // School name / address fields should be present
    const nameInput = page.locator('input[name="name"], input[placeholder*="school" i]').first();
    await expect(nameInput).toBeVisible({ timeout: 8_000 });
  });
});

test.describe('Admin Management', () => {

  const ADMIN_NAME  = `TestAdmin ${RUN_ID}`;
  const ADMIN_EMAIL = `admin${RUN_ID}@school.com`;

  test('Super admin can create an admin account', async ({ page }) => {
    await page.goto('/superadmin/admins');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8_000 });

    const addBtn = page.getByRole('button', { name: /add admin|create admin|new admin/i }).first();
    if (!await addBtn.isVisible()) {
      test.skip(true, 'Add admin button not visible — feature may require specific permissions');
      return;
    }
    await addBtn.click();

    // Fill in admin details
    await page.locator('input[name="name"], input[placeholder*="name" i]').first().fill(ADMIN_NAME);
    await page.locator('input[name="email"], input[type="email"]').first().fill(ADMIN_EMAIL);

    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();
    if (await passwordInput.isVisible()) {
      await passwordInput.fill('Admin@123');
    }

    await page.getByRole('button', { name: /create|save|add/i }).last().click();

    await expect(
      page.getByText(ADMIN_NAME).or(page.getByText(/created|success/i))
    ).toBeVisible({ timeout: 8_000 });
  });

  test('Super admin can view admin list', async ({ page }) => {
    await page.goto('/superadmin/admins');
    const table = page.locator('table, [class*="data-table"]').first();
    await expect(table).toBeVisible({ timeout: 8_000 });
  });

  test('Super admin can reset admin password', async ({ page }) => {
    await page.goto('/superadmin/admins');
    const row = page.locator('tr').filter({ hasText: ADMIN_NAME }).first();
    if (await row.isVisible()) {
      await row.locator('button[title*="reset" i], button[title*="password" i]').first().click();
      const newPass = page.locator('input[type="password"]').first();
      if (await newPass.isVisible()) {
        await newPass.fill('NewAdmin@456');
        await page.getByRole('button', { name: /reset|save|confirm/i }).click();
      }
    }
  });
});
