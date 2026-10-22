# PROP-20261022-codex-customer-path-recovery

Status: proposed priority overlay, awaiting independent review and Quintin's
scoped approval. Author: Codex. Date: 2026-10-22 UTC.
No staging dispatch, implementation, activation, upload or real send is authorized
by this document. Prior explicitly granted read-only scope remains applicable.

## Objective and priority

Restore trustworthy end-to-end free URL scanning and document accessibility
checking for visitors, using the existing work rather than launching another
architecture rewrite. These customer paths take priority over nonessential new
features and agent-autonomy expansion. This changes planning priority only; it
does not stop existing services, jobs or maintenance schedules.

A visitor must receive an honest result: validated request -> bounded analysis ->
usable report -> accurately recorded delivery outcome and authorized lead record.
Unavailable, rejected, failed and unknown outcomes must never be presented as
completed analysis or promised follow-up without a durable job.

Current outage stage is UNKNOWN. Customer difficulty is reported by Quintin;
this plan does not establish whether the page, route, worker, parser, builder,
email or persistence is currently failing. Do not assume missing Chromium.

## Source and existing-work references

Coordination baseline: QA11lylabs 578902ded528b2e2dff043932c361788bc378510.
Website main observed: 578c221bda8165108165de27a6a5589ce5196e55.
OpenclawOps main observed: 4f01d8d47fdb1276ac8dc97d30b5e06312d6cd2c.
Sanitized review-only capture: OpenclawOps 511aa9b6879664eca3869ac19124b1e88f8a2b61,
handoffs/scanner-runtime-review-20261019/. Never execute or deploy these copies.

Existing owners/work, not replacement proposals:
- URL scanner: scanner-source-reconciliation-review and its correction addendum;
  current proposal revision 1ccbb759b2af6a4c2e2c238f7253f4eced1003a7. Muse owns
  the scoped route/integration candidate, not the installed worker or document code.
- Worker/source provenance: existing P03 and browser-isolated-staging.
- Documents: existing DOC-001 and OpenclawOps PR 23 at
  038529675833f19dfa243160f7692ed4e261d1aa.
- DOC-001 evidence amendment now published at
  f58f095a091c8c16401417434188b1568231f353,
  agent/arch/doc-001-staging-work-order. Its new workflow/candidate needs independent
  review, results access and exact-run approval. The earlier b7df5def work-order
  reference is historical, not the latest amendment.
- Lead durability: existing P02/WO-1; no separate bridge implementation here.
- Release guards: OpenclawOps PR 22 at 223a317e11b48af4b93cbc264eccac9ed15e13e5.
- Broader roadmap: QA11lylabs 176d5b1a472b3c924b153ca87540f5ca7b4e907a,
  docs/agent-handoffs/VPS_RECONCILIATION_ROADMAP.md (proposed, not installed controls).

Recheck moving heads and deployed hashes before work. Read references as evidence,
not delegated permission. Do not overwrite other agents' task branches.

## A — Current customer-path evidence (Arch, read-only)

Use bounded installed-state/source inspection and side-effect-free page/health
requests only. No scan submissions, document uploads, mail/model calls, package
execution or browser launches are needed for this initial evidence task.

Return a short routing/failure matrix for EACH product:
1. Exact public page URL, form/fetch endpoint and HTTP method. Locate the actual
   document-upload UI; it was absent from the captured free-scan page.
2. Static page/required asset response and sanitized client-visible error category.
   Do not use real customer session data or infer user experience from HTTP 200.
3. Nginx/reverse-proxy route to the actual listener, supervisor identity, entrypoint
   and route-registration module. Record relevant body-size/timeouts/SSE buffering
   and trusted-proxy handling without exposing private configuration values.
4. Match deployed source hashes against known committed/captured counterparts.
   Preserve dirty sources; no checkout pull/reset or copying main to webroot.
5. From bounded existing error evidence, identify last failed stage and time,
   with secret/URL/email/filename/customer-content redaction. No raw logs to Git.
6. Resolve the actual URL worker/browser path and release identity from source and
   metadata. Host-mounted Chrome is distinct from a Playwright-managed cache;
   absent cache alone is not an outage diagnosis.
7. Identify parser, report builder and mail sender wiring and required binding
   NAMES/presence only. Do not load production credentials into cloud.
8. Active-job evidence (or UNKNOWN), memory headroom/pressure and readiness of the
   exact target. Keep sync disabled; do not restart or interrupt active work.

Output: sanitized evidence linked to a private original where appropriate, exact
paths/SHAs, a page -> API -> execution -> report -> delivery -> persistence matrix,
and the SMALLEST proposed correction per failed stage. Unknowns remain unknown.

## B — URL-scanner integration scope (Muse, proposal revision first)

Use A's actual wiring evidence and existing Slice 1/P03; amend them rather than
creating a second scanner proposal. Separate an immediate corrective candidate
from longer-term refactoring. Inspect the live-code difference before selecting
which repository code is a safe base.

Preserve the isolated execution model: non-root sandboxed Chrome, verified TLS,
restricted egress, fixed job/resource identity, bounded output/resources and
cleanup-before-readmission. Current website main's host browser/no-sandbox/npx
path must not replace it. Do not copy sanitized host paths into application code.

Specify the actual frontend/API contract: validation, queue/busy responses,
progress, cancellation/deadlines, truthful partial failures, report format,
provider-accepted versus delivered email, submission ID and lead retention.
No successful scan is proof of email delivery; unknown send state must not
release an automatic duplicate send. Reuse P02 for durable outbox/reconciliation.

