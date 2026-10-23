// verify-tree.mjs (Rev 9 safeguard): compare a directory tree
// against TREE-MANIFEST.json (path -> sha256, plus the expected
// executable bit for script files). Anyone can run this against
// a fresh clone or checkout to prove an upload was not altered:
//   node tools/verify-tree.mjs <tree-dir> [manifest-path]
// Exit 0 = every manifest file present with matching hash and
// mode class; exit 2 = at least one mismatch (each printed).
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
