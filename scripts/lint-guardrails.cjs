#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const FUNCTIONS_DIR = path.join(ROOT, 'functions');
const INDEX_FILE = path.join(FUNCTIONS_DIR, 'index.js');

const violations = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules') continue;
      files.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files;
}

function report(filePath, line, message) {
  const relative = path.relative(ROOT, filePath).replace(/\\/g, '/');
  violations.push(`${relative}:${line} ${message}`);
}

function checkMaskedEmailLogs(filePath, source) {
  const lines = source.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!/console\.(log|warn|error)\(/.test(line)) continue;

    const hasRawEmailInterpolation = /\$\{\s*email\s*\}/.test(line);
    const hasRawEmailArg = /\(\s*email\s*[),]/.test(line) || /,\s*email\s*[),]/.test(line);
    const hasMask = /maskEmail\s*\(\s*email\s*\)/.test(line);

    if ((hasRawEmailInterpolation || hasRawEmailArg) && !hasMask) {
      report(filePath, i + 1, 'Logs con email deben usar maskEmail(email)');
    }
  }
}

function checkCallableValidation(indexSource) {
  const callableExportRegex = /exports\.(\w+)\s*=\s*onCallWithCors\s*\(\s*async\s*\(request\)\s*=>\s*\{/g;
  const matches = [];
  let match = callableExportRegex.exec(indexSource);

  while (match) {
    matches.push({ name: match[1], start: match.index });
    match = callableExportRegex.exec(indexSource);
  }

  for (let i = 0; i < matches.length; i += 1) {
    const current = matches[i];
    const next = matches[i + 1];
    const end = next ? next.start : indexSource.length;
    const block = indexSource.slice(current.start, end);

    if (!/ensureDataObject\s*\(\s*request\.data/.test(block)) {
      const prefix = indexSource.slice(0, current.start);
      const line = prefix.split(/\r?\n/).length;
      report(INDEX_FILE, line, `Callable ${current.name} debe validar request.data con ensureDataObject(...)`);
    }
  }
}

function main() {
  if (!fs.existsSync(FUNCTIONS_DIR)) {
    console.error('No se encontro directorio functions/');
    process.exit(1);
  }

  const functionFiles = walk(path.join(FUNCTIONS_DIR, 'src')).concat([INDEX_FILE]);
  for (const file of functionFiles) {
    if (!fs.existsSync(file)) continue;
    const source = fs.readFileSync(file, 'utf8');
    checkMaskedEmailLogs(file, source);
  }

  if (!fs.existsSync(INDEX_FILE)) {
    console.error('No se encontro functions/index.js');
    process.exit(1);
  }

  const indexSource = fs.readFileSync(INDEX_FILE, 'utf8');
  checkCallableValidation(indexSource);

  if (violations.length > 0) {
    console.error('Guardrails: se encontraron violaciones');
    for (const violation of violations) {
      console.error(`- ${violation}`);
    }
    process.exit(1);
  }

  console.log('Guardrails: OK');
}

main();
