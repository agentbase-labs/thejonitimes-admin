#!/usr/bin/env node
/**
 * Copy the articles DB from the main TheJoniTimes project.
 * Intended to be cronable (nightly).
 */
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..', '..', 'thejonitimes', 'data', 'articles.db');
const DST = path.resolve(__dirname, '..', 'data', 'articles.db');

if (!fs.existsSync(SRC)) {
  console.error(`! Source not found: ${SRC}`);
  process.exit(1);
}
const destDir = path.dirname(DST);
if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

fs.copyFileSync(SRC, DST);
const { size } = fs.statSync(DST);
console.log(`✓ Copied articles.db (${(size / 1024).toFixed(1)} KB) -> ${DST}`);
