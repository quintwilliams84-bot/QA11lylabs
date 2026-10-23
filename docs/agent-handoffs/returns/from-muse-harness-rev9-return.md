# Harness Rev 9 - the six alignment findings fixed, safeguards added

From: Muse. To: Codex (customer-path-integration-scope).
Date: 2026-10-23. Metadata only, never permission.

Rev 9 supersedes Rev 8 (c194a4dbf6e39e1a057fccdee5263543e729aa06)
in tree position. It answers the independent Rev 7 alignment
review (reviews/Rev7-independent-alignment-review.md at
customer-path-recovery e9bb6429), whose six findings Muse
verified present in the Rev 8 source by inspection before
building (see the ack at 113778fea54f5e0edb09ce7c0b2253e4e9325e15).

## The six fixes, each with a regression

1. Launch ownership (E17): the supervisor records LAUNCHED and
   the manager InvocationID at launch; stop_unit acts only for
   a unit this invocation launched whose invocation identity
   still matches. A foreign same-named unit survives a failed
   launch untouched (stop.log assertion).
2. UNIT_CLEAN evidence (E18): starts UNKNOWN; PASS only on
   LoadState not-found or inactive/failed with MainPID 0;
   manager inspection errors stay UNKNOWN and block.
3. HostConfig (E19, E20, E21, E21b): NanoCpus is now inspected
   alongside Memory, MemorySwap and PidsLimit; a failed
   inspection is a sticky FAIL; inspection is ledger-driven
   (ps visibility is irrelevant); cleanup reconciles coverage
   and downgrades PASS to UNKNOWN for any owned container
   never inspected.
4. Terminal status (E22): HARNESS PASS requires the manager
   record for the owned invocation (Result=success,
   ExecMainStatus=0, InvocationID match) in addition to the
   result file; run-confined now also records its exit code
   in the job root as in-unit evidence.
5. Digest v2 (E23): the tree digest binds entry type, mode,
   path, link target and content in one canonical algorithm
   (supervisor and fixture assembler implement the same form);
   links must resolve inside the tree; unsupported entry
   types fail the digest. A symlink swapped for a regular
   file with identical content FAILs the gate.
6. Preflight binding (A8, A9): the standalone verifier
   requires --host-id and --run-id AND a record carrying
   both; omitting flags can no longer pass an unbound record.

## Safeguards (Quintin, Oct 23 - no new key or token)

Quintin chose the safeguards option and explicitly declined a
new deploy key or token unless absolutely necessary. Rev 9
therefore keeps the existing approval-card filing path and adds:

- Self-healing modes (E24): the supervisor restores executable
  bits in its own harness tree before launch (the shim is
  reached through PATH); the digest binds the assembled modes,
  and the runbook checkout step remains as belt and braces.
- Tree integrity: TREE-MANIFEST.json covers every package file
  (hash + executable bit, except the manifest and PACKAGE.md)
  and tools/verify-tree.mjs checks any tree against it (H1,
  H2). Anyone can prove an upload or checkout was not altered
  by running one command.

## Package identity

Identities are in the package's PACKAGE.md. Regression
evidence: tests/REGRESSION-RESULTS-2026-10-23-rev9.txt -
58 passed, 0 failed (synthetic doubles plus the real
launcher/preload/identity section run). Filed modes will read
100644 again after this push (the filing path strips them);
the manifest records the intended modes and verify-tree names
the difference, and the supervisor heals them at run time.

## Limitations (unchanged, restated)

- No real-host claim: an end-to-end supervisor PASS still
  requires the real non-production systemd host so the
  identity component can bind to a real cgroup; under the
  doubles the happy path aggregates BLOCKED, as documented.
- Every limit in the runbook register remains PROPOSED, NOT
  ENFORCED until demonstrated on that host.
- Execution stays HELD at every CLIENT-PILOT-001 gate. This
  return requests review of the changed scope, nothing else.
