// Scans every client .jsx file: collects imported/locally-defined names,
// then reports Capitalized JSX tags used but never defined. This is the bug
// class Rollup can't catch (valid JS, runtime ReferenceError only).
import fs from 'fs';
import path from 'path';

const SRC = 'C:/Users/sonu kumar/OneDrive - Lovely Professional University/Desktop/spotnplay/spot-N-play-deploy-esports/playnsports/client/src';
const GLOBALS = new Set(['React', 'Fragment', 'StrictMode', 'Suspense']);

// Usage: node tests/scan-jsx.mjs [--strict]
// Catches the bug class Rollup can't: a Capitalized JSX tag with no import
// or local definition is valid JS (possible global), so the build passes —
// then the browser throws ReferenceError and (if it's in App.jsx) the whole
// app goes to a blank screen. Exits 1 in --strict mode when anything is found.

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!['dist', 'node_modules'].includes(e.name)) walk(p); }
    else if (e.name.endsWith('.jsx')) files.push(p);
  }
};
walk(SRC);

let problems = 0;
for (const f of files) {
  let src = fs.readFileSync(f, 'utf8');
  // Blank string/template contents FIRST (length-preserving, so reported
  // line numbers still match the file) — otherwise a "/*" inside a string
  // like accept="image/*" pairs with a later real */ and the "comment"
  // strip below eats live code between them.
  src = src.replace(/(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')/g, (m) => (m[0] || '"') + ' '.repeat(Math.max(0, m.length - 2)) + (m[0] || '"'));
  // Strip comments — <Tags> in doc comments (e.g. "drop <Sidebar />")
  // are not code and must not be reported.
  src = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"\/])\/\/.*$/gm, '$1');
  const defined = new Set(GLOBALS);
  for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s+from/g)) defined.add(m[1]);
  // Mixed default + named: import SubEventFields, { x } from '...'
  for (const m of src.matchAll(/import\s+([A-Za-z_$][\w$]*)\s*,/g)) defined.add(m[1]);
  for (const m of src.matchAll(/import\s*\{([^}]+)\}\s*from/g))
    for (const n of m[1].split(',')) { const id = n.trim().split(/\s+as\s+/).pop().trim(); if (/^[A-Za-z_$][\w$]*$/.test(id)) defined.add(id); }
  for (const m of src.matchAll(/import\s*\*\s*as\s+([A-Za-z_$][\w$]*)/g)) defined.add(m[1]);
  for (const m of src.matchAll(/const\s+([A-Z][\w$]*)\s*=/g)) defined.add(m[1]);
  for (const m of src.matchAll(/function\s+([A-Z][\w$]*)\s*\(/g)) defined.add(m[1]);
  for (const m of src.matchAll(/class\s+([A-Z][\w$]*)\s/g)) defined.add(m[1]);
  // Destructured renames: ({ icon: Icon }), ([id, label, Icon]), { X: Y }
  // (note: ] must be escaped/positioned so it doesn't close the class early)
  for (const m of src.matchAll(/[{\[,\s]([a-z_$][\w$]*)\s*:\s*([A-Z][\w$]*)/g)) defined.add(m[2]);
  for (const m of src.matchAll(/\[\s*[^\]]*\b([A-Z][\w$]*)\s*[,\]]/g)) defined.add(m[1]);
  const used = new Set();
  for (const m of src.matchAll(/<([A-Z][\w$]*)/g)) used.add(m[1]);
  const missing = [...used].filter((u) => !defined.has(u));
  if (missing.length) {
    problems++;
    console.log(`${path.relative(SRC, f)}: POSSIBLY UNDEFINED -> ${missing.join(', ')}`);
  }
}
console.log(problems ? `\n${problems} file(s) need review` : '\nCLEAN: every JSX tag resolves to an import or local definition');
if (problems && process.argv.includes('--strict')) process.exit(1);
