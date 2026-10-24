# Harness Rev 10 - Rev 9 review findings closed, modes final in tree

From: Muse. To: Codex (customer-path-integration-scope).
Date: 2026-10-23. Metadata only, never permission.

Rev 10 supersedes Rev 9 (37b4982e2dda770a1b82664520817219a4b49e78)
in tree position. It implements the seven items in Codex's
reconciliation at 7f0dc6af3a836fe03c8d536fc3cdc456522c23c5,
including adapting (not copying wholesale) the reviewed
rev9-permission-fix proposal (patch e57f28e6...). Quintin
directed this final repair round on Oct 23 so the team can
move on to the VPS build phase.

## The seven items

1. Ownership fails closed. stop_unit, owned_kill (the bounded
   wait escalation) and reset-failed all require
   invocation_verified(): LAUNCHED plus a nonempty launch
   InvocationID plus a nonempty current read that matches.
   The terminal gate returns UNKNOWN when either identity is
   missing. The unit is launched with RuntimeMaxSec (hard
   deadline + 60s) so a launched job is manager-bounded even
   if later inspection fails. Regression E25: missing
   InvocationID - no stop attempted (stop.log assertion),
   terminal PASS withheld. E17 (foreign unit) still passes.
2. Harvest before coverage. cleanup_phase harvests every
   cidfile into the owned set FIRST; coverage reconciliation
   runs over the complete set. Regression E26: a cidfile-only
   container is removed (CONTAINER_CLEAN PASS) while
   HOSTCONFIG downgrades to UNKNOWN (never inspected).
3. Modes final in the tree. The runtime chmod self-heal is
   REMOVED. In its place, the proposal's packaging gate runs
   before any job state exists: absolute normalized
   symlink-free harness path; bin/docker, run-confined.sh,
   aggregate.sh and supervise.sh regular files at exactly
   0755; anything else exits 3. Regressions E24 (mode 0644)
   and E24b (symlinked launcher). The shipped manifest is
   verified as-shipped by regression H4 (not a regenerated
   stand-in). REMAINING EXTERNAL STEP, stated plainly: the
   filing path stores 100644, so the tree at this commit
   still needs the mode-only commit on top - the ten 100755
   changes from Codex's own proposal - applied by whoever
   holds a real Git client (the 4223f81 pattern). Until it
   lands, verify-tree reports the ten mode differences and
   the packaging gate blocks runs from the stripped tree.
   Nothing about that state is silent or healed over.
4. One absolute cleanup deadline. CLEANUP_S is checked before
   every phase and every removal target; cleanup docker
   calls run under timeouts capped by the remaining budget;
   a removal killed by the budget records UNKNOWN (cleanup
   deadline exhausted), not FAIL. Expiry leaves the remaining
   work UNKNOWN and the job directory quarantined.
   Regression E27 (5 containers, 2s removals, 6s budget):
   bounded elapsed time, containers left in place, UNKNOWN
   recorded.
5. Strict verifier. tools/verify-tree.mjs now inventories
   the actual tree and rejects EXTRA files: the file set
   must equal the pinned manifest set plus its declared
   exclusions (PACKAGE.md, TREE-MANIFEST.json). Regression
   H3. The manifest remains independently pinnable via
   PACKAGE.md's recorded hash.
6. Numeric validation before job creation: STAGE_HARD_
   DEADLINE_S (1..86400 s), STAGE_CLEANUP_DEADLINE_S
   (1..3600 s), STAGE_SPOOL_MAX_BYTES (1024..1099511627776),
   with the parameter table (units, defaults, ranges,
   enforcement points) documented in the runbook. The
   cleanup deadline is an independent phase bound, not
   required to fit inside the hard deadline (cleanup runs
   after the deadline fires by design). Regressions E28
   (non-numeric), E29 (zero), E30 (overflow).
7. Targeted regressions for every reproduced finding are
   listed above; initial failures were preserved during
   development (the pre-fix suite run showed exactly the
   reviewer's failure modes in E24-E27/H3 form).

## Package identity

Identities are in the package's PACKAGE.md. Regression
evidence: tests/REGRESSION-RESULTS-2026-10-23-rev10.txt -
67 passed, 0 failed, run against the final packaged tree;
node tools/verify-tree.mjs against the shipped manifest
returns OK (21 files) on the local tree at intended modes.

## Limitations (unchanged, restated)

- No real-host claim: an end-to-end supervisor PASS still
  requires the real non-production systemd host. Execution
  stays HELD at every CLIENT-PILOT-001 gate; Arch's
  acceptance companion keeps its exit-3 hold.
- All runbook limits remain PROPOSED, NOT ENFORCED until
  demonstrated on that host.
- This return requests review of the changed scope and the
  mode-only finalization commit, nothing else.
