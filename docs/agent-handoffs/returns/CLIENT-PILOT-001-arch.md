# CLIENT-PILOT-001 — Arch preparation receipt

## Exact receipt and role

Read QA11lylabs c298d8be6c6a52f07631abacab8d9a5b8490eb44:
- docs/work-orders/CLIENT-PILOT-001.md
- docs/agent-handoffs/CURRENT_ASSIGNMENTS.md
- docs/agent-handoffs/reviews/Muse1ce5e4c8-client-readiness.md

Arch/OpenClaw is the proposed controlled scan operator. Execution is HELD.
This is a return against CLIENT-PILOT-001, not a replacement work order or another
scanner implementation. Existing customer-path branch ownership is preserved.
No client identity, URL, findings or report content is recorded here.

## Preparation completed

Reviewed the work order and blocking review of Muse harness
1ce5e4c8cb026fa8979360907db999572f9b0c02. No runtime code was executed or imported.
Existing public-page permission is acknowledged; Quintin need not repeat it.
Muse must supply the exact target privately; Arch will not guess or retrieve it
from public/client context. Homepage only initially, no login, forms, checkout,
downloads, vulnerability probing or recursive crawl.

## Private evidence directory plan — NOT created

Use a separately approved non-production evidence root and a newly allocated,
opaque job directory owned by the designated operator. Proposed directory mode
0700, evidence files 0600; no broad permission changes. Exact host, UID/GID and
private root require review before creation. A human-readable client name or URL
must not be used in public paths, Git or artifact names.

Within that job directory, plan an allowlist: private scope/settings record,
source/image/browser identity manifest, bounded per-engine results, stage-status
receipt, cleanup evidence, hashes and a later reviewed draft. Keep original raw
approved evidence private and immutable by convention/verified hashes; sanitized
public receipt contains only an opaque locator and non-client operational status.
Retention/deletion duration and authorized reader set remain PENDING; do not
invent an indefinite retention policy. No whole-workspace upload or automatic send.
Do not populate the plan until the exact allowed evidence schema and limits are
reviewed. No private directory, capture or production state created this turn.

## Preconditions/resource checklist — all execution gates remain held

- Exact private HTTPS target, allowed host/redirects and initial homepage scope:
  PENDING Muse. Navigation/reload/subresource budget and engine selection PENDING.
- Named non-production host, operator identity, evidence root and processing
  permissions: PENDING. Production VPS is not assumed the test host.
- Complete reviewed source/dependency/image/browser pairing: PENDING; prior Arch
  metadata cd7b56146469e5851d76a29bacc37bd5634392aa is historical input, not a
  new runtime verification or complete executable assembly.
- Effective filesystem/network/process confinement verified before import,
  clean environment and job-bound resource identity: BLOCKED by reviewed harness.
- Concrete memory/CPU/PID/disk/log/request/worker/cleanup ceilings and active-work
  headroom on intended host: PENDING, not measured here. Concurrency one; no retry.
- Synthetic sandbox/TLS/egress/result-validation/timeout/interruption/cleanup
  tests on intended path: NOT RUN here; actual results and independent review needed.
- Client data/model processing and delivery authority: PENDING where applicable;
  no Hermes/model delegation or real send follows from this acknowledgment.

## Harness blocker disposition

The linked review identifies safety status falsely remaining PASS, global
before/after cleanup without job ownership, unproved confinement, launcher/child
identity ambiguity, malformed worker hash, incoherent successful pairing gate,
weak containment/environment checks, unbounded log capture, and result validation
gaps. These remain Muse-owned corrections; no edits made to Muse's branch.
Antigravity reviews the corrected exact revision, then an approved synthetic
staging exercise must demonstrate real behavior before any client request.
The client is never the first sandbox or cleanup test target.

## Proposed eventual operator sequence — not authorized commands

1. Review exact scope/host/pairing and successful synthetic evidence. Revalidate
   mutable identities and active-work/headroom within separately approved scope.
2. Only after gates resolve, perform one bounded approved job; capture truthful
   engine/version/settings/status evidence privately. No automatic retry or crawl.
3. On unexpected redirect/destination, pressure, timeout, scope change or uncertain
   cleanup: stop further requests and follow reviewed owned-resource cleanup.
   Missing cleanup proof blocks admission/readiness; never improvise repair.
4. Return sanitized receipt. Report building, manual accessibility review, model
   processing and client delivery remain separate. Scan success is not conformance
   or inbox delivery. Quintin reviews the final draft before any delivery.

## Actual checks and next handoff

Only GitHub document reads and this documentation preparation; diff whitespace
check performed. Zero scans, runtime tests, application imports, installations,
source captures, service changes, workflow dispatches or client communications.
No independent review acceptance is claimed by Arch.

Next: Muse returns corrected harness/source and exact private scope reference;
Antigravity/Codex review their assigned evidence. Arch waits for the resolved
execution prerequisites, providing only specifically requested missing inputs.
This committed receipt does not notify other agents or create background work.
