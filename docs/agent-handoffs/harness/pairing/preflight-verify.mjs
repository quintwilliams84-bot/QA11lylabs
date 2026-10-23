// Preflight pairing verifier for the staging diagnostic packet (Rev 5).
// Read-only. Rechecks every manifest entry against a target install
// and prints PASS / FAIL / BLOCKED per item. Exit codes: 0 = every
// checkable item PASS and the pairing gate resolved by an operator
// supplied approval record; 2 = FAIL (identity or schema broken);
// 3 = BLOCKED (gate unresolved or an item could not be inspected).
// This verifier NEVER creates or implies an approval. The gate
// resolves only when --pairing-approval names a record file supplied
// by the operator: JSON { path: "a"|"b", approved_by, approved_at }.
// (Path "a" = manifests/locks; path "b" = captured-runtime pairing.)
// Rev 5 changes per Codex's client-readiness review of 1ce5e4c8:
//   - manifest schema is validated first: every digest must be a full
//     64-char lowercase hex SHA-256 (the Rev 4 worker.cjs digest was
//     truncated at 52 chars and passed silently);
//   - absence/read checks distinguish ENOENT from permission and
//     other errors, and name the error code in the result detail;
//   - the pairing gate has a coherent resolved path (approval record)
//     instead of being BLOCKED unconditionally.
// Usage: node preflight-verify.mjs --manifest pairing.manifest.json \
//          --release-root $RELEASE_ROOT --chrome-path $CHROME_PATH \
//          [--image-id sha256:...] [--pairing-approval approval.json]
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, a, i, arr) => {
  if (a.startsWith('--')) acc.push([a.slice(2), arr[i + 1]]); return acc;
}, []));
const results = [];
const record = (item, status, detail) => results.push({ item, status, detail });
const SHA256 = /^[0-9a-f]{64}$/;

let manifest;
try {
  manifest = JSON.parse(await readFile(args.manifest, 'utf8'));
} catch (e) {
  console.log(`FAIL    manifest - unreadable or invalid JSON (${e.code || e.message})`);
  console.log('OVERALL: FAIL');
  process.exit(2);
}

// --- schema validation: a malformed identity is a FAIL, never a
// silent mismatch against a value that could never match.
let schemaOk = true;
const checkDigest = (item, value) => {
  if (typeof value !== 'string' || !SHA256.test(value)) {
    record(item, 'FAIL', `manifest schema: digest is not a full 64-char lowercase hex SHA-256 (got ${typeof value === 'string' ? value.length + ' chars' : typeof value})`);
    schemaOk = false;
  }
};
for (const f of manifest.release_files || []) checkDigest(`schema:file:${f.path}`, f.sha256);
checkDigest('schema:host-browser', manifest.host_browser && manifest.host_browser.sha256);
const imageId = manifest.worker_image && manifest.worker_image.id;
if (typeof imageId !== 'string' || !/^sha256:[0-9a-f]{64}$/.test(imageId)) {
  record('schema:worker-image', 'FAIL', 'manifest schema: worker image id is not sha256:<64 hex>');
  schemaOk = false;
}

async function sha256(file) {
  const h = createHash('sha256');
  for await (const chunk of createReadStream(file)) h.update(chunk);
  return h.digest('hex');
}
const errKind = (e) => (e && e.code) ? e.code : String(e && e.message || e);

