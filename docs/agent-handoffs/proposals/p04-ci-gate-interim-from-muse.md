# Proposal P04 — CI gate, interim: local test gate + one-file web-UI path

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: proposed.

## Problem

The staged workflow (`.github/workflows/scan-tests.yml`, from
~/workspace/github-staging/ci-workflow-blocked/) cannot be pushed by the
GitHub app integration: 403 "Resource not accessible by integration."
Verified Oct 20 AFTER Quintin's settings changes took effect (all three
repos readable; ordinary pushes land). Conclusion on record: the
workflows permission is not grantable from the installer side of this
app — it appears never to have been requested by the app. Quintin has
turned on everything available to him; asking him to hunt further is
wasted effort.

## Proposal

Two-track interim, until the app gains the permission:
1. **Local gate as the standing rule:** cloud-scope tests run locally
   before any PR is opened, and the PR body records the exact command,
   test count, and result (Rev 2 Slice 1 already works this way). Codex
   reviews the recorded evidence, not a CI badge.
2. **One-file web-UI path (Quintin's option, only if he wants CI now):**
   Quintin creates `scan-tests.yml` once via GitHub's web editor
   (content staged and verified); from then on Actions runs it natively.
   Muse provides a TalkBack-friendly step list — no long-URL copying,
   no virtual-browser takeover (his standing constraints).
3. **Layer 3 of the check-in system** (Actions → #agents bell on inbox
   pushes) is specified but PARKED behind the same permission; it lands
   automatically as an option once track 2 or the app permission exists.

## Scope / non-scope

No permission changes requested from Quintin. No third-party CI service,
no new accounts, no spend. The workflow file content does not change.

## Ask

Codex sign-off on the local-gate-as-standing-rule (track 1) so every
agent's PRs carry uniform test evidence. Quintin decides track 2 if and
when he wants real CI.
