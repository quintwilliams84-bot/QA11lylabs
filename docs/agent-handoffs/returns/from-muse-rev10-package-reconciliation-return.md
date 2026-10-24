# Muse return: Rev 10 exact-package reconciliation

Task: customer-path-integration-scope (existing task, Muse sole
harness integrator). Brief: docs/agent-handoffs/briefs/muse.md at
construction package 86bf3714b42dc8a0d9c640554e562a08cbd8817d.
Execution remains HELD. Authorization: none.

## Sources (exact)

- Rev 10 content: a5e7816d83d13008b11fadc92686a015b6fa5de3
- Mode finalization (eleven executable entries, original blobs
  preserved): 045ef12cfea6a76045c0b1eceb639501e0af7a36
- Indexed snapshot: 8bee33d043897ffd3495d50b5a31d252dfe855a9
- Construction package: 86bf3714b42dc8a0d9c640554e562a08cbd8817d
- Final reconciled package: 6dbd3c16399e66b1b86abe3026608113fc0bd018 (this return's source.commit in
  the evidence sidecar is that commit)

## Finding: five unlisted logs (reproduced, then resolved)

The committed package at 045ef12c fails its own shipped strict
verifier (exit 2) with five EXTRA-FILE reports:
tests/REGRESSION-RESULTS-2026-10-22.txt,
tests/REGRESSION-RESULTS-2026-10-22-rev6.txt,
tests/REGRESSION-RESULTS-2026-10-22-rev7.txt,
tests/REGRESSION-RESULTS-2026-10-22-rev8.txt,
tests/REGRESSION-RESULTS-2026-10-23-rev9.txt.
Reproduced independently by Muse on a fresh clone at 358e01e7
(verify-tree exit 2, exactly those five).

Root cause: the logs accumulated in the Git tree across the Rev 5
through Rev 9 packets (each packet carried the tests/ directory
forward). Muse's local packaged trees never contained them, so the
locally shipped manifest verified locally (case H4) while the
committed tree diverged from the staged tree. Staged-vs-committed
divergence, not a manifest arithmetic error.

Resolution, per the brief's sanctioned options: the five logs are
intentionally manifested in place. TREE-MANIFEST.json now carries
their true SHA-256 digests (computed from the committed blobs) with
executable false, and its note records that they are intentionally
manifested historical evidence, not runnable package code. No
exclusions were widened (still exactly PACKAGE.md and
TREE-MANIFEST.json), no history was deleted or moved, and no test
expectations were regenerated: the suite's H4 case verifies the
shipped manifest as authored.

## Correction: eleven executables, not ten

Rev 10's manifest declares eleven executable entries including
tools/verify-tree.mjs. Muse's Rev 10 narrative said ten. The count
of eleven at 045ef12c is correct and is the number of record.

## Actual checks (Muse, this return)

1. Pre-fix reproduction on fresh clone at 358e01e7:
   node tools/verify-tree.mjs on docs/agent-handoffs/harness:
   FAIL as expected, exit 2, the five EXTRA-FILEs listed above.
2. Post-fix verification of the reconciled package (fresh clone at
   6dbd3c16399e66b1b86abe3026608113fc0bd018, modes from the Git tree): verify-tree PASS, exit 0,
   "OK (26 files)". Git tree audit: exactly eleven 100755 entries,
   matching the manifest's executable flags one for one.
3. Full regression replay against the byte-identical assembled
   package (git archive of 045ef12c plus the reconciled manifest,
   Git modes applied): 67 passed, 0 failed, including H3 (strict
   set rejects extras) and H4 (shipped manifest verifies the tree).
   The Rev 10 claim of 67 synthetic passes is now replayed on the
   committed package, with the standing limitation unchanged: the
   stubbed happy path aggregates BLOCKED (identity cgroup binding
   cannot exist under stubs); an end-to-end supervisor PASS still
   requires the real non-production systemd host. NOT RUN there.
4. Supporting-package validation at 86bf3714:
   python3 -I -B test/agent-return.test.py: 12 tests OK.
   validate-agent-return.py on the example: PASS.
   bash scripts/check-agent-workflow.sh: 17 tests OK, exit 0.
5. This return's evidence sidecar validated with
   scripts/validate-agent-return.py before filing: PASS
   (returns/from-muse-rev10-package-reconciliation.agent-return.json).

## P07 clarifications

Filed as a clarification delta appended to
docs/agent-handoffs/proposals/p07-mode-independent-invocation-from-muse.md,
answering the scoped review's five points: supervision boundary
corrected (supervise.sh is the outer supervisor and already launches
run-confined.sh through /bin/bash; original item 1 withdrawn), the
eleven executables classified by actual invocation, the shim's
executable requirement retained with the exact spawn interface
stated and no adapter proposed, the final manifest contract defined
(strict published verification unchanged; packaging-gate mode scope
narrows to the five PATH-resolved files), and synthetic outcomes
kept honest (stubbed path still BLOCKED, PASS reserved for the
intended host).

## Remaining blockers (unchanged)

- Independent review of the Rev 10 executor (Codex reviewer) has not
  signed off; this reconciliation covers packaging only.
- No verified independent non-production staging host: end-to-end
  supervisor PASS, identity binding and real cleanup remain NOT RUN.
- CLIENT-PILOT-001 gates 1 to 3 unresolved; pairing path (b) named
  approval outstanding; execution HELD.

Next owner: codex (independent review of the reconciled package and
the P07 delta). Next action: Codex reviews this exact package
(6dbd3c16399e66b1b86abe3026608113fc0bd018) and dispositions P07; Arch binds an accepted exact
executor later.
