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
const {
  handleConversationMessageCreated,
} = require('../../functions/src/triggers/onConversationMessageCreated.js');
const {
  handleConversationUpdated,
} = require('../../functions/src/triggers/onConversationUpdated.js');

describe('Conversation functions', () => {
  beforeAll(() => {
    getAdminApp();
  });

  beforeEach(async () => {
    await clearCollection('emulatorOutbox');
  });

  afterAll(async () => {
    await deleteAdminApps();
  });

  test('handleConversationMessageCreated registra push en emulatorOutbox para la familia destinataria', async () => {
    const db = getAdminDb();
    const convId = `fn_conv_${randomUUID()}`;

    await Promise.all([
      db.collection('users').doc('fn_family_push').set({
        role: 'family',
        displayName: 'Familia Push',
        email: 'familia-push@demo.pn',
      }, { merge: true }),
      db.collection('userPushTokens').doc('fn_family_push').set({
        tokens: ['fn-family-push-token'],
      }, { merge: true }),
      db.collection('conversations').doc(convId).set({
        familiaUid: 'fn_family_push',
        participantesUids: ['fn_family_push'],
        destinatarioEscuela: 'coordinacion',
        estado: 'activa',
        asunto: 'Push de prueba',
      }),
    ]);

    const result = await handleConversationMessageCreated({
      snapshot: {
        data: () => ({
          autorRol: 'coordinacion',
          texto: 'Respuesta de la escuela',
          tipoMensaje: 'normal',
        }),
      },
      convId,
      db,
    });

    expect(result.success).toBe(true);
    expect(result.pushResult.mode).toBe('emulator');

    const outboxDoc = await waitForCollectionMatch(
      'emulatorOutbox',
      (docSnap) => {
        const data = docSnap.data();
        return data.type === 'push' && data.payload?.clickAction === `/portal/familia/conversaciones/${convId}`;
      }
    );

    expect(outboxDoc.data().recipientUids).toContain('fn_family_push');
    expect(outboxDoc.data().payload.tokens).toContain('fn-family-push-token');
  });

  test('handleConversationUpdated limpia solo la lectura de escuela al cerrar la conversacion', async () => {
    const db = getAdminDb();
    const convId = `fn_conv_close_${randomUUID()}`;

    await db.collection('conversations').doc(convId).set({
      estado: 'activa',
      mensajesSinLeerEscuela: 3,
      mensajesSinLeerFamilia: 2,
      ultimoMensajeTexto: 'Mensaje pendiente',
    });

    const result = await handleConversationUpdated({
      before: { estado: 'activa' },
      after: { estado: 'cerrada' },
      convId,
      db,
    });

    expect(result).toEqual({ success: true, updated: true });

    const updatedSnap = await db.collection('conversations').doc(convId).get();
    const updatedData = updatedSnap.data();

    expect(updatedData.mensajesSinLeerEscuela).toBe(0);
    expect(updatedData.mensajesSinLeerFamilia).toBe(2);
    expect(updatedData.ultimoMensajeVistoPorEscuela).toBeTruthy();
    expect(updatedData.actualizadoAt).toBeTruthy();
  });
});
