// Staging diagnostic harness: drives the REAL runner contract once.
//   runScan(raw, { signal, timeoutMs = 90000 }) -> Promise<{ lh, axe }>
// There is no submit/status/cancel service; this harness is the caller
// the module contract assumes. It makes exactly ONE call, with the
// synthetic target, under harness-imposed outer bounds the module
// itself does not provide:
//   - timeoutMs is fixed at 90000 (the module does not range-validate
//     caller overrides; this harness rejects any other value)
//   - caller cancellation: AbortController at OUTER_DEADLINE_MS
//   - the supervisor (supervise.sh) adds the hard stop and cleanup
// Environment gates run BEFORE any runner code is imported: production
// credentials, production paths, or a missing pairing resolution abort
// the run with a BLOCKED result and the scan is never attempted.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const TARGET = 'https://example.com';
const TIMEOUT_MS = 90000;
const OUTER_DEADLINE_MS = 180000;

const out = { stages: {}, result: null, error: null };
const stage = (name, status, detail) => { out.stages[name] = { status, detail }; };

function envGate() {
  const problems = [];
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('AGENTMAIL_')) problems.push(`forbidden env present: ${key}`);
  }
  const releaseDir = process.env.STAGE_RELEASE_DIR || '';
  const stageRoot = process.env.STAGE_ROOT || '';
  if (!stageRoot || !releaseDir.startsWith(stageRoot)) problems.push('release copy must live under $STAGE_ROOT');
  if (releaseDir.startsWith('/root') || stageRoot.startsWith('/root')) problems.push('production path referenced');
  if (process.env.STAGE_PAIRING_PATH !== 'manifests' && process.env.STAGE_PAIRING_PATH !== 'captured-runtime') {
    problems.push('pairing gate unresolved: STAGE_PAIRING_PATH must name the approved pairing path');
  }
  return problems;
}

// Job identity for the supervisor: (pid, /proc starttime) is the
// trusted pair every later stop/kill decision re-verifies.
try {
  const stat = await (await import('node:fs/promises')).readFile(`/proc/${process.pid}/stat`, 'utf8');
  const starttime = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
  await writeFile(path.join(process.env.STAGE_ROOT || '.', 'job.json'),
    JSON.stringify({ job_id: process.env.STAGE_JOB_ID || 'unassigned', pid: process.pid, proc_starttime: starttime }));
} catch { /* identity unavailable: supervisor treats stops as unverifiable */ }

const problems = envGate();
if (problems.length) {
  stage('env-gate', 'BLOCKED', problems.join('; '));
  out.overall = 'BLOCKED';
  await writeFile(path.join(process.env.STAGE_ROOT || '.', 'result.json'), JSON.stringify(out, null, 2));
  console.log('BLOCKED', problems.join('; '));
  process.exit(3);
}
stage('env-gate', 'PASS', 'allowlist clean; pairing path: ' + process.env.STAGE_PAIRING_PATH);

const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const runnerPath = path.join(process.env.STAGE_RELEASE_DIR, 'runner.cjs');
let runScan;
try {
  ({ runScan } = require(runnerPath));
  if (typeof runScan !== 'function') throw new Error('runScan export missing');
  stage('load', 'PASS', 'runner loaded under audit preload');
} catch (e) {
  stage('load', 'FAIL', String(e && e.message || e));
  out.overall = 'FAIL';
  await writeFile(path.join(process.env.STAGE_ROOT, 'result.json'), JSON.stringify(out, null, 2));
  process.exit(2);
}

const controller = new AbortController();
const killer = setTimeout(() => controller.abort(new Error('outer deadline 180s')), OUTER_DEADLINE_MS);
const started = Date.now();
try {
  const value = await runScan(TARGET, { signal: controller.signal, timeoutMs: TIMEOUT_MS });
  out.elapsed_ms = Date.now() - started;
  // Record the result field-for-field. A null lh.score is recorded as
  // null: it is neither Lighthouse success proof nor a run failure.
  out.result = value;
  stage('scan', 'PASS', 'promise resolved; result recorded verbatim');
  stage('lh-score', value && value.lh && typeof value.lh.score === 'number' ? 'PASS' : 'NOT RUN',
    value && value.lh ? `lh.score = ${value.lh.score}` : 'no lh object returned');
  out.overall = 'PASS';
} catch (e) {
  out.elapsed_ms = Date.now() - started;
  out.error = String(e && e.message || e);
  stage('scan', 'FAIL', out.error);
  out.overall = 'FAIL';
} finally {
  clearTimeout(killer);
}
await writeFile(path.join(process.env.STAGE_ROOT, 'result.json'), JSON.stringify(out, null, 2));
console.log(out.overall, JSON.stringify(out.stages));
process.exit(out.overall === 'PASS' ? 0 : 2);
