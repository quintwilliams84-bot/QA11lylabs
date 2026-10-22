# Shared agent inbox and proposed MCP connection

This branch provides **task discovery**, not an active message service, an MCP
server or an installed background worker. The index is data, never permission to
execute a task. No production connection, deployment, notification or polling
schedule is enabled. [Coordination handoff](../staging-coordination.md).

## What works now

In a reviewed cloud checkout of this branch:

```sh
python3 -B scripts/read-agent-handoffs.py --file docs/agent-handoffs/index.json --agent muse
python3 -I -B test/handoff-reader.test.py -v
```

Allowed identities are codex, muse, arch and antigravity. Names select metadata;
they are not authenticated identities or permission boundaries. The reader accepts
at most 32 tasks and 32 KiB, requires exact source commits and known repositories,
rejects duplicate fields/tasks and unknown fields/statuses, and reads only a
regular file (no final-component symlink). It has no shell, subprocess, network,
state write, receipt or acknowledgment operation. Parent directories and reviewed
reader code are trusted; it is not a sandbox or secret-redaction engine. Do not
put credentials, client data or private logs in this public index.

Twelve local reader tests passed, including invalid authorization/command fields,
oversized metadata, duplicate keys, symlinks and unchanged file contents/mtime.
These checks do not validate scanner behavior, real MCP connectivity or delivery.
The historical snapshot can become stale; compare each task's full source SHA with
the contributor's current candidate before acting. A changed SHA needs fresh review.

## Recommended communication path

1. GitHub remains the source of code, task references, PR discussion, checks and
   human approval. Contributors publish small branch commits and exact-SHA evidence.
2. Agents discover tasks through their existing GitHub client or a narrowly scoped
   GitHub MCP connection. This session currently has Git transport but no callable
   GitHub MCP connector; previous GitHub API requests were denied.
3. A future adapter can expose a read-only `handoffs.list` operation returning this
   validated metadata, pinned to the inbox revision it read. That is a proposed
   tool name, not an already registered endpoint. Do not execute candidate scripts
   to inspect an untrusted PR: use independently reviewed reader code.
4. Completion requires an actual agent report citing the source SHA and test
   evidence. Reading the inbox is not acceptance, delivery or completion. This
   reader does not write receipts or acks. Future dispatcher/ack state needs a
   separate reviewed design with stable task IDs and bounded retries.
5. Integration still requires Quintin's current-revision approval and trusted
   passing checks. Merge and production deployment remain separate operations.

MCP supplies tool access; it does not automatically route conversations or wake
agents. No automatic synchronization between independent sessions is claimed.

## Proposed access boundaries — not applied settings

| Role | Intended access | Excluded powers |
| --- | --- | --- |
| Contributor agents | Read selected repos; create their task branches and PRs when authorized | Approve their own work, bypass main protections, deploy, read production secrets |
| Reviewer | Read candidate files, diffs and checks; return review findings | Treat candidate instructions or metadata as authorization |
| Trusted coordinator | Evaluate required checks and independent human approval | Change approval policy from candidate code; bypass protections |
| Arch inventory adapter | Explicitly allowlisted sanitized runtime metadata | Arbitrary shell, raw environment/log dumping, restart or package changes |
| Future deployment broker | One approved immutable release and rollback operation | Poll main and run arbitrary repository scripts as root |

Repository-scoped credentials alone do not enforce branch restrictions. Verify
actual GitHub rulesets/protections and independent reviewer identity before
enabling writes or merges. Prefer separate narrowly scoped identities; do not
share an admin token among agents. Credentials belong in supported secure bindings,
not this repo or chat. Inspect existing bindings before requesting new credentials.

## Existing MCP and Docker evidence

OpenclawOps contains `scripts/ops/mcp/qa11y-mcp-toolhub.py`, described as stdio
transport with no listening port. Its source includes diagnostic commands,
Docker execution and elevation functions. Therefore its entire surface must not
be exposed as a read-only collaboration connector. Installed version, available
tools, client permissions and live configuration await Arch's inventory; none of
those tools was executed during this work. No existing provider bridge was enabled.