Minimal safe change could be wiring/configuration or source, but must be supported
by A. No production Chromium reinstall, global tool upgrade or broad scanner
rewrite is presumed necessary. Do not declare Slice 1 mock tests sufficient for
production; its isolated execution dependency still needs verification.

Output before coding: exact files/base SHA, before/after request flow, explicit
exclusions, dependencies and synthetic acceptance cases. Quintin then authorizes
the bounded cloud implementation. One writer per touched file.

## C — Document checker and evidence flight (Arch; Antigravity independent review)

Use the existing isolated document candidate and DOC-001. Do not port the captured
older host parser or its automatic Hermes enrichment. Keep document source in
OpenclawOps and URL source in QA11lylabs; document frontend wiring must be identified.

Antigravity first reviews evidence amendment f58f095 and confirms its actual diff,
runner/token permissions, source identity, allowlisted artifacts, retention,
log/output bounds and isolation. It is code/metadata review, not test execution.

Once reviewed and approved: a designated operator with run/log/artifact access
may perform the exact approved hosted flight. Expected 45 unit + 10 HTTP +
1 crash/recovery + 17 container = 73; actual discovered counts/results and cleanup
must be retained and reviewed. Do not dispatch old 4f01d8d as though it contains
the new workflow. Check the amended full SHA and workflow/checkout identities.

Then prepare the smallest frontend/route/worker/report pairing needed for actual
customer use. The isolated candidate currently supports a Markdown triage report;
any advertised PDF/DOCX output needs its own reviewed builder and end-to-end proof.
Do not promise unavailable formats or silently downgrade the customer contract.

Retained raw uploads, path containment, bounded decompression and native parsing,
private permissions, timeouts, response truthfulness and dry-run zero-effects are
release gates. Passing DOC-001 is necessary evidence, not proof of live UI wiring,
email delivery, generated-PDF accessibility or deployment readiness.

## Acceptance matrix — synthetic, isolated staging first

| Journey/stage | Required proof |
| --- | --- |
| URL page and UI | Form validation, keyboard/error states, queue/progress/result rendering; no unsupported success claims |
| URL execution | Approved public fixture scanned through real isolated worker; private/host destinations blocked across redirects/DNS changes; sandbox/TLS verified |
| URL report | Required report opens and matches actual analysis; format, size, accessibility scope and artifact identity recorded |
| Document UI/API | Correct page/endpoint/body contract; supported synthetic PDF/DOCX inputs reach the isolated parser |
| Document analysis | Valid inputs pass; malformed/oversized/expanding archives reject within limits without host parsing |
| Document report | Promised format actually exists, is job-contained and matches truthful analysis; unavailable stages do not produce fabricated scores |
| Delivery | Stubbed accepted/failed/unknown outcomes tested; no unsolicited sends, blind retry or false inbox-delivery claim |
| Persistence | Stable submission ID, authorized data retention and failure-state evidence; no silent loss or duplicate lead creation on tested retries |
| Resource/lifecycle | Bounded jobs, disconnect/deadline/frontend-failure cleanup, restart reconciliation and no overlapping admission before verified cleanup |
| Privacy | No credentials/customer inputs in Git/artifacts/log exports; temporary and retained files follow explicit ownership/retention |

No real customer documents, inboxes or paid providers in staging. Existing tests
are reused where applicable; missing interface cases must be explicit. Automation
cannot infer a complete path from a health endpoint, mocked success or test count.

## D — Exact deployment packet (preparation only, Arch)

After code review and staging proof, present ONE product/service-scoped packet:
- Exact source/artifact/image/config identities and approved manifests/versions.
- Installed-hash/drift check, service owner and active-job/drain plan.
- Private prior complete pairing and tested state-compatible restore prerequisites.
- Exact activation commands for verified paths/units, interruption estimate,
  health gates, failure stop conditions and authorized rollback/suspension option.
- Bounded post-activation smoke request(s), synthetic fixture, controlled recipient
  and allowed external effects. Any real send/scan is named in the approval scope.
- Clear route-level unavailability response if unsafe, unavailable or uncertain.
  Do not promise queued reports unless a durable job was actually created.

Quintin approves this exact packet before execution. Use existing authorization
where it covers a named action; avoid repeated per-command permission prompts.
Never use an unapproved auto-pull, reset --hard, broad kill, credential rotation,
blanket PM2 restart or database rollback. Old document-parser restoration reopens
known weaknesses; do not automatically restore public intake with it.

Roll out one product change at a time. Proposed production checks are sequential
and bounded, not a load test. Verify the page, real route, execution, report,
delivery state and persistence together. If a safe check cannot be performed,
report that gap and follow the approved stop/suspension condition.

## Delegation and exit gate

Arch: A first, plus existing DOC-001 evidence preparation. Do not wait for a broad
VPS optimization project. No repair/deployment follows automatically from evidence.
Muse: B using existing proposals and A's route map; no overlapping Arch/document
source edits. Antigravity: independent C review plus later exact candidate review.
Codex: reconcile findings, choose minimal bounded corrections, review revisions and
assemble the next scoped approval request. Codex-authored plans require independent
review; this document is not self-approved.

Recovery is complete only when the approved exact production pairing passes the
agreed end-to-end checks, truthful degraded/failure states are in place, durable
outcomes/cleanup are reconciled and the observation window meets agreed thresholds.
Until then mark the actual stage: evidence pending, changes requested, staging
blocked/passed, activation pending, or production-verified with time and scope.
The index continues to use only its existing routing statuses; this file adds no
second status database or automatic execution.
