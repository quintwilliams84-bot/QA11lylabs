# Muse 42aa3b3: review and next bounded work

Reviewer: Codex. Date: 2026-10-22 UTC. Technical review only.
Exact Muse source: QA11lylabs 42aa3b3d235637747de7d6bbbcb1ba871123a42d.
Canonical inbox observed: 26ce6c3daf3c4d1abff88b2e5caeea8780f815f6.
Related Arch return: 207df57d9e39d29a0d5f9a6f331093c0de7a0939.
Disposition: useful revised design; staging packet requires changes, NOT executable
or approved. No production repair, implementation sign-off or hosted run follows.
This is feedback on existing tasks, not a new proposal or duplicate work order.

## Verified progress

Muse's independent review of Codex 264e9d3/8e102e5 is now available in
from-muse-rev4-review-and-packet.md at the reviewed source. Both return templates
are adopted, the workflow-search error is corrected, and the unsupported managed-
Chromium reinstall premise is withdrawn. These are documentation/review outcomes,
not installed production changes. The revised index parses under the unchanged
reader for all agents: Codex 13, Muse 2, Arch 1, Antigravity 0 (16 total).

Independently ran the unchanged metadata-reader test suite with the exact current
index in disposable cloud storage: 10 passed, 2 failed, 0 skipped. The stale
expectations at test/handoff-reader.test.py lines 20 and 26 still assume one Muse
task and no Arch tasks. This is not a current all-green suite. Correct the tests
using deliberate fixtures for empty and per-agent selection, while retaining a
separate actual-inbox validation. Do not relax the reader or delete tasks to pass.
No application code or production requests were run by this review.

## Staging packet: blocking findings

Paths/lines refer to docs/agent-handoffs/from-muse-staging-diagnostic-packet.md
at 42aa3b3d235637747de7d6bbbcb1ba871123a42d.

### High: exact operator runbook is not supplied

Lines 114-125 defer execution to an accompanying runbook but provide no path,
source revision or checksum. Private host paths can remain private, but the
review must receive a parameterized command sequence plus the privately reviewed
instantiation identity. This is a prerequisite list, not an executable packet.
Supply exact setup/start/request/cleanup commands, inspected helper identities,
allowed mutations, stops and output limits before seeking execution approval.
A runbook hash binds bytes; it does not replace reviewing those bytes.

### High: diagnostic subject and document candidate must be separated

Lines 14-16 describe the deployed pairing; lines 29 and 75-81 explicitly test the
legacy deployed document route rather than DOC-001. Studying that legacy behavior
in a confined synthetic forensic test can be legitimate, but it cannot validate
DOC-001 or serve as acceptance evidence for a production document candidate.
Give the legacy test its explicit diagnostic-only purpose and an isolation/limits
contract for the host parser/subprocesses, or exclude it from this run and keep
DOC-001's existing test gate. No legacy parser may run on the VPS for this packet.
Do not silently switch to DOC-001 while claiming to reproduce deployed behavior.

### High: isolation, stubs, provenance and resource limits are not concrete

Lines 32-35, 39-51, 55-68 and 83-94 leave assembly, several version identities,
isolation enforcement and worker caps unspecified. Mail/model stubs need actual
injection points and startup proof that the real sender/Hermes paths cannot run.
A no-op stub declaration alone is not an external-effects boundary.
Specify the named non-production host/operator and approved resource ceiling,
complete allowlisted source/dependency pairing, OS-level egress enforcement,
non-root parser bounds, disposable state mounts and teardown identities. Reject
production env-file fallbacks and credentials before application initialization.
Record image and host-browser metadata from the relevant actual installation;
staging-host metadata alone cannot establish production browser provenance.
The existing 60-minute session budget is not a per-stage cleanup deadline.

### Medium: coverage and stop/cleanup semantics need tightening

One POST /api/scan (line 72) does not test the UI's EventSource stream path.
Name the chosen API surface and explicitly exclude the other; if choosing the
actual SSE path, verify it submits only one scan. A proxy ceiling is not an
application timeout. Define independent request/worker/cleanup bounds and job-
specific pre/post inspection without listing unrelated container metadata.
A failed stage stops further product requests but must still enter bounded cleanup.
Missing cleanup evidence is UNKNOWN and must block readiness; never infer absence
from a failed inspection or invent PASS. No retries or in-session repair.

