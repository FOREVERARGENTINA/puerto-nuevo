import { afterAll, beforeAll, describe, test } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { createRequire } from 'node:module';
import { getRulesTestEnvironment, cleanupRulesTestEnvironment } from '../helpers/rules-test-environment.js';

const require = createRequire(import.meta.url);
const { STORAGE_BUCKET } = require('../../scripts/emulator-config.cjs');

describe('Storage security rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await getRulesTestEnvironment();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      const storage = context.storage(`gs://${STORAGE_BUCKET}`);

      await Promise.all([
        db.collection('children').doc('rules_child_storage').set({
          responsables: ['rules_family_1'],
        }),
        db.collection('children').doc('rules_child_storage_other').set({
          responsables: ['rules_family_2'],
        }),
        db.collection('talleres').doc('rules_taller_assigned').set({
          talleristaId: 'rules_tallerista',
        }),
        storage.ref('private/children/rules_child_storage/report.txt').putString(
          'archivo privado',
          'raw',
          { contentType: 'text/plain' }
        ),
      ]);
    });
  });

  afterAll(async () => {
    await cleanupRulesTestEnvironment();
  });

  test('permite a una familia subir su propia foto de perfil', async () => {
    const familyStorage = testEnv
      .authenticatedContext('rules_family_1', { role: 'family' })
      .storage(`gs://${STORAGE_BUCKET}`);

    await assertSucceeds(
      familyStorage.ref('public/social/families/rules_family_1/profile/avatar.png').putString(
        'imagen-demo',
        'raw',
        { contentType: 'image/png' }
      )
    );
  });

  test('rechaza a una familia subir la foto de otra familia', async () => {
    const familyStorage = testEnv
      .authenticatedContext('rules_family_1', { role: 'family' })
      .storage(`gs://${STORAGE_BUCKET}`);

    await assertFails(
      familyStorage.ref('public/social/families/rules_family_2/profile/avatar.png').putString(
        'imagen-demo',
        'raw',
        { contentType: 'image/png' }
      )
    );
  });

  test('permite a una familia responsable leer archivos privados de su hijo y bloquea archivos ajenos', async () => {
    const familyStorage = testEnv
      .authenticatedContext('rules_family_1', { role: 'family' })
      .storage(`gs://${STORAGE_BUCKET}`);

    const otherFamilyStorage = testEnv
      .authenticatedContext('rules_family_2', { role: 'family' })
      .storage(`gs://${STORAGE_BUCKET}`);

    await assertSucceeds(
      familyStorage.ref('private/children/rules_child_storage/report.txt').getDownloadURL()
    );

    await assertFails(
      otherFamilyStorage.ref('private/children/rules_child_storage/report.txt').getDownloadURL()
    );
  });

  test('permite a coordinacion subir documentos y bloquea a docentes', async () => {
    const adminStorage = testEnv
      .authenticatedContext('rules_coord', { role: 'coordinacion' })
      .storage(`gs://${STORAGE_BUCKET}`);

    const teacherStorage = testEnv
      .authenticatedContext('rules_teacher', { role: 'docente' })
      .storage(`gs://${STORAGE_BUCKET}`);

    await assertSucceeds(
      adminStorage.ref('documents/institucional/reglamento.pdf').putString(
        'pdf-demo',
        'raw',
        { contentType: 'application/pdf' }
      )
    );

    await assertFails(
      teacherStorage.ref('documents/institucional/reglamento-docente.pdf').putString(
        'pdf-demo',
        'raw',
        { contentType: 'application/pdf' }
      )
    );
  });

  test('permite a un tallerista asignado subir archivos a la galeria de su taller', async () => {
    const talleristaStorage = testEnv
      .authenticatedContext('rules_tallerista', { role: 'tallerista' })
      .storage(`gs://${STORAGE_BUCKET}`);

    const familyStorage = testEnv
      .authenticatedContext('rules_family_1', { role: 'family' })
      .storage(`gs://${STORAGE_BUCKET}`);

    await assertSucceeds(
      talleristaStorage.ref('talleres/rules_taller_assigned/gallery/media.png').putString(
        'galeria-demo',
        'raw',
        { contentType: 'image/png' }
      )
    );

    await assertFails(
      familyStorage.ref('talleres/rules_taller_assigned/gallery/media.png').putString(
        'galeria-demo',
        'raw',
        { contentType: 'image/png' }
      )
    );
  });
});
