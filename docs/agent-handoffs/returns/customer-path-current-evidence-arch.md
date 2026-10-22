# Evidence return for customer-path-current-evidence

## Receipt of task

- Agent: Arch; GitHub publishing account quintwilliams84-bot.
- Packet: QA11lylabs 264e9d3592c169e1d85c6fd832d14ac0dce01b32,
  docs/agent-handoffs/TONIGHT_RECONCILIATION.md and both return templates.
- Canonical coordination index read: 68cf05cdf14d0e4209fb16d12762928c7840b7bb.
- Observation: 2026-10-22 04:14–04:15 UTC; read-only, sequential collection.
- Reviewer: PENDING Codex; this is not independent acceptance.
- Scope: first customer-path return only, before wider component collection.

## Current URL/document failure map

| Stage | URL checker | Document checker | Evidence and limits |
|---|---|---|---|
| Public page | PASS availability only: GET https://qa11ylabs.com/free-scan.html HTTP 200 | UNKNOWN actual upload page | curl exit 0 at 04:15 UTC. No browser/UI execution. Earlier bounded top-level HTML inspection found no /api/document-check reference, not proof no nested/dynamic UI exists. |
| Page to API | Static wiring: /api/scan and /api/scan-stream in free-scan.html | UNKNOWN frontend wiring | POST /api/scan and GET /api/scan-stream registered in route source; POST /api/document-check uses upload.single(document). No requests submitted. |
| Proxy/listener | PASS listener observation; execution NOT RUN | Same /api/ proxy, execution NOT RUN | nginx static /api/ -> 127.0.0.1:3001, read timeout 120s, buffering off; scan-stream override 180s, buffering off. Effective inherited upload-size limit and trust-proxy semantics UNKNOWN. |
| Supervisor/entrypoint | PM2 saved app qa11ylabs-scan -> /var/www/qa11ylabs/server.js | Same server imports document_checker_routes.js | Port 3001 currently owned by PID 752444, UID/GID 0/0. Saved PM2 metadata is not a fresh PM2 ownership receipt. server.js imports both route modules. |
| Execution | Static runner import /opt/qa11y-scanner/current/runner.cjs -> Docker worker | Static host python3 invocation from older route | URL current resolves release 20261017-r2. Runner mounts /opt/google/chrome readonly; worker launches /opt/google/chrome/chrome with chromiumSandbox true. Chrome file exists. Installed image compatibility and real launch UNKNOWN. Document route points to legacy document-checker tree and imports HermesDelegator: not proof isolated DOC-001 is deployed. |
| Report | Static pdfkit builder and private PDF artifact write | External document-production builder invocation | Builder operation and report correctness NOT RUN. URL route also imports remediation-engine; full downstream provenance UNKNOWN. |
| Mail | Binding names AGENTMAIL_SENDER and QA11Y_PYTHON appear in route | Exact mail adapter UNKNOWN | Adapter completion/provider acceptance/inbox delivery NOT RUN; no send. Source names do not prove bindings are populated. |
| Persistence | Private free-scan lead directory and unified lead-inbox JSONL referenced | Receipt writes present; durable lifecycle UNKNOWN | Paths treated by role, contents not inspected. No proof of durable outbox, duplicate prevention or restart reconciliation. |
| Last failure | UNKNOWN | UNKNOWN | Last 32 KiB each of saved PM2 stdout/stderr paths had no matches for ENOENT/EACCES/browserType.launch/Timeout/ECONNREFUSED/Error/Cannot find module. Log mtimes Oct 21 12:25 UTC and Oct 19 21:28 UTC respectively. No raw logs retained/published. Absence of these patterns does not establish health or absence of failure. |
| End to end | NOT RUN | NOT RUN | No scan submissions, uploads, browser/model calls, mail or customer data. |

The observed failure stage is UNKNOWN; reported customer difficulty remains
unresolved. A Chromium reinstall is not supported by these observations. The
host browser exists and the live route imports the isolated runner rather than
a managed-cache launch. File existence does not establish executable health.

