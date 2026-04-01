import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const PASSWORD = 'PuertoLocal123!';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadFixturePath = path.resolve(__dirname, '..', 'fixtures', 'tiny-upload.txt');

test.describe.configure({ mode: 'serial' });

async function loginAs(page, email, expectedRole, expectedPath) {
  await page.goto('/portal/login', { waitUntil: 'domcontentloaded' });

  let lastError = 'Login fallido por causa desconocida';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const result = await page.evaluate(
      async ({ loginEmail, loginPassword }) => {
        try {
          const { authService } = await import('/src/services/auth.service.js');
          const loginResult = await authService.login(loginEmail, loginPassword);

          if (loginResult?.success && loginResult?.user) {
            await loginResult.user.getIdToken(true);
            const tokenResult = await loginResult.user.getIdTokenResult();

            return {
              success: true,
              error: null,
              role: tokenResult?.claims?.role || null,
              uid: loginResult.user.uid,
            };
          }

          return {
            success: !!loginResult?.success,
            error: loginResult?.error || null,
            role: null,
            uid: null,
          };
        } catch (error) {
          return {
            success: false,
            error: error?.message || String(error),
            role: null,
            uid: null,
          };
        }
      },
      { loginEmail: email, loginPassword: PASSWORD }
    );

    if (!result.success) {
      lastError = result.error || lastError;
      continue;
    }

    if (result.role !== expectedRole) {
      lastError = `Rol inesperado tras login: ${result.role || 'sin rol'} (esperado: ${expectedRole})`;
      continue;
    }

    if (result.uid) {
      await page.evaluate((uid) => {
        window.localStorage.setItem(`pn_welcome_${uid}`, '1');
      }, result.uid);
    }

    await page.goto(expectedPath, { waitUntil: 'domcontentloaded' });

    await page.waitForFunction(
      async ({ loginEmail, loginPassword, role }) => {
        try {
          const { auth } = await import('/src/config/firebase.js');
          let user = auth.currentUser;
          if (!user) {
            const { authService } = await import('/src/services/auth.service.js');
            const result = await authService.login(loginEmail, loginPassword);
            if (!result?.success || !result?.user) return false;
            user = result.user;
            await user.getIdToken(true);
          }
          const tokenResult = await user.getIdTokenResult();
          return (tokenResult?.claims?.role || null) === role;
        } catch {
          return false;
        }
      },
      { loginEmail: email, loginPassword: PASSWORD, role: expectedRole },
      { timeout: 30000 }
    );

    return;
  }

  throw new Error(`No se pudo autenticar a ${email} tras 3 intentos. Ultimo error: ${lastError}`);
}

test('@smoke familia puede recorrer conversaciones, snacks y reservar un turno', async ({ page }) => {
  await loginAs(page, 'familia1@demo.pn', 'family', '/portal/familia/conversaciones');

  await expect(page.getByRole('heading', { name: 'Conversaciones' })).toBeVisible({ timeout: 30000 });
  await expect(page.getByText('Consulta demo')).toBeVisible();

  await page.goto('/portal/familia/snacks');
  await expect(page.getByRole('heading', { name: /Mis turnos de snacks/i })).toBeVisible();
  await expect(page.getByText('Tu próximo turno')).toBeVisible();

  await page.goto('/portal/familia/turnos');
  await expect(page.getByRole('heading', { name: 'Turnos para Reuniones' })).toBeVisible();
  await expect(page.locator('.appointments-calendar-panel .event-calendar__day--has-slot').first()).toBeVisible();
  await page.locator('.appointments-calendar-panel .event-calendar__day--has-slot').first().click();
  await expect(page.getByRole('button', { name: 'Reservar' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Reservar' }).first().click();

  await expect(page.getByRole('heading', { name: 'Confirmar turno' })).toBeVisible();
  await page.getByRole('button', { name: 'Presencial' }).click();
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(page.getByText('Turno reservado exitosamente')).toBeVisible();
});

test('@smoke coordinacion puede revisar conversaciones y crear un evento con upload', async ({ page }) => {
  await loginAs(page, 'coordinacion@demo.pn', 'coordinacion', '/portal/admin');

  await page.goto('/portal/admin/conversaciones');
  await expect(page.getByRole('heading', { name: 'Conversaciones' })).toBeVisible();
  await expect(page.getByText('Familia Uno Demo')).toBeVisible();

  await page.goto('/portal/admin/eventos');
  await expect(page.getByRole('heading', { name: 'Eventos' })).toBeVisible();

  await page.getByRole('button', { name: 'Crear Evento' }).click();
  await expect(page.getByText('Crear Nuevo Evento')).toBeVisible();

  await page.locator('#titulo').fill('Evento E2E Demo');
  await page.locator('#fecha').fill(new Date().toISOString().slice(0, 10));
  await page.locator('#hora').fill('10:30');
  await page.locator('#event-media').setInputFiles(uploadFixturePath);
  await page.getByRole('button', { name: 'Crear Evento' }).last().click();

  await expect(page.getByText('Evento creado correctamente.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Evento E2E Demo' }).first()).toBeVisible();
});

test('@smoke superadmin puede asignar rol SuperAdmin en gestion de usuarios', async ({ page }) => {
  await loginAs(page, 'superadmin@demo.pn', 'superadmin', '/portal/admin');

  await page.goto('/portal/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();

  await page.getByRole('button', { name: /\+ Crear Usuario|Cancelar/i }).click();
  await expect(page.getByText('Crear Nuevo Usuario')).toBeVisible();

  const roleSelect = page.locator('#role');
  await expect(roleSelect.locator('option[value="superadmin"]')).toHaveCount(1);
});