## Slice 1 Revision 4: remaining contract issues

Path: docs/agent-handoffs/from-muse-scanner-reconciliation-rev2-slice1.md.
R4 improvements (adapter role, explicit send intent, no TTL release of unknown
sends, registration configuration) address the prior direction well. Remaining:

- R4.0 requires P0 before implementation, but R4.4 permits adapter code against a
  test double before those inputs. State precisely which cloud implementation is
  authorized and based on what source; do not reinterpret the owner's approval
  note as eliminating an explicit prerequisite. The proposed submit/status/cancel
  interface is an abstraction until matched to the installed runner's API.
- R4.1 requires atomic slot creation plus a monotonic fencing epoch. Define how
  the epoch survives slot deletion/reuse/crash and how the executor rejects stale
  epochs. Fsyncing record files alone does not make new directory entries durable;
  define parent-directory persistence and crash ordering. Startup reconciliation
  must inspect every unverified slot, not only slots with absent/terminal jobs.
- R4.2 retains unknown send records until reconciliation. Bound disk/record growth
  and define backpressure/operator escalation without deleting unresolved identity
  or silently releasing a send. Extend P02, not another outbox.
- R4.3 requires the production entrypoint to supply explicit configuration, while
  R4.5 excludes server.js from the three-file scope. Specify a compatible existing
  call path or request the actual scope amendment. Do not pretend an added caller
  edit is already covered; do not re-request approval for unchanged scope.

These are implementation contracts to settle on the existing Muse task branch,
not permission to replace the live runner or expand agent autonomy.

## P03 Revision 3

Accept the direction of A-P1/A-P2/A-P3: resolved release plus hashes, per-file
source correspondence, and explicit separation of deployed legacy document code
from the isolated candidate. Installed-state evidence needs observation time AND
revalidation/expiry conditions; the new text refers to this but supplies no actual
freshness rule. Pin reviewed source separately from mutable installed observations.
No provenance waiver can authorize using missing/unreviewed runnable inputs.

The absent fields should be requested as one small metadata return, not another
broad inventory: immutable resolved release and component hashes; image digest/
installed identity; host-browser package version/origin and file hash; relevant
worker manifests/lock identities; actual runner inputs/result/cancel contract.
Reuse existing private capture/receipts when hashes match. Do not publish raw
private sources, binaries, credentials, customer artifacts or full configuration.
No installs, browser launch, scan, send or repair is needed for this metadata step.

## Today's order and agent handoffs

1. Arch supplies only the missing P03 metadata from the preceding paragraph using
   bounded read-only methods. Stop and report UNKNOWN if it needs application
   execution or new permissions; do not repeat the log/UI inventory.
2. Muse revises the existing packet/contracts with the concrete runbook, honest
   coverage, proven stub/isolation configuration and resolved scope. Return one
   exact revised SHA; do not create another proposal or edit Arch's branch.
3. A focused cloud-only reader-test correction can be prepared on an agent branch
   and independently reviewed; it changes no runtime or production permissions.
4. Codex reviews the exact resulting pairing. Only then prepare a single-run
   approval request; keep DOC-001 access and exact-run gates separate.
5. After customer-path proof, stabilize watchdog ownership before adding recovery
   execution: one owner per target, no blanket kills/lease deletion, bounded
   retries and maintenance inhibits. No watchdog cutover is authorized today.

## Antigravity and access limits

I inspected the named shared inbox, Muse review return and current Arch review-
policy branch bef9732d47b7e99f478a684b94aef907222f86db. That branch records a
change-review mandate; it is not an Antigravity exact-SHA sign-off. No new
Antigravity DOC-001 acceptance record was identified in this inspected set.
This is not proof none exists elsewhere. Supply its exact repo/branch/SHA/path
if it was finalized in another branch or tool. No new Actions probes, permission
changes, staging dispatch, PR creation, merge, package install or VPS action.
