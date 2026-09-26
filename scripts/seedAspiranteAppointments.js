#!/usr/bin/env node
/**
 * Crea de forma idempotente los turnos presenciales de admisión de octubre 2026.
 *
 * Uso:
 *   node scripts/seedAspiranteAppointments.js --key=service-account.json
 *   node scripts/seedAspiranteAppointments.js --key=service-account.json --apply
 */
import fs from 'fs';
import admin from 'firebase-admin';

const argv = process.argv.slice(2);
const apply = argv.includes('--apply');
const keyArg = argv.find(arg => arg.startsWith('--key='));
const keyPath = keyArg ? keyArg.slice('--key='.length) : process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error('Faltan credenciales. Usá GOOGLE_APPLICATION_CREDENTIALS o --key=ruta/al/service-account.json');
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`No se encontró la cuenta de servicio en ${keyPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const slots = [
  ['aspirante-2026-10-02-1600', '2026-10-02T16:00:00-03:00'],
  ['aspirante-2026-10-02-1640', '2026-10-02T16:40:00-03:00'],
  ['aspirante-2026-10-02-1720', '2026-10-02T17:20:00-03:00'],
  ['aspirante-2026-10-09-1600', '2026-10-09T16:00:00-03:00'],
  ['aspirante-2026-10-09-1640', '2026-10-09T16:40:00-03:00'],
  ['aspirante-2026-10-09-1720', '2026-10-09T17:20:00-03:00'],
];

async function run() {
  const refs = slots.map(([id]) => db.collection('appointments').doc(id));
  const snapshots = await db.getAll(...refs);
  const missingSlots = slots.filter((_, index) => !snapshots[index].exists);

  slots.forEach(([id, iso], index) => {
    const status = snapshots[index].exists ? 'YA EXISTE' : (apply ? 'CREAR' : 'PENDIENTE');
    const date = new Date(iso).toLocaleString('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      dateStyle: 'short',
      timeStyle: 'short',
    });
    console.log(`${status} - ${id} - ${date}`);
  });

  if (!apply) {
    console.log(`\nDry run: ${missingSlots.length} turno(s) por crear. Agregá --apply para guardarlos.`);
    return;
  }

  if (missingSlots.length === 0) {
    console.log('\nLos seis turnos ya estaban creados; no se modificó ninguna reserva.');
    return;
  }

  const batch = db.batch();
  missingSlots.forEach(([id, iso]) => {
    batch.set(db.collection('appointments').doc(id), {
      fechaHora: admin.firestore.Timestamp.fromDate(new Date(iso)),
      duracionMinutos: 30,
      estado: 'disponible',
      modalidad: 'presencial',
      targetRole: 'aspirante',
      origenSlot: 'admision_aspirantes_2026',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  console.log(`\n${missingSlots.length} turno(s) creado(s). Las reservas existentes se preservaron.`);
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
