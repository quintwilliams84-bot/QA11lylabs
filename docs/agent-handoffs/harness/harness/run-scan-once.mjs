// Staging diagnostic harness (Rev 5): drives the REAL runner contract
// once.
//   runScan(raw, { signal, timeoutMs = 90000 }) -> Promise<{ lh, axe }>
// There is no submit/status/cancel service; this harness is the caller
// the module contract assumes. It makes exactly ONE call, with the
// synthetic target, under harness-imposed outer bounds the module
// itself does not provide:
//   - timeoutMs is fixed at 90000 (the module does not range-validate
//     caller overrides; this harness rejects any other value)
//   - caller cancellation: AbortController at OUTER_DEADLINE_MS
//   - the supervisor (supervise.sh) adds the hard stop and cleanup
// Environment gates run BEFORE any runner code is imported and BEFORE
// any runtime identity file (job.json) is written: credential-bearing
// env, production paths, unresolved containment, or a missing pairing
// approval record abort the run with a BLOCKED result and the scan is
// never attempted.
// Rev 5 changes per Codex's client-readiness review of 1ce5e4c8:
//   - the resolved scan value is VALIDATED against the bounded
//     { lh, axe } contract; a malformed result is a FAIL, never a
//     PASS by resolution alone;
//   - env gate rejects any credential-pattern variable, not only
//     AGENTMAIL_*; containment is checked on realpaths with a
//     separator boundary (sibling and symlink escapes rejected);
//   - the pairing gate requires an operator-supplied approval record
//     whose path matches STAGE_PAIRING_PATH, not the bare string;
//   - job.json is written only after the env gate passes.
import { writeFile, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';

const TARGET = 'https://example.com';
const TIMEOUT_MS = 90000;
const OUTER_DEADLINE_MS = 180000;

const out = { stages: {}, result: null, error: null };
const stage = (name, status, detail) => { out.stages[name] = { status, detail }; };

const CREDENTIAL_ENV = /(^AGENTMAIL_|KEY|TOKEN|SECRET|PASSWORD|PASSWD|AUTH|CREDENTIAL|PRIVATE|BEARER|SESSION|COOKIE|APIKEY|API_KEY)/i;
const PAIRING_PATHS = { manifests: 'a', 'captured-runtime': 'b' };

async function envGate() {
  const problems = [];
  for (const key of Object.keys(process.env)) {
    if (CREDENTIAL_ENV.test(key)) problems.push(`credential-pattern env present: ${key}`);
  }
  let stageRoot = process.env.STAGE_ROOT || '';
  let releaseDir = process.env.STAGE_RELEASE_DIR || '';
  if (!stageRoot || !releaseDir) {
    problems.push('STAGE_ROOT and STAGE_RELEASE_DIR are required');
    return problems;
  }
  try { stageRoot = await realpath(stageRoot); } catch { problems.push('STAGE_ROOT does not resolve'); }
  try { releaseDir = await realpath(releaseDir); } catch { problems.push('STAGE_RELEASE_DIR does not resolve'); }
  if (!problems.length) {
    const inside = releaseDir === stageRoot || releaseDir.startsWith(stageRoot + path.sep);
    if (!inside) problems.push('release copy must resolve inside $STAGE_ROOT (sibling/symlink escapes rejected)');
    const rootPath = stageRoot === '/root' || stageRoot.startsWith('/root' + path.sep) ||
      releaseDir === '/root' || releaseDir.startsWith('/root' + path.sep);
    if (rootPath) problems.push('production path referenced');
  }
  // Pairing gate: STAGE_PAIRING_PATH names the path; a separate
  // operator-supplied approval record must confirm it.
  const named = process.env.STAGE_PAIRING_PATH;
  const approvalFile = process.env.STAGE_PAIRING_APPROVAL_FILE;
  if (!PAIRING_PATHS[named]) {
    problems.push('pairing gate unresolved: STAGE_PAIRING_PATH must name the approved pairing path');
  } else if (!approvalFile) {
    problems.push('pairing gate unresolved: STAGE_PAIRING_APPROVAL_FILE (approval record) is required');
  } else {
    try {
      const approval = JSON.parse(await readFile(approvalFile, 'utf8'));
      if (approval.path !== PAIRING_PATHS[named]) problems.push('pairing approval record path does not match STAGE_PAIRING_PATH');
      if (!approval.approved_by || !approval.approved_at) problems.push('pairing approval record lacks approved_by/approved_at');
    } catch (e) {
      problems.push(`pairing approval record unreadable (${e.code || e.message})`);
    }
  }
  return problems;
}

// Bounded result contract (Arch's reviewed runner contract): the
// resolved value must be { lh: {score, contrast, viewport},
// axe: {violations, passes, pageTitle, metaDesc} } with score a
// number in [0,1] or null, violations <= 250 entries, passes <= 500.
function validateResult(value) {
  const errs = [];
  if (!value || typeof value !== 'object') return ['result is not an object'];
  const { lh, axe } = value;
  if (!lh || typeof lh !== 'object') errs.push('lh missing or not an object');
  else {
    if (!(lh.score === null || (typeof lh.score === 'number' && lh.score >= 0 && lh.score <= 1))) errs.push('lh.score is neither null nor a number in [0,1]');
    for (const k of ['contrast', 'viewport']) {
      if (!(k in lh) || !(lh[k] === null || typeof lh[k] === 'string' || typeof lh[k] === 'number' || typeof lh[k] === 'boolean')) errs.push(`lh.${k} missing or wrong type`);
    }
  }
  if (!axe || typeof axe !== 'object') errs.push('axe missing or not an object');
  else {
    if (!Array.isArray(axe.violations) || axe.violations.length > 250) errs.push('axe.violations not an array of <= 250');
    if (!Array.isArray(axe.passes) || axe.passes.length > 500) errs.push('axe.passes not an array of <= 500');
    if (typeof axe.pageTitle !== 'string') errs.push('axe.pageTitle not a string');
    if (typeof axe.metaDesc !== 'string') errs.push('axe.metaDesc not a string');
  }
  return errs;
}

const problems = await envGate();
if (problems.length) {
  stage('env-gate', 'BLOCKED', problems.join('; '));
  out.overall = 'BLOCKED';
  await writeFile(path.join(process.env.STAGE_ROOT || '.', 'result.json'), JSON.stringify(out, null, 2));
  console.log('BLOCKED', problems.join('; '));
  process.exit(3);
}
stage('env-gate', 'PASS', 'env clean; containment resolved; pairing path approved: ' + process.env.STAGE_PAIRING_PATH);

// Job identity for the supervisor, written only AFTER the env gate:
// (pid, /proc starttime) is the trusted pair every later stop decision
// re-verifies together with the scope unit that owns the process.
try {
  const stat = await readFile(`/proc/${process.pid}/stat`, 'utf8');
  const starttime = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
  await writeFile(path.join(process.env.STAGE_ROOT, 'job.json'),
    JSON.stringify({ job_id: process.env.STAGE_JOB_ID || 'unassigned', pid: process.pid, proc_starttime: starttime }));
} catch { /* identity unavailable: supervisor records IDENTITY UNKNOWN and readiness is blocked */ }

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
  const contractErrs = validateResult(value);
  if (contractErrs.length) {
    out.error = 'result contract violation: ' + contractErrs.join('; ');
    stage('scan', 'FAIL', out.error);
    out.overall = 'FAIL';
  } else {
    // Record the result field-for-field. A null lh.score is recorded
    // as null: it is neither Lighthouse success proof nor a run
    // failure; the lh-score stage reports NOT RUN for it.
    out.result = value;
    stage('scan', 'PASS', 'promise resolved; result satisfies the bounded {lh, axe} contract');
    stage('lh-score', typeof value.lh.score === 'number' ? 'PASS' : 'NOT RUN', `lh.score = ${value.lh.score}`);
    out.overall = 'PASS';
  }
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
