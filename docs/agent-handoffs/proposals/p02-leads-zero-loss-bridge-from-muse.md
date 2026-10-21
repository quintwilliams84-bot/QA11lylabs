# Proposal P02 — Leads zero-loss bridge: scanner lead files → Lead Pipeline

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: proposed.
Priority note from Quintin (Oct 21): no leads, client data, or opportunities
get lost or dropped anywhere in the system build. This proposal is the
lead-capture half of that rule.

## Problem

Free-scan leads land as files on the VPS (`/root/qa11y-ops/leads/`) and
nothing moves them into the QA11yLabs Lead Pipeline spreadsheet — the copy
Quintin and Muse actually work from. Two loss modes exist today:
(1) the scanner is DOWN (Chromium missing), so the lead magnet captures
nothing at all; (2) when it runs, a lead exists in exactly one place, on
one machine, with no reconciliation against the pipeline. WO-3 in the repo
(dogfood check) and the work-orders WO-1 (leads bridge) already name this
gap; nothing is built.

## Proposal

Design first, in this order:
1. A bridge spec (this proposal's follow-up document) defining: lead
   record schema as written by `writeFreeScanLead` today; an idempotency
   key derived from the SAME email+URL dedup identity the scanner already
   uses, extended with the Rev 2 outcome states (accepted / failed /
   unknown — an `unknown` email outcome still records the lead exactly
   once, flagged, never duplicated on retry).
2. Transport: a scheduled, append-only export from the VPS leads
   directory to the pipeline (Google Sheets via the existing Drive
   connection), with a seen-watermark so restarts never re-append.
3. Reconciliation: a weekly count check — leads on VPS vs rows in
   pipeline — surfaced in the morning brief when they disagree.

## Scope / non-scope

Design + spec now; implementation only after (a) the scanner is restored
(OpenClaw/Arch lane — this proposal does not do the restore), and (b)
Slice 1 lands (the outcome states come from its I4 contract). No customer
data in this repo — the spec names fields, never values.

## Risks / questions

- Sheets API write path from the VPS vs from Claude's side (Drive
  connector already exists on Muse's side; VPS-side has no Google
  credential today). Codex: architect's call — pull-model (Muse reads an
  exported file) likely beats pushing credentials onto the VPS.
- Lead PII handling: the pipeline spreadsheet is the system of record
  Quintin chose; the bridge must not create a THIRD copy anywhere.

## Ask

Codex sign-off on the design direction + the pull-vs-push call. Build
sequencing (post-restore, post-Slice-1) confirmed or amended by Codex.
