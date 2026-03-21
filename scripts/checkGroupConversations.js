#!/usr/bin/env node
/**
 * checkGroupConversations.js
 * Muestra todas las conversaciones grupales y sus participantesUids.
 * Uso: node scripts/checkGroupConversations.js --key=ruta/al/service-account.json
 */
import fs from 'fs';
import admin from 'firebase-admin';

const argv = process.argv.slice(2);
const keyArg = argv.find(a => a.startsWith('--key='));
const keyPath = keyArg ? keyArg.slice('--key='.length) : process.env.GOOGLE_APPLICATION_CREDENTIALS;

if (!keyPath || !fs.existsSync(keyPath)) {
  console.error('Credenciales no encontradas. Usá --key=ruta/service-account.json');
  process.exit(1);
}

admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });

const APPLY = process.argv.includes('--apply');

async function main() {
  const db = admin.firestore();

  // Buscar conversaciones grupales sin participanteMap
  const grupalSnap = await db.collection('conversations').where('esGrupal', '==', true).get();
  console.log(`\nConversaciones grupales: ${grupalSnap.size}`);
  console.log(APPLY ? 'Modo: APPLY' : 'Modo: DRY-RUN (agregá --apply para escribir)');

  let batch = db.batch();
  let count = 0;

  for (const doc of grupalSnap.docs) {
    const d = doc.data();
    const uids = d.participantesUids || [];
    console.log(`\n  ID: ${doc.id} | asunto: ${d.asunto}`);
    console.log(`  participantesUids: ${JSON.stringify(uids)}`);
    console.log(`  participanteMap: ${JSON.stringify(d.participanteMap || null)}`);

    if (!d.participanteMap) {
      const participanteMap = {};
      uids.forEach(uid => { participanteMap[uid] = true; });
      console.log(`  → Agregar participanteMap: ${JSON.stringify(participanteMap)}`);
      if (APPLY) {
        batch.update(doc.ref, { participanteMap });
        count++;
      }
    }
  }

  if (APPLY && count > 0) {
    await batch.commit();
    console.log(`\n✓ ${count} conversaciones actualizadas.`);
  } else if (!APPLY) {
    console.log('\nDry-run completo. Usá --apply para escribir.');
  }
}

main().catch(err => { console.error(err); process.exit(1); });
