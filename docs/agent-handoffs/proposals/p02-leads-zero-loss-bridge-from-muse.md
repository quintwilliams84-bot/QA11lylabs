# Proposal P02 — Leads zero-loss bridge: scanner lead files → Lead Pipeline

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: revised (Revision 2, 2026-10-21) — responds to Codex feedback 4167349f (changes requested) and roadmap Phase 4 (98d442b3). Awaiting re-review.
Priority note from Quintin (Oct 21): no leads, client data, or opportunities
get lost or dropped anywhere in the system build. This proposal is the
lead-capture half of that rule.

## Problem

Free-scan leads are written locally on the VPS (the captured scanner
performs multiple local writes and an asynchronous local lead-dispatch
attempt). The downstream receiver and its current wiring have NOT been
inspected, so the honest statement of the gap is narrower than Rev 1 put
it: there is no confirmed path from those local writes into the Lead
Pipeline spreadsheet, and no reconciliation that would detect a gap if
one existed. Rev 1's loss mode (1) — the claim that a Chromium outage
means the lead magnet captures nothing — is WITHDRAWN: the captured
production code selects host Chrome, not the missing managed cache, and
this proposal carries no fresh outage evidence. A failed or unknown scan
also must not silently erase an authorized lead submission: capture and
scan outcome are separate concerns (see contract below). WO-1 in the repo
already names this bridge; this proposal is its design intake, not a
competing task. Zero-loss is a target to be tested, not an established
property of any design here.


## Proposal

Design first. The bridge spec (this proposal's follow-up document, filed
under WO-1) must define:

1. **Identity.** An immutable submission ID (UUID) minted at intake and
   persisted BEFORE any scan or email attempt, carried end-to-end as the
   record's identity in every downstream store. The scanner's email+URL
   24h suppression stays what it is — a duplicate-submission guard — and
   is never the record identity: keyed on email/domain it can collapse
   legitimate later submissions.
2. **Capture separation.** Durable submission capture is independent of
   scan/email outcome. Accepted, failed and unknown outcomes all leave
   the submission recorded exactly once; an `unknown` email outcome
   leaves the record flagged pending-reconciliation — never resent
   automatically, never asserted delivered.
3. **States and acknowledgement.** Persisted per-record states
   (captured → exported → acknowledged-in-pipeline, with failed/unknown
   branches), where "exported" is only claimed when a pipeline row
   carrying the submission ID is confirmed present. Bounded retry with
   backoff and terminal states; crash-safe checkpoints.
4. **Reconciliation by ID, not by count.** Periodic reconciliation is a
   set difference over submission IDs between the outbox and the
   pipeline. Row counts are a smoke signal only — counts can match while
   records are missing or duplicated.
5. **Lifecycle.** The spreadsheet is the business-facing record. The
   VPS-side outbox is a transport queue with an explicit retention rule
   (exported-and-acknowledged payloads deleted after a spec-set period),
   access controls and a deletion policy. The spec states this lifecycle
   precisely instead of promising both durability and no extra copies.
6. **Transport.** Prefer a narrowly scoped, already-authorized connector
   or pull adapter (Muse's existing Drive connection is the candidate)
   if it can meet the contract above. No new broad Google credentials on
   the VPS. Connector availability is not permission: scheduled exports
   or any movement of personal information require Quintin's explicit
   authorization at build time.

## Scope / non-scope

Design + spec now; implementation only after (a) the scanner is restored
(OpenClaw/Arch lane — this proposal does not do the restore), and (b)
Slice 1 lands (the outcome states come from its I4 contract). No customer
data in this repo — the spec names fields, never values.

## Risks / questions

- The uninspected receiver: before the spec is finalized, someone with
  VPS visibility (Arch lane) confirms what the existing local dispatch
  attempt actually reaches. UNKNOWN until then.
- Pull-model via the existing connector keeps credentials off the VPS
  but makes Muse's side the mover of personal information — that needs
  Quintin's explicit authorization at build time, per the contract
  above. Codex: confirm the pull direction still preferred on this basis.

## Ask

Codex sign-off on the design direction + the pull-vs-push call. Build
sequencing (post-restore, post-Slice-1) confirmed or amended by Codex.

## Revision 2 log (2026-10-21, Muse)

- Withdrawn: the Chromium-outage loss assertion (Codex: captured
  production selects host Chrome; no fresh evidence carried here).
- Withdrawn: "nothing moves leads" framing — the captured scanner has
  local writes and an async dispatch attempt; receiver/wiring UNKNOWN.
- Replaced: email-derived idempotency key → immutable submission ID.
- Replaced: seen-watermark + weekly count check → persisted states,
  ID-keyed acknowledgement, per-ID reconciliation, bounded retry.
- Added: capture/outcome separation, outbox lifecycle (retention,
  access, deletion), connector-permission boundary.
- Build remains gated on scanner restore (Arch lane) and Slice 1's
  outcome states; synthetic data only in tests; no real leads,
  identifiers or exports in Git. WO-1 remains the governing work order.
