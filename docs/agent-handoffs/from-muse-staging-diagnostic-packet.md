# Staging diagnostic packet — customer-path failure localization

Author: Muse. Date: 2026-10-22 (America/Denver). Task:
customer-path-integration-scope (existing). Requested by Quintin;
implements the diagnostic session Arch proposed at
207df57d9e39d29a0d5f9a6f331093c0de7a0939. Status: PREPARED, NOT RUN.
Nothing in this packet is authorization to execute it. Execution
requires Codex review of this packet and Quintin's explicit approval
of the packet as the bounded scope. No dispatch, merge or deploy is
part of this packet.

## Purpose and limits

Localize the failing stage of the URL-scan and document-check
customer paths in an isolated staging clone of the exact deployed
pairing. This packet cannot prove live production health; it
produces stage-tagged evidence for one synthetic request per
product. One request each, NO retries.

## Exact source identities (deployed, observed 2026-10-22 04:14 UTC)

| Component | Identity |
| --- | --- |
| server.js | SHA-256 e70df6a142feb4edcf39cde2dd12dceacf07756e0ae8f2d2628ae581f95599e1 |
| scan_server_patch.js | SHA-256 f4c601ca7d9977966405688686346771219cf690bbd4ecf7475482c32f01a738 |
| free-scan.html | SHA-256 4926283589a27206df4fe0c04a4128092fc18fbe92e77e6069b9125caabbc910 |
| document_checker_routes.js | SHA-256 74d347624f2dda27c1297353d650b2dcf4934ee50ef41545ddd7a1179f684ab3 |
| runner.cjs | SHA-256 d2b3167f8be4081822183ccd7022a9bf7b83cf3ba454a73edd6f0c747597b0dd, release 20261017-r2 (resolved target, not the current pointer name) |
| Document candidate (distinct) | OpenclawOps isolated checker under doc-001, workflow at d4a96970d58d3ec2913a265119d344a5beced7fb. NOT part of this packet's runtime; the packet tests the DEPLOYED document route only |

Git correspondence for the deployed files: UNKNOWN (Slice 1
prerequisite P0). The staging clone is assembled from the deployed
files captured through the private channel and verified against the
hashes above; sanitized handoff files are never substituted for
runnable source.

## Dependency, browser and image identities

- Browser: host Chrome at /opt/google/chrome/chrome, mounted
  read-only into the worker, launched with chromiumSandbox true.
  Version and package origin: UNKNOWN — collect from package
  metadata in staging before the run (evidence step, not a fix).
- Worker image: registry digest and installed identity UNKNOWN —
  prerequisite; the staging run uses the identical image identity
  recorded by the operator before start, or the URL stage is
  reported BLOCKED rather than approximated with a substitute image.
- Website-tree Playwright metadata 1.60.0 is recorded as website
  evidence only, not worker dependency proof.
- Node/PM2/nginx versions: record from the staging host at setup;
  staging need not mirror production versions except for the
  components under test (server pairing, runner, worker, Chrome).

## Isolated environment and operator

- Environment: disposable staging host or isolated sandbox with no
  production data, no production credentials, no route to the
  production lead store or mail provider. Outbound network limited
  to the single fixture URL fetch through the worker's normal
  egress controls.
- Operator: one designated operator (Arch for infrastructure,
  executing only the commands in this packet). Muse receives the
  stage results as a return on this task. Codex reviews.
- Resource and deadline limits: concurrency 1; per-job deadline
  180 seconds (matches the scan-stream proxy ceiling); worker
  resource caps as configured in the existing isolated worker
  (record actual values at setup); total session budget 60
  minutes; log capture capped at 1 MiB per stage, sanitized
  before any publication.

## Test requests (exactly one each, no retries)

1. URL: one POST /api/scan for https://example.com through the
   staging clone's real route, runner and worker, with the mail
   adapter stubbed (below).
2. Document: one POST /api/document-check with one small generated
   synthetic PDF (created in staging, no customer content),
   multipart field name "document" per the backend contract.
   Coverage is BACKEND-ONLY: Arch's webroot search (48 files)
   located no document-upload UI, so no UI claim is made or
   tested. If a UI is located before execution, it is added to
   this packet by amendment and re-review, not improvised.

## Stubs and persistence

- Mail adapter (sendAgentMail / AgentMail): replaced by a
  recording stub. It captures the would-be payload hash and
  returns a scripted "accepted" outcome. No real send occurs.
- Model/Hermes adapters (HermesDelegator and any model calls):
  stubbed to a no-op that records invocation. No model is called.
- Persistence: all state (admission ledger, job records, lead
  writes, report artifacts) confined to disposable staging
  storage created for the session and destroyed at teardown.
  No production path is mounted writable; production paths are
  not mounted at all.

## Stage-specific results (required return format)

For each product, report PASS / FAIL / BLOCKED / NOT RUN with the
sanitized evidence reference: page/route registration, admission,
worker/parser execution, report build, stubbed delivery,
persistence, cleanup. A stage that did not run is NOT RUN, never
inferred from a neighboring stage.

## Verified job cleanup (a required stage, not an assumption)

After each request: worker container removed (operator lists
containers before and after), admission slot released or
explicitly reconciled, job temp directories removed, staging
storage inventory matches the pre-run inventory plus the retained
sanitized evidence only. Cleanup failure is reported as a FAILED
stage with the job's trusted resource identity; no bare-PID kills
or stored-path deletes are used at any point.

## Exact commands (for the approved operator; NOT RUN)

Setup and execution are enumerated in the operator runbook
accompanying the approval request: capture deployed files by hash
verification, assemble the clone, record image/browser/package
identities, install stubs, start the pairing on a staging port,
run the two curl requests (one each), capture stage logs, verify
cleanup, tear down. The runbook is executed verbatim; any deviation
stops the session and is reported. Commands are deliberately not
embedded in this coordination file because several reference
private staging paths; the runbook travels with the approval, and
its hash is recorded in the return.

## Missing prerequisites

1. Worker image digest/installed identity and dependency manifests
   (Arch metadata return).
2. Host Chrome version and package origin.
3. Runner registration metadata (inputs, results, cancellation).
4. Deployed-to-Git source correspondence (Slice 1 P0) — the clone
   can run from hashed deployed files without it, but Slice 1
   implementation cannot.
5. Staging host identity and operator designation.
6. Document UI location (only affects coverage labeling; the
   packet proceeds backend-only without it).

## Approval boundary

Preparation of this packet: done under Quintin's request.
Execution: requires Codex review of this exact packet revision
and Quintin's explicit approval naming it. Production is out of
scope entirely; any production test requires a separate precise
approval. A failed or ambiguous stage stops the session; no
retries, no repairs in-session, no restarts of production
services at any point.
