# Candidate validation — staging review revision

Base: QA11lylabs main `a6bf2761cf6efeb9979c86265563fe5a49d8ec20`.
Validation performed in the Codex cloud development environment, not the VPS.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Installer regression suite | PASS | 24 tests; real process-group timeout/background cleanup, read-only metadata snapshots, exclusive probe lock, installer fingerprint and isolation rejection checks included |
| Probe syntax | PASS | `node --check ops/browser-runtime/probe.cjs` |
| Whitespace validation | PASS | `git diff --check` |
| Locked package install | Previously PASS | e3a78c2: installed 117 packages; not repeated in this revision; package manifest/lock unchanged |
| npm advisory audit | Previously PASS | e3a78c2: 0 reported vulnerabilities, 117 dependencies; not repeated, not proof of no vulnerabilities |
| Managed Chromium download | BLOCKED | official cdn.playwright.dev returned HTTP 403 `Domain forbidden` |
| Read-only metadata check | PASS | Positive synthetic metadata and failure snapshots unchanged; does not launch or verify Chromium |
| Host namespace capability | BLOCKED | util-linux unshare rejected uid_map: read-only filesystem; no platform restrictions changed |
| Direct host-network probe rejection | PASS | refused before requiring Playwright; no insecure fallback |
| Chromium sandbox / axe functional fixture | UNRUN | browser download blocked; no sandbox claim is made |
| Detached Chromium cleanup | UNRUN | requires a real browser plus release-level supervisor/cgroup validation |
| Actual Lighthouse scan | UNRUN | tool installed but browser unavailable |
| Real scanner / PDF / AgentMail / VPS | UNRUN | outside this isolated tooling change; no production actions performed |

The first installer test run exposed a test fixture affected by the shell's
private umask; the fixture now sets public mode explicitly. Initial installation
also exposed conflicting empty npm config paths and missing platform proxy/CA
passthrough. Both were corrected; proxy values and credentials were not printed.
The background-child test initially checked immediately after SIGKILL; it now
waits up to two seconds for signal delivery, failing if the child remains active.

The existing scanner's security/cancellation defects remain; this revision does
not change `server.js`, `scan_server_patch.js`, the old VPS preflight, environment
loading, supervisor configuration or application dependency resolution.

Cloud network configuration: a draft addition for **cdn.playwright.dev** was
saved while preserving preset package-manager destinations. Saving is not runtime
activation or publication. No publication was performed. Redirect destinations,
if needed, must be identified and reviewed rather than adding broad wildcards.
No existing cloud install/start script was replaced. The network draft was saved
in the earlier revision; it was not changed or published during this follow-up.

Review corrections: context request routing is now described only as defense in
depth. Functional probing requires fresh network/PID namespaces and fails closed
when unsupported. `--check` is metadata-only and performs no runtime writes.
The source fingerprint includes the installer; final manager evidence also emits
the full source commit, dirty status and installer checksum. Positive namespace /
detached-browser teardown claims remain unverified until real isolated runs pass.

Recommendation: review this branch as isolated preparation; **do not promote to
production or claim live scanner readiness** until browser download, sandbox,
application adapter and synthetic end-to-end gates pass. The repository protocol
requires VPS preflight before opening a PR; none was run, so this remains a review
branch rather than a claim that those gates passed.
