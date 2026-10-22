// Module-load audit preload (node --require). Enforces the packet's
// isolation boundary during a staging run: every module the harness
// process loads must resolve inside the assembled release copy
// ($STAGE_RELEASE_DIR) or be a Node builtin. An out-of-boundary load
// aborts the process BEFORE the scan call. Every load is appended to
// $STAGE_AUDIT_LOG for the run evidence.
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');

const releaseDir = process.env.STAGE_RELEASE_DIR;
const auditLog = process.env.STAGE_AUDIT_LOG;
if (!releaseDir || !auditLog) {
  console.error('audit-preload: STAGE_RELEASE_DIR and STAGE_AUDIT_LOG are required');
  process.exit(64);
}
const builtins = new Set(Module.builtinModules.flatMap(m => [m, m.replace(/^node:/, '')]));
const origLoad = Module._load;
Module._load = function (request, parent, isMain) {
  const resolved = Module._resolveFilename(request, parent, isMain);
  const isBuiltin = builtins.has(request) || String(resolved).startsWith('node:');
  if (!isBuiltin) {
    const rel = path.relative(releaseDir, resolved);
    const inside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
    // The harness's own files live beside the release copy under the
    // staging root; they are allowlisted explicitly by the runbook.
    const harnessOk = process.env.STAGE_HARNESS_DIR &&
      !path.relative(process.env.STAGE_HARNESS_DIR, resolved).startsWith('..');
    fs.appendFileSync(auditLog, `${inside || harnessOk ? 'ALLOW' : 'DENY'} ${resolved}\n`);
    if (!inside && !harnessOk) {
      console.error(`audit-preload: out-of-boundary module load blocked: ${resolved}`);
      process.exit(65);
    }
  }
  return origLoad.apply(this, arguments);
};
