#!/usr/bin/env node
/**
 * Normalize source files to UTF-8 (fix Windows-1252 / Latin-1 saved files).
 *
 * Usage:
 *  - Dry run (default): node scripts/fixSourceEncoding.js
 *  - Apply changes:      node scripts/fixSourceEncoding.js --apply
 *  - Limit roots:        node scripts/fixSourceEncoding.js --roots=src,functions,scripts
 *  - Limit extensions:   node scripts/fixSourceEncoding.js --ext=js,jsx,css,html
 */
import fs from 'fs';
import path from 'path';

const argv = process.argv.slice(2);
const APPLY = argv.includes('--apply');

const rootsArg = argv.find(arg => arg.startsWith('--roots='));
const roots = rootsArg
  ? rootsArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean)
  : ['src', 'functions', 'scripts', 'public', 'datos'];

const extArg = argv.find(arg => arg.startsWith('--ext='));
const extensions = new Set(
  (extArg
    ? extArg.split('=')[1].split(',').map(s => s.trim())
    : ['js', 'jsx', 'ts', 'tsx', 'css', 'html', 'md', 'json', 'cjs', 'mjs', 'txt']
  ).filter(Boolean).map(s => s.startsWith('.') ? s.toLowerCase() : `.${s.toLowerCase()}`)
);

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git', '.firebase', '.claude']);

const CP1252_MAP = {
  0x80: '€',
  0x82: '‚',
  0x83: 'ƒ',
  0x84: '„',
  0x85: '…',
  0x86: '†',
  0x87: '‡',
  0x88: 'ˆ',
  0x89: '‰',
  0x8A: 'Š',
  0x8B: '‹',
  0x8C: 'Œ',
  0x8E: 'Ž',
  0x91: '‘',
  0x92: '’',
  0x93: '“',
  0x94: '”',
  0x95: '•',
  0x96: '–',
  0x97: '—',
  0x98: '˜',
  0x99: '™',
  0x9A: 'š',
  0x9B: '›',
  0x9C: 'œ',
  0x9E: 'ž',
  0x9F: 'Ÿ'
};

const decodeCP1252 = (buffer) => {
  let result = '';
  for (const byte of buffer) {
    if (byte < 0x80) {
      result += String.fromCharCode(byte);
    } else if (byte >= 0x80 && byte <= 0x9F) {
      result += CP1252_MAP[byte] || String.fromCharCode(byte);
    } else {
      result += String.fromCharCode(byte);
    }
  }
  return result;
};

const isUtf8 = (buffer) => {
  try {
    const decoder = new TextDecoder('utf-8', { fatal: true });
    decoder.decode(buffer);
    return true;
  } catch (_err) {
    return false;
  }
};

const looksBinary = (buffer) => buffer.includes(0);

const walk = (dir, files = []) => {
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(fullPath, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (extensions.has(ext)) {
        files.push(fullPath);
      }
    }
  }
  return files;
};

let scanned = 0;
let invalid = 0;
let converted = 0;

const truncate = (value, length = 120) => {
  if (value.length <= length) return value;
  return `${value.slice(0, length)}…`;
};

const processFile = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  if (!buffer.length || looksBinary(buffer)) return;
  scanned += 1;
  if (isUtf8(buffer)) return;

  invalid += 1;
  const decoded = decodeCP1252(buffer);
  const preview = truncate(decoded.replace(/\s+/g, ' '));
  console.log(`[${APPLY ? 'fix' : 'check'}] ${filePath} -> "${preview}"`);
  if (!APPLY) return;

  fs.writeFileSync(filePath, decoded, 'utf8');
  converted += 1;
};

const main = () => {
  const files = roots.flatMap(root => walk(root));
  console.log(`Scanning ${files.length} files...`);
  files.forEach(processFile);
  console.log('\nDone.');
  console.log(`Files scanned: ${scanned}`);
  console.log(`Invalid UTF-8 files: ${invalid}`);
  if (APPLY) console.log(`Files converted: ${converted}`);
  if (!APPLY) console.log('Dry run only. Re-run with --apply to write changes.');
};

main();
