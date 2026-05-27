import { Page, expect } from '@playwright/test';

type Role = 'Super Admin' | 'Admin' | 'Teacher' | 'Student';

/**
 * Log in through the main /login page.
 * Selects the role tab first, then fills credentials.
 */
export async function loginAs(
  page: Page,
  role: Role,
  emailOrAdmission: string,
  password: string,
) {
  await page.goto('/login');

  // Click the role tab (Super Admin / Admin / Teacher / Student)
  await page.getByRole('button', { name: role, exact: true }).click();

  // Fill credentials
  const emailField = page.locator('input[name="email"]');
  await emailField.waitFor({ state: 'visible' });
  await emailField.fill(emailOrAdmission);
  await page.locator('input[name="password"]').fill(password);

  // Submit and wait for redirect to a dashboard
  await page.getByRole('button', { name: /LOGIN/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
}

/**
 * Log in as Application Owner through /owner-login.
 */
export async function loginAsOwner(page: Page, email: string, password: string) {
  await page.goto('/owner-login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole('button', { name: /LOGIN/i }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 20_000 });
}

/** Wait for a toast/alert with the given text (success or error feedback). */
export async function expectToast(page: Page, text: string | RegExp) {
  const toast = page.locator('.toast, [class*="toast"], [class*="alert"]').filter({ hasText: text });
  await expect(toast.first()).toBeVisible({ timeout: 8_000 });
}
