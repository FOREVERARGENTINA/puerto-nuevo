#!/usr/bin/env node
/**
 * Elimina slots legacy (sin campo `ambiente`) disponibles a partir del 8 de abril de 2026.
 * Usage:
 *  - Dry run (default): node scripts/deleteLegacySlots.js
 *  - Aplicar cambios:   node scripts/deleteLegacySlots.js --apply
 *  - Specify key:       node scripts/deleteLegacySlots.js --key=path/to/key.json
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
const CUTOFF = new Date(2026, 3, 8, 0, 0, 0, 0); // 8 de abril 2026

async function run() {
  const snapshot = await db.collection('appointments')
    .where('fechaHora', '>=', admin.firestore.Timestamp.fromDate(CUTOFF))
    .get();

  const legacy = snapshot.docs.filter(doc => {
    const d = doc.data();
    return d.estado === 'disponible' && !d.ambiente;
  });

  console.log(`Slots legacy disponibles desde el 8/4/2026: ${legacy.length}`);
  legacy.forEach(doc => {
    const d = doc.data();
    const fecha = d.fechaHora.toDate().toLocaleString('es-AR');
    console.log(`  ${APPLY ? 'BORRADO' : 'PENDIENTE'} — ${doc.id} — ${fecha}`);
  });

  if (!APPLY) {
    console.log('\nDry run. Pasá --apply para borrar.');
    process.exit(0);
  }

  const batch = db.batch();
  legacy.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  console.log(`\n${legacy.length} slots eliminados.`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
