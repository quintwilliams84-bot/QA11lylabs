// verify-tree.mjs (Rev 9 safeguard): compare a directory tree
// against TREE-MANIFEST.json (path -> sha256, plus the expected
// executable bit for script files). Anyone can run this against
// a fresh clone or checkout to prove an upload was not altered:
//   node tools/verify-tree.mjs <tree-dir> [manifest-path]
// Exit 0 = every manifest file present with matching hash and
// mode class AND no extra files beyond the manifest set plus
// its declared exclusions; exit 2 = any mismatch (printed).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, lstatSync, existsSync } from 'node:fs';
import path from 'node:path';

const treeDir = process.argv[2];
const manifestPath = process.argv[3] || path.join(treeDir, 'TREE-MANIFEST.json');
if (!treeDir || !existsSync(manifestPath)) {
  console.error('usage: node tools/verify-tree.mjs <tree-dir> [manifest-path]');
  process.exit(64);
}
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
let bad = 0;
// Strict set check (Rev 10): inventory the actual tree and
// reject anything the pinned manifest does not declare.
const exclusions = new Set(manifest.exclusions || []);
const manifestRel = path.relative(treeDir, manifestPath);
if (manifestRel && !manifestRel.startsWith('..')) exclusions.add(manifestRel);
const actual = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const rel = path.relative(treeDir, full);
    const st = lstatSync(full);
    if (st.isDirectory()) walk(full);
    else actual.push(rel);
  }
})(treeDir);
for (const rel of actual) {
  if (!Object.prototype.hasOwnProperty.call(manifest.files, rel) && !exclusions.has(rel)) {
    console.log(`EXTRA-FILE ${rel}`); bad++;
  }
}
for (const [rel, want] of Object.entries(manifest.files)) {
  const full = path.join(treeDir, rel);
  if (!existsSync(full)) { console.log(`MISSING ${rel}`); bad++; continue; }
  const st = lstatSync(full);
  if (!st.isFile()) { console.log(`NOT-A-FILE ${rel}`); bad++; continue; }
  const hash = createHash('sha256').update(readFileSync(full)).digest('hex');
  if (hash !== want.sha256) { console.log(`HASH-MISMATCH ${rel}`); bad++; continue; }
  const isExec = (st.mode & 0o100) !== 0;
  if (Boolean(want.executable) !== isExec) { console.log(`MODE-MISMATCH ${rel} (executable=${isExec}, manifest=${want.executable})`); bad++; }
}
console.log(bad === 0 ? `verify-tree: OK (${Object.keys(manifest.files).length} files)` : `verify-tree: ${bad} mismatch(es)`);
process.exit(bad === 0 ? 0 : 2);
