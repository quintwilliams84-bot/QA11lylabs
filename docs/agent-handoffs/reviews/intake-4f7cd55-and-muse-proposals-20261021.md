# Codex technical review: intake and queued proposals

Date: 2026-10-21 UTC. Reviewer: Codex. Documentation feedback only.
No implementation, staging, merge, deployment or external communication is authorized by this review.
The publication of this review is not a GitHub PR approval or proof of enforced controls.

## Reviewed revisions

- Intake: QA11lylabs 4f7cd55da33b8dbc1c81e87403b91b1b296f63cf, agent/arch/proposal-intake.
- Coordination index: 595db1e20175e4840d836a9710c5524e4f984c1f.
- P01 through P05: 1411a6bb92960f9744972429b36af3a24f80a3fd, docs/agent-handoffs/proposals/.
  Verified proposal bytes equal the copies at coordination 595db1e.
- Source context: QA main 578c221bda8165108165de27a6a5589ce5196e55 and OpenclawOps handoff 511aa9b6879664eca3869ac19124b1e88f8a2b61.
- This review does not assess or approve the complete revised scanner Slice 1 proposal/addendum. That remains a separate queued review.

## Intake verdict: technically ready for Quintin's approval

Independently replayed the actual unchanged handoff reader from the intake revision using temporary files only. All calls exited zero: codex 11 tasks, muse 1, arch 0, antigravity 0. Authorization remained none.

Verified twelve total tasks, DOC-001 once, and preservation of every original task identity, source mapping, target agent and status. Seven corrected subject descriptions are retained in README. Schema remains version 1. The revision diff is whitespace-clean and documentation/metadata only. No blocking intake issue remains in this reviewed revision.

Integration is still a separate decision. Recheck the coordination head before integrating; do not overwrite later agent updates. Do not force-push or treat a readable index as execution permission. This review does not integrate the intake or change existing task statuses.

## P01: technically ready for scoped documentation preparation

Proposal: p01-base64-docs-cleanup-from-muse.md.

One docs-only decode PR is reasonable. No consumer of these Markdown files in Base64 form was identified in the inspected source. A limited executable-source search for base64/b64decode/atob found risk-teaser.js, not a documented Markdown decoder. This is scoped negative evidence, not proof that external tools or every branch have no such consumer.

Verify the current exact base and PR #13 ownership before editing; do not assume the remaining count is still nine. Preserve existing work and decode only verified encoded Markdown. Round-trip equality verifies byte conversion, not absence of dependent consumers.

Clearly distinguish a faithful decode from factual edits. If factual corrections are included, list them explicitly and review them against source; do not present them as byte-identical decoding. Never turn an inaccurate sandbox or CI claim into authority. Quintin must authorize the selected implementation scope and later approve the exact PR head before merge. No runtime, dependencies, workflows or VPS changes belong in this task.

## P02: changes requested; design only

Proposal: p02-leads-zero-loss-bridge-from-muse.md.

The goal is sound, but zero-loss is a target to test, not an established property. Remove the current outage/absent-Chromium assertions unless supported by fresh evidence: captured production selects host Chrome, not the missing managed cache. The captured scanner already has multiple local writes and an asynchronous local lead-dispatch attempt, so do not claim nothing moves leads without inspecting that receiver and current wiring.

Separate durable submission capture from successful scan/email. A failed or unknown scan must not silently erase an authorized lead submission. Define an immutable submission/job ID and downstream record identity: email/domain suppression is not a sufficient permanent identity and can collapse legitimate later submissions.

A single watermark and weekly row counts are insufficient for crash safety or reconciliation. Specify persisted states, acknowledgement semantics, retry/backoff limits, unknown-outcome handling and per-ID reconciliation. Counts can match while records are missing or duplicated. Keep Sheets as the business-facing record while defining the operational outbox, retention, access and deletion policy; do not promise both a durable export and no additional copies without a precise lifecycle.

Prefer a narrowly scoped existing authorized connector/pull adapter if it can meet those requirements. Do not place new broad Google credentials on the VPS. Connector availability does not grant scheduled exports or permission to move personal information. No real leads, identifiers or exports in Git. Link existing WO-1 rather than create a competing implementation task.

## P03: accept provenance-design direction; correct scope before collection

Proposal: p03-slice2-worker-provenance-from-muse.md.

Codex can own the technical provenance specification; Arch owns separately scoped installed-state evidence; Muse may draft assembly after the contract review. These role assignments do not authorize execution or production changes.

Correct the source identity: the captured URL worker is review-only material in the handoff at 511aa9b. OpenclawOps main 4f01d8d contains the separate isolated document candidate. Do not conflate their images, identities, resource settings or source trees.

Reuse existing version/hash evidence and collect only missing inputs. Distinguish an upstream image reference/digest from host-mounted Chrome version, libraries and compatible Playwright identity. Record release assembly, configuration schema, source/lock hashes and trust ownership. Public host deny-list values can remain private deployment configuration; specify required semantics without publishing the address.

Consolidate overlapping browser-provenance blockers by reference to browser-isolated-staging. This does not merge the browser-readiness package into the production runner or select an upgrade. No install, image build or new runtime code is authorized here.

## P04: local evidence accepted as review input, not replacement enforcement

Proposal: p04-ci-gate-interim-from-muse.md.

Require reviewed, bounded cloud test evidence bound to the exact candidate: command, environment, counts, failures/skips/unrun checks and limitations. Documentation-only proposals and blocked work can still be opened as drafts with honest NOT RUN evidence; do not make unavailable tests a prerequisite to requesting review.

Local results do not replace required hosted checks, independently verified results or enforced branch protections. Do not relax merge requirements or claim a protected merge path while evidence is unavailable. Keep automated merging disabled.

The claimed application-permission root cause exceeds a 403 response alone. Record the exact denied operation and observed credential route; do not blame user settings, assert permissions are impossible to grant, demand a new token or change authentication without evidence and authorization.

Any web-UI workflow option needs review of the actual workflow, permissions, triggers, runner identity, source SHA and evidence retention before a separate approval. No standing approval for future workflow execution or Actions-to-Slack notifications is granted. Existing workflow permission on another repository/operator does not establish this integration's access.

## P05: separate booking-settings proposal; changes requested for privacy

Proposal: p05-booking-availability-hardening-from-muse.md.

Configuring booking availability at its source is reasonable, subject to Quintin confirming the intended hours and an explicit IANA timezone/DST policy. Codex cannot confirm calendar state, outreach dependencies or provider behavior from this repository proposal.

Remove identifiable appointment/customer examples and unnecessary personal schedule details from the shared proposal. A generic conflict example is sufficient. Keep private supporting evidence outside Git. If public exposure is confirmed, assess remediation separately; do not rewrite history or contact affected people automatically.

No booking-page edits, calendar cancellations, invitations, outreach changes or messages are authorized. Quintin can apply or explicitly delegate a reviewed settings change, then verify offered slots across timezone/DST boundaries. Do not alter existing appointments implicitly.

## Next actions

1. Quintin reviews the intake's exact revision for coordination integration; that is not a main merge or production approval.
2. Arch preserves all newer coordination entries when preparing integration and keeps DOC-001 blocked until its staging/evidence prerequisites and approval are satisfied.
3. Muse revises P02, P04 and P05, corrects P03 baseline identity, and confirms P01's exact remaining scope. Keep proposal IDs and links stable; no duplicate packets.
4. Record later technical feedback and human authorization against exact revisions. This review does not claim completion of the scanner, leads, CI, booking or recovery work.
