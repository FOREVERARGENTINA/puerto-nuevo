#!/usr/bin/env node
/**
 * Fix mojibake (UTF-8 bytes interpreted as Latin-1) in Firestore documents.
 *
 * Usage:
 *  - Dry run (default): node scripts/fixMojibake.js
 *  - Apply changes:      node scripts/fixMojibake.js --apply
 *  - Specify key:        node scripts/fixMojibake.js --key=path/to/key.json
 *  - Limit docs:         node scripts/fixMojibake.js --limit=200
 *  - Limit collections:  node scripts/fixMojibake.js --collections=children,users
 */
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');
const limitArg = argv.find(arg => arg.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : null;
const collectionsArg = argv.find(arg => arg.startsWith('--collections='));
const includeCollections = collectionsArg
  ? new Set(collectionsArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean))
  : null;

const keyArg = argv.find(arg => arg.startsWith('--key='));
const keyPath = keyArg
  ? keyArg.split('=')[1]
  : process.env.GOOGLE_APPLICATION_CREDENTIALS || path.resolve('functions', 'service-account-key.json');

if (!fs.existsSync(keyPath)) {
  console.error(`Service account key not found at ${keyPath}. Set GOOGLE_APPLICATION_CREDENTIALS or pass --key=...`);
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

try {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
} catch (_err) {
  console.warn('Firebase app already initialized, proceeding...');
}

const db = admin.firestore();
const TIMESTAMP = admin.firestore.Timestamp;
const GEOPOINT = admin.firestore.GeoPoint;
const DOCREF = admin.firestore.DocumentReference;

const isInstance = (value, ctor) => Boolean(ctor) && value instanceof ctor;

const MOJIBAKE_PATTERN = /[\u00C2\u00C3\u00E2\u00F0]/;

const hasMojibake = (value) => MOJIBAKE_PATTERN.test(value);

const decodeLatin1ToUtf8 = (value) => Buffer.from(value, 'latin1').toString('utf8');

const fixString = (value) => {
  if (typeof value !== 'string' || !hasMojibake(value)) return value;
  const decoded = decodeLatin1ToUtf8(value);
  if (!decoded || decoded === value) return value;
  if (decoded.includes('\uFFFD')) return value;
  if (hasMojibake(decoded)) return value;
  return decoded;
};

const truncate = (value, length = 120) => {
  if (typeof value !== 'string') return String(value);
  if (value.length <= length) return value;
  return `${value.slice(0, length)}…`;
};

const sanitizeValue = (value, pathSegments, changes) => {
  if (typeof value === 'string') {
    const fixed = fixString(value);
    if (fixed !== value) {
      changes.push({
        path: pathSegments.join('.'),
        before: value,
        after: fixed
      });
    }
    return fixed;
  }

  if (!value || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (isInstance(value, TIMESTAMP)) return value;
  if (isInstance(value, GEOPOINT)) return value;
  if (isInstance(value, DOCREF)) return value;
  if (typeof value.toDate === 'function') return value;

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, [...pathSegments, String(index)], changes));
  }

  const result = {};
  Object.entries(value).forEach(([key, entry]) => {
    result[key] = sanitizeValue(entry, [...pathSegments, key], changes);
  });
  return result;
};

const sanitizeDocData = (data) => {
  const changes = [];
  const sanitized = sanitizeValue(data, [], changes);
  return { sanitized, changes };
};

let processedDocs = 0;
let changedDocs = 0;
let updatedDocs = 0;
let totalChanges = 0;

const processCollection = async (collectionRef) => {
  const snapshot = await collectionRef.get();
  for (const doc of snapshot.docs) {
    if (limit && processedDocs >= limit) return;
    processedDocs += 1;

    const data = doc.data();
    const { sanitized, changes } = sanitizeDocData(data);
    if (changes.length > 0) {
      changedDocs += 1;
      totalChanges += changes.length;
      console.log(`\n[${APPLY ? 'update' : 'dry'}] ${doc.ref.path} (${changes.length} changes)`);
      changes.slice(0, 6).forEach(change => {
        console.log(`  - ${change.path}: "${truncate(change.before)}" -> "${truncate(change.after)}"`);
      });
      if (changes.length > 6) {
        console.log(`  - ... ${changes.length - 6} more`);
      }

      if (APPLY) {
        try {
          await doc.ref.set(sanitized, { merge: true });
          updatedDocs += 1;
        } catch (err) {
          console.error(`Error updating ${doc.ref.path}:`, err.message || err);
        }
      }
    }

    const subcollections = await doc.ref.listCollections();
    for (const sub of subcollections) {
      if (limit && processedDocs >= limit) return;
      await processCollection(sub);
    }
  }
};

const main = async () => {
  const collections = includeCollections
    ? Array.from(includeCollections).map(name => db.collection(name))
    : await db.listCollections();

  console.log(`Starting mojibake scan${APPLY ? ' (apply)' : ' (dry run)'}...`);
  console.log(`Collections: ${collections.map(c => c.id).join(', ') || '(none)'}`);
  if (limit) console.log(`Limit: ${limit} documents`);

  for (const collection of collections) {
    if (limit && processedDocs >= limit) break;
    console.log(`\nScanning collection: ${collection.id}`);
    await processCollection(collection);
  }

  console.log('\nDone.');
  console.log(`Processed documents: ${processedDocs}`);
  console.log(`Documents with fixes: ${changedDocs}`);
  console.log(`Total fixes: ${totalChanges}`);
  if (APPLY) console.log(`Updated documents: ${updatedDocs}`);
  if (!APPLY) console.log('Dry run only. Re-run with --apply to write changes.');
};

main().catch(err => {
  console.error('Migration failed:', err.message || err);
  process.exit(1);
});
