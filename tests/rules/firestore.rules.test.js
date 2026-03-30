import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { getRulesTestEnvironment, cleanupRulesTestEnvironment } from '../helpers/rules-test-environment.js';

describe('Firestore security rules', () => {
  let testEnv;

  beforeAll(async () => {
    testEnv = await getRulesTestEnvironment();

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();

      await Promise.all([
        db.collection('children').doc('rules_child_taller1').set({
          nombreCompleto: 'Alumno Rules Taller 1',
          ambiente: 'taller1',
          responsables: ['rules_family_1'],
        }),
        db.collection('children').doc('rules_child_taller2').set({
          nombreCompleto: 'Alumno Rules Taller 2',
          ambiente: 'taller2',
          responsables: ['rules_family_2'],
        }),
        db.collection('documents').doc('rules_doc_family').set({
          titulo: 'Documento para familias',
          roles: ['family'],
          ambiente: 'global',
        }),
        db.collection('documents').doc('rules_doc_admin').set({
          titulo: 'Documento solo admin',
          roles: ['superadmin', 'coordinacion'],
          ambiente: 'global',
        }),
        db.collection('conversations').doc('rules_conv_family_1').set({
          familiaUid: 'rules_family_1',
          participantesUids: ['rules_family_1'],
          participanteMap: { rules_family_1: true },
          destinatarioEscuela: 'coordinacion',
          asunto: 'Consulta permitida',
          categoria: 'administrativa',
          iniciadoPor: 'familia',
          estado: 'activa',
        }),
        db.collection('conversations').doc('rules_conv_family_2').set({
          familiaUid: 'rules_family_2',
          participantesUids: ['rules_family_2'],
          participanteMap: { rules_family_2: true },
          destinatarioEscuela: 'coordinacion',
          asunto: 'Consulta ajena',
          categoria: 'administrativa',
          iniciadoPor: 'familia',
          estado: 'activa',
        }),
        db.collection('appointments').doc('rules_appt_taller1').set({
          estado: 'disponible',
          origenSlot: 'agenda',
          ambiente: 'taller1',
        }),
        db.collection('appointments').doc('rules_appt_taller2').set({
          estado: 'disponible',
          origenSlot: 'agenda',
          ambiente: 'taller2',
        }),
      ]);
    });
  });

  afterAll(async () => {
    await cleanupRulesTestEnvironment();
  });

  test('permite a una familia leer su propia conversacion', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_1', { role: 'family' }).firestore();

    await assertSucceeds(
      familyDb.collection('conversations').doc('rules_conv_family_1').get()
    );
  });

  test('rechaza a una familia leer una conversacion ajena', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_1', { role: 'family' }).firestore();

    await assertFails(
      familyDb.collection('conversations').doc('rules_conv_family_2').get()
    );
  });

  test('permite a una familia leer documentos para su rol y bloquea documentos administrativos', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_1', { role: 'family' }).firestore();

    await assertSucceeds(
      familyDb.collection('documents').doc('rules_doc_family').get()
    );
    await assertFails(
      familyDb.collection('documents').doc('rules_doc_admin').get()
    );
  });

  test('permite reservar un turno del ambiente correcto y rechaza otro ambiente', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_1', { role: 'family' }).firestore();

    await assertSucceeds(
      familyDb.collection('appointments').doc('rules_appt_taller1').update({
        familiaUid: 'rules_family_1',
        familiasUids: ['rules_family_1'],
        hijoId: 'rules_child_taller1',
        estado: 'reservado',
      })
    );

    await assertFails(
      familyDb.collection('appointments').doc('rules_appt_taller2').update({
        familiaUid: 'rules_family_1',
        familiasUids: ['rules_family_1'],
        hijoId: 'rules_child_taller1',
        estado: 'reservado',
      })
    );
  });

  test('permite a coordinacion crear documentos institucionales', async () => {
    const adminDb = testEnv.authenticatedContext('rules_coord', { role: 'coordinacion' }).firestore();

    await assertSucceeds(
      adminDb.collection('documents').doc('rules_doc_created_by_coord').set({
        titulo: 'Nuevo documento',
        roles: ['family'],
        ambiente: 'global',
        uploadedBy: 'rules_coord',
      })
    );
  });

  test('rechaza a docentes subir documentos institucionales', async () => {
    const teacherDb = testEnv.authenticatedContext('rules_docente', { role: 'docente' }).firestore();

    await assertFails(
      teacherDb.collection('documents').doc('rules_doc_created_by_teacher').set({
        titulo: 'Documento no permitido',
        roles: ['family'],
        ambiente: 'global',
        uploadedBy: 'rules_docente',
      })
    );
  });

  test('solo admin puede crear perfiles de usuarios', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_1', { role: 'family' }).firestore();
    const adminDb = testEnv.authenticatedContext('rules_admin', { role: 'superadmin' }).firestore();

    await assertFails(
      familyDb.collection('users').doc('rules_created_by_family').set({
        role: 'family',
      })
    );

    await assertSucceeds(
      adminDb.collection('users').doc('rules_created_by_admin').set({
        role: 'family',
      })
    );

    expect(true).toBe(true);
  });
});
