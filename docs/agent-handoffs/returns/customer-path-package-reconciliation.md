# customer-path-integration-scope: package reconciliation

Onboarding read: 86bf3714b42dc8a0d9c640554e562a08cbd8817d.
Coordination base: 358e01e7e3417fe080dbb8ca8339199b6abbe6d6.
Rev10 executable content: a5e7816d83d13008b11fadc92686a015b6fa5de3.
Indexed snapshot: 8bee33d043897ffd3495d50b5a31d252dfe855a9.
Mode finalization: 045ef12cfea6a76045c0b1eceb639501e0af7a36.
Exact reconciled package: cdc202aa31c1e9e2d5bc9f37cf6088f2f0b204d3.
Manifest SHA-256: 072b8a24bf914a99e4ea120f1858d72d0c0cc16718dd21c2965cddcfeca44ff5.

## Actual checks

Only the reviewed stdlib-only tree verifier was executed; no harness, browser,
Docker, systemd, application imports or client requests. Isolated temporary
package directories were reconstructed from GitHub blob bytes and Git modes.
Command: `node <package>/tools/verify-tree.mjs <package> <package>/TREE-MANIFEST.json`.

- Baseline: FAIL (exit 2), exactly five EXTRA-FILE historical logs.
- Candidate staged package: PASS (exit 0), 26 manifested files.
- Independently downloaded committed package: PASS (exit 0), 26 files.
  This repeats the same check against committed bytes, not unique coverage.
- Manifest inspection: 11 executable entries; exclusions unchanged.
- Five log blobs and all executable code remain unchanged; only three paths
  in the package/proposal commit differ. No expected hashes regenerated for
  existing entries. Five additional hashes describe retained evidence only.

These checks ran as the current review operator, not an unprivileged runtime
acceptance test. Claimed 67 regression passes remain attributed, NOT REPLAYED.
No tests were skipped by a runner; full suite and real-host tests were NOT RUN.
No claim of independent review of this amendment is made.

## P07 and remaining gates

The appended clarification supersedes conflicting proposal text without erasing
history. Supervisor stays outside worker unit; run-confined.sh is its launcher.
Actual Node child-spawn and absolute Docker paths require explicit reviewed
pairing; PATH alone is not proof. Strict manifest and all executable requirements
remain. No mode-independent implementation is accepted here. Synthetic identity
BLOCKED must not be relabeled PASS.

Independent reviewer/Codex owns review of this exact package and clarification.
Missing interpreter, actual child-spawn, malformed-package, timeout/interruption
and owned-cleanup tests remain prerequisites for future P07 implementation.
Intended host, pinned runtime pairing, fixture digest, isolation and demonstrated
resource enforcement remain unresolved for execution. Arch binds only an accepted
executor. CLIENT-PILOT-001 and the companion exit-3 hold remain intact.
Hermes remains outline-only. No production changes or execution authorization.