if (schemaOk) {
  for (const f of manifest.release_files) {
    const p = path.join(args['release-root'], f.path);
    try {
      const got = await sha256(p);
      record(`file:${f.path}`, got === f.sha256 ? 'PASS' : 'FAIL',
        got === f.sha256 ? 'hash match' : `hash mismatch (got ${got.slice(0, 12)}...)`);
    } catch (e) {
      record(`file:${f.path}`, 'FAIL', `unreadable (${errKind(e)})`);
    }
  }
  for (const absent of manifest.absent_inputs) {
    try {
      await stat(path.join(args['release-root'], absent));
      record(`absent:${absent}`, 'FAIL', 'present but manifest expects absent - pairing changed, re-review');
    } catch (e) {
      if (e && e.code === 'ENOENT') record(`absent:${absent}`, 'PASS', 'still absent (ENOENT; pairing gap unchanged)');
      else record(`absent:${absent}`, 'FAIL', `absence not confirmable (${errKind(e)}); only ENOENT proves absence`);
    }
  }
  try {
    const got = await sha256(args['chrome-path']);
    const size = (await stat(args['chrome-path'])).size;
    const ok = got === manifest.host_browser.sha256 && size === manifest.host_browser.bytes;
    record('host-browser', ok ? 'PASS' : 'FAIL', ok ? 'hash and size match' : 'browser identity changed');
  } catch (e) {
    record('host-browser', 'FAIL', `browser unreadable (${errKind(e)})`);
  }
  if (args['image-id']) {
    record('worker-image', args['image-id'] === manifest.worker_image.id ? 'PASS' : 'FAIL',
      args['image-id'] === manifest.worker_image.id ? 'digest match' : 'image digest changed');
  } else {
    record('worker-image', 'BLOCKED', 'no image id supplied; run docker image inspect on the staging host');
  }
}

// --- pairing gate: resolved only by an operator-supplied approval
// record naming path (a) manifests/locks or (b) captured-runtime.
if (!args['pairing-approval']) {
  record('pairing-gate', 'BLOCKED',
    'no approval record supplied. Execution requires a named approval of manifests/locks (path a) or of the captured-runtime pairing (path b). This verifier never resolves the gate itself.');
} else {
  try {
    const approval = JSON.parse(await readFile(args['pairing-approval'], 'utf8'));
    // Binding (Rev 6): the record is operator-supplied EVIDENCE, not
    // an authenticated approval. It must bind the exact manifest
    // bytes, host and run it claims to cover; dispatch still
    // requires independently verifying the scoped authorization
    // through the approver's own channel before any run.
    const { createHash } = await import('node:crypto');
    const manifestSha = createHash('sha256').update(await readFile(args.manifest)).digest('hex');
    if (approval.manifest_sha256 !== manifestSha) approval._bindingError = 'manifest_sha256 does not match the manifest file';
    // Rev 9 (finding 6): standalone preflight REQUIRES the
    // expected host/run arguments AND a record carrying both -
    // omitting the flags must never let an unbound record pass.
    if (!args['host-id'] || !args['run-id']) approval._bindingError = 'standalone preflight requires --host-id and --run-id arguments';
    else if (!approval.host_id || !approval.run_id) approval._bindingError = 'approval record lacks host_id or run_id';
    else if (approval.host_id !== args['host-id']) approval._bindingError = 'host_id does not match --host-id';
    else if (approval.run_id !== args['run-id']) approval._bindingError = 'run_id does not match --run-id';
    const pathOk = approval.path === 'a' || approval.path === 'b';
    const whoOk = typeof approval.approved_by === 'string' && approval.approved_by.length > 0;
    const whenOk = typeof approval.approved_at === 'string' && approval.approved_at.length > 0;
    if (pathOk && whoOk && whenOk && !approval._bindingError) {
      record('pairing-gate', 'PASS',
        `path (${approval.path}) approved by ${approval.approved_by} at ${approval.approved_at} (operator-supplied record; verifier does not create approvals)`);
    } else {
      record('pairing-gate', 'FAIL', 'approval record malformed or unbound: ' + (approval._bindingError || 'requires path a|b, approved_by, approved_at, manifest_sha256, host_id, run_id'));
    }
  } catch (e) {
    record('pairing-gate', 'FAIL', `approval record unreadable (${errKind(e)})`);
  }
}

for (const r of results) console.log(`${r.status.padEnd(7)} ${r.item} - ${r.detail}`);
const hardFail = results.some(r => r.status === 'FAIL');
const blocked = results.some(r => r.status === 'BLOCKED');
console.log(hardFail ? 'OVERALL: FAIL' : blocked ? 'OVERALL: BLOCKED' : 'OVERALL: PASS');
process.exit(hardFail ? 2 : blocked ? 3 : 0);
