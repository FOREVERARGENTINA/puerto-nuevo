import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  clearCollection,
  deleteAdminApps,
  getAdminApp,
  getAdminDb,
  waitForCollectionMatch,
} from '../helpers/admin-emulator.js';

const require = createRequire(import.meta.url);
const { runSnacksReminder } = require('../../functions/src/scheduled/snacksReminder.js');
const {
  runAppointmentSameDayReminder,
} = require('../../functions/src/scheduled/appointmentSameDayReminder.js');

describe('Scheduled reminder functions', () => {
  beforeAll(() => {
    getAdminApp();
  });

  beforeEach(async () => {
    await Promise.all([
      clearCollection('communications'),
      clearCollection('emulatorOutbox'),
      clearCollection('snackAssignments'),
      clearCollection('appointments'),
    ]);
  });

  afterAll(async () => {
    await deleteAdminApps();
  });

  test('runSnacksReminder crea comunicados y marca recordatorios enviados', async () => {
    const db = getAdminDb();
    const assignmentId = `fn_snack_${randomUUID()}`;
    const baseNow = new Date('2026-03-06T13:00:00.000Z');

    await db.collection('snackAssignments').doc(assignmentId).set({
      childName: 'Alumno Snacks',
      ambiente: 'taller1',
      fechaInicio: '2026-03-09',
      fechaFin: '2026-03-13',
      estado: 'pendiente',
      familias: [
        {
          uid: 'fn_family_snacks',
          name: 'Familia Snacks',
          confirmed: false,
          recordatorioEnviado: false,
        },
      ],
    });

    const result = await runSnacksReminder({
      db,
      now: baseNow,
    });

    expect(result).toEqual({ success: true, count: 1 });

    const assignmentSnap = await db.collection('snackAssignments').doc(assignmentId).get();
    const assignmentData = assignmentSnap.data();
    expect(assignmentData.familias[0].recordatorioEnviado).toBe(true);
    expect(assignmentData.familias[0].fechaRecordatorio).toBeTruthy();

    const communicationSnap = await waitForCollectionMatch(
      'communications',
      (docSnap) => docSnap.data().metadata?.assignmentId === assignmentId
    );

    expect(communicationSnap.data().destinatarios).toEqual(['fn_family_snacks']);
    expect(communicationSnap.data().tipo).toBe('recordatorio_snacks');
  });

  test('runAppointmentSameDayReminder registra emails simulados sin proveedor real', async () => {
    const db = getAdminDb();
    const appointmentId = `fn_appt_${randomUUID()}`;
    const now = new Date('2026-03-30T12:00:00.000Z');

    await Promise.all([
      db.collection('users').doc('fn_family_appointment').set({
        role: 'family',
        email: 'family-appointment@demo.pn',
        displayName: 'Familia Appointment',
      }, { merge: true }),
      db.collection('appointments').doc(appointmentId).set({
        estado: 'reservado',
        familiaUid: 'fn_family_appointment',
        familiasUids: ['fn_family_appointment'],
        hijoNombre: 'Alumno Turno',
        modalidad: 'virtual',
        fechaHora: new Date('2026-03-30T18:00:00.000Z'),
      }),
    ]);

    const result = await runAppointmentSameDayReminder({
      db,
      now,
      apiKey: null,
    });

    expect(result).toEqual({ success: true, reminders: 1 });

    const appointmentSnap = await db.collection('appointments').doc(appointmentId).get();
    const reminderState = appointmentSnap.data().recordatorioReunionMismoDia;

    expect(reminderState.fecha).toBe('2026-03-30');
    expect(reminderState.uids).toContain('fn_family_appointment');

    const outboxDoc = await waitForCollectionMatch(
      'emulatorOutbox',
      (docSnap) => {
        const data = docSnap.data();
        return data.type === 'email' && data.metadata?.appointmentId === appointmentId;
      }
    );

    expect(outboxDoc.data().recipientEmails).toContain('family-appointment@demo.pn');
    expect(outboxDoc.data().source).toBe('sendAppointmentSameDayReminder');
  });
});
