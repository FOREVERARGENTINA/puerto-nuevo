#!/usr/bin/env node

/**
 * Script para detectar mojibakes y problemas de codificación
 * Uso: node scripts/check-encoding.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Patrones comunes de mojibake (UTF-8 mal interpretado como Latin-1)
const mojibakePatterns = [
  { pattern: /Ã©/g, correct: 'é', name: 'é con mojibake' },
  { pattern: /Ã¡/g, correct: 'á', name: 'á con mojibake' },
  { pattern: /Ã³/g, correct: 'ó', name: 'ó con mojibake' },
  { pattern: /Ãº/g, correct: 'ú', name: 'ú con mojibake' },
  { pattern: /Ã­/g, correct: 'í', name: 'í con mojibake' },
  { pattern: /Ã±/g, correct: 'ñ', name: 'ñ con mojibake' },
  { pattern: /Â¿/g, correct: '¿', name: '¿ con mojibake' },
  { pattern: /Â¡/g, correct: '¡', name: '¡ con mojibake' },
  { pattern: /sÃºbelo/g, correct: 'súbelo', name: 'súbelo' },
  { pattern: /peg(Ã¡|a)/g, correct: 'pegá', name: 'pegá' }
];

// Directorios a escanear
const dirsToScan = ['src'];

// Extensiones de archivo a verificar
const extensionsToCheck = ['.js', '.jsx', '.css', '.html', '.md'];

let filesWithIssues = [];
let totalFilesScanned = 0;

function scanDirectory(dir) {
  const items = fs.readdirSync(dir);

  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // Ignorar node_modules, dist, build
      if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
        scanDirectory(fullPath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (extensionsToCheck.includes(ext)) {
        checkFile(fullPath);
      }
    }
  });
}

function checkFile(filePath) {
  totalFilesScanned++;

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];

    // Verificar cada patrón de mojibake
    mojibakePatterns.forEach(({ pattern, correct, name }) => {
      const matches = content.match(pattern);
      if (matches) {
        issues.push({
          pattern: name,
          count: matches.length,
          correct: correct
        });
      }
    });

    if (issues.length > 0) {
      filesWithIssues.push({
        file: filePath,
        issues: issues
      });
    }
  } catch (error) {
    console.error(`❌ Error leyendo ${filePath}:`, error.message);
  }
}

// Ejecutar escaneo
console.log('=== DETECTOR DE MOJIBAKES ===\n');

dirsToScan.forEach(dir => {
  if (fs.existsSync(dir)) {
    scanDirectory(dir);
  }
});

// Mostrar resultados
console.log(`\n--- RESUMEN ---`);
console.log(`Archivos escaneados: ${totalFilesScanned}`);

if (filesWithIssues.length === 0) {
  console.log('\n[OK] No se encontraron mojibakes. Codificacion UTF-8 correcta.\n');
  process.exit(0);
} else {
  console.log(`Archivos con problemas: ${filesWithIssues.length}\n`);

  filesWithIssues.forEach(({ file, issues }) => {
    console.log(`[MOJIBAKE] ${file}`);
    issues.forEach(({ pattern, count, correct }) => {
      console.log(`  - ${pattern} (${count} ocurrencias) -> deberia ser: ${correct}`);
    });
    console.log('');
  });

  console.log('[ACCION] Para corregir automaticamente:');
  console.log('  npm run fix:encoding        (dry-run)');
  console.log('  npm run fix:encoding -- --apply   (aplicar)\n');

  process.exit(1);
}
