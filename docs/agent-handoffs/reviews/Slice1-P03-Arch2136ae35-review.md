# Slice 1 / P03: review using Arch's current-path evidence

Reviewer/contract author: Codex. Date: 2026-10-22 UTC.
Disposition: changes requested; no implementation sign-off or production approval.
This is feedback on existing work, not a new proposal or competing task registry.
The P03 contract below is Codex-authored and still requires independent review.

## Exact sources

- Muse Slice 1 Revision 3 and P03 Revision 2:
  QA11lylabs 1ccbb759b2af6a4c2e2c238f7253f4eced1003a7,
  docs/agent-handoffs/from-muse-scanner-reconciliation-rev2-slice1.md and
  docs/agent-handoffs/proposals/p03-slice2-worker-provenance-from-muse.md.
- Arch current-path report: 2136ae35d9c92f630043c51b1af6f9ee4dd995cb,
  docs/agent-handoffs/returns/customer-path-current-evidence-arch.md.
- Arch component exception report: 57539cb3d2997d78ab0ee74c5c0eea66792a7499,
  docs/agent-handoffs/returns/customer-path-component-exceptions-arch.md.
- Candidate return scaffolds independently reviewed separately:
  264e9d3592c169e1d85c6fd832d14ac0dce01b32.

Method: static source/report inspection, Git ref verification. No VPS access,
application imports, scans, uploads, mail, containers or tests of the runtime.
Arch's observations are attributed evidence, not independently reproduced here.

## Arch report assessment

The current-path report explicitly limits page PASS to HTTP availability and
listener PASS to socket observation (lines 17-20). Browser launch, parsing, report
creation, delivery and persistence remain NOT RUN/UNKNOWN (lines 21-31).
This is a useful decision input, not a health certificate or outage diagnosis.
Its hashes (lines 40-44) name live inputs without promoting website main.
The component report distinguishes historical observations and missing sample
time (lines 9-19); do not treat those records as refreshed runtime facts.

It supports no managed-Chromium reinstall: the observed path is the isolated
runner and host-mounted Chrome. It also establishes that the actual document UI
is still unlocated. Do not build or deploy a replacement before locating the
request contract. The source-identified older document path is not evidence that
DOC-001's isolated candidate is active. No repair is justified solely by this report.

## Slice 1 findings requiring revision

### High: identify the candidate's role before route replacement

Slice 1 I1/I2 describes defaults that launch in-process (lines 82-105), while Arch
lines 20-21 observes a live isolated runner. Revision 3.5 correctly forbids
intermediate deployment, but the proposal must state whether the candidate is
only a cloud refactor or an adapter to that live contract. No direct host browser
may become a production default, and existing in-worker Lighthouse must not be
silently removed just because QA main's npx implementation must be retired.

Required: exact existing runner inputs/results/cancellation interface, main/live
differences, which outputs remain supported, and the source pairing to be tested.
Preserve null/unknown semantics when a stage actually did not run.

### High: atomic job records do not establish exclusive capacity

R3.2 lines 215-224 requires per-job atomic creation but does not define one shared
atomic claim for the configured worker capacity. Two callers can each exclusively
create different job files and still over-admit. A rename alone also says nothing
about crash persistence or multi-writer ownership.

Required: one authoritative claim/fencing contract across callers, trusted store
ownership, startup reconciliation and durability semantics. Tests must kill at
claim/create/start/cleanup boundaries, corrupt persisted state and race two callers;
uncertainty must hold admission. The rate-limit file stays non-authoritative.
Do not attempt real cross-restart browser cleanup by bare PID or arbitrary path.

### High: unknown email expiry conflicts with explicit reconciliation

I4 lines 126-131 blocks only for the normal dedup window, while R3.3 lines 226-231
requires explicit reconciliation and no automatic resend. A timeout/exit after
provider acceptance but before recording the result is still ambiguous.

Required: define stable submission identity before send, durable send-intent and
outcome transitions, operator reconciliation and bounded retention. Ordinary TTL
expiry must not silently permit a duplicate for the unresolved submission.
Reuse P02/WO-1; do not add another outbox. State what happens when persistence
fails before/after send and test crash points without real provider calls.

### Medium: cloud-safe configuration must cover registration too

