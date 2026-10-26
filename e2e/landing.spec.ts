import { test, expect } from '@playwright/test';

test.beforeEach(async ({ context }) => {
  await context.addInitScript(() => {
    localStorage.setItem('mopiq-language', 'en');
    localStorage.setItem('mopiq-analytics-consent', 'denied');
  });
});

test('a visitor can open signup from the main page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in', exact: true }).first().click();
  const login = page.getByRole('dialog', { name: 'Log in', exact: true });
  await expect(login).toBeVisible();
  await login.getByRole('button', { name: 'Need an account? Register', exact: true }).click();
  const signup = page.getByRole('dialog', { name: 'Create account', exact: true });
  await expect(signup.getByLabel('Name', { exact: true })).toBeVisible();
  await expect(signup.getByLabel('Email', { exact: true })).toBeVisible();
  await expect(signup.getByLabel('Password (6+ characters)', { exact: true })).toBeVisible();
  await expect(signup.getByRole('button', { name: 'Create account', exact: true })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(signup).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});
