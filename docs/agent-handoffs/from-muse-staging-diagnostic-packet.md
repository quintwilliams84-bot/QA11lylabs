# Staging diagnostic packet - customer-path failure localization

Author: Muse. Date: 2026-10-22 (America/Denver). Revision 2,
responding to Codex review 4d26b343e76ee8e0d64c4c4aeae16c995b59f272.
Task: customer-path-integration-scope (existing). Implements the
diagnostic session Arch proposed at
207df57d9e39d29a0d5f9a6f331093c0de7a0939, narrowed per review.
Status: PREPARED, NOT RUN. Nothing in this packet is authorization
to execute it. Execution requires Codex review of this packet
revision and Quintin's explicit approval naming it. No dispatch,
merge, deploy, install or production change is part of this packet.

## Purpose, subject and exclusions (separated per review)

SUBJECT: the deployed URL-scan pairing only, cloned from hashed
files into isolated staging: server.js
e70df6a142feb4edcf39cde2dd12dceacf07756e0ae8f2d2628ae581f95599e1
calling the scan routes backed by scan_server_patch.js
f4c601ca7d9977966405688686346771219cf690bbd4ecf7475482c32f01a738
and runner.cjs
d2b3167f8be4081822183ccd7022a9bf7b83cf3ba454a73edd6f0c747597b0dd
(release target 20261017-r2 resolved, not the current pointer).

EXCLUDED from this packet entirely: the document path. The deployed
legacy document route (document_checker_routes.js, host python3
parser) does NOT run under this packet, on the VPS or in staging.
It is a diagnostic subject of a different kind and is not run here;
DOC-001 keeps its own existing test gate and this packet produces
NO document coverage claim and NO acceptance evidence for any
document candidate. The packet does not silently switch subjects:
it reproduces deployed URL behavior only.

Purpose: localize the failing stage of the URL-scan customer path
with stage-tagged evidence for exactly one synthetic request. This
packet cannot prove live production health or production browser
provenance; staging-host metadata establishes staging facts only.

## Chosen API surface (one only)

POST /api/scan with the synthetic target https://example.com.
Exactly one submission. The EventSource stream surface
(GET /api/scan-stream) is EXCLUDED and named uncovered; the job is
observed through the POST response, the staging access log and the
runner job state instead. Submission count is verified three ways:
client log (1 request sent), staging access log (exactly 1 POST),
runner job count (exactly 1 job created). Any mismatch is a FAIL
of the counting stage, not a reason to send another request.

## Operator runbook (parameterized; this text is what is reviewed)

Private host values stay private. Placeholders: $STAGE_HOST_ID
(recorded at approval), $OPERATOR (Arch, designated), $STAGE_ROOT
(disposable staging directory created for this run), $JOB (single
job id generated at setup), $TARGET = https://example.com.
The operator's filled instantiation is identified in the run
return by its own SHA-256; the hash binds the instantiation, this
reviewed text binds the method.

Phase 0 - preflight (deadline 5 min, no mutations):
  1. Record $STAGE_HOST_ID, operator identity, wall-clock start.
  2. Verify staged source hashes equal the four identities above;
     any mismatch: STOP, stage result BLOCKED, no assembly.
Phase 1 - assembly (deadline 10 min; allowed mutations: create
$STAGE_ROOT and its children only):
  3. Create $STAGE_ROOT/{app,state,logs,outbox}; copy the hashed
     files into app/; re-hash in place and record.
  4. Construct the staging env from an allowlist file written for
     this run (PORT loopback-only, state dir = $STAGE_ROOT/state,
     lead dir = $STAGE_ROOT/state/leads). Startup REJECTS if any
     AGENTMAIL_* variable, any production credential, or any path
     under /root is referenced; rejection is a preflight FAIL and
     the app is never started.
  5. Wire stubs at the established injection points: both route
     registrars receive sendAgentMail as a dependency (Arch
     evidence). Pass the recording stub implemented in the staging
     harness file (identity: harness file SHA-256 recorded in the
     return); the stub appends each attempted send to
     $STAGE_ROOT/outbox/log.jsonl and performs no network I/O.
     Hermes/model paths: the assembly registers ONLY the scan
     routes; the document registrar is never loaded, so
     HermesDelegator is never instantiated. Startup proof (step 7)
     enumerates the route table to prove it.
  6. Egress enforcement at OS level: the app process runs in a
     network namespace (or host firewall equivalent) whose only
     permitted egress is loopback plus the resolved addresses of
     $TARGET on 443; all other egress DROP. Negative probe before
     the product request: one connection attempt to a
     non-allowlisted address must fail; probe result recorded.
Phase 2 - start and startup proof (deadline 5 min):
  7. Start the app bound to 127.0.0.1 on the staging port; record
     the PID and the exact start command in $STAGE_ROOT/run.json.
     Enumerate the registered route table from the running process
     harness: required exactly {POST /api/scan}; any additional
     product route (in particular any document route) is a FAIL
     and the run stops before any product request. Assert the
     loaded send dependency is the stub by its marker export.
Phase 3 - the one request (independent bounds):
  8. curl --max-time 180 -X POST $BASE/api/scan with the synthetic
     form body for $TARGET. Client deadline 180s; the runner
     worker watchdog (120s, existing) is the worker bound; the
     nginx proxy ceilings of production are NOT timeouts here and
     are not relied on. No retries under any outcome.
Phase 4 - evidence capture (deadline 5 min; read-only):
  9. Per stage record PASS / FAIL / BLOCKED / NOT RUN with bounded
     log suffixes (cap 1 MiB per stage): preflight, assembly,
     egress probe, startup proof, submit accepted, runner claim,
     worker start, browser stage (as reported by the runner
     envelope), result assembly, send-intent/stub capture, lead
     persistence (file presence inside $STAGE_ROOT/state only).
 10. Job-specific pre/post inspection only: process by recorded
     PID, container by the exact id the runner created for $JOB
     (captured in stage evidence), files under $STAGE_ROOT. No
     listing of unrelated containers, processes or directories.
Phase 5 - cleanup (independent deadline 10 min, ALWAYS entered,
including after a failed stage):
 11. Stop the app by recorded PID; ask the runner path to remove
     the $JOB container by its exact id; remove $STAGE_ROOT job
     state. Verify by identity: PID gone, container id absent,
     staging port closed, $STAGE_ROOT/state empty of job data.
     Absent or failed verification is recorded as UNKNOWN and
     blocks any readiness claim; absence is never inferred from a
     failed inspection and never reported as PASS.
Session budget: 60 minutes wall clock total; per-phase deadlines
above are hard stops, not targets. A failed stage stops further
product requests (there is only one) but never skips Phase 5.
No in-session repair, no restart of any production service.

## Provenance and prerequisites

Production provenance does NOT come from this packet. The complete
allowlisted pairing for the assembly is the four hashed files
above plus the worker image and host-browser metadata recorded
from the relevant actual installation by Arch's separate metadata
return (P03); until that return lands, the worker/browser stages
of this packet are expected to be BLOCKED, and the packet's value
is the route/runner-boundary evidence. Missing prerequisites
(image digest and manifests, runner registration metadata,
staging host identity and operator designation recorded at
approval) keep the affected stages BLOCKED, never waived.

## Approval boundary (unchanged)

Execution requires Codex review of this exact revision and
Quintin's explicit approval naming it. Production is out of
scope entirely.
