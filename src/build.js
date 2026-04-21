#!/usr/bin/env node
// Build script: src/bookmarklet.js → dist/bookmarklet.txt (URL-encoded javascript: URI)
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'bookmarklet.js'), 'utf8');

// Minify: strip comments, collapse whitespace (keeps it simple — no deps)
const mini = src
  .replace(/\/\/.*$/gm, '')           // line comments
  .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
  .replace(/\n\s*/g, ' ')             // collapse newlines
  .replace(/\s{2,}/g, ' ')            // collapse spaces
  .trim();

const uri = 'javascript:' + encodeURIComponent(mini);

const dist = path.join(__dirname, '..', 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'bookmarklet.txt'), uri);
fs.writeFileSync(path.join(dist, 'bookmarklet.min.js'), mini);

console.log(`Built bookmarklet (${uri.length} chars)`);
