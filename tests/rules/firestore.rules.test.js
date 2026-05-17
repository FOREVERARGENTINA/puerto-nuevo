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
        db.collection('conversations').doc('rules_conv_facturacion').set({
          familiaUid: 'rules_family_3',
          participantesUids: ['rules_family_3'],
          participanteMap: { rules_family_3: true },
          destinatarioEscuela: 'administracion',
          asunto: 'Consulta de facturacion',
          categoria: 'pagos',
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
        // Setup para Clases Abiertas
        db.collection('children').doc('rules_child_taller1_family3').set({
          nombreCompleto: 'Alumno Rules Taller 1 Family 3',
          ambiente: 'taller1',
          responsables: ['rules_family_3_ca'],
        }),
        db.collection('clasesAbiertas').doc('rules_ca_conv_aa_t1').set({
          tipo: 'ambiente_abierto',
          ambiente: 'taller1',
          activo: true,
          dias: [{ id: 'dia001', fecha: new Date('2026-08-01'), horario: '10:00 - 11:00' }],
          diaIds: { dia001: true },
          cupos: {},
          familiasDia: {},
          hijosDia: {},
        }),
        db.collection('clasesAbiertas').doc('rules_ca_conv_aa_t1_lleno').set({
          tipo: 'ambiente_abierto',
          ambiente: 'taller1',
          activo: true,
          dias: [{ id: 'dia_lleno', fecha: new Date('2026-08-02'), horario: '10:00 - 11:00' }],
          diaIds: { dia_lleno: true },
          cupos: { dia_lleno: 2 },
          familiasDia: { other_family_a: 'dia_lleno', other_family_b: 'dia_lleno' },
          hijosDia: { other_child_a: 'dia_lleno', other_child_b: 'dia_lleno' },
        }),
        db.collection('clasesAbiertas').doc('rules_ca_conv_ta_t1').set({
          tipo: 'taller_abierto',
          ambiente: 'taller1',
          activo: true,
          dias: [{ id: 'tallerdia001', fecha: new Date('2026-08-03'), horario: '14:00 - 15:00', nombreTaller: 'Teatro' }],
          diaIds: { tallerdia001: true },
          cupos: {},
          familiasDia: {},
          hijosDia: {},
        }),
        db.collection('clasesAbiertas').doc('rules_ca_conv_inactiva').set({
          tipo: 'taller_abierto',
          ambiente: 'taller1',
          activo: false,
          dias: [{ id: 'diainact001', fecha: new Date('2026-08-04'), horario: '14:00 - 15:00', nombreTaller: 'Huerta' }],
          diaIds: { diainact001: true },
          cupos: {},
          familiasDia: {},
          hijosDia: {},
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

  test('rechaza a coordinacion leer una conversacion dirigida a facturacion', async () => {
    const coordinacionDb = testEnv.authenticatedContext('rules_coord', { role: 'coordinacion' }).firestore();

    await assertFails(
      coordinacionDb.collection('conversations').doc('rules_conv_facturacion').get()
    );
  });

  test('permite a facturacion leer una conversacion dirigida a facturacion', async () => {
    const facturacionDb = testEnv.authenticatedContext('rules_facturacion', { role: 'facturacion' }).firestore();

    await assertSucceeds(
      facturacionDb.collection('conversations').doc('rules_conv_facturacion').get()
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

  // ── Clases Abiertas ──────────────────────────────────────────────────────────

  test('CA: familia puede leer el doc de convocatoria activa (incluye cupos)', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_3_ca', { role: 'family' }).firestore();
    await assertSucceeds(
      familyDb.collection('clasesAbiertas').doc('rules_ca_conv_aa_t1').get()
    );
  });

  test('CA: usuario no autenticado no puede leer convocatoria', async () => {
    const unauthedDb = testEnv.unauthenticatedContext().firestore();
    await assertFails(
      unauthedDb.collection('clasesAbiertas').doc('rules_ca_conv_aa_t1').get()
    );
  });

  test('CA: familia no puede leer inscripciones ajenas', async () => {
    // Primero crear una inscripción de otra familia (con rules-disabled)
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore()
        .collection('clasesAbiertas').doc('rules_ca_conv_aa_t1')
        .collection('inscripciones').doc('otra_familia_uid').set({
          diaId: 'dia001',
          familiaUid: 'otra_familia_uid',
          familiaNombre: 'Otra Familia',
          hijoId: 'otro_hijo',
          hijoNombre: 'Otro Hijo',
          ambiente: 'taller1',
          createdAt: new Date(),
        });
    });

    const familyDb = testEnv.authenticatedContext('rules_family_3_ca', { role: 'family' }).firestore();
    await assertFails(
      familyDb.collection('clasesAbiertas').doc('rules_ca_conv_aa_t1')
        .collection('inscripciones').doc('otra_familia_uid').get()
    );
  });

  test('CA: familia puede leer sus propias inscripciones', async () => {
    // Crear inscripción propia con rules-disabled
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore()
        .collection('clasesAbiertas').doc('rules_ca_conv_ta_t1')
        .collection('inscripciones').doc('rules_family_3_ca_tallerdia001').set({
          diaId: 'tallerdia001',
          familiaUid: 'rules_family_3_ca',
          familiaNombre: 'Familia 3 CA',
          hijoId: 'rules_child_taller1_family3',
          hijoNombre: 'Alumno Rules Taller 1 Family 3',
          ambiente: 'taller1',
          createdAt: new Date(),
        });
    });

    const familyDb = testEnv.authenticatedContext('rules_family_3_ca', { role: 'family' }).firestore();
    await assertSucceeds(
      familyDb.collection('clasesAbiertas').doc('rules_ca_conv_ta_t1')
        .collection('inscripciones').doc('rules_family_3_ca_tallerdia001').get()
    );
  });

  test('CA: familia no puede crear inscripción en convocatoria inactiva', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_3_ca', { role: 'family' }).firestore();
    // Intentar inscribirse en taller_abierto inactivo (sin el atomic update del doc padre, que no aplica a taller)
    await assertFails(
      familyDb.collection('clasesAbiertas').doc('rules_ca_conv_inactiva')
        .collection('inscripciones').doc('rules_family_3_ca_diainact001').set({
          diaId: 'diainact001',
          familiaUid: 'rules_family_3_ca',
          familiaNombre: 'Familia 3 CA',
          hijoId: 'rules_child_taller1_family3',
          hijoNombre: 'Alumno Rules Taller 1 Family 3',
          ambiente: 'taller1',
          createdAt: new Date(),
        })
    );
  });

  test('CA: familia no puede crear inscripción con diaId inexistente', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_3_ca', { role: 'family' }).firestore();
    await assertFails(
      familyDb.collection('clasesAbiertas').doc('rules_ca_conv_ta_t1')
        .collection('inscripciones').doc('rules_family_3_ca_NOPE').set({
          diaId: 'id_que_no_existe',
          familiaUid: 'rules_family_3_ca',
          familiaNombre: 'Familia 3 CA',
          hijoId: 'rules_child_taller1_family3',
          hijoNombre: 'Alumno Rules Taller 1 Family 3',
          ambiente: 'taller1',
          createdAt: new Date(),
        })
    );
  });

  test('CA: familia no puede desanotarse de ambiente_abierto', async () => {
    // Crear inscripción de ambiente_abierto con rules-disabled
    await testEnv.withSecurityRulesDisabled(async (ctx) => {
      await ctx.firestore()
        .collection('clasesAbiertas').doc('rules_ca_conv_aa_t1')
        .collection('inscripciones').doc('rules_family_3_ca').set({
          diaId: 'dia001',
          familiaUid: 'rules_family_3_ca',
          familiaNombre: 'Familia 3 CA',
          hijoId: 'rules_child_taller1_family3',
          hijoNombre: 'Alumno Rules Taller 1 Family 3',
          ambiente: 'taller1',
          createdAt: new Date(),
        });
    });

    const familyDb = testEnv.authenticatedContext('rules_family_3_ca', { role: 'family' }).firestore();
    await assertFails(
      familyDb.collection('clasesAbiertas').doc('rules_ca_conv_aa_t1')
        .collection('inscripciones').doc('rules_family_3_ca').delete()
    );
  });

  test('CA: familia puede desanotarse de taller_abierto', async () => {
    const familyDb = testEnv.authenticatedContext('rules_family_3_ca', { role: 'family' }).firestore();
    await assertSucceeds(
      familyDb.collection('clasesAbiertas').doc('rules_ca_conv_ta_t1')
        .collection('inscripciones').doc('rules_family_3_ca_tallerdia001').delete()
    );
  });

  test('CA: admin puede borrar una inscripción de ambiente_abierto', async () => {
    const adminDb = testEnv.authenticatedContext('rules_admin_ca', { role: 'superadmin' }).firestore();
    await assertSucceeds(
      adminDb.collection('clasesAbiertas').doc('rules_ca_conv_aa_t1')
        .collection('inscripciones').doc('rules_family_3_ca').delete()
    );
  });
});
