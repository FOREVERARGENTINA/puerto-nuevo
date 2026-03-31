import { test, expect } from '@playwright/test';

const FAMILY_EMAIL = process.env.PLAYWRIGHT_FAMILY_EMAIL;
const FAMILY_PASSWORD = process.env.PLAYWRIGHT_FAMILY_PASSWORD;
const COORDINACION_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const COORDINACION_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
const SUPERADMIN_EMAIL = process.env.PLAYWRIGHT_SUPERADMIN_EMAIL;
const SUPERADMIN_PASSWORD = process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD;

async function fillLogin(page, email, password) {
  await page.goto('/portal/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

test('@smoke login con cuenta family redirige a /portal/familia', async ({ page }) => {
  await fillLogin(page, FAMILY_EMAIL, FAMILY_PASSWORD);
  await expect(page).toHaveURL(/\/portal\/familia/, { timeout: 15000 });
});

test('@smoke login con cuenta coordinacion redirige a /portal/admin', async ({ page }) => {
  await fillLogin(page, COORDINACION_EMAIL, COORDINACION_PASSWORD);
  await expect(page).toHaveURL(/\/portal\/admin/, { timeout: 15000 });
});

test('@smoke login con cuenta superadmin redirige a /portal/admin', async ({ page }) => {
  await fillLogin(page, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
  await expect(page).toHaveURL(/\/portal\/admin/, { timeout: 15000 });
});

test('@smoke login con password incorrecto muestra error y no navega', async ({ page }) => {
  await fillLogin(page, FAMILY_EMAIL, 'password-incorrecto-xyz-9999');
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
  await expect(page).not.toHaveURL(/\/portal\/familia/);
});

test('@smoke login con email inexistente muestra error', async ({ page }) => {
  await fillLogin(page, 'noexiste-xyz@test.invalid', 'cualquierpassword');
  await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });
});
