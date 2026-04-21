#!/usr/bin/env node
// Build script: src/bookmarklet.js → dist/bookmarklet.txt (URL-encoded javascript: URI)
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, 'bookmarklet.js'), 'utf8');

// Strip comments while respecting string literals, then collapse whitespace.
// Walks char-by-char to avoid clobbering '//' inside strings (e.g. URLs).
function stripComments(code) {
  let out = '', i = 0, inStr = '';
  while (i < code.length) {
    const ch = code[i];
    if (inStr) {
      out += ch;
      if (ch === '\\') { out += code[++i] || ''; }
      else if (ch === inStr) { inStr = ''; }
      i++; continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') {
      inStr = ch; out += ch; i++; continue;
    }
    if (ch === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && code[i + 1] === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) i++;
      i += 2; continue;
    }
    out += ch; i++;
  }
  return out;
}

const mini = stripComments(src)
  .replace(/\n\s*/g, ' ')
  .replace(/\s{2,}/g, ' ')
  .trim();

const uri = 'javascript:' + encodeURIComponent(mini);

const dist = path.join(__dirname, '..', 'dist');
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(path.join(dist, 'bookmarklet.txt'), uri);
fs.writeFileSync(path.join(dist, 'bookmarklet.min.js'), mini);

console.log(`Built bookmarklet (${uri.length} chars)`);
