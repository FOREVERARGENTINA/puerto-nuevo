import { test, expect } from '@playwright/test';

const FAMILY_EMAIL = process.env.PLAYWRIGHT_FAMILY_EMAIL;
const FAMILY_PASSWORD = process.env.PLAYWRIGHT_FAMILY_PASSWORD;
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD;

async function fillLogin(page, email, password) {
  await page.goto('/portal/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

test('login con cuenta family redirige a /portal/familia', async ({ page }) => {
  await fillLogin(page, FAMILY_EMAIL, FAMILY_PASSWORD);
  await expect(page).toHaveURL(/\/portal\/familia/, { timeout: 15000 });
});

test('login con cuenta admin (coordinacion) redirige a /portal/admin', async ({ page }) => {
  await fillLogin(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/portal\/admin/, { timeout: 15000 });
});

test('login con password incorrecto muestra error y no navega', async ({ page }) => {
  await fillLogin(page, FAMILY_EMAIL, 'password-incorrecto-xyz-9999');
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  await expect(page).not.toHaveURL(/\/portal\/familia/);
});

test('login con email inexistente muestra error', async ({ page }) => {
  await fillLogin(page, 'noexiste-xyz@test.invalid', 'cualquierpassword');
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
});
