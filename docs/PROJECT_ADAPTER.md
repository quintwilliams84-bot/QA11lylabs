# Project adapter

Repository: `quintwilliams84-bot/QA11lylabs`.

Scanner and historical website application. The supplied VPS inventory identifies its checkout under a directory named qa11ylabs-website; confirm origin and deployed hashes before any release.

Shared standard: [OPERATING_STANDARD.md](OPERATING_STANDARD.md), version 1.0.0.
Expected SHA-256: `ed4fd1d2375f2b86860445761ae3ea885f1b6efebf731c353f3351745cd4de9c`.
Canonical source is OpenclawOps; this local copy is a reviewable mirror.

Agent branches: `<agent>/<description>`, lowercase descriptions with hyphens. Existing branches
can finish under their established names. Start new work from current main and
open PRs to main unless a separately approved integration plan specifies otherwise.
Old integration branches are not automatically current or trusted.

Muse owns scanner application changes. Do not replace the isolated live runner with a direct host browser launch. Live scanner-runtime source provenance and dirty VPS differences still need reconciliation.

## Validation and runtime configuration

Record actual Node/Python/browser versions and lockfile identities per candidate.
This document does not select, install or upgrade those versions. Existing wildcard
or missing-lockfile dependencies remain blockers to claiming reproducible builds;
resolve them in a focused follow-up with compatibility testing.

Use the applicable repository test commands after reviewing their side effects.
Syntax checks alone are insufficient. A named check becomes required only when
implemented, exercised and configured in GitHub; missing checks are BLOCKED or
NOT RUN, never green by implication. Health endpoints do not prove browser sandbox,
scan completion, delivery, persistence or rollback.

Deployment adapter: not approved by this change. Verify installed supervisor,
service owner, release source and working-tree drift before proposing activation.
Do not substitute any documented path or unit name for live identity evidence.
