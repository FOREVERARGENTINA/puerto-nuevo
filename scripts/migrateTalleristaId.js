#!/usr/bin/env node
/**
 * Migration script to normalize `talleristaId` field in `talleres` collection to an array.
 * Usage:
 *  - Dry run (default): node scripts/migrateTalleristaId.js
 *  - Apply changes:      node scripts/migrateTalleristaId.js --apply
 *  - Specify key:        node scripts/migrateTalleristaId.js --key=path/to/key.json
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
  console.error(`Service account key not found at ${keyPath}. Set GOOGLE_APPLICATION_CREDENTIALS or pass --key=...`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (_err) {
  // In case script is run multiple times in same process
  console.warn('Firebase app already initialized, proceeding...');
}

const db = admin.firestore();

async function main() {
  console.log('Scanning `talleres` collection for `talleristaId` fields to normalize...');
  const snapshot = await db.collection('talleres').get();
  console.log(`Found ${snapshot.size} talleres.`);

  const changes = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    const t = data.talleristaId;
    // If it's a plain string or number, we'll convert to array
    if (typeof t === 'string') {
      const cleaned = t.trim();
      const newVal = cleaned ? [cleaned] : [];
      changes.push({ id: doc.id, before: t, after: newVal });
    } else if (typeof t === 'number') {
      changes.push({ id: doc.id, before: t, after: [String(t)] });
    } else if (Array.isArray(t)) {
      // No-op: ensure elements are strings
      const needFix = t.some(el => typeof el !== 'string');
      if (needFix) {
        const newVal = t.map(el => (el == null ? '' : String(el)));
        changes.push({ id: doc.id, before: t, after: newVal });
      }
    } else if (t == null) {
      // No tallerista assigned - skip
    } else {
      // Unexpected type - try to stringify
      try {
        const s = JSON.stringify(t);
        changes.push({ id: doc.id, before: t, after: [s] });
      } catch (_err) {
        changes.push({ id: doc.id, before: t, after: [] });
      }
    }
  });

  if (changes.length === 0) {
    console.log('No changes required. All `talleristaId` fields appear normalized.');
    process.exit(0);
  }

  console.log(`
${changes.length} documentos a modificar (listado):
`);
  changes.forEach(c => {
    console.log(`- ${c.id}: ${JSON.stringify(c.before)} => ${JSON.stringify(c.after)}`);
  });

  if (!APPLY) {
    console.log('\nDry run only. No documents were updated.');
    console.log('To apply the changes run: node scripts/migrateTalleristaId.js --apply');
    process.exit(0);
  }

  console.log('\nApplying updates...');
  let applied = 0;
  for (const c of changes) {
    try {
      const ref = db.collection('talleres').doc(c.id);
      await ref.update({ talleristaId: c.after, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      applied += 1;
      console.log(`Updated ${c.id}`);
    } catch (err) {
      console.error(`Error updating ${c.id}:`, err.message || err);
    }
  }

  console.log(`\nDone. ${applied}/${changes.length} documents updated.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
