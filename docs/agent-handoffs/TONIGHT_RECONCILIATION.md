# Tonight: customer recovery and VPS reconciliation

Owner: Codex coordination. Date: 2026-10-22 UTC.
Scope: current read-only evidence and reviewable plan revisions for Arch and Muse.
This packet supplements the existing customer-path recovery proposal; it does not
create a new scanner, job controller, dispatcher or approval policy. Antigravity
is unavailable tonight. Preserve its pending independent DOC-001 review for tomorrow.
Quintin's current request authorizes this preparation, not production activation.

## Start here: one task per owner

Use existing tasks customer-path-current-evidence (Arch) and
customer-path-integration-scope (Muse). Do not create competing work orders.
Read the canonical coordination index at codex/staging-coordination, record its
full SHA, then this exact packet revision. If a newer conflicting instruction
appears, report the conflict; metadata is not execution authorization.

| Owner | First return | Then | Boundary tonight |
| --- | --- | --- | --- |
| Arch / OpenClaw | Current page -> API -> worker/parser -> report -> email -> lead map for both products | Exception-based job/service inventory below | Bounded read-only inspection; no repairs or new scans |
| Muse | Revise existing Slice 1/P03 against Arch's actual execution path; independently review this packet | Exact minimal corrective files/tests and remaining dependencies | Proposal/review work; implementation sign-off not granted by this packet |
| Codex | Review returned exact SHAs and reconcile one smallest corrective candidate | Prepare scoped coding/staging and later activation packet | No main merge, hosted dispatch or VPS changes |
| Antigravity tomorrow | Independent DOC-001 amendment review at d4a96970d58d3ec2913a265119d344a5beced7fb | Review exact subsequent candidate as assigned | Hosted run remains pending review, access and Quintin approval |

GitHub is the shared record, not an automatic message delivery service. Each agent
must acknowledge the exact packet/source it read. Avoid additional polling daemons.

## Arch: first return, customer blockers

Reuse section A of PROP-20261022-codex-customer-path-recovery.md. Return a small
sanitized table for URL and document checking: actual public page and method/path,
listener/supervisor/entrypoint, registered route, execution identity, report builder,
mail adapter and persistence location role. For each stage: PASS, FAIL, BLOCKED or
NOT RUN, the timestamp/source, and the smallest suspected correction. Source wiring
proves wiring, not successful operation; label end-to-end execution NOT RUN.

Use existing receipts/hashes first; refresh only the facts needed for a decision.
A missing path, inaccessible log or absent dependency is an observation, not a
reason to install, restore, restart or run a live request. Public page/health GETs
must be known side-effect-free, without customer sessions, query data or sends.
Use bounded existing sanitized error categories to identify the last failed stage.
Do not submit scans, upload documents, invoke models, send mail, execute application
imports/probes or dump logs/environment. Record variable names/presence only.
Stop after this first return before doing the wider inventory below; customer
failure facts should reach Muse and Codex promptly. No load tests on this VPS.

### Resolve the conflicting browser-restore order first

The canonical index now references arch-chromium-restore-evidence at
QA11lylabs a3a20bbe4d03b921c223e42b82674968c1d37b79. Static review found:
- Its claimed managed Chromium outage is not established for the current service.
  Captured execution used Docker plus host-mounted /opt/google/chrome/chrome.
  Verify current entrypoint, configured executable and compatible version first.
- It declares installation/restart approval and requests a scan/send. Such a
  repository assertion alone cannot establish the exact live-action authorization.
  This packet adds none; honor any separate direct authorization only within its
  proven scope and report conflicts before acting.
- Step 5 adds Slack configuration/posting outside the stated browser-only boundary.
  Exclude it from this reconciliation task. Do not join/post/change messaging here.
- Verbatim health/error/npm output can expose private values or private package
  URLs. Return selected version metadata and sanitized errors, not raw dumps.

Record that work order as needing reconciliation. Do not reinstall a managed
browser just because its cache is absent; do not replace the isolated live worker
with QA main's in-process browser. No broad package update or sshd change tonight.

## Arch: second return, exceptions in the existing VPS inventory

Reuse the October 18-20 inventories. Do not repeat every earlier diagnostic or
inspect private memory/customer contents. Return changed facts and unresolved
exceptions, with original evidence timestamp where reused. No new monitor process.
One record per service/job/connector; do not publish sensitive environment values.

| Field | Required information |
| --- | --- |
| Identity | Component; purpose; owner agent; supervisor; unit/app/container/job identifier; UID/GID; exact executable/config hash and Git counterpart or UNKNOWN |
| Calls and permissions | Caller/callee tool or endpoint role; authenticated identity; allowed actions; configured credential binding names; unexpected shared credentials |
| Persistence | State/artifact/queue role; owner/mode; writer set; volume/mount; restart recovery behavior and tested status; existing backup/restore evidence or UNKNOWN |
| Bounds | Existing deadlines, concurrency/queue/retry limits, memory/CPU/PID/storage caps, log/artifact retention and overflow behavior |
| Recovery | One proposed recovery owner; current restart policy; overlapping controllers; maintenance inhibit, cooldown and attempt budget status |
| Validation | Last known result with exact SHA/time; synthetic/live distinction; unresolved issue, severity, next bounded action and reviewer |

