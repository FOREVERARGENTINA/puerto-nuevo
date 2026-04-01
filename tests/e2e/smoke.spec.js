import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const PASSWORD = 'PuertoLocal123!';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadFixturePath = path.resolve(__dirname, '..', 'fixtures', 'tiny-upload.txt');

test.describe.configure({ mode: 'serial' });

async function waitForLoginForm(page) {
  const emailInput = page.locator('#email');
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await page.goto('/portal/login', { waitUntil: 'domcontentloaded' });

    try {
      await emailInput.waitFor({ state: 'visible', timeout: 20000 });
      return;
    } catch (error) {
      if (attempt === 3) {
        const currentUrl = page.url();
        throw new Error(`No se pudo mostrar el login tras 3 intentos. URL final: ${currentUrl}`);
      }
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
  }
}

async function loginAs(page, email, expectedPath) {
  await waitForLoginForm(page);
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.waitForURL(`**${expectedPath}`);
}

test('@smoke familia puede recorrer conversaciones, snacks y reservar un turno', async ({ page }) => {
  await loginAs(page, 'familia1@demo.pn', '/portal/familia');

  await expect(page.getByRole('heading', { name: 'Portal de Familias' })).toBeVisible();

  await page.goto('/portal/familia/conversaciones');
  await expect(page.getByRole('heading', { name: 'Conversaciones' })).toBeVisible();
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
  await loginAs(page, 'coordinacion@demo.pn', '/portal/admin');

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
  await loginAs(page, 'superadmin@demo.pn', '/portal/admin');

  await page.goto('/portal/admin/usuarios');
  await expect(page.getByRole('heading', { name: 'Usuarios' })).toBeVisible();

  await page.getByRole('button', { name: /\+ Crear Usuario|Cancelar/i }).click();
  await expect(page.getByText('Crear Nuevo Usuario')).toBeVisible();

  const roleSelect = page.locator('#role');
  await expect(roleSelect.locator('option[value="superadmin"]')).toHaveCount(1);
});
