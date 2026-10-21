# Agent Collaboration Guide — qa11ylabs.com

This repo is the source of truth for qa11ylabs.com. All changes — from humans
or AI agents — flow through the same pipeline. No exceptions, no direct edits
to the live server.

## Unity standard

Every agent (Muse, Codex, Antigravity, OpenClaw, Hermes) follows this exact
protocol. Do only what is helpful and constructive for the shared workspace.
When in doubt, open a PR and let review decide — never push around the gates.

## Session check-in — read the agent inbox first

Every agent session that touches this repo or the QA11yLabs workspace starts
with a check-in. No exceptions, no "I'll catch up later."

1. Fetch branch `codex/staging-coordination` and read
   `docs/agent-handoffs/index.json`.
2. Compare it against the inbox state you last saw (your watermark: the
   branch head SHA you last read). Any task with `target_agent` set to you —
   and any task whose `status` or source `commit` changed since your
   watermark — is new to you. Read its summary file in
   `docs/agent-handoffs/` before starting other work.
3. Update your watermark to the inbox commit you just read.

Rules of the road:

- The inbox is task discovery, never permission. Reading a task is not
  accepting it; acting on it still follows the standard below, including
  Quintin's approval on the exact revision.
- A changed source SHA needs fresh review — never act on a stale summary.
- Completion is an actual agent report citing the source SHA and test
  evidence, delivered through the same inbox or a PR. Silence is not
  completion.
- Whoever completes a review pass or a multi-part work item writes the
  summary for the next agent (plain Markdown in `docs/agent-handoffs/` plus
  an `index.json` entry pinned to the summary's exact commit). Summaries
  state the verdict, the exact SHAs reviewed, what was verified and what
  was not, blockers, and the proposed scope. No credentials, client data,
  or private logs ever go in the inbox.
- If you cannot reach GitHub, say so in your status report. Never proceed
  as if you are current when you could not check in.

## Branch model

| Branch             | Purpose                                              | Managed by |
|--------------------|------------------------------------------------------|------------|
| `main`             | Production. Only approved changes land here.         | OpenClaw   |
| `openclaw/ops`     | Integration branch for backend/ops/scanner work.     | OpenClaw   |
| `website`          | Integration branch for site content and frontend.    | OpenClaw   |
| `muse/<desc>`      | Muse's work branches. One branch per change.         | Muse       |
| `codex/<desc>`     | Codex's work branches. One branch per change.        | Codex      |
| `antigravity/<desc>` | Antigravity's work branches. One branch per change.| Antigravity|

All agent branch names: all lowercase, hyphens, no slashes after the prefix
(e.g. `muse/fix-hero-contrast`). Delete the branch after merge.

Current practice (Quintin's ruling): PRs target `main` directly until the
architecture is complete. The integration branches remain OpenClaw's lanes.

## The standard — in order

```
cloud checks → isolated staging → Quintin's PR approval → production activation
```

Each stage gates the next. No stage is skipped, no stage implies the next.

### 1. Cloud checks

Automated checks run on every PR (CI: `npm test`, lint, template checklist).
Checks must be green before review. A green check is not an approval — it
only means the change is reviewable.

### 2. Isolated staging

The change is validated in an isolated staging environment — never on the
live scanner, never on production traffic. For the scanner: full preflight
(`ops/preflight.sh`) plus an end-to-end smoke test of the changed feature
(a real scan through `/api/scan` producing results, PDF, email, and lead
record).

- Browser checks run WITH the sandbox enabled. If the sandbox is unavailable,
  the check fails closed. Never pass `--no-sandbox` to make a check go green.
- Process-kill tests, restart drills, and destructive checks happen here and
  only here.
- Environment-specific values (ports, paths, secrets) live in VPS config and
  env files, never hard-coded in repo code.

### 3. Quintin's PR approval (current revision)

- Open the PR from the agent branch. Fill out the PR template completely —
  especially the accessibility checklist.
- Quintin's approval on the exact revision being shipped. A rebase or new
  commit after approval needs re-approval — approval attaches to the
  revision, not the branch.
- Reviewers check code quality AND accessibility: if you can't verify it with
  a screen reader, say so.
- Keep PRs small and focused. One idea per PR.

### 4. Production activation (separately approved)

Merging is not deploying. Production activation is a separate, explicit
approval by Quintin — it never happens automatically on merge.

> Scope note: the release receiver (deploy-by-release-ID with rollback) is a
> design document, not an installed system. No release receiver is installed
> on the VPS, and rollback is unproven. Until the receiver exists and is
> validated, production activation is a manual, explicitly approved step
> performed by the release manager, with the previous known-good state
> identified beforehand.

## Environment parity rule

Repo code must never assume an agent's local machine. All VPS-localized
values — ports, file paths, browser binary locations, library paths, secrets,
API endpoints — come from environment variables or VPS config files with
sane fallbacks. If a value only exists on one machine, it is not in the repo.

## Accessibility is the product

This is QA11yLabs' own website. Every change must meet WCAG 2.2 AA at minimum.
If a change can't be verified accessible, it doesn't merge. The PR template
checklist is the gate — treat it as seriously as the automated checks.
