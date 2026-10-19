# QA11y shared operating standard

Standard version: 1.0.0 (review candidate).
Canonical source: quintwilliams84-bot/OpenclawOps, docs/OPERATING_STANDARD.md.
Copies in other projects must match this file byte for byte. Change the canonical
copy first, then propose matching copies in separate project PRs. No runtime
fetching of policy or dependencies from a moving branch.

## Scope and authority

These are repository collaboration rules, not installed production controls.
Quintin approves PRs; passing checks alone never grants merge permission. Approval
must cover the current revision. Re-review after changes and use current required
checks, including the current base/merge result where GitHub supports it.
Deployment needs separate explicit approval for the exact release, target and
procedure. A merge, tag, GitHub Release or schedule alone grants no deployment
permission. Never infer a new credential or production permission from this file.

## Shared language

- Candidate: proposed source revision; testing may be incomplete.
- Reviewed: review records identify the exact revision and unresolved findings.
- Staging-verified: named checks passed on that revision in a named isolated
  environment. Record what was not tested; this does not mean production-ready.
- Approved release: exact artifact/revision and target explicitly approved for
  deployment. Approval is separate from PR approval.
- Deployed: recorded artifact activated on a named target; health still needs proof.
- Production-verified: post-activation checks passed, with time and scope recorded.
- Check status: PASS, FAIL, BLOCKED or NOT RUN. Never count missing checks as PASS.
- Read-only: no file, database, receipt, session, schedule or runtime mutations.
  A command that writes evidence is write-producing even if non-destructive.

## Repeatable development and review

1. Establish repository owner/name, base commit, clean/dirty state and task owner.
   Directory names do not establish repository identity. Preserve dirty work.
2. Work on an agent branch from current main. Keep one concern per PR. Do not
   force-push another agent's branch or overwrite concurrent edits.
3. Use synthetic data and cloud-only credentials. Never source VPS environment
   files, use customer documents, send real email or call paid models in tests
   without separate authorization. Sanitize evidence; never print secret values.
4. Declare checks before claiming readiness. Run appropriate syntax, unit,
   integration and accessibility checks against the exact candidate. Record
   commands, revision, environment, results and limitations. Mocked/synthetic
   results are not live-service evidence. A checksum proves bytes, not authorship.
5. Open a PR with the tested SHA, change/risk summary and rollback considerations.
   Require Quintin's approval and passing required checks on the current revision.
   Automation must fail closed when approval, revision or check evidence is absent.
6. Never run production preflight as a prerequisite to opening a PR. Environment
   parity and browser tests belong in isolated staging first. Live diagnostics,
   external effects and activation require their own approved scope.

## Project adapters and production boundary

Each project declares its role and branch convention in docs/PROJECT_ADAPTER.md.
Toolchains, lockfiles, browser builds, ports, paths, process identities and service
owners are project-specific. Pin compatible versions, preserve manifests and
locks, and fail clearly if missing. Do not blindly upgrade every project together.
No shell sourcing or executable hooks from the adapter. Do not load production
credentials into cloud. A free tool still needs a maintenance and resource budget.

Never pull main directly into live service files, self-update a deployment gate,
or use git reset --hard, git clean, blanket process-name kills or lease deletion
as automatic recovery. Do not assume a receiver, branch protection, CI, backup or
rollback exists merely because documentation proposes it. Verify installed state.
Use one approved owner per recovery target; keep observation separate from action.

Release design must account for immutable artifact identity, trusted provenance,
exact approval, bounded commands/resources, durable job state, maintenance inhibits,
health checks, failure stop conditions and preservation of the previous artifact.
Before activation, reconcile local drift and prove rollback in staging. Database
or evidence changes may require a forward repair; swapping code is not sufficient.
Production restarts, permissions, schedules, secrets and deployments remain outside
ordinary repository edits. Never disable TLS, Chromium sandboxing or network
restrictions to make validation pass.

## Accessibility and evidence

WCAG 2.2 AA is the target for user interfaces. Automated scans detect a subset of
issues and do not establish conformance. Record manual keyboard/screen-reader
coverage and remaining gaps. Never invent delivery, health or accessibility proof.

## Coordination

Use PRs and revision-bound review comments as the durable handoff. Name the owner,
exact commit, touched files, checks and blockers. Other agents must inspect the
handoff; no automatic agent-to-agent delivery is implied. MCP or webhook adapters
need separate review, narrow permissions, signature/replay checks, bounded queues
and idempotency before activation. No extra VPS daemon is required by this standard.
