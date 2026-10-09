#!/usr/bin/env node
/**
 * findOrphanDocumentReceipts.js
 * Lista recibos de documentReadReceipts con status 'pending' cuyo documento ya no existe
 * o ya no requiere lectura. Por defecto solo muestra; --apply los borra.
 * Uso: node scripts/findOrphanDocumentReceipts.js --key=ruta/al/service-account.json [--apply]
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

const APPLY = argv.includes('--apply');

async function main() {
  const db = admin.firestore();
  const pendingSnap = await db.collection('documentReadReceipts').where('status', '==', 'pending').get();
  console.log(`\nRecibos pendientes: ${pendingSnap.size}`);
  console.log(APPLY ? 'Modo: APPLY' : 'Modo: DRY-RUN (agregá --apply para borrar)');

  const docCache = new Map();
  const toDelete = [];

  for (const receipt of pendingSnap.docs) {
    const r = receipt.data();
    if (!docCache.has(r.documentId)) {
      docCache.set(r.documentId, await db.collection('documents').doc(String(r.documentId)).get());
    }
    const docSnap = docCache.get(r.documentId);
    const reason = !docSnap.exists
      ? 'documento borrado'
      : !docSnap.data().requiereLectura ? 'no requiere lectura' : null;

    const label = docSnap.exists ? `"${docSnap.data().titulo || docSnap.data().title || '(sin título)'}"` : '(no existe)';
    console.log(`  ${receipt.id} | ${r.userEmail || r.userId} (${r.userRole || '?'}) | doc ${r.documentId} ${label}${reason ? ` → HUÉRFANO: ${reason}` : ''}`);
    if (reason) toDelete.push(receipt.ref);
  }

  console.log(`\nHuérfanos: ${toDelete.length}`);
  if (APPLY && toDelete.length > 0) {
    // ponytail: un solo batch, alcanza hasta 500 recibos
    const batch = db.batch();
    toDelete.forEach(ref => batch.delete(ref));
    await batch.commit();
    console.log(`✓ ${toDelete.length} recibos borrados.`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