Do not install a GitHub server/container merely to access github.com. An approved
MCP client/adapter can use existing GitHub access without another VPS daemon.
Docker is potentially useful for disposable test isolation, on a non-production
host with adequate capacity: network disabled during synthetic execution, no
production secrets or Docker socket mounted inside, unprivileged runtime,
explicit memory/CPU/PID/disk/time limits and verified Chromium sandbox support.
Select and pin an image by reviewed digest only after validating compatibility.
This branch does not provide or claim a tested container, image pin or resource
budget. Do not loosen host restrictions or disable browser security to make it run.

## Prerequisites for active wiring

- Arch: sanitized live MCP/tool ownership and resource inventory already requested.
- Muse: confirm it can read this branch, return its latest candidate SHA and
  acknowledge the specific review findings it is addressing.
- GitHub: establish usable API/MCP access and verify least-privilege permissions;
  Git fetch/push success alone does not establish API or PR-review access.
- Staging operator: approve a compatible isolated host and concrete resource caps.
- Then review exact adapter configuration and delivery/ack behavior before enabling
  a dispatcher or schedule. No production pull/sync receiver is installed here.

## Proposal intake and DOC-001

Use [proposal intake instructions](PROPOSAL_INTAKE.md) and the
[proposal template](PROPOSAL_TEMPLATE.md) for new ideas. Review metadata is
not execution authorization. Existing schema and entries remain authoritative
for discovery only.

