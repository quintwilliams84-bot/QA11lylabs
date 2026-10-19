# Candidate validation

Base: QA11lylabs main `a6bf2761cf6efeb9979c86265563fe5a49d8ec20`.
Validation performed in the Codex cloud development environment, not the VPS.

| Check | Result | Evidence / limit |
| --- | --- | --- |
| Installer regression suite | PASS | 16 tests; real process-group timeout/background cleanup tests included |
| Probe syntax | PASS | `node --check ops/browser-runtime/probe.cjs` |
| Whitespace validation | PASS | `git diff --check` |
| Locked package install | PASS | `npm ci --ignore-scripts --no-audit --no-fund` installed 117 packages in private cloud runtime |
| npm advisory audit | PASS at review time | 0 reported vulnerabilities, 117 total dependencies; not proof of no vulnerabilities |
| Managed Chromium download | BLOCKED | official cdn.playwright.dev returned HTTP 403 `Domain forbidden` |
| Missing-browser readiness | PASS negative check | `--check` returned nonzero; no insecure fallback or runtime promotion |
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

The existing scanner's security/cancellation defects remain; this commit does
not change `server.js`, `scan_server_patch.js`, the old VPS preflight, environment
loading, supervisor configuration or application dependency resolution.

Cloud network configuration: a draft addition for **cdn.playwright.dev** was
saved while preserving preset package-manager destinations. Saving is not runtime
activation or publication. No publication was performed. Redirect destinations,
if needed, must be identified and reviewed rather than adding broad wildcards.
No existing cloud install/start script was replaced.

Recommendation: review this branch as isolated preparation; **do not promote to
production or claim live scanner readiness** until browser download, sandbox,
application adapter and synthetic end-to-end gates pass. The repository protocol
requires VPS preflight before opening a PR; none was run, so this remains a review
branch rather than a claim that those gates passed.
