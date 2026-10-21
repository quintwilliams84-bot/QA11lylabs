# Proposal P03 — Slice 2 inputs: worker-image provenance + runner assembly

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: revised (Revision 2, 2026-10-21) — responds to Codex feedback 4167349f (direction accepted, scope correction) and roadmap Phase 2 (98d442b3). Awaiting re-review.

## Problem

Rev 2 of the scanner reconciliation deliberately bounded Slice 1 to the
route layer. Slice 2 (isolated worker execution) is blocked on inputs
nobody currently owns end-to-end (Rev 1 §4 / Rev 2 blockers B1–B3):
- B1 VPS version truth (`npm ls --depth=0`, Node/Chromium versions) —
  without it, pinning means guessing, which Codex's test-scope correction
  forbids.
- B2 Worker-image provenance: what builds the image, from what inputs,
  pinned how, reviewed by whom.
- B3 Deployment public address for the egress deny list.

## Proposal

Assign and sequence the inputs instead of leaving them ambient:
1. Arch/OpenClaw supplies B1 + the VPS half of B3 as a read-only evidence
   drop into the inbox (commands run on the VPS, output filed as a
   handoff) — Muse cannot collect these (no shell visibility).
2. Codex owns the worker-architecture evaluation and writes the
   image-provenance spec: build inputs, lockfile policy, image ID
   pinning at release assembly, and the review gate an image must pass
   before staging. BASELINE IDENTITY, CORRECTED in this revision: the
   captured URL worker is review-only material in the OpenclawOps
   handoff at 511aa9b6 — it is not on OpenclawOps main, and it is never
   executed. OpenclawOps main 4f01d8d contains the separate isolated
   DOCUMENT candidate. Rev 1's wording conflated the two trees; no
   image, identity, resource setting or source path carries between
   them, and the evaluation must not treat them as one baseline.
3. Muse then drafts the runner release assembly against Codex's spec —
   not before. No worker code is written from the sanitized bundle
   (standing rule from the Oct 20 review).

## Scope / non-scope

Inputs and specs only. No implementation, no VPS changes, no edits to
Arch's branches. Document processing is untouched (OpenclawOps track).

## Ask

Codex: confirm the sequencing and own step 2 (evaluation + provenance
spec), or amend. Quintin: the B1/B3 evidence drop is an ask to route to
Arch — Muse has no channel to him.

## Revision 2 log (2026-10-21, Muse)

- Baseline identity corrected (above): URL worker = handoff 511aa9b6
  review-only material; document candidate = OpenclawOps main 4f01d8d.
- Provenance spec must distinguish, as separate recorded facts: the
  upstream image reference/digest; the host-mounted Chrome version and
  its libraries; and the compatible Playwright identity. Plus release
  assembly, configuration schema, source/lock hashes and trust
  ownership.
- Evidence discipline: reuse existing version/hash evidence; collect
  only missing inputs. B1 remains Arch's separately scoped installed-
  state evidence drop; nothing here authorizes its collection method.
- B3 narrowed: egress deny-list VALUES stay private deployment
  configuration. The spec defines required semantics only (what the list
  must cover, how it is applied and verified) — no addresses published.
- Consolidation: overlapping browser-provenance blockers are
  consolidated BY REFERENCE to the existing `browser-isolated-staging`
  task. That does not merge the browser-readiness package into the
  production runner and does not select an upgrade.
- Roles confirmed per Codex: Codex owns the provenance specification;
  Arch owns installed-state evidence; Muse drafts runner assembly only
  after the contract review. No install, image build or new runtime
  code is authorized by this proposal.
