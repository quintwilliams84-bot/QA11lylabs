# Independent review of non-applied permission proposal

Reviewer: separate Codex review agent `independent_scaffold_review`, 2026-10-23 UTC. Scope: `/tmp/rev9-permission-proposal/permission-packaging.patch` against QA11lylabs `37b4982e2dda770a1b82664520817219a4b49e78`. This is not controller, Antigravity or human approval. The candidate branch and source checkout were not modified.

**Final disposition: no remaining blocking finding in the corrected narrow permission proposal.** Exact reviewed patch SHA-256: `e57f28e6de18756597827dc3f540a496e4b8167c51ad78f9fd9757d8c041193d`. The corrected supervisor preserves the raw input and requires an absolute normalized path before checking realpath equality. Independently replayed the expanded suite: **9 passed, 0 failed**. Independently reran the original distinct-target symlink/parent-traversal exploit: now exits **3 (BLOCKED)**, with the runtime-target files still 0644. The updated patch exactly matches the alternate-index diff; updated supervisor/prefix, all 21 manifest hashes/executable classes, ten Git mode corrections and shell syntax checks also pass. This is limited technical acceptance of that exact non-applied packaging proposal, not controller or operational readiness approval.

**Initial finding, now corrected:** the earlier proposed supervisor at lines 83–85 used `root = os.path.abspath(sys.argv[1])`, collapsing lexical parent segments before symlink resolution. That validated a potentially different directory from the raw STAGE_HARNESS_DIR retained for launch. The initial exact-prefix probe returned 0 for `<temp>/alias/../harness`, while the actual selected scripts were 0644 in a different directory. The corrected check rejects this input before normalization; the original finding is retained here as review history. No fixture script or lifecycle was executed in either probe.

Independent checks completed:

- The patch bytes exactly match `git diff --cached --binary` against the proposal's isolated alternate index and the named base.
- The supervisor artifact matches that index; check-prefix.sh is byte-for-byte the supervisor prefix through the new permission gate, followed only by `exit 0`.
- All 21 manifest file content hashes and executable classes match the proposed index; all ten intended Git mode corrections are present.
- `bash -n` passes for the proposed supervisor and prefix.
- Original proposal: seven prefix-only cases passed; the additional independent symlink/parent-segment case unexpectedly exited 0 and prompted the correction.
- Corrected proposal: all nine supplied prefix-only cases passed; the additional original distinct-target exploit now exits 3. Snapshots show no job/temp-root creation or mutation of fixture bytes/modes by the checker. Each subprocess has a four-second timeout.

Removing runtime chmod and its misleading header is appropriate for this narrow proposal. It does not address the independently reported controller ownership, lifecycle, HostConfig coverage, cleanup-deadline or complete-tree findings. The existing manifest note also retains the broader “every package file” claim; complete-tree verification remains a separate unresolved finding.

This artifact is a partial, non-applied patch for Muse, not a complete corrected package. PACKAGE.md retains the earlier supervisor checksum and the runbook/regression text retains legacy claims; Muse must regenerate these against the final integrated exact candidate and record fresh applicable checks. Those integration follow-ups are not represented as completed by this narrow proposal.

Only the exact prefix and local hash/index/syntax checks were executed. No real Docker/systemd, application runner, browser, network/provider/client request, credentials, installation, GitHub write or production operation occurred. The patch remains a non-applied proposal; Muse remains the integration author. Changed source after this exact patch requires review of its changed scope; remaining controller findings and separate approval gates are unchanged.
