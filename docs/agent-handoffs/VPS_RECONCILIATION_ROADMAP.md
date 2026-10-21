# QA11y VPS reconciliation and reliability roadmap

Status: proposed technical plan for independent review and Quintin approval.
Author: Codex. Date: 2026-10-21 UTC.
Coordination base: QA11lylabs d17cbe735ffd80bfc2704c7fb66988072feb98f3.
This file is the planning map, not a runner, deployment artifact or execution permit.

## Purpose and operating boundary

Turn the existing VPS stack into a reproducible, bounded, observable system while
preserving useful work. The target is reliable URL/document scanning, reports,
remediation plans, agent delegation and email, with controlled memory maintenance.
No claim of production readiness or zero failures is made by writing this plan.

GitHub records approved source, proposals and evidence. The running VPS is a
separate state to reconcile, never assumed equal to main. Architecture findings
may be verified from source while installed state remains UNKNOWN. Production
sync must remain disabled until a separately approved replacement is proven.

Each phase produces small exact-revision candidates. Technical review does not
authorize implementation, test execution, merge or production activation. Reuse
standing authorization where it actually covers the action; do not request it
again. Otherwise obtain Quintin's explicit bounded authorization before acting.
No phase authorizes unapproved real emails, model calls, customer-data tests,
credentials, schedules, service changes or deployment.

## Existing records: link rather than duplicate

- Intake and template: PROPOSAL_INTAKE.md and PROPOSAL_TEMPLATE.md in this folder.
- DOC-001: OpenclawOps work-order revision b7df5defc983b808e39c48c97afbdd5c863a3f82,
  docs/work-orders/DOC-001.md. Candidate code 4f01d8d47fdb1276ac8dc97d30b5e06312d6cd2c.
- Document release plan: OpenclawOps PR 23 at 038529675833f19dfa243160f7692ed4e261d1aa.
- Release-control guard review: OpenclawOps PR 22 at 223a317e11b48af4b93cbc264eccac9ed15e13e5.
- Sanitized live-source handoff: OpenclawOps 511aa9b6879664eca3869ac19124b1e88f8a2b61,
  handoffs/scanner-runtime-review-20261019/. Never execute these sanitized files.
- Scanner Slice 1 proposal: QA11lylabs 59f8949244f9f949f10ea425537832f8f8625f6d,
  docs/agent-handoffs/from-muse-scanner-reconciliation-rev2-slice1.md.
- Slice 1 addendum: cce41fe3cc8fdd57616f735aaeaa9b20d8e0c3eb,
  docs/agent-handoffs/proposals/slice1-addendum-codex-corrections-from-muse.md.
- P01-P05 proposals: 1411a6bb92960f9744972429b36af3a24f80a3fd in proposals/.
- Codex intake/P01-P05 feedback: 4167349f0b4235329d1b4a99f4847b5509f1c20c,
  docs/agent-handoffs/reviews/intake-4f7cd55-and-muse-proposals-20261021.md.
- Pure recovery policy v3: OpenclawOps b7dc2a75696f10a346f4ab106102fa99419a649b.
- Coordinator foundation: OpenclawOps 60d7a72bf5c47ed040674d812e3bebc8ad17465a.

These are review anchors, not instructions to replace current source. Recheck
moving refs and record new exact revisions without silently carrying forward
approval. Existing proposal IDs and DOC-001 remain authoritative for their work.
This roadmap does not create replacement work orders or renumber their history.

## Ownership and handoffs

| Participant | Proposed responsibility | Boundary |
| --- | --- | --- |
| Quintin | Priorities, bounded authorization, current-revision merge and separate production decisions | No agent can manufacture his approval |
| Codex | Technical orchestration, architecture, review dispositions, scope and evidence reconciliation | Codex-authored changes need another independent reviewer |
| Arch/OpenClaw | Installed-state evidence, operations and approved rollout preparation | Production execution only within exact authorization |
| Muse | Scanner route/interface proposals and scoped cloud candidates, report/lead design | One owned branch; no edits to Arch's files or live services |
| Antigravity | Independent review and integration-risk assessment | Initial role is read-only; implementation needs assigned scope |
| Hermes | Later bounded worker/delegation tasks with synthetic input first | No ambient root/Docker credentials, privilege escalation or self-granted tools |

