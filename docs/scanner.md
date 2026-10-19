# QA11yLabs Free Scanner

Express + Playwright + axe-core backend behind `qa11ylabs.com/api/scan`.
One scan = Lighthouse score + axe-core violations + PDF report, emailed to
the requester, with the lead recorded for follow-up.

## Layout

| Path | What it is |
|---|---|
| `server.js` | Main Express app (requires `./scan_server_patch` for scan routes) |
| `scan_server_patch.js` | Scan routes, abuse protection, browser/SSRF hardening |
| `lib/ip-policy.js` | Pure IP helpers (no side effects — safe to unit-test directly) |
| `test/scan-hardening.test.js` | Regression suite (`node:test`, zero dependencies) |
| `scripts/release-check.js` | Release gate: fails until deps are pinned + locked |
| `ops/preflight.sh` | VPS-only pre-deployment checks (never run off the VPS) |
| `remediation-engine.js` | Finding → remediation guidance |

## Quick start (development)

```sh
npm test            # run the regression suite
npm run release:check   # release gate — must pass before any release is cut
```

No `npm install` from this manifest yet: versions are intentionally unpinned
until reconciled from the VPS (`npm ls --depth=0`), then pinned and locked
with `npm install --package-lock-only`.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `TRUSTED_PROXIES` | `127.0.0.1,::1,100.64.0.0/10` | Proxies trusted for `X-Forwarded-For` (client-IP gating) |
| `RATE_STORE_PATH` | `/root/qa11y-ops/rate-store.json` | Persistent rate-limit/dedup store |
| `SCAN_TIMEOUT_MS` | `180000` | Per-scan timeout (axe/PDF/email) |
| `MAX_CONCURRENT` | `2` | Concurrent scans; rest queue (FIFO, max 20) |
| `CHROME_NO_SANDBOX` | unset (root keeps `--no-sandbox`) | Explicit opt-in to sandbox bypass |
| `QA11Y_COMMIT_SHA` | `unknown` | Deploy sets this — surfaces in `/api/scan-health` |
| `DEDUP_RESERVE_MS` | `900000` | Dedup reservation window before email confirm |

## Endpoints

- `GET /api/scan-stream` — SSE scan with live progress events
- `POST /api/scan` — legacy scan (same pipeline)
- `GET /api/scan-health` — browser status, queue depth, uptime, **version + commit**

## Abuse protection (4 layers)

1. nginx: 2 req/min/IP (burst 3) — VPS nginx config
2. Node: 5 scans/IP/10 min, persisted across restarts
3. Honeypot field (bots fill it, humans don't)
4. Email+domain dedup: 24 h, confirmed only after the mailer accepts

## Deploy pipeline

Agent branch → PR → checks → human review → merge → GitHub Release →
VPS release receiver deploys by release ID. See `docs/phased-optimization-plan.md`
and `ops/preflight.sh`. Never commit to `main` directly.
