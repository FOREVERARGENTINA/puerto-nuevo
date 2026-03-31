import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  page.on('pageerror', (err) => {
    throw new Error(`Error de página no capturado: ${err.message}`);
  });

  await page.goto('/portal/login');
  await page.fill('#email', process.env.PLAYWRIGHT_FAMILY_EMAIL);
  await page.fill('#password', process.env.PLAYWRIGHT_FAMILY_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/portal\/familia/, { timeout: 15000 });
});

test('@smoke family puede ver la lista de conversaciones', async ({ page }) => {
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  await page.goto('/portal/familia/conversaciones');

  await expect(page).not.toHaveURL(/\/portal\/login/);

  await expect(page.locator('main, [role="main"], .page-content, h1, h2').first())
    .toBeVisible({ timeout: 10000 });

  const criticalErrors = consoleErrors.filter(
    (e) => !e.includes('favicon') && !e.includes('ERR_BLOCKED_BY_CLIENT')
  );
  expect(criticalErrors, `Errores de consola: ${criticalErrors.join('\n')}`).toHaveLength(0);
});