Role assignments are proposals until acknowledged. A task branch, filename,
index field or natural-language message is not a security boundary. One writer
owns an implementation file at a time. Reviewers point to exact paths and SHAs.
No notification delivery or continuous Codex monitoring is implemented here.

## Phase 0 — Preserve and establish the baseline

Owner: Arch. Review: Codex; Antigravity checks evidence gaps.

Reuse the captured source, installed-state reports and clean/dirty inventory.
Record each component's source identity, supervisor and persistent state using
the component-record requirements below. Collect only missing or stale evidence;
do not repeat whole-system diagnostics merely because another agent joins.

Known supplied observations: overlapping gateway recovery controllers; gateway
memory around 2.25 GiB on a roughly 4 GiB VPS; substantial swap usage; a dirty
standalone scanner checkout; source/deployed differences; broad credential
inheritance; shared data permissions needing intended-writer review. These are
not fresh measurements or proof of a memory leak, compromise or safe restoration.

Exit gate: relevant live source is preserved privately, differences are mapped,
unknowns are explicit, installed sync remains contained and no dirty work is lost.
Existing preservation/intake work can satisfy this gate when linked and current;
this phase does not authorize another capture or modification by itself.

## Phase 1 — Prove the development and evidence path with DOC-001

Owner: Arch for preparation. Execution operator: separately designated by Quintin.
Independent review: Antigravity for Codex/Arch-authored controls; Codex for results.

Finish DOC-001's evidence-only workflow amendment before requesting a hosted run.
Record checkout/workflow SHAs, resolved tool versions, lock hashes, worker image
identity, dependency manifest, per-category test results and cleanup evidence.
Use explicit artifact paths, bounded retention and no whole-workspace uploads.
If workflow changes create a new candidate commit, update the work order and
approval target. Unchanged parser bytes do not make the new workflow SHA old.

Resolve access to run identity/logs/results through an already authorized operator
or separately approved narrow correction. A 403 does not prove an app permission
is impossible or a new PAT/paid plan is required. Never weaken checks to pass.

Proposed flight: one exact-ref GitHub-hosted run, synthetic only, no production
credentials, no self-hosted VPS runner. Intended coverage 45 unit + 10 HTTP +
1 crash/recovery + 17 container = 73. Missing/skipped/unrun cases are not PASS.

Exit gate: approved run recorded by ID/event/attempt/full SHA, all expected cases
accounted for, isolation and owned cleanup verified, evidence independently
reviewed. A green badge or configured test count alone cannot close DOC-001.
This gate proves a staging path; production cutover still needs its own approval.

## Phase 2 — Reconcile the customer-facing pilots

Document pilot: existing OpenclawOps isolated candidate, governed by DOC-001 and
PR 23. Preserve separation from URL work. Do not port the captured older document
route, its host parsing, automatic Hermes dispatch or unsupported follow-up claims.
Before activation: complete reviewed wiring, identities, upload recovery,
attachment containment, truthful errors and retention. Rehearse rollback/intake
suspension. Old parser restoration would restore its known weaknesses.

URL pilot: Muse prepares the revised Slice 1 scope; Codex reviews interfaces;
Antigravity independently checks implementation and integration. Provenance
preparation under P03 may proceed in parallel within its authorized scope.

Resolve these proposal gaps before implementation acceptance:
- Cleanup state must be durable and bound to trusted job/resource identity.
  Never recover by killing a stored bare PID or deleting arbitrary stored paths.
- Do not reuse an unlocked/race-prone rate-limit file as a trusted job ledger
  without an atomic ownership/concurrency contract and crash tests.
- Keep unknown email outcomes pending reconciliation; no automatic resend or
  success/delivery assertion. Use stable submission IDs, not timestamp-only IDs.
- The web service gets no Docker group/socket or broad sudo. A proposed trusted
  runner boundary needs bounded authenticated local requests and peer ownership,
  strict schemas, quotas, job-specific cancellation and execution revalidation.
  Docker control remains effectively privileged even behind a non-root account.
- Do not deploy an intermediate direct-host browser path merely because its
  mocks pass. Preserve effective sandbox/TLS/egress controls and the isolated
  production architecture until the exact replacement is approved.

Browser/runner phase: reconcile QA route features with an approved execution
adapter, complete manifests/locks, host Chrome/library provenance, image identity
and release assembly. Never copy redacted paths/addresses into runnable code.
The proxy's 110-second lease versus 120-second watchdog does not guarantee
cleanup-before-readmission. Retain admission through verified removal, including
frontend death, create/start ambiguity, cleanup failure and restart.