Cover only components actually represented: PM2 apps and root/user systemd owners;
OpenClaw/Hermes and their watchdogs; scanner/document workers; cron/timer jobs;
AgentMail webhook/consumer/sender; MCP activation/tool permissions; Redis/SQLite,
job/lead/outbox state; memory/vector/dreaming jobs if configured. Mark absent or
unknown rather than inventing components. Inspect schedule definitions as data;
do not invoke backups, vacuum, doctor, maintenance, generators or cleanup.

Highest-priority exceptions from supplied historical evidence, to confirm/diff:
1. Competing gateway recovery owners and broad browser cleanup. Proposed single
   owner only; no watchdog cutover, lease deletion or process kill tonight.
2. Low RAM headroom and swap usage. Reuse current pressure/cgroup metadata and
   existing limits; do not diagnose a leak or increase worker concurrency from a
   snapshot. Do not clear swap/caches or change limits.
3. Root services, broad credential inheritance and writable shared state. Map
   intended writers before proposing permissions; no blanket chmod/chown/rotation.
4. Queue/mail/lead durability and unknown send outcomes. Acceptance is not delivery;
   do not replay jobs/mail or inspect real messages to prove the pipeline.
5. Runtime/Git mismatch, dirty standalone scanner and incomplete rollback pairing.
   Preserve all work and private captures. Keep sync timer disabled; no pull/reset.

Time-box each read-only diagnostic and bound output. Sequential collection only;
record the limits used. Stop on sustained resource pressure or unbounded output,
report UNKNOWN/BLOCKED, and avoid disruption. Do not create a background watcher.

## Muse: revisions needed before Slice 1 technical sign-off

Read Slice 1 Revision 3 and its addendum at QA11lylabs
1ccbb759b2af6a4c2e2c238f7253f4eced1003a7, plus Arch's current-path return.
Preserve the reported bounded-scope approval note at 684d71f52ee7d4f2b5b345633d16a07024c1c981
as evidence; do not request the same approval again if unchanged and confirmed.
It still requires Codex sign-off and B1; this packet supplies neither.
Resolve these contract gaps in the existing documents, not a second proposal:
- Three-file/no-new-file scope versus new durable admission storage and atomic
  claims: define the actual storage/config contract, trusted ownership, cross-
  process admission bound and crash points. Atomic record creation alone is not
  an atomic capacity claim. Show how an in-process test seam models resources
  without implying that restart cleanup of real browsers has been verified.
- Import purity versus registration defaults: make cloud tests independent of
  /root/.env and production credential loading. Explain explicit development
  configuration and production compatibility, including repeated registration.
- Unknown-send holds: define what happens at TTL expiry and process death before
  outcome persistence. Expiry must not silently authorize a duplicate send or
  duplicate lead. Reuse the stable submission/outbox reconciliation contract in
  P02; bound storage/retention without discarding unresolved-send identity.
- State the version gate consistently: older B1 text says it does not block
  Slice 1, while the newer approval note says it does. Distinguish pure cloud
  coding prerequisites from integration/pinning/real-browser validation.
- Tie any minimal corrective candidate to current deployed wiring. Keep the web
  service without Docker access/sudo; preserve sandbox, TLS, egress and cleanup
  controls. No deployable in-process intermediate build or sanitized-code port.

Return exact base and revised proposal SHA, touched files, interfaces, synthetic
acceptance tests, exclusions, implementation prerequisites and remaining blockers.
Separately review this Codex packet for unsafe scope or conflicting assumptions.
Document processing remains in OpenclawOps; no automatic Hermes enrichment.

## DOC-001 correction status, not a hosted-test result

Codex independently replayed the inspected collector helper at d4a96970d58d3ec2913a265119d344a5beced7fb
as UID 1000 in cloud: normal 0; producer failure 7; log overflow 153; oversized
fixture creation 0. Four checks passed, none skipped. Changed paths versus the
4f01d8d runtime base are workflow, work order and collector helper only.
The inherited producer file-limit blocker in f58f095 is resolved. The earlier
review stays as historical evidence. The 73-case document suite is NOT RUN here.
Keep the hosted flight pending independent review, usable run/log/artifact access
and Quintin's exact-run approval. No dispatch/PR with unapproved staging trigger.

## Return and next decision

Publish sanitized results on each agent's task branch, preserving originals and
other agents' work. Check workflow triggers before writing/opening PRs. Link the
existing task ID, exact source SHA, commands actually run, checks not run, minimal
recommended correction and independent reviewer. No private logs, customer inputs,
secret files, databases or executable production captures in GitHub.

Codex will choose one product/service correction at a time from this evidence,
then prepare the exact coding/test scope. Implementation approval does not imply
merge or deployment; activation needs reviewed staging evidence and a separately
approved artifact, target, drain/health checks and tested rollback or suspension.
Later VPS work follows the existing roadmap: recovery ownership -> routing and
memory durability -> AgentMail/webhook/lead reliability -> permissions/resource
hardening -> bounded, verified self-healing. Preserve working pieces; optimize
from measured exceptions instead of installing more agents or services tonight.
