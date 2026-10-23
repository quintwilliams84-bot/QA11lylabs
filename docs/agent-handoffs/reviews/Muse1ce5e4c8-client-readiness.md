# Muse harness Revision 4 - client-pilot readiness review

Reviewer: Codex. Exact source: QA11lylabs
1ce5e4c8cb026fa8979360907db999572f9b0c02, packet/harness under
docs/agent-handoffs/. Status: CHANGES REQUESTED; not ready for isolated execution
or a real-client scan. This review did not launch/import the runner, execute the
supervisor, contact a client website, send mail, deploy or change production.

## High - supervisor success ignores failed or uncertain safety checks

harness/harness/supervise.sh lines 24, 76-78, 89-112 keep OVERALL=PASS when
HOSTCONFIG is FAIL/UNKNOWN, SCOPE_CLEAN is UNKNOWN, or container/tmp cleanup fails.
Only scope setup and post-run log size update OVERALL. The script can exit with
a successful HARNESS_EXIT despite unresolved cleanup or resource checks.
Docker/listing errors are converted into empty output by || true (27,72,93,98),
so absence of evidence can become an empty container set and then PASS.
Required: authoritative combined status; failed safety check must fail, missing
inspection stays UNKNOWN and blocks readiness. Include tested daemon-down,
permission-denied, HostConfig mismatch and failed-cleanup cases before execution.

## High - cleanup targets are not proven job-owned

Supervisor lines 27,72-79,93-106 choose containers/temp names by global before/after
difference, then remove all new running container IDs and new directory names.
Full IDs identify objects but do not establish job ownership. Concurrent workload
creation is not excluded by this code; stopped/created containers are missed by
running-only docker ps -q. A dedicated staging-host assumption is insufficient
for a reusable ownership-aware cleanup mechanism.
Required: capture trusted job-bound full resource IDs from creation, enforce owner/
job binding and inspect all relevant lifecycle states. Never remove unrelated
resources. Directory cleanup needs reviewed containment/ownership checks, bounded
operations and verification. Use finally/traps so interruption also enters cleanup.

## High - confinement and hard-stop claims are not demonstrated

Supervisor lines 31-54 check command availability and scope lookup, not the effective
namespace/filesystem/resource policy. The fallback unshare -m -n does not set up a
read-only filesystem, mount allowlist or cgroup limits. A systemd scope lookup alone
cannot prove PrivateNetwork/ProtectSystem or the claimed caps. The process is
launched before scope verification, and a failed setup does not terminate flow.
Use a supported reviewed confinement mechanism and verify it before runner import;
never proceed on missing/unsupported properties or silently weaker fallback.

Lines 57-65 compare HPID's starttime with a starttime read from the Node harness's
job.json but do not bind HPID to the recorded job.pid. Launcher and child identity
must not be assumed equivalent. The timeout may therefore fail to stop the actual
job, and lifetime handling needs the whole owned group/cgroup plus daemon resources.
No execution test of these paths was performed by Codex; require safe synthetic
launcher/child, missing-identity, timeout and interruption cases on the intended
non-production supervisor before real-browser execution.

## High - pairing verifier cannot supply the documented successful gate

harness/pairing/pairing.manifest.json line 25 has a 52-character worker.cjs digest,
not SHA-256. The correct digest in Arch cd7b561 line 36 is:
9cba6bcd5ee33840622fa37fcc0eac0ca2538c5900589ed9fa44f68dea653459.
Add schema/length validation and verify every identity against reviewed evidence.

pairing/preflight-verify.mjs lines 55-62 always add BLOCKED; no successful resolved
path exists despite runbook exit-0 requirements. Conversely the harness at
harness/run-scan-once.mjs lines 33-35 accepts a pairing-name environment string,
not verified approval or a successfully checked assembly. Define a coherent,
separately authorized operator gate without bypassing failed identity checks.
Absence checks at verifier lines 36-40 must distinguish ENOENT from permission or
other read errors. A full runnable-tree identity remains missing.

## Medium - advertised boundaries and evidence differ from implementation

- run-scan-once.mjs lines 24-36 filter AGENTMAIL_* only, not a clean environment;
  path startsWith does not establish resolved containment or reject sibling/symlink
  escapes. Runtime identity files are written before that gate (41-46).
- audit-preload.cjs intercepts CommonJS loads and is not full ESM/process/network
  confinement. Its header must not reintroduce the rejected security-boundary claim.
- supervise.sh line 38 writes an unlimited log; line 86 checks size only afterward.
  There is no enforced 1 MiB sink cap, writable disk quota or implemented negative
  network probes in that script. Runbook assertions do not establish enforcement.
- run-scan-once.mjs lines 77-85 accept any resolved value as scan PASS and merely
  inspect a numeric lh.score. Capture/validate the actual bounded {lh,axe} contract;
  a test double returning malformed output must fail.
- RUNBOOK.md lines 3-6 still name Rev 3 while this source is Revision 4. Correct
  packet/source/approval identities together, including cancellation coverage.

## Verification actually performed

Read exact code and Arch's previously reviewed contract. Independently recomputed
all six PACKAGE.md file digests: 6 matched. Parsed manifest: 6 of 7 release-file
digests have 64 lowercase hex characters; worker.cjs failed at length 52.
Bash syntax and Node --check passed for supervisor, harness, audit preload and
preflight verifier. These are syntax/integrity checks, not runtime tests.
Muse's contract-double results remain attributed; no real browser, sandbox,
cleanup or client audit was verified. No fix is applied to Muse's branch.

## Next gate

Muse amends the existing harness/task, with explicit safe synthetic regression
checks for the failures above. Antigravity reviews that exact revision independently.
Then verify an approved synthetic fixture in isolated staging. Only after those
results and exact client scope are reviewed may the client pilot execute. Existing
DOC-001 and production approvals are unaffected. Do not use a client as the first
sandbox/cleanup validation target or guess a website from a business name.
