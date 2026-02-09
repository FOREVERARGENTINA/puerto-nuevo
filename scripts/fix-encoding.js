#!/usr/bin/env node

/**
 * Script para corregir mojibakes automáticamente
 * Estrategia: Re-decode UTF-8 mal interpretado como Latin-1
 *
 * Uso:
 *   node scripts/fix-encoding.js          (dry-run, solo preview)
 *   node scripts/fix-encoding.js --apply  (aplica cambios)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const APPLY_CHANGES = process.argv.includes('--apply');

// Mapeo de mojibakes UTF-8 mal interpretado como Latin-1
// Fuente: caracteres UTF-8 de 2 bytes interpretados como Latin-1
const MOJIBAKE_MAP = {
  // Minúsculas con tilde
  'Ã¡': 'á',  // U+00E1 (á) = C3 A1 en UTF-8
  'Ã©': 'é',  // U+00E9 (é) = C3 A9
  'Ã­': 'í',  // U+00ED (í) = C3 AD
  'Ã³': 'ó',  // U+00F3 (ó) = C3 B3
  'Ãº': 'ú',  // U+00FA (ú) = C3 BA

  // Mayúsculas con tilde
  'Ã\u0081': 'Á',  // U+00C1 (Á) = C3 81
  'Ã\u0089': 'É',  // U+00C9 (É) = C3 89
  'Ã\u008d': 'Í',  // U+00CD (Í) = C3 8D
  'Ã\u0093': 'Ó',  // U+00D3 (Ó) = C3 93
  'Ã\u009a': 'Ú',  // U+00DA (Ú) = C3 9A

  // Ñ/ñ
  'Ã±': 'ñ',  // U+00F1 (ñ) = C3 B1
  'Ã\u0091': 'Ñ',  // U+00D1 (Ñ) = C3 91

  // Signos de puntuación
  'Â¿': '¿',  // U+00BF (¿) = C2 BF
  'Â¡': '¡'   // U+00A1 (¡) = C2 A1
};

const DIRS_TO_SCAN = ['src'];
const FILE_EXTENSIONS = ['.js', '.jsx', '.css', '.html', '.md'];
const IGNORE_DIRS = ['node_modules', 'dist', 'build', '.git'];

const stats = {
  filesScanned: 0,
  filesWithChanges: 0,
  totalReplacements: 0,
  changedFiles: []
};

/**
 * Aplica correcciones de mojibake a un string
 */
function fixMojibakes(content) {
  let fixed = content;
  let replacements = 0;

  // Ordenar las claves por longitud descendente para evitar reemplazos parciales
  const sortedKeys = Object.keys(MOJIBAKE_MAP).sort((a, b) => b.length - a.length);

  for (const mojibake of sortedKeys) {
    const correct = MOJIBAKE_MAP[mojibake];
    const regex = new RegExp(escapeRegex(mojibake), 'g');
    const matches = fixed.match(regex);

    if (matches) {
      fixed = fixed.replace(regex, correct);
      replacements += matches.length;
    }
  }

  return { fixed, replacements };
}

/**
 * Escapa caracteres especiales para regex
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Procesa un archivo individual
 */
function processFile(filePath) {
  stats.filesScanned++;

  try {
    const originalContent = fs.readFileSync(filePath, 'utf8');
    const { fixed, replacements } = fixMojibakes(originalContent);

    if (replacements > 0) {
      stats.filesWithChanges++;
      stats.totalReplacements += replacements;
      stats.changedFiles.push({
        path: filePath,
        replacements
      });

      if (APPLY_CHANGES) {
        fs.writeFileSync(filePath, fixed, { encoding: 'utf8' });
        console.log(`[APLICADO] ${filePath} (${replacements} correcciones)`);
      } else {
        console.log(`[PREVIEW] ${filePath} (${replacements} correcciones pendientes)`);
      }
    }
  } catch (error) {
    console.error(`[ERROR] ${filePath}: ${error.message}`);
  }
}

/**
 * Escanea directorio recursivamente
 */
function scanDirectory(dir) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORE_DIRS.includes(item)) {
        scanDirectory(fullPath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (FILE_EXTENSIONS.includes(ext)) {
        processFile(fullPath);
      }
    }
  }
}

// Ejecutar
console.log(APPLY_CHANGES
  ? '=== MODO: APLICAR CAMBIOS ==='
  : '=== MODO: DRY RUN (preview) ==='
);
console.log('');

for (const dir of DIRS_TO_SCAN) {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
}

// Resumen
console.log('\n--- RESUMEN ---');
console.log(`Archivos escaneados: ${stats.filesScanned}`);
console.log(`Archivos con cambios: ${stats.filesWithChanges}`);
console.log(`Total de correcciones: ${stats.totalReplacements}`);

if (stats.filesWithChanges > 0) {
  console.log('\nArchivos afectados:');
  stats.changedFiles.forEach(({ path: p, replacements }) => {
    console.log(`  - ${p} (${replacements} correcciones)`);
  });

  if (!APPLY_CHANGES) {
    console.log('\n[INFO] Este fue un dry-run. Para aplicar cambios ejecuta:');
    console.log('  npm run fix:encoding -- --apply');
  } else {
    console.log('\n[OK] Cambios aplicados. Revisa con: git diff');
  }
} else {
  console.log('\n[OK] No se encontraron mojibakes.');
}

process.exit(stats.filesWithChanges > 0 && !APPLY_CHANGES ? 1 : 0);
