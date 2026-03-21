#!/usr/bin/env node
/**
 * migrateParticipantesUids.js
 *
 * Migración one-time: agrega el campo `participantesUids: [familiaUid]`
 * a todas las conversaciones individuales existentes que no lo tienen.
 *
 * Uso:
 *   node scripts/migrateParticipantesUids.js --key=ruta/al/service-account.json
 *   node scripts/migrateParticipantesUids.js --key=ruta/al/service-account.json --apply
 *
 * Sin --apply corre en modo dry-run (solo muestra qué haría, no escribe).
 */

import fs from 'fs';
import admin from 'firebase-admin';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const keyArg = argv.find(a => a.startsWith('--key='));
const keyPath = keyArg ? keyArg.split('=')[1] : process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath) {
  console.error('Credenciales no encontradas. Usá --key=ruta/service-account.json o GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

if (!fs.existsSync(keyPath)) {
  console.error(`Archivo no encontrado: ${keyPath}`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

async function main() {
  const db = admin.firestore();
  const snapshot = await db.collection('conversations').get();
  console.log(`Total conversaciones: ${snapshot.size}`);
  console.log(APPLY ? 'Modo: APPLY (escribe en Firestore)' : 'Modo: DRY-RUN (solo muestra, no escribe)');

  let migrated = 0;
  let skipped = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();

    if (Array.isArray(data.participantesUids)) {
      skipped++;
      continue;
    }

    if (!data.familiaUid) {
      console.warn(`  [WARN] ${docSnap.id} sin familiaUid — omitida`);
      skipped++;
      continue;
    }

    console.log(`  Migrar: ${docSnap.id} → participantesUids: ["${data.familiaUid}"]`);

    if (APPLY) {
      batch.update(docSnap.ref, { participantesUids: [data.familiaUid] });
      batchCount++;

      if (batchCount === 499) {
        await batch.commit();
        console.log(`  Batch de ${batchCount} docs aplicado`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    migrated++;
  }

  if (APPLY && batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n${APPLY ? 'Migración completa' : 'Dry-run completo (usá --apply para escribir)'}.`);
  console.log(`  A migrar/migradas: ${migrated}`);
  console.log(`  Omitidas: ${skipped}`);
}

main().catch(err => {
  console.error('Error en migración:', err);
  process.exit(1);
});
