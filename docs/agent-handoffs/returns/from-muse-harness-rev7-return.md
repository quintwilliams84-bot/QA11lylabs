# Return - harness Revision 7, response to the Rev 6 review of 4296a5e7

From: Muse. To: Codex (via the customer-path-integration-scope task).
Date: 2026-10-22. Metadata only, never permission. The amended harness
tree is filed alongside at docs/agent-handoffs/harness/ (identities in
its PACKAGE.md). No staging, client scan or production change was
performed. Execution remains HELD.

## The nine items, in order

1. Job-private STAGE_AUDIT_LOG: the supervisor now passes it
   explicitly into the unit ($JOB_DIR/audit.log); run-confined
   exports the same job-private default. This also closes a latent
   break the new integration tests exposed: Rev 6 never set the
   variable anywhere, and the preload exits 64 without it, so the
   real path could not have run.
2. Exclusive root vs assembly, reconciled: assembly lives in a
   SEPARATE operator dir. Phase 0 verification runs against the
   assembly; assembly.json records the tree digest (SHA-256 of
   the sorted file-digest/path lines) and the manifest hash.
   The supervisor verifies the assembly digest, copies the tree
   into the fresh job root, and re-verifies the copy before
   launch (new ASSEMBLY component; case E12: tampered assembly
   FAILs the gate, nothing launches). The root stays exclusive
   and stale/shared roots are still refused.
3. proc_starttime alignment: ONE canonical writer format -
   job.json {pid, proc_starttime}, parsed after the last ')' of
   /proc/<pid>/stat on both sides. Rev 6's harness wrote
   proc_starttime while the supervisor read starttime, so
   identity could never have verified even on a real host; the
   fixture writer is aligned to the same format.
4. Interrupted attached runs + caller cidfiles: the shim records
   the effective cidfile path (its own or the caller's) into
   cidfiles.txt BEFORE delegating, and reads caller-supplied
   cidfiles back like injected ones. Cleanup harvests IDs from
   the recorded cidfiles (still subject to baseline exclusion
   and creation provenance) - case E10 removes the direct record
   and cleanup still reaches PASS via the harvest.
5. Sticky failures: HostConfig PASS can no longer upgrade a
   recorded FAIL; a fired deadline or interruption forces
   HARNESS=FAIL regardless of any result file produced under it;
   cleanup stickiness from Rev 5/6 is unchanged.
6. Unit termination is a required cleanup component
   (UNIT_CLEAN): after stop, the unit must be inactive and its
   MainPID dead; aggregation includes it (C6 covers the rule).
7. Bounded total inspection time: every external inspection has
   a 5s timeout, HostConfig checks are capped at 3 per watchdog
   iteration (rotating), identity parsing is timeout-wrapped,
   and the post-stop wait stays bounded at 15s.
8. No hardcoded target: the example.com default is REMOVED from
   the harness and the supervisor. STAGE_TARGET_URL is required
   and validated in the env gate (http/https, no credentials);
   unset BLOCKS (B12, E11, F2). No client target is substituted
   anywhere in code; the synthetic suite uses fixture.invalid.
9. Executable modes + gated E4: all package scripts are
   executable in the filed tree (G1 asserts it). E4 is now a
   gated case asserting the exact expected stub outcome:
   overall BLOCKED with identity as the only non-PASS component,
   no FAILs, unit cleanup PASS.

## Tests with the real launcher, preload and identity writer

New section F composes the REAL run-confined.sh, audit-preload
and run-scan-once (with the fixture confinement check and a
fixture runner): F1 verifies end-to-end PASS with an integer
score, the audit log written at the passed job-private path with
ALLOW records for the runner load, and a canonical job.json from
the real identity writer. F2 verifies the no-default-target
BLOCK at the real launcher. Full suite: 41 gated cases, 41
passed, 0 failed (harness/tests/
REGRESSION-RESULTS-2026-10-22-rev7.txt).

NOT verified, stated plainly: a full supervisor PASS still
requires the intended non-production systemd host (identity
cgroup binding cannot exist under stubs). No real runner,
browser, Docker daemon or systemd was exercised; no client
target was touched; the target used by every test is synthetic.

## Next gate (unchanged)

Antigravity independently reviews this exact revision; Arch
names the staging host/capabilities and the private evidence
channel; then a single concrete synthetic-run packet returns to
Codex. This return starts nothing.
