# Work order for Arch/OpenClaw — restore the scanner's browser + return version evidence

From: Muse. For: Arch/OpenClaw (VPS lane). Date: 2026-10-21.
Requested by Quintin (Oct 21): the free URL scanner and document scanner
are broken while people are trying to use them. This packet is the
restore step in his lane; it is also the Phase 0/1 evidence the Codex
roadmap (98d442b3) assigns to Arch. Registered in the coordination index
as task `arch-chromium-restore-evidence`.

## Background (verified facts, not assumptions)

- The free URL scanner (qa11ylabs.com/api/scan) has been down since
  Oct 18: a Playwright upgrade wiped the browser build at the hard-coded
  path (chromium-1217) the service launches. Ops/environmental failure,
  not an architecture failure.
- The route code on QA11lylabs main has never run against the real
  scanner since; a VPS smoke test is the stack's #1 proof gap.
- Route-layer hardening (Slice 1) is a separate, gated track (Muse
  lane, Codex review + Quintin's work-order approval). This packet does
  NOT depend on it and does not change route code.

## Authorization boundary (from Quintin, via this packet)

Approved: restoring the browser install; ONE restart of the scanner
service if required for it to pick the browser up; the smoke test in
step 2; the read-only evidence collection in steps 3–4.
NOT approved here: route/code changes, config changes beyond the
browser install, other services, deploys. If the restore needs more
than this boundary, stop and report what is needed.

## Step 1 — Restore Chromium, pinned

- Install the browser via Playwright's managed install, pinned to the
  Playwright version the service actually resolves (no floating
  upgrade). Prefer a version-pinned install location over a hard-coded
  build-number path so the next upgrade cannot silently orphan it; if
  the service's configured path must change to match, report the exact
  old/new path — that single config value is in scope, nothing else is.
- Do NOT use --no-sandbox in any verification launch (fail closed,
  standing rule).

## Step 2 — Smoke test (the proof)

- GET /api/scan-health: report the response verbatim.
- ONE synthetic POST /api/scan against a known public test page
  (e.g., https://example.com) with a synthetic recipient in a test
  domain — no real lead data, no real customer address.
- Report: success/failure, the result shape (axe violations count,
  lighthouse field state), wall time, and any error text verbatim.
- If the route itself errors, report the exact error and STOP — route
  code is Muse's lane; do not patch it in production.

## Step 3 — B1 evidence drop (roadmap Phase 2 / proposal P03 input)

File the following as a handoff document (OpenclawOps, or a reply file
on the coordination branch) and register/point to it in the index:
- `npm ls --depth=0` for the scanner service directory.
- `node --version`; the Playwright version; the Chromium version and
  its resolved install path.
- OS release of the VPS.
- Whether an egress deny list is currently applied to the scanner's
  outbound traffic, and its semantics (values may stay private — report
  what it covers and how it is enforced, per P03 Revision 2).

## Step 4 — sshd over Tailscale: report only

- The long-standing issue: TCP connects on port 22 over Tailscale but
  no SSH banner is returned (Muse's read-only diagnostics are blocked
  on it). Report sshd's current state and the likely cause from logs.
  NO fix in this packet — Quintin decides after the report.

## Step 5 — Small: point the OpenClaw bot at #agents

- One config change: the OpenClaw Slack bot joins/posts in #agents
  (C0CA2N5UMPD), the build/test/ship coordination channel. GitHub stays
  the source of truth for work; #agents for status.

## Return format

Exact commands' outputs or verbatim excerpts, what changed, what did
not, and any blocker with its specific next action — filed where step 3
says, with the index entry updated to the return commit. No production
claims beyond what the smoke test actually proved.
