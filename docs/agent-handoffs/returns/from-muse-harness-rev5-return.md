# Return - harness Revision 5, response to the client-readiness review of 1ce5e4c8

From: Muse. To: Codex (via the customer-path-integration-scope task).
Date: 2026-10-22. Metadata only, never permission.
Exact sources answered: CLIENT-PILOT-001 and reviews/
Muse1ce5e4c8-client-readiness.md at c298d8be6c6a52f07631abacab8d9a5b8490eb44
(branch agent/codex/customer-path-recovery). The amended harness tree
is filed alongside at docs/agent-handoffs/harness/ (identities in its
PACKAGE.md). No client scan, staging run, deployment or production
change was performed. Execution remains HELD.

## What changed, finding by finding

High 1 (status aggregation): supervise.sh v3 computes the overall
result in harness/aggregate.sh from named components. Any FAIL fails
the run; any safety component UNKNOWN, BLOCKED, NOT RUN or missing
blocks PASS; PASS requires every component PASS and harness exit 0.
Safety-path inspections are no longer error-swallowed: a failed
baseline docker ps BLOCKS before launch instead of becoming an
empty set. A sticky-FAIL defect found by the new regression suite
(re-verification downgrading a cleanup FAIL to UNKNOWN) was fixed
in this revision and is covered by case E3.

High 2 (cleanup ownership): containers are removed ONLY when their
full IDs were captured at creation time by a docker CLI shim placed
first on PATH inside the job's own process tree
(harness/bin/docker, logging to owned-containers.txt). Diff-seen
ids are reported as unowned-new evidence, never removed, and their
presence caps container cleanup at UNKNOWN. Stated limitation: if
the runner uses the Docker API instead of the CLI, the shim
captures nothing and cleanup reports UNKNOWN, not PASS. Temp-dir
removal now requires realpath containment inside $STAGE_TMP, no
symlinks, and an mtime inside the run window; failures leave the
entry in place and report UNKNOWN. Cleanup runs on INT/TERM via
the same path (trap), not only on clean exit.

High 3 (confinement): the unshare fallback is REMOVED; systemd
scope or BLOCKED. Inside the scope, run-confined.sh runs
harness/confinement-check.mjs BEFORE the harness: it verifies
read-only /usr and /etc mounts, cgroup memory.max equal to the
declared 2 GiB, a private network namespace (no non-loopback
interfaces), and writability expectations, printing a JSON verdict
the supervisor independently requires in the log. Identity: the
stop mechanism is the unit's lifetime (systemctl stop), and the
watchdog records IDENTITY PASS only when job.json's (pid,
starttime) pair matches /proc AND the pid descends from the
launched systemd-run process AND its cgroup names the unit. The
log cap is enforced by ulimit -f in the launcher (SIGXFSZ), not
measured after the fact.

High 4 (pairing gate): the manifest worker.cjs digest is
corrected to the full SHA-256 from Arch cd7b561
(9cba6bcd5ee33840622fa37fcc0eac0ca2538c5900589ed9fa44f68dea653459).
preflight-verify.mjs now schema-validates every digest (64-char
lowercase hex) before any comparison; absence and read checks
name the error kind (only ENOENT proves absence); the gate
resolves only from an operator-supplied approval record
(--pairing-approval: path a or b, approved_by, approved_at) and
the harness requires the same record with a matching path. The
verifier still never creates or implies an approval. A full
runnable-tree identity remains missing and is still named missing.

Mediums: env gate rejects credential-pattern variables (not only
AGENTMAIL_*); containment is realpath-based with a separator
boundary in the harness and the preload; job.json is written only
after the env gate passes; the audit-preload header now states
evidence-logging-only in terms and claims no boundary; run-scan-
once validates the resolved value against the bounded {lh, axe}
contract (malformed = FAIL; null lh.score still records NOT RUN);
RUNBOOK is corrected to Revision 5 identities with cancellation
coverage (caller abort 180s, contract timeout 90s, supervisor
unit stop at the hard deadline, INT/TERM cleanup).

## Synthetic regression results (real, local, doubles/stubs only)

tests/run-regression.sh: 19 gated cases, 19 passed, 0 failed
(full output filed at harness/tests/
REGRESSION-RESULTS-2026-10-22.txt). Coverage: verifier exit 0
with an approval record; BLOCKED without one; 52-char digest
caught as schema FAIL; hash mismatch; ENOTDIR named instead of
absence PASS; valid contract with null score; malformed result
FAIL; missing approval BLOCKS before job.json exists; credential
env BLOCKS; symlink escape BLOCKS; aggregation rules (5 cases);
confinement-check FAILs on this unconfined machine (exit 66);
supervisor under stubs: daemon-down BLOCKS before launch,
HostConfig mismatch FAILs, failed cleanup FAILs.

NOT verified, stated plainly: an end-to-end supervisor PASS.
Under stubs, IDENTITY cannot PASS (no real scope cgroup), so the
stubbed happy path aggregates BLOCKED, as the suite records. A
full PASS requires the intended non-production systemd host,
which remains unnamed; the pairing path approval also remains
Quintin's named decision. No real runner, browser, or client
target was touched by any of this work.

## Next gate (per the review)

Antigravity independently reviews this exact revision. Then an
approved synthetic fixture in isolated staging. Only after those
results and the exact client scope are reviewed may the client
pilot execute (CLIENT-PILOT-001 gates 1 to 3). This return asks
Codex to route the revision to that review; it starts nothing.
