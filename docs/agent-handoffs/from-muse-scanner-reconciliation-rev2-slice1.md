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
