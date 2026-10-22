// Preflight pairing verifier for the staging diagnostic packet.
// Read-only. Rechecks every manifest entry against a target install
// and prints PASS / FAIL / BLOCKED per item. Exit 0 only if all
// checkable items PASS and the pairing gate is explicitly resolved.
// Usage: node preflight-verify.mjs --manifest pairing.manifest.json \
//          --release-root $RELEASE_ROOT --chrome-path $CHROME_PATH \
//          [--image-id sha256:...]  (from `docker image inspect`)
// Change-based revalidation: this IS the recheck the packet requires
// before any separately approved run.
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]); return acc;
}, []));
const manifest = JSON.parse(await readFile(args.manifest, 'utf8'));
const results = [];
const record = (item, status, detail) => results.push({ item, status, detail });

async function sha256(file) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}

for (const f of manifest.release_files) {
  const p = path.join(args['release-root'], f.path);
  try {
    const got = await sha256(p);
    record(`file:${f.path}`, got === f.sha256 ? 'PASS' : 'FAIL',
      got === f.sha256 ? 'hash match' : `hash mismatch (got ${got.slice(0, 12)}...)`);
  } catch { record(`file:${f.path}`, 'FAIL', 'missing or unreadable'); }
}
for (const absent of manifest.absent_inputs) {
  try {
    await stat(path.join(args['release-root'], absent));
    record(`absent:${absent}`, 'FAIL', 'present but manifest expects absent - pairing changed, re-review');
  } catch { record(`absent:${absent}`, 'PASS', 'still absent (pairing gap unchanged)'); }
}
try {
  const got = await sha256(args['chrome-path']);
  const size = (await stat(args['chrome-path'])).size;
  const ok = got === manifest.host_browser.sha256 && size === manifest.host_browser.bytes;
  record('host-browser', ok ? 'PASS' : 'FAIL', ok ? 'hash and size match' : 'browser identity changed');
} catch { record('host-browser', 'FAIL', 'browser missing or unreadable'); }

if (args['image-id']) {
  record('worker-image', args['image-id'] === manifest.worker_image.id ? 'PASS' : 'FAIL',
    args['image-id'] === manifest.worker_image.id ? 'digest match' : 'image digest changed');
} else {
  record('worker-image', 'BLOCKED', 'no image id supplied; run docker image inspect on the staging host');
}
record('pairing-gate', 'BLOCKED',
  'deps/package.json and deps/package-lock.json are absent. Execution requires a named approval of manifests/locks (path a) or of the captured-runtime pairing (path b). This verifier never resolves the gate itself.');

for (const r of results) console.log(`${r.status.padEnd(7)} ${r.item} - ${r.detail}`);
const hardFail = results.some(r => r.status === 'FAIL');
const blocked = results.some(r => r.status === 'BLOCKED');
console.log(hardFail ? 'OVERALL: FAIL' : blocked ? 'OVERALL: BLOCKED' : 'OVERALL: PASS');
process.exit(hardFail ? 2 : blocked ? 3 : 0);