## Exact deployed source identities

All SHA-256, observed 04:14 UTC. Git correspondence UNKNOWN pending private
capture/source comparison; do not substitute website main or sanitized copies.

| File | SHA-256 |
|---|---|
| /var/www/qa11ylabs/server.js | e70df6a142feb4edcf39cde2dd12dceacf07756e0ae8f2d2628ae581f95599e1 |
| /var/www/qa11ylabs/scan_server_patch.js | f4c601ca7d9977966405688686346771219cf690bbd4ecf7475482c32f01a738 |
| /var/www/qa11ylabs/free-scan.html | 4926283589a27206df4fe0c04a4128092fc18fbe92e77e6069b9125caabbc910 |
| /var/www/qa11ylabs/document_checker_routes.js | 74d347624f2dda27c1297353d650b2dcf4934ee50ef41545ddd7a1179f684ab3 |
| /opt/qa11y-scanner/current/runner.cjs | d2b3167f8be4081822183ccd7022a9bf7b83cf3ba454a73edd6f0c747597b0dd |

Website installed Playwright/playwright-core package.json metadata: 1.60.0
(reused immediately preceding inspection, not worker dependency proof). Actual
worker dependency/browser versions and image identity remain UNKNOWN here.

## Commands and effects

- Read GitHub contents/tree APIs and fetched references into an existing isolated
  review Git repository only; no production checkout fetch/pull/reset.
- Python standard-library Path/read_text/hashlib inspection of named source,
  saved PM2 metadata and selected nginx directives; no app imports.
- `ss -ltnp` (5-second timeout), selected port 3001; selected UID/GID from
  /proc/752444/status. Full command lines were not published.
- `curl --silent --show-error --connect-timeout 3 --max-time 8 --output /dev/null
  --write-out '%{http_code}' https://qa11ylabs.com/free-scan.html`.
- Log reads capped at 32 KiB per file, selected category counts only. Tool output
  capped at 1,300–3,500 tokens per collection. Other local file inspections were
  synchronous; no global file-read timeout was imposed, a collection limitation.
- No raw logs, config dumps, credentials, client documents or production source
  copies exported. Only this sanitized report is created in the isolated branch.
- No scan-health request: side-effect-free route implementation not verified.
- No Docker commands, browser version execution, probes, tests or app imports.
- Task branch has no .github/workflows files; no PR or workflow dispatch requested.

## Minimal next correction

No installation or code correction justified yet. Muse should bind Slice 1/P03
to this isolated runner architecture, not website-main host browser assumptions.
Arch next read-only evidence gaps: actual document UI location, exact registration
calls, installed image/worker manifests, parser/report/mail identities, bounded
new error-stage evidence and private source correspondence. No successful source
inspection should be relabeled customer-path health.

Browser-restore task a3a20bbe needs reconciliation: claimed cache outage and
installation/restart/send authorization are not established by repository text.
Slack configuration is excluded. Canonical index still carries that task as ready
for review and an old DOC-001 SHA; proposed recovery metadata differs. Neither
index is execution authority. No shared index rewrite performed.

Existing DOC-001 d4a96970d58d3ec2913a265119d344a5beced7fb remains blocked on
named independent review, Actions evidence access and exact-run authorization.
Runtime test coverage remains unrun. Codex selects a smallest correction after
review; activation needs separate approved artifact/drain/health/rollback packet.

## Reviewer return and delivery

Independent feedback must cite the report commit in a later review. GitHub push
is publication, not proof Muse/Codex received or accepted it. Component exception
records follow separately using historical evidence with explicit age/unknowns.

## Follow-up: isolate the failing stage (2026-10-22 04:19 UTC)

Scope remains read-only; no new scan/upload or Actions access probe.