I1 lines 82-92 moves loadRootEnv into registration. Import purity alone does not
stop development route tests from loading production paths when registering.
Required: explicit development configuration with no production fallback, reviewed
production compatibility and repeated-registration behavior. Test import AND route
registration with production paths/credentials unavailable and side effects stubbed.
No configuration or credential change is authorized here.

### Medium: normalize the B1 gate and preserve scope approval correctly

The older proposal says B1 does not block Slice 1; the later approval note at
684d71f52ee7d4f2b5b345633d16a07024c1c981 requires B1 before implementation.
Arch has provided path/version fragments, not complete worker/browser compatibility.
Required: one explicit gate for pure coding versus dependency pinning, staging and
integration. Preserve Quintin's recorded approval where it applies; do not infer
expanded scope or ask for duplicate approval of unchanged work. Technical sign-off
remains withheld until the revised scope and its actual prerequisites are clear.

## P03 contract draft: inputs for Muse's existing assembly design

This fulfills Codex's assigned specification role in P03, not the specification's
independent acceptance. Do not execute/build/install from this review document.

| Provenance item | Required evidence | Present status / owner |
| --- | --- | --- |
| Route/runtime pairing | Exact source commits and deployed source hashes, route registration, remediation/report/mail contract | Arch report provides selected hashes; complete pairing UNKNOWN. Arch |
| Worker image | Registry digest and installed image identity, upstream source/build or attestation available, declared trust/missing provenance | Historical digest is not fresh compatibility proof. Arch supplies metadata; Codex evaluates |
| Browser independent of image | Host-mounted browser file/version/package origin, read-only mount, library compatibility and SHA; no managed-cache assumption | Path/file existence only in current report. Missing metadata: Arch |
| JS runtime/dependencies | Host/container Node identities, exact Playwright/axe/Lighthouse versions; complete package manifests and install lockfiles for each bundle | Website metadata alone is insufficient for worker. Arch supplies selected metadata |
| Release assembly | Immutable source/dependency/config hashes, expected layout, trusted owners, validated mount targets and previous full pairing | Muse drafts assembly after this contract's review; no current-pointer change |
| Configuration | Names/types/requiredness, allowed private deployment overrides, validation without loading production secrets in cloud | Muse defines schema; private address values stay private |
| Admission and recovery | Shared atomic capacity authority, durable job/resource identity, fail-closed restart/cleanup reconciliation, bounded cancellation | Existing lease/watchdog timing is not proof. Muse specifies; staging must demonstrate |
| Security/resources | Non-root worker; verified sandbox/TLS; restricted egress for axe AND Lighthouse; no web-tier Docker/sudo; bounded CPU/RAM/PIDs/I/O/time | Preserve controls; real behavior NOT RUN in this review |
| Egress semantics | Deny private/reserved/host addresses, pin resolved destination, restrict ports/methods, bounded sockets/bytes/lifetime; enforce through redirects/subresources | Arch identifies applied policy metadata; synthetic network fixtures later |
| Results and delivery | Bounded validated output with actual stage outcomes; report formats supported; accepted/failed/unknown send semantics and stable submission identity | Interfaces unverified; no fabricated score/delivery or silent output loss |

Missing inputs may be supplied as sanitized metadata, not binaries, customer
records, environment dumps or full private configurations. Do not execute the
sanitized handoff. It is a design reference, not an install tree. Missing installed
tree root manifests must not be reconstructed by guessing wildcard dependencies.
A registry digest proves image identity, not browser compatibility or authorship.

## Next bounded returns, not deployment commands

Arch: reuse existing hashes; locate the actual document upload caller and its
request field/route. Then supply only missing version/manifest/image and exact
registration metadata from existing files/receipts, with collection limits. No
package install, app import, browser launch, scan/send or permission changes.
Report inability to collect any field as UNKNOWN rather than widening methods.

Muse: revise the EXISTING Slice 1/P03 documents on your task branch against these
findings and Arch's two exact returns. Include exact touched files, candidate role,
interfaces, claim/outcome durability contract, synthetic acceptance matrix and
scope exclusions. Independently review this Codex-authored contract. No duplicate
proposal, changes to Arch's branch or merge. Return the exact revised SHA.

Codex: review the revised scope, choose the smallest evidence-supported correction
and use existing implementation authorization if it covers that exact scope.
No hosted execution, production repair or merge follows from this review. DOC-001
Actions access is a separate blocker; it does not prevent these design returns.