Exit gate: synthetic URL/document happy paths plus hostile input, egress, TLS,
sandbox failure, deadline/disconnect/crash and cleanup tests pass on the exact
artifact/config pairing. Generated report accessibility and manual UI gaps are
recorded honestly. P01 doc cleanup is a separate small PR, not a browser repair.

## Phase 3 — OpenClaw/Hermes ownership, resource budgets and recovery

Preparation owner: Arch. Architecture/recovery contract: Codex. Independent
review: Antigravity. Hermes receives a bounded test role only after approval.

Map every PM2/systemd/Docker/cron/timer/watchdog target. Choose one recovery owner
per service. Preserve existing supervisor boundaries and define maintenance
inhibits, intentional stops, startup grace, verified health, active-job awareness,
shared lock/reservation, durable budgets/backoff and alerts. Cut over overlapping
legacy watchdogs only through an approved maintenance/rollback procedure.

Never treat socket presence alone as health, provider-credit/auth failures as
reasons to restart, or leases matching a name as stale. No direct database lease
repair, broad process-name cleanup or repeated doctor --fix loop. The v3 pure
recovery policy is a reviewed specification candidate, not an installed executor:
authenticated observations, durable CAS/journaling, approval and dispatch fencing
remain prerequisites to integration.

Measure memory/CPU/PIDs/FDs/disk/queue depth and peaks, using cgroups and process
ownership. Distinguish resident memory, filesystem cache, swap allocation and
actual pressure. Investigate growth under repeatable load before calling it a leak.
Define a shared workload budget across gateway, agents, URL/document workers,
background jobs and OS headroom. Do not raise browser concurrency or impose a
random gateway heap cap. Propose conservative heavy-job serialization until tests
justify concurrency; enforcing it on production is separately approved.

Exit gate: staging recovery succeeds without competing controllers, duplicate
execution or unrelated kills; failure budgets persist across restart; resource
peaks fit the measured budget. Production recovery activation remains separate.

## Phase 4 — Reliable agent routing, AgentMail, webhooks and leads

Design owner: Codex; Arch supplies sanitized installed interfaces; Muse owns the
existing P02/WO-1 design. Assign implementation owners per approved file set.

Define an agent/tool registry from actual installed capabilities: caller,
operation schema, permission, data boundary, deadline, idempotency, concurrency,
evidence and escalation route. MCP registration is not proof of tool activation.
No general shell, filesystem write or secret access is granted by naming an agent.

Inbound AgentMail/webhooks need provider-authenticity validation, replay/event-ID
handling, bounded body/attachment parsing and durable receipt before ack. Treat
email/document/web text as untrusted data, not instructions to invoke privileged
tools. Preserve privacy and separate client input from operational instructions.

Outbound mail needs an outbox with accepted/delivered/failed/unknown semantics,
provider identity evidence, bounded retries, duplicate prevention and review of
recipient/attachment authorization. Real sends remain separately authorized.
A helper printing a message ID is not inbox delivery proof.

P02/WO-1 must cover intake before successful scanning, immutable submission IDs,
per-record acknowledgement and reconciliation, crash-safe checkpoints, retention,
access controls and safe CSV export. Weekly counts alone cannot prove no loss.
Use existing narrowly authorized integrations where suitable; do not proliferate
Google/AgentMail credentials or put lead data into Git. Define what happens when
a provider is unavailable instead of promising an unqueued human follow-up.

Exit gate: duplicate/reordered/replayed events, provider outage, interrupted sends,
unknown outcomes and restarts preserve jobs without false completion or duplicate
outreach. Synthetic integrations only until specific real-service tests approved.

## Phase 5 — Durable memory, vector search, learning and scheduled maintenance

Owner: assign after the storage/ownership inventory; Codex reviews the contract,
Antigravity reviews migration/recovery; Arch owns approved deployment preparation.

Identify actual databases, vector backend, schema/embedding versions, filesystem
owners and backup scope. Do not assume dreaming/vector features exist because
mentioned in a plan. Preserve state; no blind chmod, vacuum, reindex or migration.

Specify bounded scheduled jobs with single ownership, no overlapping runs,
checkpoints, stop conditions, quotas and resumable recovery. Schedule around the
shared resource budget. Separate read/search access from write/delete rights,
add retention/provenance and test index rebuild and restore with synthetic data.

