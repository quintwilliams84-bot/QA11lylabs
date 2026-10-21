# Proposal P04 — CI gate, interim: local test gate + one-file web-UI path

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: revised (Revision 2, 2026-10-21) — responds to Codex feedback 4167349f and roadmap Phase 1/2 (98d442b3). Awaiting re-review.

## Problem

The staged workflow (`.github/workflows/scan-tests.yml`, from
~/workspace/github-staging/ci-workflow-blocked/) cannot be pushed through
Muse's GitHub app integration. The exact record supports only this:
the denied operation was a push creating a file under
`.github/workflows/`; the observed result was 403 "Resource not
accessible by integration" via that credential route; and this was
observed after Quintin's settings changes took effect (all three repos
readable, ordinary pushes landing). ROOT CAUSE: UNKNOWN. Rev 1's
conclusion — that the workflows permission was never requested by the
app and is not grantable from the installer side — exceeded what a 403
response alone establishes and is WITHDRAWN. This revision does not blame
user settings, does not assert the permission is impossible to grant,
and proposes no new token or authentication change without evidence and
Quintin's authorization. Permission observed on another repository or
operator does not establish this integration's access either.

## Proposal

Two-track interim, until hosted checks are actually available:

1. **Local evidence as review input:** cloud-scope tests run locally
   before a PR is opened, and the PR body records evidence bound to the
   exact candidate — command, environment, counts, and
   failures/skips/unrun checks with limitations stated. Codex reviews the
   recorded evidence, not a CI badge. This evidence is review input, NOT
   replacement enforcement: it does not substitute for hosted checks,
   independently verified results, or branch protections, and no merge
   requirement is relaxed because evidence is unavailable. Automated
   merging stays disabled; no protected merge path is claimed while
   evidence is unavailable. Documentation-only proposals and blocked
   work may still be opened as drafts carrying honest NOT RUN evidence —
   unavailable tests are not a prerequisite to requesting review.
2. **One-file web-UI path (Quintin's option, only if he wants CI now):**
   Quintin creates `scan-tests.yml` once via GitHub's web editor
   (content staged and verified). Before any separate approval of this
   option, the actual workflow content, its permissions, triggers,
   runner identity, source SHA and evidence retention are reviewed as
   they will run. No standing approval for future workflow execution or
   for Actions-to-Slack notifications is granted by this proposal.
   Muse provides a TalkBack-friendly step list — no long-URL copying,
   no virtual-browser takeover (his standing constraints).
3. **Layer 3 of the check-in system** (Actions → #agents bell on inbox
   pushes) stays PARKED behind real hosted-check availability; it is an
   option to evaluate then, not an approved notification mechanism.

## Scope / non-scope

No permission changes requested from Quintin. No third-party CI service,
no new accounts, no spend. The workflow file content does not change.

## Ask

Codex sign-off on the local-gate-as-standing-rule (track 1) so every
agent's PRs carry uniform test evidence. Quintin decides track 2 if and
when he wants real CI.

## Revision 2 log (2026-10-21, Muse)

- Root-cause claim withdrawn and replaced with the exact denied
  operation, the observed credential route, and UNKNOWN (see Problem).
- Local gate reframed: bounded, candidate-bound evidence as review
  input; explicitly not enforcement, not a branch-protection substitute;
  merge requirements not relaxed; automated merging stays disabled.
- NOT RUN honesty rule added for documentation-only and blocked work.
- Web-UI option now requires review of the workflow as it will actually
  run (permissions, triggers, runner identity, source SHA, retention)
  before its own separate approval; no standing approval for workflow
  execution or Actions-to-Slack notifications.
