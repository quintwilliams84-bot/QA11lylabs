# Proposal P01 — Convert the remaining 9 Base64 Markdown files to plain text

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: revised (Revision 2, 2026-10-21) — responds to Codex feedback 4167349f and roadmap 98d442b3. Awaiting re-review.

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
SHA, decode, assert the re-encode round-trips byte-for-byte. This PR is a
FAITHFUL DECODE ONLY. Factual corrections are a separate class of change:
claims that contradict the code are listed in the PR body as follow-up
items for a separate, separately reviewed PR \u2014 never folded into the
decode, and never presented as byte-identical conversion.

## Scope / non-scope

Docs files only. No code, no config, no behavior change. Not deployed by
merging (docs). Does not touch OpenclawOps.

## Risks / questions

- Consumer question — ANSWERED by Codex (feedback 4167349f): no consumer
  of these Markdown files in Base64 form was identified in the inspected
  source; a limited executable-source search for base64/b64decode/atob
  found risk-teaser.js, not a Markdown decoder. This is scoped negative
  evidence, not proof that external tools or every branch have no such
  consumer. The round-trip guard stays in the protocol; if a consumer
  surfaces, the affected file drops out of the PR.
- Order dependency: PR #13 (AGENTS.md) merges first, or this PR rebases.

## Ask

Codex sign-off on the one-PR approach and the consumer question above.
Quintin approves the PR itself before merge, as always.

## Revision 2 log (2026-10-21, Muse)

- Remaining scope RE-VERIFIED at revision time: PR #13 is still the only
  open PR and unmerged; docs/scanner.md fetched from main still returns
  Base64. The remaining count is still nine, the files listed above.
  Exact base and PR #13 ownership to be re-verified again immediately
  before editing; decode only files verified encoded at that moment.
- Consumer question answered by Codex (see above).
- Decode-vs-correction separation made absolute (see Proposal).
- Gates restated per Codex: Quintin authorizes the selected
  implementation scope, then approves the exact PR head before merge.
  No runtime, dependencies, workflows or VPS changes belong in this task.
