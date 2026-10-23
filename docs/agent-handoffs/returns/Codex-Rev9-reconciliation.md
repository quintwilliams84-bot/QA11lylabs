# Rev9 reconciliation and next owners

Date: 2026-10-23 UTC. Candidate: QA11lylabs `37b4982e2dda770a1b82664520817219a4b49e78`.
Canonical discovery index read at `138899b57859cee1e0042b00097b3af175c150bd`.
Arch intake reviewed at `3f8bd6edfff277526b0b6f2af4c0b439fe5defad`.
This amends existing CLIENT-PILOT-001, not a new proposal or execution grant.

## Current disposition

Rev9 needs revision. Preserve the existing acceptance companion exit-3 hold.
The separate reviewer reproduced ownership/coverage failures and exact-package
mode mismatches. Its full report is `reviews/Rev9-independent-review.md`.
The attributed 58-pass regression report was not independently replayed.
No real systemd, Docker, browser, target, email, provider or production operation
was executed by this reconciliation. No production parameters have been set.

## Narrow permission proposal prepared by Codex

`proposals/rev9-permission-fix/permission-packaging.patch` targets exactly Rev9.
It is NON-APPLIED review material. Muse remains the single harness integrator.
It removes launch-time chmod/error suppression, checks four required launcher
files before job creation, and records ten intended executable modes in the
proposed Git tree. It also updates the supervisor hash in TREE-MANIFEST.json.
It is a partial integration diff: Muse must regenerate PACKAGE.md hashes and
reconcile runbook claims on the final corrected revision; existing Rev9 results
remain historical, not tests of that revised package.
It rejects symlink ancestry/final links, nonregular entries, missing files,
wrong modes and special bits. This is not authenticated ownership, immutable
storage, race resistance, full-tree integrity or controller readiness.

Patch SHA256: `e57f28e6de18756597827dc3f540a496e4b8167c51ad78f9fd9757d8c041193d`.

Nine prefix-only synthetic tests passed: repeat/no mutation, missing file,
non-executable unchanged, final link, ancestor link, directory, special bits, relative paths and traversal paths.
Bash syntax passed. Documentation and proposed-source whitespace checks passed;
the patch artifact itself retains the required blank-line context marker of a
unified diff (a trailing space), which is excluded from Markdown whitespace checking. No full supervisor lifecycle ran. The supplied test prefix
is extracted from the proposed supervisor before DEADLINE_S; the tests stop
there deliberately. A corrected exact-package regression suite remains needed.
Independent review found that the first proposal normalized paths before checking
symlinks, which could check a different tree across a symlink/parent traversal.
The corrected proposal rejects noncanonical/relative paths before resolution;
new regression cases cover this. See the separate limited patch review.

The first local patch-preparation attempt used a Git chmod operation requiring
an absent worktree; it failed before publication. Rebuilding cached index entries
with explicit modes resolved that tooling error; no production file was changed.

## Muse - sole harness writer, next implementation

Continue the existing customer-path-integration-scope task. Inspect/adapt the
permission proposal rather than copying an entire competing router/harness.
1. Require nonempty matching manager InvocationIDs before stop, kill, reset or
   terminal PASS, including inspection failure, launch collision and replacement.
   Establish a manager-enforced workload lifetime; missing evidence must not
   justify killing an unidentified unit or leaving a launched job unbounded.
2. Harvest/validate all cidfiles before HostConfig coverage reconciliation.
   Every relevant owned container needs evidence; removed-but-uninspected stays
   UNKNOWN, including interrupted attached runs.
3. Finalize packaging modes in Git/assembly before execution; no runtime chmod.
   Verify the exact shipped manifest, not a test-generated replacement manifest.
4. Make cleanup use one monotonic absolute deadline across targets and phases,
   including stop, inspection, removal, temp cleanup and escalation. Bound each
   external call by remaining time. Incomplete cleanup retains quarantine.
5. Make integrity checking compare the actual file/type set with a trusted,
   independently pinned manifest and explicit exclusions. Reject unexpected code
   and symlinks/unsupported entries, and test altered modes/content/extras.
6. Validate numeric configuration BEFORE job creation: STAGE_HARD_DEADLINE_S,
   STAGE_CLEANUP_DEADLINE_S, STAGE_SPOOL_MAX_BYTES and other arithmetic inputs.
   Document units, finite approved ranges, relationships and malformed/zero/
   negative/overflow behavior. Do not silently invent production ceilings.
7. Add targeted regressions for every issue and current missing-ID/late-cidfile
   examples; preserve initial failures. Return exact commit, per-case results,
   manifest/mode verification and remaining real-host gaps. No broad upgrades.

## Arch - existing acceptance packet, no launch

Read this return and review. Keep the companion's exit-3 hold and existing
private packet. Record config requirements from Muse's corrected executor as a
parameter table: name, units, proposed value/range, enforcement point, evidence,
approval state. Unknown remains unknown. Include worker/aggregate memory, CPU,
PIDs, all deadlines, output/spool/temp/disk limits, fixture origin/digest,
complete pairing and ownership cleanup. Do not substitute historical low RAM
for present readiness or lower thresholds merely to pass. Do not repeat the
inventory or unchanged failing Actions probes; request only genuinely missing
inputs. Identify one safe isolated synthetic next run after review, with exact
SHA/fixture/limits/stop conditions. No run, installs, restarts, Docker operations,
scanner submissions, chmod, Git repair or timer reactivation is authorized here.
Hermes stays outline-only; do not claim invocation or receipt-backed participation.

## Perplexity - manual independent research/review, optional

Read the exact revised Muse source and the existing review. Verify claims using
primary systemd/Docker/Chromium documentation: InvocationID lifetime and missing
identity semantics, manager-enforced runtime bounds, container accounting and
sandbox limitations. Separate static reasoning from executed evidence. Produce
file/line findings, source URLs, missing tests and limitations. Do not claim the
unavailable Antigravity sign-off or run live scans. Return sanitized text for Muse
or Arch to file in existing handoffs; do not change the reader schema/identities.
No credentials, client information, client target requests or production access.

## Shared handoff and approval contract

Use existing task IDs and one branch owner per implementation. A new revision
invalidates prior revision-specific acceptance; task status is not permission.
Post exact reviewed source SHA and exact test/evidence identities, actual results,
known unknowns and next owner. Cross-link this return from canonical discovery
through normal non-force updates preserving all task IDs and source history.
Do not overwrite another agent's branch or duplicate proposals. Operational
language is PASS / FAIL / BLOCKED / UNKNOWN / NOT RUN; expected cases are not
passes. Client details/artifacts remain private.

After the corrected package passes cloud checks, review an explicit isolated
synthetic acceptance packet. Approval of that packet is separate from main merge,
production activation, client execution, notifications and paid provisioning.
No destructive cleanup/crash/resource-pressure tests on the live shared VPS.
DOC-001 remains separate and blocked on demonstrable Actions evidence access.
Watchdog/Git/permissions/memory modernization follows scanner proof in reviewed
slices; no global upgrades or production recovery-controller cutover here.