| Check | Result | Meaning / limit |
|---|---|---|
| server.js calls registerScanRoutes and registerDocumentCheckerRoutes | PASS static | Registration calls are present, not merely imports. Both receive sendAgentMail. Runtime execution success not tested. |
| URL UI submission | PASS static | Form POST /api/scan exists; JavaScript creates EventSource /api/scan-stream. No live scan performed. |
| Direct scanner /health | PASS HTTP 200, curl exit 0 | Source reviewed: app.get('/health', ... status ok). This is process liveness only, not worker readiness. Public /health proxies a different service and must not be treated as scanner health. |
| /resources.html | PASS HTTP 200, curl exit 0 | Static page availability; document upload UI still UNKNOWN. Top-level HTML document-link search found only resources.html#documents. |
| Browser/Docker/parser/builder paths | PASS existence and executable-access checks | /opt/google/chrome/chrome, /usr/bin/docker, legacy document_checker.py and qa11y-build-client-doc exist and are executable by observer. No version execution/import/build or compatibility proof. |
| Current API failure evidence | UNKNOWN | Last 128 KiB of default nginx access log has 10 GET /free-scan.html HTTP 200 records, timestamps Oct 21 20:12:31–22:15:15 MDT. No selected scan/stream/document-check requests in that bounded suffix. May be incomplete or wrong per-vhost log; not proof requests never occurred. |
| Worker/parser/report/mail failure stage | UNKNOWN / NOT RUN | No existing selected request evidence identifies a failed stage. No basis for reinstall or restart. |

Document route source explicitly invokes host python3 with the legacy analyzer,
60-second timeout and 4 MiB subprocess buffer, then optionally invokes the report
builder. It instantiates HermesDelegator. This verifies the older execution path,
not DOC-001 isolated-worker activation. Route binding and executable presence do
not establish safe or successful parsing. No runtime/parser limits were changed.

Commands: standard-library bounded source/link matching and os.access checks;
log suffix reads at most 131072 bytes per default nginx log, emitting only
allowlisted method/path/status aggregate counts and timestamp range, never query
strings/client identities. GETs via curl --connect-timeout 3 --max-time 5 --output
/dev/null --write-out '%{http_code}' (outer timeout 7 seconds). No scan endpoints
were called. Default error log yielded no selected access-format records; this
is not a substantive error-log clearance or proof of no upstream errors.

Next minimum evidence: verify actual per-vhost request/error log destinations and
inspect bounded stage-specific categories for the reported incident window;
locate document UI beyond top-level static pages. If those still cannot identify
the fault, report that limitation and request a separately scoped synthetic
end-to-end test rather than guessing. Muse/Codex should not infer browser failure
from the reported outage. No production repair is justified by this follow-up.

## One bounded follow-up pass — 2026-10-22 04:26:18 UTC

Collection stopped after this pass. No submissions, installs, restarts, repairs,
workflow dispatches or repeated Actions probes.

### Configured nginx log destinations

