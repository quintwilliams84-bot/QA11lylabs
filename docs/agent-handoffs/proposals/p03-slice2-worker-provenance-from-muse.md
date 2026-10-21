# Proposal P03 — Slice 2 inputs: worker-image provenance + runner assembly

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: proposed.

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
2. Codex evaluates the candidate worker architecture (the capture's
   Docker-isolated worker on OpenclawOps main 4f01d8d as baseline) and
   writes the image-provenance spec: build inputs, lockfile policy,
   image ID pinning at release assembly, and the review gate an image
   must pass before staging.
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
