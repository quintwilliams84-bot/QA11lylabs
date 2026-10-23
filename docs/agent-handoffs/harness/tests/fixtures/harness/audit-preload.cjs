// Module-load audit preload (node --require). EVIDENCE LOGGING ONLY.
// This preload is NOT a security boundary and must never be described
// as one (Codex client-readiness review of 1ce5e4c8): it observes
// CommonJS module loads in this process only; it does not intercept
// ESM imports, child processes, or network access, and it provides no
// confinement. Confinement is the supervisor's systemd scope, verified
// by confinement-check.mjs before the runner is imported.
// What it does: every CommonJS load is appended to $STAGE_AUDIT_LOG,
// and a load resolving outside the assembled release copy
// ($STAGE_RELEASE_DIR, realpath-checked) or the harness directory is
// logged DENY and aborts the process as a tripwire. The log is the
// evidence; the abort is a tripwire, not a boundary.
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const releaseDir = process.env.STAGE_RELEASE_DIR;
const auditLog = process.env.STAGE_AUDIT_LOG;
if (!releaseDir || !auditLog) {
  console.error('audit-preload: STAGE_RELEASE_DIR and STAGE_AUDIT_LOG are required');
  process.exit(64);
}
const realRelease = fs.realpathSync(releaseDir);
const realHarness = process.env.STAGE_HARNESS_DIR ? fs.realpathSync(process.env.STAGE_HARNESS_DIR) : null;
const inside = (base, p) => p === base || p.startsWith(base + path.sep);
const builtins = new Set(Module.builtinModules.flatMap(m => [m, m.replace(/^node:/, '')]));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  const isBuiltin = builtins.has(request) || String(resolved).startsWith('node:');
  if (!isBuiltin) {
    let real = resolved;
    try { real = fs.realpathSync(resolved); } catch { /* keep unresolved path; containment fails closed below */ }
    const inRelease = inside(realRelease, real);
    const inHarness = realHarness ? inside(realHarness, real) : false;
    fs.appendFileSync(auditLog, `${inRelease || inHarness ? 'ALLOW' : 'DENY'} ${resolved}\n`);
    if (!inRelease && !inHarness) {
      console.error(`audit-preload: out-of-boundary module load (tripwire): ${resolved}`);
      process.exit(65);
    }
  }
  return origLoad.apply(this, arguments);
};
