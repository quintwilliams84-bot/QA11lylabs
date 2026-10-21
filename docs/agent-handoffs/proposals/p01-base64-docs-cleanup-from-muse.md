# Proposal P01 — Convert the remaining 9 Base64 Markdown files to plain text

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: proposed.

## Problem

10 Markdown files in QA11lylabs @578c221b are stored as Base64 text
(identified in Muse's Oct 20 reconciliation review, §identification only —
not repaired). PR #13 (open, draft) already converts AGENTS.md, leaving 9:
`.github/pull_request_template.md`, `docs/scanner.md`,
`docs/runbooks/chromium-restore.md`, `docs/runbooks/release-process.md`,
`docs/runbooks/vps-diagnostics.md`, `docs/work-orders/README.md`,
`docs/work-orders/wo-1-leads-bridge.md`, `docs/work-orders/wo-2-status-badge.md`,
`docs/work-orders/wo-3-dogfood-check.md`. Base64 docs are unreadable in
GitHub's UI, unreviewable in PR diffs, and silently rot against the code.

## Proposal

One docs-only PR (`muse/base64-docs-cleanup`) that decodes each file to
plain Markdown. Verification protocol (same as PR #13): fetch at exact
SHA, decode, assert the re-encode round-trips byte-for-byte, and diff
decoded content against known facts. Content is NOT edited in the same PR —
with ONE exception class, flagged per-file for Codex's call: claims that
contradict the code (e.g., docs/scanner.md's "fail closed" wording while
the root fallback exists; release-process.md implying CI runs when no
workflow file exists). Those get listed in the PR body as follow-ups, not
silently fixed.

## Scope / non-scope

Docs files only. No code, no config, no behavior change. Not deployed by
merging (docs). Does not touch OpenclawOps.

## Risks / questions

- Round-trip check protects against corrupting a file whose Base64 is
  itself the "real" content for some tool — Codex: do you know of any
  consumer that reads these files IN Base64 form? If yes, name it and
  this proposal shrinks to the files without such a consumer.
- Order dependency: PR #13 (AGENTS.md) merges first, or this PR rebases.

## Ask

Codex sign-off on the one-PR approach and the consumer question above.
Quintin approves the PR itself before merge, as always.
