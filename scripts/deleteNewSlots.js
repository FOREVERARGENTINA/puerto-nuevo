#!/usr/bin/env node
/**
 * Elimina slots nuevos (con campo `ambiente`) a partir del 15 de abril de 2026.
 * Usage:
 *  - Dry run (default): node scripts/deleteNewSlots.js
 *  - Aplicar cambios:   node scripts/deleteNewSlots.js --apply
 *  - Specify key:       node scripts/deleteNewSlots.js --key=path/to/key.json
 */
import fs from 'fs';
import admin from 'firebase-admin';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const keyArg = argv.find(a => a.startsWith('--key='));
const keyPath = keyArg ? keyArg.split('=')[1] : process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error('Missing credentials. Set GOOGLE_APPLICATION_CREDENTIALS or pass --key=path/to/key.json');
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

const db = admin.firestore();
const CUTOFF = new Date(2026, 3, 15, 0, 0, 0, 0); // 15 de abril 2026

async function run() {
  const snapshot = await db.collection('appointments')
    .where('fechaHora', '>=', admin.firestore.Timestamp.fromDate(CUTOFF))
    .get();

  const newSlots = snapshot.docs.filter(doc => doc.data().ambiente);

  console.log(`Slots nuevos (con ambiente) desde el 15/4/2026: ${newSlots.length}`);
  newSlots.forEach(doc => {
    const d = doc.data();
    const fecha = d.fechaHora.toDate().toLocaleString('es-AR');
    console.log(`  ${APPLY ? 'BORRADO' : 'PENDIENTE'} — ${doc.id} — ${fecha} — ${d.ambiente} — ${d.estado}`);
  });

  if (!APPLY) {
    console.log('\nDry run. Pasá --apply para borrar.');
    process.exit(0);
  }

  const batch = db.batch();
  newSlots.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`\n${newSlots.length} slots eliminados.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
