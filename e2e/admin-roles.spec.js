import { test, expect } from '@playwright/test';

async function loginAs(page, email, password) {
  await page.goto('/portal/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

test('@smoke coordinacion no puede asignar rol SuperAdmin', async ({ page }) => {
  await loginAs(page, process.env.PLAYWRIGHT_ADMIN_EMAIL, process.env.PLAYWRIGHT_ADMIN_PASSWORD);
  await page.waitForURL(/\/portal\/admin/, { timeout: 15000 });

  await page.goto('/portal/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();

  await page.getByRole('button', { name: /\+ Crear Usuario|Cancelar/i }).click();
  await expect(page.getByText('Crear Nuevo Usuario')).toBeVisible();

  const roleSelect = page.locator('#role');
  await expect(roleSelect).toBeVisible();
  await expect(roleSelect.locator('option[value="superadmin"]')).toHaveCount(0);
});

test('@smoke superadmin puede asignar rol SuperAdmin', async ({ page }) => {
  await loginAs(page, process.env.PLAYWRIGHT_SUPERADMIN_EMAIL, process.env.PLAYWRIGHT_SUPERADMIN_PASSWORD);
  await page.waitForURL(/\/portal\/admin/, { timeout: 15000 });

  await page.goto('/portal/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();

  await page.getByRole('button', { name: /\+ Crear Usuario|Cancelar/i }).click();
  await expect(page.getByText('Crear Nuevo Usuario')).toBeVisible();

  const roleSelect = page.locator('#role');
  await expect(roleSelect).toBeVisible();
  await expect(roleSelect.locator('option[value="superadmin"]')).toHaveCount(1);
});