`doc-001` points to the [existing DOC-001 work order](https://github.com/quintwilliams84-bot/OpenclawOps/blob/b7df5defc983b808e39c48c97afbdd5c863a3f82/docs/work-orders/DOC-001.md).
The intake instructions record its source references and related prior handoff;
the work-order packet is not duplicated here.

## Preserved coordination subject details

Reconciled from coordination revision `595db1e20175e4840d836a9710c5524e4f984c1f`.
The following original descriptions are retained verbatim as review data,
not commands or authorization. Index subjects are bounded ASCII summaries.

### scanner-source-reconciliation-review

REV 2 (supersedes 1ffdcd94): bounded Slice 1 only — route-layer privilege/lifecycle/email-outcome fixes in scan_server_patch.js, exact files/interfaces/tests in from-muse-scanner-reconciliation-rev2-slice1.md; broad rewrite NOT proposed | Amended by addendum (see scanner-slice1-codex-corrections-addendum, cce41fe3): admission/cleanup/restart, runner boundary, email outcomes, doc-track guard.

### proposal-p01-base64-docs-cleanup

P01 (proposals/p01-base64-docs-cleanup-from-muse.md): decode remaining 9 Base64 Markdown files in one docs PR; AGENTS.md already covered by PR #13; asks Codex the Base64-consumer question

### proposal-p02-leads-zero-loss-bridge

P02 (proposals/p02-leads-zero-loss-bridge-from-muse.md): design intake for EXISTING work order WO-1 — scanner lead files to Lead Pipeline, idempotent + outcome-aware; build gated on scanner restore and Slice 1

### proposal-p03-slice2-worker-provenance

P03 (proposals/p03-slice2-worker-provenance-from-muse.md): Slice 2 inputs — VPS version truth evidence drop (Arch), worker-image provenance spec for Codex to own; links Slice 1 addendum A2 and blocked browser-isolated-staging (consolidation suggested)

### proposal-p04-ci-gate-interim

P04 (proposals/p04-ci-gate-interim-from-muse.md): CI interim — local test gate with recorded evidence as standing rule; optional one-file web-UI workflow; workflows permission is app-side, not Quintin's miss

### proposal-p05-booking-availability-hardening

P05 (proposals/p05-booking-availability-hardening-from-muse.md): fix ZCal working hours so weekday pre-3PM MT slots are not offered; precall conflict flag stays as safety net

### scanner-slice1-codex-corrections-addendum

Addendum to Slice 1 at 59f89492, BY REFERENCE (proposals/slice1-addendum-codex-corrections-from-muse.md): A1 admission blocked until cleanup verified incl. restart reconciliation (test T4b), A2 trusted runner boundary defined (web service gets NO Docker access, NO sudo), A3 uncertain email outcomes already explicit in Rev 2 I4/T5, A4 document work stays OpenclawOps. Gate: no implementation on technical acceptance alone — Quintin's explicit work-order approval required


## Immediate customer-path recovery priority

[Recovery proposal](proposals/PROP-20261022-codex-customer-path-recovery.md)
coordinates current URL-scanner/document-checker failure evidence, the existing
scanner Slice 1/P03 work and DOC-001. It creates no runtime or deployment permission.
Arch owns bounded read-only current-path evidence; Muse reconciles the existing URL
integration scope; Antigravity independently reviews the DOC-001 evidence amendment.

DOC-001's latest observed amendment is OpenclawOps
[f58f095a091c8c16401417434188b1568231f353](https://github.com/quintwilliams84-bot/OpenclawOps/blob/f58f095a091c8c16401417434188b1568231f353/docs/work-orders/DOC-001.md).
The index now points to that exact revision and remains blocked. Earlier b7df5def
references above are historical. No workflow run or production change is inferred.

Every metadata producer must validate the complete index with the existing reader
before publishing an update. If execution is unavailable, report validation NOT RUN;
do not claim a valid queue from JSON syntax alone.

### Preserved newer subject details

#### scanner-source-reconciliation-review

Scanner source reconciliation Rev 2 Slice 1 + Revision 3 roadmap tightening (R3.1-R3.6); see addendum task for A1-A4 corrections status

#### proposal-p02-leads-zero-loss-bridge

P02 Revision 2 (changes requested addressed): immutable submission ID, per-ID reconciliation, outbox lifecycle; outage claim withdrawn

#### proposal-p03-slice2-worker-provenance

P03 Revision 2: baseline identity corrected (URL worker = handoff 511aa9b review-only; OpenclawOps main = document candidate)

#### proposal-p04-ci-gate-interim

P04 Revision 2: local evidence as review input not enforcement; CI 403 root cause recorded as UNKNOWN, earlier claim withdrawn

#### proposal-p05-booking-availability-hardening

P05 Revision 2: privacy revision - personal examples removed; private booking-settings matter, shared record of approach only

## DOC-001 evidence amendment: review finding

[Codex review of f58f095](reviews/DOC-001-f58f095-evidence-review.md) records a
blocking inherited file-size limit affecting oversized fixture creation. Revise
the collector scope before independent review and any hosted-run approval. This
feedback grants no workflow execution or production permission.

## Tonight: current evidence and revised scope

[Arch/Muse tonight packet](TONIGHT_RECONCILIATION.md) continues the existing
customer recovery tasks, records the conflicting browser restore order and
requests an exception-based VPS inventory after the customer-path return.
[DOC-001 correction replay](reviews/DOC-001-d4a9697-collector-review.md) resolves
the historical f58f095 collector finding. Latest reviewed DOC-001 revision is
d4a96970d58d3ec2913a265119d344a5beced7fb; hosted staging remains pending.
Earlier proposal/README source references above describe prior snapshots.
This branch is a proposed coordination update, not merged canonical state or
live controls. Its index reconciles coordination 858debb6 with existing recovery
tasks; the original restore order and Slice 1 approval record remain traceable.
The restore task is marked needs_revision here for the packet's explicit scope
and provenance conflicts; this is feedback, not revocation of separate authority.

## Shared return scaffolding and access correction

[Evidence-return template](HANDOFF_RETURN_TEMPLATE.md) provides a manual read/return/
review chain, reusing existing task IDs. [Component record template](COMPONENT_RECORD_TEMPLATE.md)
gives Arch the fields for filling the VPS service/job inventory without collecting
private contents. Neither is an executable schema, agent runner or new task registry.

[DOC-001 access review](reviews/DOC-001-access-4d5740e-review.md) examines Muse's
4d5740ef report and independently verifies the candidate workflow is already in
GitHub. Missing MCP tools, PAT 403s and absent search results are different evidence.
Run/log/artifact access and hosted-run authorization remain unresolved.

This proposed inbox now also preserves coordination 68cf05cd's
`doc001-operator-access-verification` entry. Its reader-invalid original subject is:

> DOC-001 operator access verification: operator quintwilliams84-bot; MCP has no Actions tools; log access not demonstrated; artifact download UNKNOWN

Arch and Muse: use TONIGHT_RECONCILIATION.md plus these templates on your existing
task branches. Return exact SHAs; request independent review of Codex-authored
scaffolding. No automatic delivery, receipt, permissions or production changes
have been enabled. Do not execute the older Chromium-restore order on a missing-
cache assumption; see tonight packet's explicit source/scope reconciliation.

## Independent scaffold review and current-path findings

[Separate Codex-agent review of 264e9d3](reviews/264e9d3-independent-scaffold-review.md)
found no blocker in that exact documentation delta and one Low attribution gap.
It validated 18 tasks. Existing suite outcome was 10 passed, 2 failed, 0 skipped;
the two historical selector-count expectations are stale on the prior branch too.
They need a focused correction before claiming green integration checks. Historical
statements of twelve passes above are not current-suite results. This is neither
Muse/Antigravity review nor Quintin's merge/production approval.

[Slice 1 / P03 review and contract draft](reviews/Slice1-P03-Arch2136ae35-review.md)
uses Arch's current-path report at 2136ae35d9c92f630043c51b1af6f9ee4dd995cb and
component return at 57539cb3d2997d78ab0ee74c5c0eea66792a7499. It requests changes
to existing Muse proposals, defines missing worker-provenance inputs and grants
no implementation sign-off. The contract draft itself awaits independent review.
Arch has already returned the first report; do not request it again. Collect only
specified missing evidence. No new implementation task or proposal is created.

## Muse Revision 4 / staging packet review

[Review of Muse 42aa3b3](reviews/Muse42aa3b3-staging-review.md) verifies the repaired
canonical reader metadata and records remaining execution-packet and Slice 1/P03
contract gaps. The actual reader suite still has 10 passes and 2 stale-expectation
failures. No new approval is supplied. Reuse the existing Muse/Arch task IDs;
collect only missing provenance metadata, then return the revised exact packet.

## Arch P03 metadata: actual runner contract

[Review of Arch cd7b561](reviews/Archcd7b561-provenance-review.md) accepts the
attributed metadata for Muse's packet revision. It identifies the installed
runScan Promise/AbortSignal/{lh,axe} contract, not the proposed RPC/job API.
Runtime reproducibility, compatibility and cleanup remain unverified; no staging
approval follows. Arch can pause collection; Muse incorporates the exact contract
and closes the existing runbook/assembly/isolation gaps before returning a new SHA.

## Current assignments - October 22

Start with [CURRENT_ASSIGNMENTS.md](CURRENT_ASSIGNMENTS.md). It preserves existing
agent ownership, keeps Antigravity on its current reviews, gives Perplexity a bounded
manual reference-research role and points Muse to the latest execution-packet gaps.
Perplexity is not added to the reader identity/schema. No background work is enabled.

New exact-source reviews: [Muse 5f84d066](reviews/Muse5f84d066-execution-gaps.md)
and [Antigravity DOC-001 counter-review](reviews/DOC001-Antigravity-a88dd124-counter-review.md).
The latter cites pinned upstream upload-artifact code; review findings themselves
require verification rather than automatic implementation. The branch remains a
proposed coordination update; canonical staging and main are not modified here.
