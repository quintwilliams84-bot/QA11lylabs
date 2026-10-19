# Agent Collaboration Guide — qa11ylabs.com

This repo is the source of truth for qa11ylabs.com. All changes — from humans
or AI agents — flow through the same pipeline. No exceptions, no direct edits
to the live server.

## Unity standard

Every agent (Muse, Codex, Antigravity, OpenClaw, Hermes) follows this exact
protocol. Do only what is helpful and constructive for the shared workspace.
When in doubt, open a PR and let review decide — never push around the gates.

## Branch model

| Branch             | Purpose                                              | Managed by |
|--------------------|------------------------------------------------------|------------|
| `main`             | Production. Only release commits land here.          | OpenClaw   |
| `openclaw/ops`     | Integration branch for backend/ops/scanner work.     | OpenClaw   |
| `website`          | Integration branch for site content and frontend.    | OpenClaw   |
| `muse/<desc>`      | Muse's work branches. One branch per change.         | Muse       |
| `codex/<desc>`     | Codex's work branches. One branch per change.        | Codex      |
| `antigravity/<desc>` | Antigravity's work branches. One branch per change.| Antigravity|

All agent branch names: all lowercase, hyphens, no slashes after the prefix
(e.g. `muse/fix-hero-contrast`). Delete the branch after merge.

## The gates — in order

No change reaches `main` without passing every gate, in this order:

### 1. Preflight (on the VPS, never on an agent's machine)

Before any PR is opened, the change must be validated against the **VPS
environment** — not the machine where it was written. Run `ops/preflight.sh`
on the VPS (OpenClaw or whoever holds VPS access). It checks:

- Node version and installed dependencies match what the app needs
- Required environment variables are present (values never printed)
- Playwright/Chromium (or configured browser) launches headless
- Expected ports are free / services answer as configured
- nginx config is valid (`nginx -t`)

Preflight must pass. If it fails, fix the environment or the change — do not
open the PR yet. Environment-specific values (ports, paths, secrets) live in
VPS config and env files, never hard-coded in repo code.

### 2. Pull request

- Open the PR against the right integration branch: `openclaw/ops` for
  backend/ops/scanner changes, `website` for site changes.
- Fill out the PR template completely — especially the accessibility checklist.
- Automated checks (pa11y, HTML validation) must be green before review.
- At least one reviewer approval before merge. Reviewers check code quality
  AND accessibility: if you can't verify it with a screen reader, say so.
- Keep PRs small and focused. One idea per PR.

### 3. Release candidate

After merge to the integration branch, OpenClaw cuts a release candidate
tag (e.g. `v2026.10.18-rc1`).

### 4. Validation

The release candidate is validated on the VPS: full preflight again, plus an
end-to-end smoke test of the changed feature (for the scanner: a real scan
through `/api/scan` producing results, PDF, email, and lead record).

### 5. Release and deploy

1. Validation green → merge integration branch to `main`.
2. Confirm checks are green on `main`.
3. Cut a GitHub Release from `main` with the next version tag (`vYYYY.MM.DD-n`).
4. The VPS release receiver picks up the published release, deploys it
   atomically by release ID, and keeps the previous release for instant
   rollback.

**Only published GitHub Releases deploy.** The VPS release receiver ignores
branches, commits, and pushes. Nothing deploys without a release ID.

## Environment parity rule

Repo code must never assume an agent's local machine. All VPS-localized
values — ports, file paths, browser binary locations, library paths, secrets,
API endpoints — come from environment variables or VPS config files with
sane fallbacks. If a value only exists on one machine, it is not in the repo.

## Accessibility is the product

This is QA11yLabs' own website. Every change must meet WCAG 2.2 AA at minimum.
If a change can't be verified accessible, it doesn't merge. The PR template
checklist is the gate — treat it as seriously as the automated checks.
