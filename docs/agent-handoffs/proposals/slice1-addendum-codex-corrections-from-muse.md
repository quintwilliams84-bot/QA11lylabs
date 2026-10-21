# Addendum to Slice 1 — Codex's outstanding corrections, incorporated

From: Muse. For: Codex review. Date: 2026-10-21. State: proposed.
Registered through the shared proposal intake at Quintin's direction.

## Canonical reference (by reference only — this file copies nothing)

- Proposal: Scanner reconciliation Rev 2 / Slice 1.
- File: `docs/agent-handoffs/from-muse-scanner-reconciliation-rev2-slice1.md`
- Exact commit: `59f8949244f9f949f10ea425537832f8f8625f6d`
  (branch `codex/staging-coordination`).
- Index task: `scanner-source-reconciliation-review` (target codex,
  status ready_for_review), source pinned to that commit.
- This addendum amends Rev 2 where stated below; everything not amended
  stands as written there.

## A1 — Admission stays blocked until cleanup is VERIFIED, incl. restart

Amends Rev 2 interface I3 (job lease). Additions:
- Admission state is PERSISTED in the existing rate store: every admitted
  job writes a record (job id, state, cleanup status) before work starts.
- A slot/admission is released only when cleanup is verified complete —
  the cleanup routine itself records `cleanupVerified: true` after the
  browser is closed and per-job temp artifacts are gone. Handler return,
  abort firing, or timeout expiring never releases admission by itself.
- RESTART RECONCILIATION: during init (inside `registerScanRoutes`,
  before routes accept scans), any persisted job not in a terminal +
  cleanup-verified state BLOCKS new admissions. The orphaned job is
  reconciled by attempting its cleanup (kill the recorded browser
  process/session, remove recorded temp paths); admission reopens only
  when cleanup is verified — or proven unnecessary (no live process, no
  artifacts, positively confirmed). If cleanup cannot be verified,
  admission REMAINS blocked, the health endpoint reports
  `admission: blocked-recovery`, and the existing alert path fires.
  Fail closed; a human clears it. No silent auto-recovery.
- New test **T4b** (cloud scope): persist a `running` job, run init in a
  fresh process → admission blocked; verified cleanup → admission opens;
  unverifiable cleanup → stays blocked + alert stub called + health
  reports the blocked state.

## A2 — Trusted runner boundary, defined (binds Slice 2; constrains P03)

Definition, not implementation:
- The web service NEVER receives Docker access, a container-runtime
  socket, or any sudo. No exceptions, no "narrow" sudoers entries.
- The route layer talks to scan execution through ONE narrow interface:
  `runScan(jobSpec, signal) → result/events`. Slice 1's implementation is
  in-process behind this same interface, so the boundary is a code seam
  first and a process seam second — the routes cannot tell the difference.
- In Slice 2 the implementation is a separate OS service: dedicated
  non-root user, its own unit. The web service (a different user) reaches
  it ONLY over a Unix domain socket carrying a fixed JSON schema
  (submit / status / cancel; job spec in, result + progress events out).
  That socket is the entire trust surface: no shell, no process control,
  no container control exposed to the web tier. Only the runner identity
  may talk to the container runtime, and only to create/remove the
  per-job worker built to the pinned spec (provenance per proposal P03).
- Linked work: P03 (inputs + provenance spec) is where Codex evaluates
  the worker design against this boundary; the blocked index task
  `browser-isolated-staging` covers the same ground — Muse suggests
  Codex consolidate those two reviews.

## A3 — Uncertain email outcomes, handled explicitly

No change required — registered here explicitly so the coverage is on the
record: Rev 2 interface I4 defines the mailer outcome enum
`accepted | failed | unknown`; `unknown` triggers the persisted
`holdUnknownDedup` state (neither confirmed nor released), writes exactly
one lead flagged `emailOutcome: 'unknown'`, never auto-resends, and the
user-facing copy states the send could not be confirmed. Test T5 covers
all three outcomes incl. restart persistence. If Codex wants the
`unknown` TTL or operator-clearing path specified further, that is an
amendment to request — the state machine itself is already explicit.

## A4 — Document-only work stays in the OpenclawOps track

Confirmed as a hard scope guard on Slice 1 and on proposals P01–P05:
no document processing is designed, built, or tested in the QA11lylabs
track. The document checker remains the OpenclawOps isolated baseline
(PR #23 line). References to it in Muse's proposals are dependency
notes only.

## Consolidation / links (per intake rules)

- P02 is the design intake for the EXISTING repo work order WO-1
  (`docs/work-orders/wo-1-leads-bridge.md`) — not a new task; Codex
  reviews the design, WO-1 remains the work order of record.
- P03 ↔ this addendum (A2 boundary) and ↔ `browser-isolated-staging`
  (blocked) — consolidation suggested above.
- P01 ↔ PR #13: PR #13 converts AGENTS.md; P01 covers the other 9 files.
  No overlap; P01 waits on PR #13's merge or rebases.
- P04 records the CI interim and parks the check-in Layer 3 bell behind
  the same app-side workflows permission.

## Gate (Quintin, Oct 21)

Technical acceptance (Codex sign-off) does NOT start implementation.
Slice 1 begins only on Quintin's explicit approval of the bounded work
order. Status today: Slice 1 is a proposal — nothing implemented, nothing
merged, no production change, no edits to Arch's files or branches.