Inspected /etc/nginx/nginx.conf and enabled site
/etc/nginx/sites-enabled/qa11ylabs (resolves to
/etc/nginx/sites-available/qa11ylabs). Site root is /var/www/qa11ylabs.
No site-specific access/error override was found; the site inherits
/var/log/nginx/access.log and /var/log/nginx/error.log from nginx.conf.
The referenced /etc/letsencrypt/options-ssl-nginx.conf contains no logging
directives. /etc/nginx/conf.d/*.conf had no matching files. These are configured
on-disk paths, not proof of the configuration currently loaded by nginx; no
nginx reload, dump or configuration execution was performed.

### Properly parsed log suffixes

| Exact location | Bytes read / total size | Parsing and selected result |
|---|---|---|
| /var/log/nginx/access.log | 131072 / 571735 | Dropped first partial line; 833 complete lines, 825 parsed as access records. Zero matching /api/scan, /api/scan-stream or /api/document-check requests. Eight unmatched lines not treated as success. |
| /var/log/nginx/error.log | 0 / 0 | Empty regular log at observation. Error parser expects nginx timestamp/severity, then selected request path and upstream-error category; no records or matching timestamps. |

Query strings, client addresses, customer values and raw lines were not retained
in the report. Selected matching request/error timestamps: none available.
No rotated/compressed logs read. No inferences about earlier incidents or other
logging destinations. Empty selected evidence does not establish service health.

### Document UI and local JavaScript trace

Recursively inspected 48 HTML/HTM/JS/MJS files beneath the configured webroot.
Bound: at most 400 files and 1 MiB per file; no directory symlinks followed;
node_modules, .git, hidden directories, uploads, reports, logs and backups excluded.
Zero candidate files exceeded the limit or were skipped by the file-size/symlink
checks in this search. Inline scripts were searched as part of their HTML.
The only document-check/upload-pattern match was the backend
`document_checker_routes.js`, not an upload UI.

Referenced local script resolution found:
- igotyou-demo-driver/index.html -> igotyou-demo-driver/driver.js (exists, inspected).
- igotyou-demo/index.html -> igotyou-demo/assets/index-CtgCyzUA.js (exists, inspected).

No document-upload frontend was located in this inspected scope. Endpoint,
method and upload field are confirmed ONLY from backend source:
POST /api/document-check, multipart file field `document` via
upload.single('document'). No front-end-to-backend contract is verified.
External scripts, dynamic generated interfaces, other webroots and excluded
private directories were not inspected. This is not proof the UI exists nowhere.

Exact webroot-relative inspected files (source/assets only, no customer files):
- `HermesDelegator.js`
- `a11y-tree-diff.js`
- `about.html`
- `accessibility.html`
- `api/leads_api.js`
- `blog-accessible-modal.html`
- `blog-ada-title-ii-2026.html`
- `blog-agentic-workflow.html`
- `blog-ai-accessibility-lived-experience.html`
- `blog-aria-mistakes.html`
- `blog-automated-tools-30-percent.html`
- `blog-focus-styles-wcag22.html`
- `blog-form-field-accessibility.html`
- `blog-nvda-2024-update.html`
- `blog-sc-258-target-size.html`
- `blog-voiceover-ios-workflow.html`
- `blog-wcag-22-new-criteria.html`
- `blog.html`
- `case-studies.html`
- `contact.html`
- `document_checker_routes.js`
- `document_checker_routes.smoke.js`
- `evidence/jeremiahs-20260502/executive-risk-teaser.html`
- `evidence/ruby-river-20260502/executive-risk-teaser.html`
- `evidence/rumbi-20260502/executive-risk-teaser.html`
- `free-scan.html`
- `ghost-reader.js`
- `igotyou-demo-driver/driver.js`
- `igotyou-demo-driver/index.html`
- `igotyou-demo/assets/index-CtgCyzUA.js`
- `igotyou-demo/index.html`
- `igotyou-demo/service-worker.js`
- `index.html`
- `journey-engine.js`
- `monitoring.html`
- `phase15g3_test_downstream.js`
- `privacy.html`
- `remediation-engine.js`
- `resources.html`
- `risk-teaser-email-pack.js`
- `risk-teaser.js`
- `scan_server_patch.js`
- `schedule.html`
- `security.html`
- `server.js`
- `services.html`
- `terms.html`
- `test-remediation.js`

### Failure-stage disposition and separately approved test proposal

URL failure: UNKNOWN. Document failure: UNKNOWN; document UI discovery is an
observed unresolved prerequisite, not proof of parser failure. No browser install
or restart is evidence-supported. Root cause cannot be derived from these suffixes.

Propose ONE separately approved synthetic customer-path diagnostic session, not
authorized or run here: an isolated staging clone of the exact source/image/config
pairing, outbound mail/model/lead adapters stubbed, one owned public URL fixture
and one small generated PDF, one request per product, no retries. Identify the
real document UI first or explicitly approve backend-only coverage. Capture
stage-tagged admission, worker/parser, report, stubbed delivery/persistence and
owned cleanup outcomes under reviewed deadlines/resource caps. Preserve sandbox,
TLS and egress controls. This can localize a candidate failure but cannot prove
live production health; any production test needs a separate precise approval.
Prerequisites: reproducible pairing, operator, isolated environment, reviewed
fixtures/stubs and exact test limits. No automatic test follows from this proposal.
