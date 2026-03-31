import { test, expect } from '@playwright/test';

async function loginAs(page, email, password) {
  await page.goto('/portal/login');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
}

test('@smoke family ve el dashboard con sección de eventos visible', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await loginAs(page, process.env.PLAYWRIGHT_FAMILY_EMAIL, process.env.PLAYWRIGHT_FAMILY_PASSWORD);
  await page.waitForURL(/\/portal\/familia/, { timeout: 15000 });

  await expect(page.locator('main, [role="main"], .dashboard, .page-content').first())
    .toBeVisible({ timeout: 10000 });

  const criticalErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT')
  );
  expect(criticalErrors, `Errores de consola: ${criticalErrors.join('\n')}`).toHaveLength(0);
});

test('@smoke coordinacion puede acceder a EventsManager y la página renderiza', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await loginAs(page, process.env.PLAYWRIGHT_ADMIN_EMAIL, process.env.PLAYWRIGHT_ADMIN_PASSWORD);
  await page.waitForURL(/\/portal\/admin/, { timeout: 15000 });

  await page.goto('/portal/admin/eventos');
  await expect(page).toHaveURL(/\/portal\/admin\/eventos/, { timeout: 8000 });

  await expect(page.locator('main, [role="main"], .page-content, h1, h2').first())
    .toBeVisible({ timeout: 10000 });

  const criticalErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT')
  );
  expect(criticalErrors, `Errores de consola: ${criticalErrors.join('\n')}`).toHaveLength(0);
});
