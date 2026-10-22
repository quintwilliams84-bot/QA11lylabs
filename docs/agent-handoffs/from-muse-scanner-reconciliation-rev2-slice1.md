# Scanner Reconciliation — REVISED Proposal (Rev 2): One Bounded First Slice

From: Muse. For: Quintin (approval) and Codex (review via shared handoff).
Date: 2026-10-20. Status: PROPOSAL ONLY — nothing implemented, edited in
any repo, merged, or deployed by this document.

Supersedes the broad scope in `from-muse-scanner-reconciliation-20261020.md`
(the Rev 1 handoff summary). The broad scanner rewrite is NOT the plan.
Rev 1's verdict stands (reconcile, don't adopt either side whole); Rev 2
re-sequences the work into one small, cloud-testable first slice shaped by
Codex's corrections.

## Corrections applied (Codex, relayed and ratified by Quintin)

Source note: these are Codex's standing corrective items from its Oct 18
review (7 items) and Oct 19 follow-up (5 items), re-checked tonight against
the code at 578c221b. The inbox branch head was verified unchanged
(90d4298c) before this revision was written — no newer Codex artifact had
landed; if Codex posts a fresher review, this revision gets revisited.

1. **Lifecycle** (Oct 18 item 2): slots are held until the underlying work
   terminates; disconnects and timeouts cancel the owned work. Teeth added
   in Rev 2: a slot is released only after the job's cleanup promise
   (browser close, temp cleanup) has RESOLVED — on every exit path.
2. **Privilege boundary** (Oct 18 item 5; Oct 19 items 1–2): verified
   sandboxed browser runtime, no security bypasses; helpers must be pure —
   importing the scanner module must not load `/root/.env` or start
   browser verification. Verified at 578c221b: `loadRootEnv()` executes at
   import (scan_server_patch.js line 71) and `verifyBrowser()` is kicked
   off at line 382. Both are import side effects and both move.
3. **Uncertain email outcome** (Oct 18 item 6): dedup reservations are
   separate from confirmed submission; failed reservations are released;
   delivery is never claimed from submission. Teeth added in Rev 2: the
   current code has exactly three dedup transitions (reserve → confirm on
   mailer acceptance → release when `!emailConfirmed`, lines 1161/1280).
   A send whose outcome is UNKNOWN (mailer timeout after possible
   acceptance, process death between send and confirm) is currently
   RELEASED — a retry can then send a duplicate email and write a
   duplicate lead. Rev 2 adds a fourth state, `unknown`, that is neither
   confirmed nor released.
4. **Test scope** (Oct 18 item 7; Oct 19 items 3–5): reconcile the
   manifest/lockfile WITHOUT GUESSING versions; cloud tests are separate
   from VPS deployment checks. Consequence in Rev 2: `package-lock.json`
   and all version pinning are REMOVED from Slice 1 (they need VPS truth,
   blocker B1). Slice 1 tests are cloud-scope only: synthetic fixtures,
   stubbed mailer, fake browser launcher, no VPS, no real email, no
   customer data.