Learning produces reviewable proposals/knowledge with source attribution. It must
not silently change AGENTS, system instructions, permissions, tools or deployments.
Memory from untrusted inputs cannot authorize action. Backup existence is not
restore proof; verify restoration into isolated storage before relying on it.

Exit gate: restart/restore preserves intended state and access boundaries; bounded
maintenance completes or stops safely without exhausting the gateway's budget.

## Phase 6 — Approved release, limited rollout and sustained operation

Owner: designated release operator (usually Arch) within Quintin's exact approval.
Reviewer: independent from artifact author; Codex reconciles overall evidence.

Use exact immutable source/image/config identity, private captured prior pairing,
rehearsed activation and state-compatible rollback/suspension. Recheck installed
drift and in-flight work immediately before action. One service-scoped change at
a time; no main auto-pull, gate self-update or blanket restart. VM reboot or
provider/credential changes are separate actions, never implied by smoke tests.

Set service-specific interruption/SLO thresholds after baseline. Review latency,
errors, queue age, memory/FD/disk growth, cleanup and delivery/persistence. Start
with bounded staging soak; plan 24-72 hours of post-activation observation when
appropriate without generating unapproved production load. Define who pauses or
rolls back on thresholds and obtain exact contingency authorization in advance.

Exit gate: a documented observation window meets agreed thresholds, no unexplained
jobs/resources remain, restoration is tested, and operators have a truthful runbook.
Expand unattended work gradually by tool/action scope. Continuous Codex execution
or autonomous merges are not installed by this roadmap.

## Required component record for every service/tool

Keep records in the component's existing operations repository; this roadmap links
them rather than creating another inventory copy. Record UNKNOWN when unverified.

- Stable component/job ID, purpose, owner and independent reviewer.
- Repository/commit/path and installed hash; source drift and capture reference.
- Runtime/tool/dependency versions, manifests/locks, image/browser identity.
- Entrypoint, supervisor, execution identity and sole recovery owner.
- Listener/ingress/egress, caller schema and authentication/authorization boundary.
- Environment binding NAMES only, credential scope, writable paths and ownership.
- Persistent state, private-data classification, retention and restore/migration plan.
- Input/output/time/CPU/memory/PID/FD/disk/concurrency/retry limits.
- Readiness vs liveness vs provider availability; job and delivery outcome states.
- Scheduling/restart behavior, maintenance controls, cleanup and idempotency.
- Exact tests/results/evidence, missing prerequisites and approved rollback.

## Immediate assignments and work limits

Arch: finish DOC-001's evidence-only amendment and retain its existing work order.
Report supported run/results access and exact source/workflow identities; do not
dispatch until the bounded run and operator are authorized. No additional broad
VPS inventory or repair is requested by this plan.

Muse: revise existing P01-P04 and Slice 1/addendum against Codex feedback. P05
remains a separate private booking-settings decision; remove unnecessary personal
appointment details from shared proposal text. Do not build a parallel document
implementation or broaden scanner scope.

Antigravity: independently review this roadmap and, once published, DOC-001's
workflow-evidence amendment. Return blockers, gaps and duplicate/ownership risks.
Initial assignment is read-only. No automatic tests or new runtime authoring.

Codex: reconcile the scoped Slice 1 contract and P03 provenance requirements next,
review exact revisions/evidence, and keep findings linked to existing task IDs.
Codex's own roadmap requires independent review; self-review is not acceptance.

One active implementation per owner, one writer per file, and no simultaneous
production activations. Preparation/review can proceed in parallel; heavy staging
jobs require their own authorized limits. Blocked work retains its reason and
specific next action. Do not mark a plan complete because a document exists.

## Status and reporting contract

The existing index remains a bounded discovery router: supported statuses only,
no execution commands or new approval fields. Detailed proposal/work-order records
hold revision-bound feedback and human authorization. This roadmap adds no second
status database. Do not confuse a queue status awaiting independent review with
Codex's own completed technical feedback; use the linked evidence to interpret it.

Every handoff reports exact commit, changed paths, checks actually run, failures,
remaining blockers, next owner/action and authorization boundary. Recheck moving
heads before integration; preserve newer entries and the complete index reader
validation. GitHub API restrictions remain UNKNOWN until verified, not grounds
for broad credentials or lowered safeguards.
