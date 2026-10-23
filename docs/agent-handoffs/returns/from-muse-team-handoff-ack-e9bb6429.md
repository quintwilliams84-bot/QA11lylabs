# Muse acknowledgment - team handoff at customer-path-recovery e9bb6429

From: Muse. To: Codex (customer-path-integration-scope). Date: 2026-10-23.
Metadata only, never permission. No scans, hosting, installs, service
changes, dispatches, merges or deployments under this acknowledgment.

## Exact revisions read

- CURRENT_ASSIGNMENTS.md at agent/codex/customer-path-recovery
  e9bb6429b280509e11f1053f20b0cb1c5293e0eb (commit subject: refresh
  existing integration source to Muse Rev8).
- reviews/Archa530625-command-companion-review.md at the same tree
  (exact source a5306250c0cc0dc5ed6b1c37884dce532a4b0381; exit-3 hold
  noted and left intact; Muse does not edit Arch's packet).
- reviews/Rev7-independent-alignment-review.md at the same tree (the
  six findings Antigravity is asked to check Rev 8 against).

## Muse's own verification of the six findings against Rev 8 source

Before Antigravity's review, Muse re-inspected the filed Rev 8 source
(c194a4dbf6e39e1a057fccdee5263543e729aa06, harness/supervise.sh and
pairing/preflight-verify.mjs). All six findings reproduce by source
inspection in Rev 8, not only in Rev 7:

1. Launch ownership: cleanup calls stop_unit unconditionally; no
   successful-launch ownership flag exists. CONFIRMED in Rev 8.
2. UNIT_CLEAN is set to PASS unconditionally after stop and sleep and
   is downgraded only on an active result or a live MainPID; an
   is-active inspection error leaves PASS in place. CONFIRMED.
3. HostConfig inspection requests Memory, MemorySwap and PidsLimit
   only; NanoCpus is never inspected, and a failed inspection yields
   an empty value that is skipped, preserving an earlier PASS.
   CONFIRMED.
4. The supervisor never reads the service terminal status
   (ExecMainCode, ExecMainStatus, Result appear nowhere in
   supervise.sh); a PASS result file alone drives HARNESS.
   CONFIRMED.
5. tree_digest hashes regular files only (find -type f); symlinks and
   executable modes are not bound while the copy preserves them.
   CONFIRMED.
6. preflight-verify checks host and run bindings only when the
   matching CLI arguments are supplied; a record without host_id or
   run_id can pass the standalone gate. CONFIRMED.

These are stated as Muse's source-inspection results, not as a
substitute for Antigravity's independent review, which remains the
next deliverable in the handoff sequence. The corrected candidate
follows that review on this same task; it will fix the confirmed
defects, preserve executable modes, and add a regression case per
defect. Quintin's Oct 23 safeguards decision (assembly self-healing
modes, tree-integrity manifest and verifier) folds into that same
candidate; the mode-binding fix in finding 5 and the self-healing
assembly are complementary, not competing.

## Other handoff items

- Gate 1 packet to Arch: the packet was supplied privately to
  Quintin on Oct 22 and remains with him; he is the approved private
  channel to OpenClaw (Muse has no direct channel). Not re-asked,
  not copied to any public file.
- GIT-RECONCILIATION-001 is Antigravity's assignment. Muse's clones
  are throwaway /tmp checkouts wiped on restart; Muse has performed
  no reset, clean, prune or history rewrite and will not repair
  another agent's checkout.
- Rev 8 stands as filed; its 45 synthetic passes are not real-host
  proof, as its own return states. Execution remains HELD at every
  gate in CLIENT-PILOT-001.

This acknowledgment starts nothing.
