# QA11yLabs Scanner — Phased Optimization Plan

Single source of truth for the scanner upgrade track. All agents work from this
plan; GitHub is the source of truth for the code.

## Phase 0 — Triage (done Oct 18)
Diagnosed the free-scanner outage: the Playwright Chromium binary was wiped by a
Playwright upgrade (environmental, not architectural). Work order written for
the VPS-side reinstall.

## Phase 1 — Resilience, protocol, security (done Oct 18, merged to main)
- PR #1: browser startup self-test + Telegram alert, clean user-facing outage
  errors, `/api/scan-health` endpoint
- PR #2: repo protocol (branch model, preflight → PR → RC → validation →
  release → deploy gates), `ops/preflight.sh`
- PR #3: fixed command injection in `runLighthouse` (execSync → execFileSync),
  added SSRF guard on scan targets

## Phase 2 — Hardening (this change)
- **Persistent rate limits + dedup**: state survives restarts
  (`RATE_STORE_PATH`, default `/root/qa11y-ops/rate-store.json`)
- **FIFO scan queue**: scans wait their turn instead of being rejected when
  busy; queue position reported on the SSE stream; 10-min max wait
- **Per-scan timeout**: `SCAN_TIMEOUT_MS` (default 3 min) on axe-core, PDF, and
  email stages — a hung scan can never wedge a worker slot
- **Trusted-proxy client IP**: X-Forwarded-For only trusted past
  `TRUSTED_PROXIES` (default `127.0.0.1,::1,100.64.0.0/10`); rightmost
  untrusted address wins

## Phase 3 — Capability (queued, not started)
- Multi-page crawl (beyond the single landing page)
- Paid-tier scan depth
- Scan history per customer

## VPS-side track (OpenClaw / Arch — Muse cannot do these)
1. Reinstall Chromium: `npx playwright install chromium` (+ `install-deps`)
2. Pull `main`, run `ops/preflight.sh` — must be all green
3. End-to-end smoke test: a real scan through `/api/scan`
4. Build the release receiver (design in
   `~/workspace/drafts/qa11ylabs-deploy/release-receiver-design.md`):
   deploys published GitHub Releases by release ID, atomic + rollback
5. Fix sshd over Tailscale (decisive test: `tcpdump -i tailscale0 port 22`
   on the VPS while retrying from the agent VM)

## Rules
- Every change goes through the gates in `AGENTS.md`: preflight → PR →
  release candidate → validation → release → deploy.
- No hard-coded ports/paths/secrets/browser locations in repo code —
  env vars / VPS config only.
- Backend PRs target the integration branch; `main` only takes validated
  release merges (expedited direct-to-main merges need Quintin's explicit word,
  as happened Oct 18).