Document processing stays in the OpenclawOps track (isolated baseline,
PR #23). Nothing in this slice touches it.

---

## SLICE 1 — Truthful boundaries in the route layer

One sentence: in `scan_server_patch.js` only, remove the privilege
bypasses, make import pure, make slot release wait for real termination,
and make the email outcome honest under uncertainty — with the route's
public surface (`registerScanRoutes`, endpoints, response shape) unchanged
except that Lighthouse results become explicitly `null`.

### Exact files

Modify (3):
- `scan_server_patch.js`
- `test/scan-hardening.test.js`
- `ops/preflight.sh` — its smoke launch stops using `--no-sandbox`; the
  preflight FAILS when a sandboxed launch is unavailable (it currently
  violates the rule it checks).

Explicitly NOT touched in Slice 1:
- `server.js` — `registerScanRoutes` keeps its current call signature
  (new deps are optional), so the slice stays inside one module.
- `lib/ip-policy.js`, `remediation-engine.js` — unchanged.
- `package.json` — unchanged; pinning/lockfile deferred (blocker B1).
- No new files. No `scanner/` worker files (Slice 2). No frontend change.
- Nothing in OpenclawOps; no edits to Arch's branches; no production
  change of any kind.

### Interfaces (exact)

**I1. Import purity + lazy init.**
Requiring `scan_server_patch.js` performs no filesystem, env, browser, or
network side effects. `loadRootEnv()` and the `verifyBrowser()` kickoff
move inside `registerScanRoutes(app, deps = {})`. New optional deps, all
defaulting to today's production behavior:
- `deps.mailer` — defaults to the AgentMail adapter (`sendAgentMailViaPython`).
- `deps.launchBrowser` — defaults to `launchScannerBrowser`.
- `deps.storePath` — defaults to `RATE_STORE_PATH` behavior as today.
The existing `_internal` test seams stay; `initScanRuntime` is NOT a new
export — init is a route-registration effect, which is what makes the
slice bounded.

**I2. Single sandboxed launch path.**
`launchScannerBrowser()` launches with the Chromium sandbox ENABLED,
always. Deleted: `allowNoSandbox()`, every `CHROME_NO_SANDBOX` read, the
root-default fallback, and the alert-and-retry-unsandboxed path. Launch
failure (including sandbox failure) → the existing clean user-facing
"scanner unavailable" error; the job fails; its slot is released only
after cleanup settles (I3). Deleted from the request path entirely:
`runLighthouse`, `lighthouseArgs`, `parseLighthouseOutput`, and the
`execFile('npx', …)` call. Result contract: `results.lighthouse === null`
and `results.score === null` when Lighthouse has not run — no fabricated
or carried-over score. (Lighthouse returns in Slice 2 as an in-worker
library call, pinned — Rev 1 §3 stands.)

**I3. Job lifecycle lease.**
States: `queued → running → succeeded | failed | cancelled | timed_out`.
`acquireScanSlot()` returns a lease object `{ release() }`.
`release()` is idempotent and takes effect only after the job's cleanup
promise resolves (browser closed, per-job temp removed). The existing
AbortController wiring stays: client disconnect and `withScanTimeout`
abort the owned work and AWAIT termination before the lease can release.
Queue advance is driven by actual release, never by handler return.
`_internal` gains a read-only job-state snapshot for tests
(`_internal.jobSnapshot()` returning per-state counts) — test seam only,
no production caller.

**I4. Email outcome contract.**
The mailer adapter resolves to exactly one of:
- `{ status: 'accepted', id }` — the mailer accepted the submission.
- `{ status: 'failed', error }` — the mailer definitively refused/errored
  before acceptance.
- `{ status: 'unknown', reason }` — timeout, connection loss, or process
  interruption where acceptance may or may not have happened.
Dedup state machine (persisted in the existing rate store, survives
restart): `reserveDedup` → `confirmDedup` (accepted) | `releaseDedup`
(failed) | `holdUnknownDedup` (unknown — NEW). An `unknown` key stays
blocked for the normal dedup window, is visibly recorded as
`emailOutcome: 'unknown'` on the single lead record for that scan, and a
retry of the same email+URL does NOT resend and does NOT write a second
lead. User-facing copy claims submission only when accepted, and says
plainly that sending could not be confirmed when unknown — never
"delivered", never a follow-up promise (locks in PR #23 amendment C1's
truthful-failure rule on this surface too).

### Tests — cloud scope only (node:test, synthetic, stubbed)

In `test/scan-hardening.test.js` (existing 26 tests kept, except T3's
inversion):
- **T1 import purity:** fresh `require` in a child process instrumented
  to fail on `/root/*` reads and on any child-process spawn; assert the
  module loads, exports exist, and no probe fired.
- **T2 sandbox fail-closed:** fake `launchBrowser` that throws a
  sandbox-style launch error → job fails with the clean error, no
  unsandboxed retry is attempted, slot is released after cleanup.
- **T3 bypass test INVERTED:** the current test that honors the explicit
  env flag is replaced — with `CHROME_NO_SANDBOX=1` set and a root-uid
  stub, launch is still sandboxed-or-fail. Plus a static gate: the
  strings `CHROME_NO_SANDBOX`, `--no-sandbox`, and `npx` do not appear
  in `scan_server_patch.js`.
- **T4 lifecycle/lease:** fake browser with a deferred `close()`;
  disconnect mid-scan → slot NOT released and queue does NOT advance
  until `close()` resolves; then exactly one release (second `release()`
  is a no-op). Same assertion on the timeout path and the success path.
- **T5 email outcomes:** stubbed mailer × 3 outcomes → confirm / release
  / hold-unknown transitions; `unknown` → repeat request sends nothing,
  writes no second lead, response contains no delivery claim; the
  unknown state survives a store serialize/reload cycle.
- **T6 contract:** with Lighthouse removed, a fixture scan returns
  `lighthouse: null`, `score: null`, axe results byte-identical to the
  existing fixtures; `/api/scan-health` still reports version, commit,
  and queue depth.

Explicitly deferred OUT of Slice 1 tests: container/watchdog and
frontend-death tests against the isolated worker (Slice 2, T-A in Rev 1),
the document zip-bomb matrix (OpenclawOps track), and every VPS
deployment check (separate gate, per Codex's test-scope correction).

### Blockers

- **B1 — VPS version truth** (`npm ls --depth=0`, Node/Chrome versions):
  blocks pinning + `package-lock.json` and the worker image. Does NOT
  block Slice 1.
- **B2 — Worker-image provenance + runner release assembly:** Slice 2.
- **B3 — Deployment public address** (egress deny list completion):
  Slice 2.
- **B4 — This revision's review + approval:** Codex reviews Rev 2 via the
  inbox; implementation starts only on Quintin's approval of this exact
  slice. CI workflows permission (known, app-side) does not block —
  cloud tests run locally until it lands.

### Next action

Quintin approves Slice 1 → Muse implements on branch
`muse/scanner-slice1-route-boundaries`, runs the cloud test suite, and
opens a PR against main @578c221b for Quintin's review, with a Rev 2
results summary dropped in Codex's inbox. Nothing merges or deploys on
implementation — staging and production stay behind the standard's
separate gates.

---

## Revision 3 — roadmap Phase 2 tightening (2026-10-21, Muse)

Status: Rev 2 and the Oct 21 addendum stand except where this revision
tightens them. It responds to the proposal gaps in Codex's VPS
reconciliation roadmap (agent/codex/vps-reconciliation-roadmap @
98d442b3, Phase 2). Codex's intake feedback (4167349f) explicitly did not
review Slice 1; this revision is offered for that queued review. Slice 1
remains unimplemented and unapproved; implementation still requires
Codex's review of the exact revision plus Quintin's explicit approval
of the bounded work order.

**R3.1 — Cleanup bound to trusted identity (tightens I3 and addendum A1).**
Cleanup state is durable and bound to a trusted job/resource identity:
the job ID issued at admission plus the resource identity returned by
the execution layer when the resource is created. Restart reconciliation
verifies resources by that identity against the execution layer's own
records. Recovery NEVER kills a stored bare PID and NEVER deletes
arbitrary stored paths. Create/start ambiguity (the resource may or may
not exist) resolves conservatively: assume it exists, verify by identity,
and hold admission until it is verified absent or removed.

**R3.2 — The admission ledger is not the rate-limit file (tightens A1).**
Persisted admission records live in their own store under an atomic
ownership/concurrency contract: one record per job, created atomically
(create-exclusive or rename-into-place), single-writer per record, no
read-modify-write on shared files. The existing rate-limit store is a
non-authoritative abuse control and is never the job ledger. New crash
tests (T4c): process killed between claim and cleanup-verification;
concurrent admissions cannot double-claim a slot; a partial/corrupt
admission record at startup fails closed (admission blocked), never
silently discarded.

**R3.3 — Stable submission IDs (tightens I4).** Every scan/email flow
carries a stable submission ID — a UUID minted at intake and persisted
before the send attempt — never a timestamp-only ID. An unknown mailer
outcome is a pending-reconciliation state keyed by that ID: no automatic
resend, no success or delivery assertion; reconciliation is an explicit,
recorded act.

**R3.4 — Runner boundary hardening (tightens addendum A2; applies to
Slice 2 design).** The trusted runner interface additionally requires:
authenticated local requests with peer-ownership verification (Unix
socket peer credentials); strict request/response schemas; per-caller
and per-job quotas; job-specific cancellation (a cancel capability bound
to the job ID, not a global stop); and execution revalidation — the
runner re-checks job state and authorization at execution time, not
only at submit. Recorded plainly: Docker control is effectively
privileged even behind a non-root account, so the runner is a trust
boundary to be minimized and audited, not a sandbox claim. A2's core
rule stands unchanged: the web service gets NO Docker access, NO
container socket and NO sudo.

**R3.5 — No intermediate deployment.** Slice 1 acceptance covers
cloud-scope tests only. The interim in-process route shape is NOT
deployable merely because its mocks/tests pass. Production URL scanning
resumes only on the isolated execution architecture (Slice 2 runner) or
an exact replacement Quintin separately approves. Effective sandbox,
TLS and egress controls are preserved until that approval.

**R3.6 — Lease/watchdog mismatch is not a cleanup guarantee.** The
egress proxy's 110-second lease versus the 120-second watchdog does not
guarantee cleanup before readmission. Admission is therefore retained
through VERIFIED removal in every path: normal completion, frontend
death, create/start ambiguity, cleanup failure and process restart
(this is the release condition I3/A1/T4b are read under).

---

# Revision 4 — bound to Arch's current-path evidence (2026-10-22)

Author: Muse. This revision amends the SAME Slice 1 contract (no new
proposal). It responds to Codex's review at QA11lylabs
8e102e5a51ec9b9fdf10dadb644b0bd77579c577
(reviews/Slice1-P03-Arch2136ae35-review.md) and the TONIGHT packet at
264e9d3592c169e1d85c6fd832d14ac0dce01b32, using Arch's evidence returns
2136ae35d9c92f630043c51b1af6f9ee4dd995cb, 57539cb3d2997d78ab0ee74c5c0eea66792a7499
and 207df57d9e39d29a0d5f9a6f331093c0de7a0939. Where Revision 4 conflicts
with Revisions 2-3, Revision 4 governs. Quintin's bounded-scope approval
at 684d71f52ee7d4f2b5b345633d16a07024c1c981 stands for this scope; no
duplicate approval is requested. Codex technical sign-off is still
withheld pending this revision's review.

## R4.0 — Candidate role and base, corrected by deployed evidence

Arch's observed deployed pairing (2026-10-22 04:14-04:26 UTC, read-only):
PM2 app qa11ylabs-scan runs /var/www/qa11ylabs/server.js (SHA-256
e70df6a142feb4edcf39cde2dd12dceacf07756e0ae8f2d2628ae581f95599e1) as
UID 0 on port 3001. It registers the scan routes from
scan_server_patch.js (deployed SHA-256
f4c601ca7d9977966405688686346771219cf690bbd4ecf7475482c32f01a738) and
the document routes from document_checker_routes.js (SHA-256
74d347624f2dda27c1297353d650b2dcf4934ee50ef41545ddd7a1179f684ab3).
The URL route delegates execution to
/opt/qa11y-scanner/current/runner.cjs (SHA-256
d2b3167f8be4081822183ccd7022a9bf7b83cf3ba454a73edd6f0c747597b0dd,
release 20261017-r2), which runs a Docker worker mounting
/opt/google/chrome read-only; the worker launches that host Chrome with
chromiumSandbox true. No Playwright-managed cache is in the live path.

Therefore:
- The Slice 1 candidate is a CLOUD-SIDE ROUTE REFACTOR plus an ADAPTER
  to the live runner contract. It is not a route replacement that
  introduces its own browser, and no in-process browser launch may
  become a production default. The in-process launch paths in I2 are
  retained ONLY as injected test doubles behind the executor interface.
- The default executor is the runner interface: submit(jobSpec) returns
  a job identity; status/events(jobId); cancel(jobId); result(jobId)
  returns a stage envelope (scan, lighthouse-or-null, report, delivery)
  in which a stage that did not run is null/UNKNOWN, never fabricated.
  In-worker Lighthouse output is a runner-reported stage; the route
  must not silently drop it, and QA main's npx Lighthouse child is
  still retired (it ran outside the isolated worker and outside SSRF
  interception). Exact runner inputs/results/cancellation semantics
  are prerequisite evidence (Arch's next return: registration
  metadata). Until that lands, the adapter is specified against this
  abstract contract and coded against a test double.
- PREREQUISITE P0 (new): the deployed scan_server_patch.js hash does
  not correspond to any verified Git object (correspondence UNKNOWN).
  Before implementation, the deployed source must be captured through
  the private channel and diffed against QA main 578c221b; the
  candidate's base is the reconciled tree, not main alone. Cloud
  design/tests may proceed against main plus this contract; the
  implementation base is not final until P0 closes.

## R4.1 — One authoritative capacity claim (replaces R3.2 mechanics)

Per-job atomic file creation does not bound capacity. The contract is:
- A single admission ledger directory owned by the service identity
  holds N slot records (N = configured worker capacity). A claim is
  the atomic creation (O_EXCL or mkdir) of one slot record carrying:
  job ID, fencing epoch (monotonic per-slot counter), owner identity,
  and state (claimed, running, cleaning, terminal).
- A caller is admitted only while holding a slot claim. Two callers
  racing create exactly one winner per slot; total admissions never
  exceed N regardless of caller count or process count on the host.
- The rate-limit file is non-authoritative and never gates admission.
- Startup reconciliation: slots in claimed/running/cleaning whose job
  record is absent or terminal are moved to cleaning and released only
  after the cleanup-verification hook for that job's trusted resource
  identity returns (same rule as R3.1; never bare-PID kills, never
  stored-path deletes). A slot whose owner state is uncertain HOLDS
  admission (fail closed) and is surfaced for operator reconciliation.
- Durability: slot and job records are fsynced before the claim is
  acknowledged; a crash between claim and job-start leaves a
  reconcilable slot, never a phantom admission.
- Tests (synthetic, in-process model plus filesystem ledger in a temp
  dir): kill at claim, create, start, cleanup boundaries; corrupt a
  slot record; race two callers for the last slot; stale slot with a
  live owner is never reclaimed; uncertain state holds admission.
  The model proves the claim contract, NOT real browser cleanup;
  real cross-restart cleanup is staging evidence (see the diagnostic
  packet), never claimed from these tests.

## R4.2 — Send-intent durability (replaces the I4/R3.3 expiry reading)

- The stable submission ID (P02/WO-1) is minted and a send-intent
  record persisted (state: intent) BEFORE any provider call.
- Outcome transitions are persisted: intent -> accepted, intent ->
  failed, intent -> unknown. A crash or timeout after provider
  acceptance but before outcome persistence reconciles to unknown on
  restart, never to a resend.
- The normal dedup TTL governs NEW submissions only. It never releases
  an unknown hold. An unknown submission is released only by explicit
  operator reconciliation against provider evidence, recorded with
  the submission ID.
- Persistence failure BEFORE send: no send occurs. Persistence failure
  AFTER send: the submission is treated as unknown (hold), as above.
- Retention: unknown records are retained until reconciled; terminal
  (accepted/failed) records follow P02's bounded retention. No second
  outbox is created; this is the P02 outbox lifecycle read at the
  route boundary.
- Tests: crash between intent and send, between send and outcome,
  and during outcome persistence, all with a stubbed provider; no
  real provider calls; duplicate submission while unknown is held
  returns the held state, not a new send.

## R4.3 — Registration-time configuration (extends I1)

- registerScanRoutes(app, deps) takes an explicit config object.
  Registration NEVER reads /root/.env or production paths; environment
  loading remains the process entrypoint's job (server.js), outside
  this module.
- The development/test config refuses production paths and production
  credential bindings by construction (allowlist of temp locations);
  tests register routes with production paths absent and all side
  effects stubbed.
- Production compatibility: the production entry passes its existing
  configuration explicitly; behavior parity is checked by the
  registration contract test (routes present, methods/paths equal).
- Repeated registration on the same app is an explicit error, tested.

## R4.4 — B1 gate normalized (supersedes conflicting earlier text)

- Gate C (cloud coding of this contract): NOT blocked by B1. Design,
  adapter code against the test double, and the synthetic test matrix
  proceed.
- Gate I (dependency pinning, staging, integration, real-browser
  validation): BLOCKED until complete B1: worker image digest and
  installed identity, host Chrome version and package origin, worker
  dependency manifests/lockfiles, runner registration metadata, and
  P0 source correspondence.
- The approval note at 684d71f5 is read under this split: Quintin's
  approval covers the bounded scope; Gate I items are prerequisites
  to integration steps, not to cloud coding. No expanded scope is
  inferred and no duplicate approval is needed for unchanged scope.

## R4.5 — Scope, files, exclusions (unchanged unless stated)

Touched implementation files remain: scan_server_patch.js,
test/scan-hardening.test.js, ops/preflight.sh — plus, now explicit,
the admission ledger and send-intent records are runtime state under
the service-owned state directory configured in deps (not new source
files). The adapter's runner client lives inside scan_server_patch.js
under the executor interface. Exclusions stand: no deployable
in-process intermediate, no web-tier Docker/sudo, no document-track
changes (OpenclawOps), no sanitized-code port of the deployed tree.


## Revision 5 (2026-10-22, responding to Codex review 4d26b343)

R5.1 What is authorized before P0, stated precisely. Quintin's
approval note (684d71f5) covers the bounded SCOPE of this contract;
it does not eliminate prerequisites. Before P0 correspondence is
established and Arch's runner-contract metadata lands, the only
cloud implementation authorized on Codex sign-off is: (a) adapter
code written and unit-tested against the injected test double
implementing the R4.0 envelope shapes, and (b) route-layer pieces
that do not depend on runner internals (slot ledger, send-intent
ledger, explicit configuration). NOT authorized before P0 + B1:
any claim that the adapter matches the installed runner, any
staging integration, any pinning. The submit / status / cancel /
result interface remains an ABSTRACTION until it is matched,
field by field, to the installed runner's actual API as returned
in Arch's metadata; where the installed API lacks an operation
(for example cancel), the adapter records that operation as
unsupported rather than emulating it.

R5.2 Fencing epoch durability. The slot ledger is a directory of
per-slot records under the service-owned state directory. A slot
id is never reused. Releasing a slot writes a TOMBSTONE record
carrying the slot's final epoch; a later physical reuse of the
same capacity creates a NEW slot id whose epoch continues from a
monotonic run counter, never from zero. Durability ordering for
every claim, release and tombstone: write the record to a temp
file in the ledger directory, fsync the file, rename into place,
then fsync the PARENT DIRECTORY; the claim is acknowledged only
after the parent fsync returns. The executor rejects any job
message whose epoch differs from the ledger's current epoch for
that slot id (stale-epoch rejection), and rejects messages for
tombstoned slot ids outright. Startup reconciliation inspects
EVERY slot record (active, unverified and tombstoned), not only
slots with absent or terminal jobs; any slot whose on-disk state
cannot be verified is treated as occupied (fail closed) until an
operator clears it with evidence.

R5.3 Unknown-send growth bound. The send-intent ledger (P02
outbox, extended) has configured caps: maximum record count and
maximum total bytes. Reaching either cap applies BACKPRESSURE:
new submissions that would require a send are refused with a
retryable not-accepted response; no unresolved record is deleted,
aged out or released to make room. The health output reports
unknown-send count and the age of the oldest unknown; crossing
the configured escalation threshold (count or age) raises an
operator-visible alarm in the health response. Only the operator
reconciliation action of R4.2 resolves an unknown, and it
appends its outcome to the same record (records are append-only;
resolution never erases the unknown history).

R5.4 Configuration call path, stated honestly. R4.3 requires
explicit configuration through the registration dependency
object; the production entrypoint (deployed server.js) is NOT in
this contract's three-file scope and is not edited under it. The
compatible existing call path is the deployed server.js's current
registration call: Arch's evidence shows both registrars already
receive injected dependencies (sendAgentMail) at that call. IF
the P0 capture shows the deployed call passes a dependency object
the module can read its configuration from, no caller edit is
needed and R4.3 stands as written. IF the deployed call does not,
then a caller edit is a SCOPE AMENDMENT: it will be requested
explicitly as its own bounded item, never treated as already
covered by this contract, and never folded in silently.
