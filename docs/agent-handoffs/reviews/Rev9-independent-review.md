# Independent Rev9 review

Reviewer: separate Codex review agent `independent_scaffold_review`, distinct from the root/coordinating agent and candidate author. Date: 2026-10-23 UTC. This is technical feedback, not Muse, Antigravity or human approval, and grants no staging execution, merge or activation permission.

Exact candidate: `quintwilliams84-bot/QA11lylabs` commit `37b4982e2dda770a1b82664520817219a4b49e78`, branch `codex/staging-coordination`. Paths and line numbers below are relative to `docs/agent-handoffs/harness/` at that SHA. Candidate source and GitHub state were not modified.

## Findings, ranked

1. **High — invocation ownership checks still fail open when evidence is missing, and escalation bypasses them.** `harness/supervise.sh:151`–`:155` skips stopping only when BOTH invocation strings are nonempty and different. A failed current-ID inspection, an empty current ID or an empty launch ID therefore still permits stop. The terminal-result gate at `:509`–`:512` likewise accepts Result=success/ExecMainStatus=0 when either invocation ID is missing, despite claiming an owned-invocation match is required. Independent exact-function probes confirmed that a failed/empty current-ID read still sends the fake stop command, and that terminal status lacking InvocationID yields `TERM_STATE=ok`. The fallback `systemctl kill` at `:489` and unconditional `reset-failed` at `:344` do not use the ownership guard at all. Require an explicit nonempty matching identity before any stop/kill/reset or terminal PASS; bind all operations to the same owned manager invocation and report uncertainty separately. Also establish a safe manager-enforced lifetime so missing inspection cannot leave an owned workload unbounded.

2. **High — cidfile-harvested containers bypass HostConfig coverage reconciliation.** `harness/supervise.sh:225`–`:231` checks coverage BEFORE `:236`–`:243` harvests ownership from cidfiles. A run with one inspected direct-record container can retain HOSTCONFIG=PASS while a second, never-inspected container exists only in a cidfile. Independent execution of the exact cleanup function with those two synthetic IDs removed the uninspected ID and returned `HOSTCONFIG=PASS`, `CONTAINER_CLEAN=PASS`, `UNIT_CLEAN=PASS`. This is synthetic component evidence, not a complete real-supervisor PASS. Harvest and validate the complete owned set first; require HostConfig evidence for every relevant created container, including interrupted attached runs, before PASS. If capture/inspection was unavailable, retain UNKNOWN even after removal.

3. **High — the exact published tree fails its own executable-mode manifest.** An exact `git archive` extraction preserving Git modes, followed by the actual `tools/verify-tree.mjs`, returned exit 2 with ten MODE-MISMATCH reports. The archived files are 0644 while TREE-MANIFEST declares executable: primary shell scripts/shim, all three service stubs, fixture launcher and fixture shim. Thus the source report of executable-package checks does not validate this exact uploaded revision. `harness/supervise.sh:377`–`:378` attempts chmod but suppresses failures, and the regression integrity test regenerates an expected manifest from the test tree instead of proving the shipped manifest. Publish the intended modes, verify the exact packaged manifest unchanged, and fail closed on permission preparation failures. Root is separately preparing a non-applied permission proposal; this report reviews the unchanged Muse candidate only.

4. **Medium — the cleanup deadline is checked after the potentially unbounded removal loop.** `harness/supervise.sh:252`–`:269` inspects and removes every owned container; only `:272` checks elapsed time. Per-command timeouts bound individual calls but not their total across an arbitrary number of IDs, and temp removal plus subsequent unit operations also occur after that check. This is not the claimed total cleanup ceiling. Check a monotonic absolute deadline before every phase and every target, cap the remaining time of each call, and record remaining cleanup UNKNOWN when the budget expires. Stop the owned lifecycle before removing its resources and preserve quarantine on incomplete cleanup.

5. **Medium — the “full-tree” verifier silently accepts extra executable/code files.** `tools/verify-tree.mjs:20`–`:29` iterates only manifest entries and never inventories/rejects unexpected files, despite PACKAGE.md claiming full-tree integrity. Independent probe: in a disposable mode-correct variant solely to isolate this behavior, adding an unlisted synthetic code file under harness still returned `verify-tree: OK (21 files)`, exit 0. Compare a canonical actual file/type set against the trusted manifest with explicit exclusions. The manifest itself must remain pinned independently; a passing self-supplied manifest is not trusted provenance. The existing H1 test generates a fresh manifest from its input tree, so it cannot establish that the shipped TREE-MANIFEST describes the exact upload.

## Checks actually performed

Read the exact source before probes: supervisor, launcher, aggregator, tree verifier/manifest, changed regression assertions, all service stubs and the fixture launcher/runner. Supporting unchanged components were inspected in earlier exact-revision reviews; no actual application runner was imported or executed now. Inspected the attributed `REGRESSION-RESULTS-2026-10-23-rev9.txt` claim of 58 passed/0 failed; it is external evidence, not this reviewer's execution.

Extracted with `git archive` into `/tmp/qa11y-rev9-independent-w9847o4h`, preserving actual modes. Used pinned installed Node v24.19.0 for the verifier. Independently exercised:

| Check | Actual result |
| --- | --- |
| Shipped tree verifier against exact archive | exit 2; ten executable-mode mismatches |
| Exact stop_unit with failed/empty invocation read | fake stop recorded; exit 0 |
| Exact terminal-status block with missing InvocationID | TERM_STATE=ok |
| Exact cleanup, inspected direct ID plus uninspected cidfile-only ID | all three named components PASS; uninspected fake ID removed |
| Verifier against temporary mode-correct variant plus extra code file | exit 0; OK (21 files) |

Probes used only temporary files, local synthetic executables and exact extracted shell function bodies with explicitly supplied fixture state. No real Docker/systemd command was reached. Probe outer timeouts were 4–8 seconds. The mode-correct variant is deliberately separate and is not represented as the exact candidate or proposed source correction.

The full regression suite was **NOT RUN** in this review. The exact mode mismatches already prevent validating its advertised upload state; this environment also previously exhibited the known orphan-zombie fake-service limitation. No repeated full-suite attempts were made to obtain the attributed 58-pass count. Full regression completion, effective service sandboxing, real container lifecycle, real cleanup, egress, browsers and isolated-host readiness remain NOT RUN here.

## Configuration and authority limits

Environment limits such as hard-deadline seconds, cleanup seconds and spool bytes currently enter shell comparisons without an explicit validated positive-integer/range gate. Validate them before root creation or launch; malformed configuration must block rather than produce failed comparisons and continue. A numeric proposal is not a tested operational budget.

The manual pairing record remains evidence, not authentication or proof of token/service permissions. Existing user authority and scoped review gates still apply. No new token, secret, service permission, provider connection or production access was requested or exercised. No client identifiers, domains or contact details were included. Repository/GitHub writes, live services, browser/target requests, installations and deployments were outside this review and were not performed.

Corrections require review of the changed exact revision and appropriate synthetic plus independently authorized isolated-host validation. Source improvements, content hashes, attributed regression passes and this review do not supply human/Antigravity approval or readiness.
