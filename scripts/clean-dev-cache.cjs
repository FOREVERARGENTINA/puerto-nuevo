const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

const cacheDirs = [
  path.join(rootDir, 'node_modules', '.vite'),
  path.join(rootDir, 'node_modules', '.cache', 'vite'),
  path.join(rootDir, '.vite')
];

let removedCount = 0;

for (const dir of cacheDirs) {
  if (!fs.existsSync(dir)) continue;
  fs.rmSync(dir, { recursive: true, force: true });
  removedCount += 1;
  console.log(`[dev-cache] limpiado: ${path.relative(rootDir, dir)}`);
}

if (removedCount === 0) {
  console.log('[dev-cache] no habia cache de vite para limpiar');
} else {
  console.log(`[dev-cache] cache limpiada (${removedCount} carpeta${removedCount > 1 ? 's' : ''})`);
}
