# Handoff from Claude — Scanner Source-Reconciliation Review (2026-10-20)

For: Codex (evaluation/orchestration lane). From: Muse.
Status of this document: review summary only. It is task metadata, not
permission to merge, deploy, or change production. Nothing was edited,
executed, merged, or deployed in this pass; no tests were run.

## Reviewed SHAs (exact)

- QA11lylabs main: `578c221bda8165108165de27a6a5589ce5196e55`
  (quintwilliams84-bot/QA11lylabs)
- OpenclawOps handoff: `511aa9b6879664eca3869ac19124b1e88f8a2b61`,
  folder `handoffs/scanner-runtime-review-20261019`
  (quintwilliams84-bot/OpenclawOps)

## Verdict

RECONCILE — do not adopt either side whole.

- GitHub main hardened the ROUTE layer: FIFO queue (2 concurrent,
  persisted rate-limit/dedup), `/api/scan-health`, 26 route tests.
  But it still runs the browser in-process, as root, with a
  `--no-sandbox` fallback (env flag `CHROME_NO_SANDBOX` OR root), and
  an `npx` Lighthouse child that escapes the SSRF interception hook.
- The captured handoff hardened EXECUTION: Docker-isolated worker,
  `chromiumSandbox: true` with no fallback, per-job egress broker,
  pinned Lighthouse 13.4.1 as a library call. But its route layer is
  weaker: in-memory state, reject-when-busy, no health endpoint,
  zero tests.
- Document checker: neither side. The isolated baseline in
  OpenclawOps (PR #23 track) remains the path.

## Blocking removals before any production use

1. Delete `allowNoSandbox()` / root-default / `CHROME_NO_SANDBOX` /
   `forceNoSandbox` and the fallback launch in `scan_server_patch.js`.
2. Delete `execFile('npx', lighthouseArgs…)` and its unconditional
   `--no-sandbox` Chrome flags. Lighthouse moves in-worker as a pinned
   library call; until then axe-only with `score: null` is the truthful
   interim.
3. Move browser execution out of the web process into the isolated
   runner; de-root hard-coded paths (`/root/.env`,
   `/root/qa11y-venv/bin/python`, `/root/agentmail_send.py`,
   `/root/qa11y-ops/…`) to env config under a non-root service user.
4. Fix `ops/preflight.sh` — it currently smoke-launches WITH
   `--no-sandbox` and advises `npx playwright install`.
5. Pin exact dependency versions and generate `package-lock.json`.
6. Invert the existing test that "honors the explicit env flag" (it
   locks in the no-sandbox bypass).

## Protections that must be preserved from the isolated worker

Non-root UIDs (61990 URL worker/proxy, 61991 doc worker); explicit
Chromium sandboxing, fail closed, pinned Chrome; container confinement
(network none, read-only rootfs, cap-drop ALL, no-new-privileges,
seccomp); resource limits (768 MiB/1 CPU/160 PIDs URL worker; 256 MiB/
0.5 CPU/32 PIDs + RLIMITs doc worker; output caps); per-job egress
broker (resolve-once, deny private/reserved/host addresses); verified
TLS end-to-end; admission lock (flock lease + single-flight, released
only after verified container removal; cleanup failure latches
unhealthy/blocked); job-specific cleanup via detached 120 s watchdog
that survives frontend death; strict broker result validation; DOCX
limits (256 entries / 8 MiB / 32 MiB, streamed).

## Integration inputs missing from the handoff

Entrypoint/middleware wiring; `HermesDelegator` (Claude position:
remove, do not supply); remediation-engine version pairing; AgentMail
sender + document builder; complete app `package.json`/lockfile; host
Chrome version/provenance and pinned worker-image build inputs; runner
release assembly (`…/qa11y-scanner/current/` layout + pointer
management); OS/Node/Python versions, service identities, supervisor
config; nginx/rate-limit config + env schema + the deployment's
redacted public address (needed to complete the egress deny list);
qpdf/pdfinfo/pdftotext versions; the document checker's real frontend
caller (captured `free-scan.html` has no upload UI); frontend assets;
all tests; VPS `npm ls --depth=0` truth for pinning.

## Proposed scope (QA11lylabs only; no OpenclawOps/Arch edits)

- Modify: `scan_server_patch.js`, `server.js`, `package.json`,
  `test/scan-hardening.test.js`, `ops/preflight.sh`
- New: `package-lock.json`, `scanner/runner.cjs`, `scanner/worker.cjs`,
  `scanner/watchdog.cjs`, `scanner/egress_proxy.py`,
  `scanner/seccomp_profile.json`, `test/scanner-isolation.test.cjs`
  (worker files written fresh as reviewed implementations of the
  captured design — never copied from the sanitized bundle)
- Optional separate PR: `free-scan.html` (render the `queued` SSE stage)
- No change: `lib/ip-policy.js`, `remediation-engine.js`, the
  OpenclawOps isolated document-checker baseline

## Required synthetic staging tests (isolated staging, fixtures only)

- T-A frontend-death/admission-lock: SIGKILL mid-scan (watchdog removes
  only that job; proxy self-terminates ≤110 s), SIGKILL between
  create/start, cleanup-failure latch blocks all scans fail-closed,
  dual-frontend lease contention, restart persistence, exactly-one
  lead/email on retry.
- T-B sandbox/privilege: static grep gate (no `npx` / `--no-sandbox` /
  `CHROME_NO_SANDBOX`), root-start refusal, broken-sandbox fail-closed.
- T-C TLS/egress/SSRF: bad-cert targets rejected; redirect-to-private,
  DNS-rebinding, metadata IP blocked at both guard and broker; broker
  CONNECT/method/header discipline.
- T-D limits/cleanup: output/timeout/memory caps; per-job cleanup
  across success/failure/abort/frontend-death.
- T-E contract/abuse: result-validation fuzzing, queue FIFO/full/
  timeout/disconnect, dedup lifecycle, analyzer failure matrix
  (truthful failure — locks in PR #23 amendment C1), document-path
  zip-bomb matrix + guardian lock retention + dry-run zero-effects
  (PR #23 C2/C4).

## Base64 Markdown + doc-vs-code disagreements (listed only, NOT repaired)

10 Base64-encoded Markdown files, all in QA11lylabs @578c221:
`AGENTS.md`, `.github/pull_request_template.md`, `docs/scanner.md`,
`docs/runbooks/{chromium-restore, release-process, vps-diagnostics}.md`,
`docs/work-orders/{README, wo-1-leads-bridge, wo-2-status-badge,
wo-3-dogfood-check}.md`. None found in the OpenclawOps files swept.

Key disagreements: `docs/scanner.md` claims "no bypass flag… scans fail
closed" vs the code's root/env fallback; `docs/scanner.md` lists
`MAX_CONCURRENT` as an env var (hard-coded in code); decoded AGENTS.md
and release-process claim PR CI (`npm test`, lint) runs — no workflow
exists in the repo and there is no lint script; `ops/preflight.sh`
violates the sandbox rule the runbooks say it enforces; the
chromium-restore runbook's architecture notes and `executablePath` fix
are stale vs current code; the handoff's own header claims "max 2
concurrent" vs its code's `MAX_CONCURRENT = 1`.

## Ask of Codex

Evaluate/orchestrate: confirm or challenge the reconciliation direction
(main route layer + captured isolated execution + isolated doc
baseline), and sequence the §4 missing inputs — worker-image
provenance, runner release assembly, and VPS version truth gate
implementation. Implementation does not start until Quintin approves
the scope on the exact revision.
