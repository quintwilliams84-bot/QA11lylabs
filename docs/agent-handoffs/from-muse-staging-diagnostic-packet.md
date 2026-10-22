# Staging diagnostic packet - customer-path failure localization

Author: Muse. Date: 2026-10-22 (America/Denver). Revision 4,
responding to Codex review Muse5f84d066-execution-gaps and the
CURRENT_ASSIGNMENTS revision 9af0c09d32c163db0470ccc078656417a5
399cb9 read and acknowledged by Muse. Earlier revisions
responded to Codex reviews 4d26b343e76ee8e0d64c4c4aeae16c995b59f
272 and abf48671437b73052a07b17701675576ee590bb3 and incorporate
Arch's P03 metadata return cd7b56146469e5851d76a29bacc37bd5634392
aa (observed 2026-10-22 16:15-16:18 UTC).
PURPOSE, narrowed per review: this packet tests EXECUTION-MODULE
COMPATIBILITY of the installed runner in staging. It is not
end-to-end outage localization and not production acceptance;
its result cannot close the page, API, report, mail or document
stages of the customer path.
Task: customer-path-integration-scope (existing).
Status: PREPARED, NOT RUN. Nothing here authorizes execution.
Execution requires Codex review of this revision and Quintin's
explicit approval naming it, plus satisfaction of the BLOCKED
gates below. No production change, launch, dispatch or merge is
part of this packet. The document path stays excluded entirely
(Revision 2 separation stands; DOC-001 keeps its own gate and
this packet produces no document coverage).

## Subject, restated around the actual contract

There is no installed submit/status/cancel service. The real
runner contract (Arch return, static source inspection) is a
direct module call:

  runScan(raw, { signal, timeoutMs = 90000 } = {}) -> Promise
  exports: runScan, normaliseUrl, dockerArgs, validateResult

Input: string URL, max 4096 chars, no whitespace/control chars,
credentials or fragment; http/https on default ports only; a
missing scheme is normalised to https. Worker stdin receives
JSON {url}, max 8192 bytes. The caller timeout override is NOT
range-validated by the module; bounded caller behaviour is the
harness's job (below). Admission is process-local state; the
container identity is internal and random, not caller-supplied.

Result: a validated object { lh, axe } and nothing else:
lh = { score, contrast, viewport } where score may be NULL (axe
can still return; null is reported truthfully as null - it is
not Lighthouse success proof and not by itself a run failure);
axe = { violations, passes, pageTitle, metaDesc } with counts
bounded (violations <= 250, passes <= 500, nodes per violation
<= 10000, counts <= 100000) and metaDesc currently returned
EMPTY - that emptiness is observed current behaviour, recorded
as-is, not corrected and not hidden. No report, delivery or mail
stage exists in this contract and none may be inferred from a
successful { lh, axe } validation.

Phase timing inside the module (source-declared, not tested):
proxy readiness 5s; container create 10s; container removal
10s; the 90s default timer covers the ATTACHED WORKER PHASE
only - it is not a whole-request deadline. On cancel, result or
error the module enters finally: remove the owned container when
created or uncertain, latch unhealthy on cleanup failure, kill
the local CLI/proxy, delete the owned temporary directory. That
is source intent, NOT cleanup proof; proxy-exit wait and
directory removal carry NO independent deadline in the source,
and no durable status or restart reconciliation can be inferred.

## Complete runtime pairing (observed, with revalidation rule)

Installed release resolved once for inspection as
/opt/qa11y-scanner/releases/20261017-r2 (name and current
symlink are mutable identities; the hashes bind this
observation only). Worker image: sha256:9bd26ad900bb5e0f4dee75839
e957a89ae89c2b7ab1e76050e559790e946b948 =
mcr.microsoft.com/playwright at the same digest, linux/amd64.
Build attestation, full image package inventory and container
Node version: UNKNOWN.
Host browser: /opt/google/chrome/chrome, 293195072 bytes,
SHA-256 0ba9d6c54dbc1a46dfaa5f95d5975bc9b963030c8647880f5b6a53
7f8af7d2e8; owning package google-chrome-stable 153.0.8010.52-1
amd64 (dpkg-query); configured origin dl.google.com (stable
channel) - configured-origin evidence only; the historical
download/signature chain is unproven. Browser not executed;
compatibility NOT RUN.
Release files (SHA-256): runner.cjs d2b3167f8be4081822183ccd702
2a9bf7b83cf3ba454a73edd6f0c747597b0dd; worker.cjs 9cba6bcd5ee33
84f68dea6538c5900589ed9fa44f68dea653459; watchdog.cjs be66dd6c6
e5cfdc2c21efcaac9ca6e09e2202ff93943c07c5b2a216c42ccbecb;
egress_proxy.py 8eb1e1df823e2a72ed27f1ceee16de7e6ad1d0a47d372a0
e0ea87c7a25e8a8b5; seccomp_profile.json b9b7007a80b8935859cd1c
b7f766ff3ac485dc5bee6237568ab04025ce7dd33a; deps/.package-lock
.json 4bbef0f0524728c4347891987d19b6dfe6eb2ebb3629820e41709f7f8
a04beb8; lighthouse-bundle/package-lock.json bff36575a26b5b148
513cb98fcda08147bd0e6d3ca491ac2d5f35a4e2cc11cda; Playwright
1.60.0; axe-core 4.11.4; @axe-core/playwright 4.11.3; Lighthouse
13.4.1. Mounted deps are /node_modules; the Lighthouse bundle
mounts at /lhbundle.
Declared worker controls (source-declared, effective operation
NOT RUN): UID/GID 61990; network none plus Unix-socket proxy
relay; read-only root; capabilities dropped; no-new-privileges;
seccomp file above; 768 MiB memory/swap, 1 CPU, 160 PIDs,
64 MiB shm, 128 MiB /tmp tmpfs; host Chrome mounted read-only;
chromiumSandbox true; strict HTTPS in the Playwright context.
Revalidation: change-based, per Arch's rule as accepted by
Codex - these observations expire for execution purposes if any
release pointer, file, package, image or mount pairing changes.
Before any approved run, the full hash/ID set is rechecked
against this packet; no time-only TTL establishes freshness.

## BLOCKED: runnable-source / assembly gap

deps/package.json and deps/package-lock.json are ABSENT. The
hidden deps/.package-lock.json is an install-tree lock and must
not be presented as an npm ci input. A complete reproducible
pairing therefore does not exist today. Exactly two resolutions
are admissible, and neither is satisfied:
  (a) complete reviewed manifests/locks for the release tree; or
  (b) a separately approved captured-runtime diagnostic pairing:
      the installed release tree used read-only, with the content
      inventory above and declared provenance limitations -
      exact Git correspondence UNKNOWN, private-capture
      comparison UNKNOWN (Arch's lookup found no matching files
      and no new capture is authorized), explicitly NOT a
      reproducible build.
Until Quintin approves one path by name, every execution stage
of this packet is BLOCKED. Dependencies are never guessed, and
no sanitized material is run as source.
Also BLOCKED, unchanged: the HTTP/route layer (server.js
correspondence UNKNOWN - P0; that layer is where sendAgentMail
and the report builder live, and it is outside this packet's
runnable subject), image build provenance, and any production
browser-compatibility claim (real launch remains NOT RUN until
staging evidence exists).

## Staging design around runScan (applies once unblocked)

Harness: a minimal staging program, reviewed as part of the run
instantiation, that imports runScan from the assembled release
copy and calls it exactly once with https://example.com. The
harness is the caller the module contract assumes:
- It validates the timeout override itself (the module does
  not): timeoutMs is fixed at 90000 for this run; any other
  value is rejected by the harness before the call.
- Bounded caller cancellation: an AbortController fires at an
  outer request deadline of 180s; a supervisor hard-stops the
  harness at 240s. These outer bounds are independent of the
  module's internal 5s/10s/90s phase timings.
- Cleanup outer bounds, imposed and timed by the supervisor
  because the source leaves two waits unbounded: proxy-exit
  wait <= 10s then kill by recorded PID; temporary-directory
  removal <= 10s then record failure; container removal uses
  the module's 10s and is then VERIFIED (exact container id
  absent) within a further 10s. Cleanup is a tested stage with
  its own PASS/FAIL; source finally is not accepted as proof,
  and missing cleanup evidence is UNKNOWN and blocks readiness.
Enforced stubs and boundary: the runScan call graph contains
no mail, Hermes or report code - those live in the excluded
HTTP layer. Enforcement is by module-load audit: the harness
records every loaded module path; any path outside the
assembled release copy and Node builtins fails the run before
the call. Egress: the worker's network-none plus proxy relay
is the module design; the staging host adds an OS-level rule
permitting the harness tree only loopback plus the proxy's
single target flow, with a pre-run negative probe to a
non-allowlisted address that must fail.
Resource limits: the declared worker caps above are preserved
unchanged. The STAGING host budget is defined separately by
this packet: harness + worker + proxy together <= 2 GiB memory
and 2 CPUs on the staging host, <= 1 GiB disk under $STAGE_ROOT,
per-stage log cap 1 MiB, session wall clock 60 minutes with
per-phase deadlines in the runbook. No upgrades or reinstalls
of the observed browser, image or dependencies.

## Operator runbook (parameterized; this text is what is reviewed)

Placeholders: $STAGE_HOST_ID and $OPERATOR (Arch) recorded at
approval; $STAGE_ROOT disposable; $TARGET https://example.com.
The operator's filled instantiation is identified in the run
return by its own SHA-256.
Phase 0 preflight (5 min, no mutations): verify the pairing
path approval exists by name; recheck every hash/ID in the
pairing table against the installed state (change-based
revalidation); any mismatch or unapproved pairing path: STOP,
all stages BLOCKED.
Phase 1 assembly (10 min; mutations only inside $STAGE_ROOT):
assemble the release copy by the approved path; re-hash in
place; write the env allowlist (loopback bind, state under
$STAGE_ROOT only); reject startup if any AGENTMAIL_* variable,
production credential or /root path is referenced.
Phase 2 startup proof (5 min): module-load audit armed; loaded
module list contains only the release copy plus Node builtins;
egress negative probe fails as required; supervisor bounds
(180s abort, 240s hard stop, cleanup timers) armed and logged.
Phase 3 the one call (outer bound 180s): runScan($TARGET) once;
no retries; record resolution or rejection verbatim, including
a null lh.score as null and metaDesc as returned.
Phase 4 evidence (5 min, read-only): stage table - preflight,
pairing, assembly, load audit, egress probe, admission, proxy
readiness, container create/start, attached worker, result
validation, cancellation behaviour (only if exercised) - each
PASS / FAIL / BLOCKED / NOT RUN with bounded suffixes; result
object recorded field-for-field ({ lh, axe } only).
Phase 5 cleanup (independent 10 min, always entered): per the
bounded cleanup above, verified by identity (container id,
proxy PID, temp directory, staging port); unverified cleanup
is UNKNOWN and blocks any readiness statement.

## Approval boundary (unchanged)

Preparation: done. Execution: Codex review of this exact
revision, a named pairing-path approval resolving the BLOCKED
gate, and Quintin's explicit approval naming the packet.
Production is out of scope entirely; the customer-path failure
itself remains UNKNOWN until evidence says otherwise.


## Revision 4 (2026-10-22): harness source, confinement, cleanup identity, pairing choice

R4.1 Reviewed harness source is now committed with this packet
under docs/agent-handoffs/harness/ (identities in its PACKAGE.md):
pairing/pairing.manifest.json (machine-readable, unwrapped
digests), pairing/preflight-verify.mjs, harness/run-scan-once.mjs,
harness/audit-preload.cjs, harness/supervise.sh, runbook/RUNBOOK.md
(the actual command runbook; the phase prose in earlier revisions
is superseded by it). Local checks by Muse (test double only,
never the real runner): env gate BLOCKS with the pairing
unresolved (exit 3, no scan attempted); with a named pairing
path the harness drives the contract and records a null lh.score
as NOT RUN with the verbatim result; the audit preload denies an
out-of-boundary module load (exit 65); the preflight verifier
detects hash mismatches and never self-resolves the pairing
gate. Supervisor end-to-end on a real systemd staging host is
NOT verified - the only available local host has a stub
systemd-run, where the supervisor correctly recorded scope
cleanup UNKNOWN rather than PASS. That verification is staging
evidence, still to come.

R4.2 Confinement is OS-level and established BEFORE import; the
module-load audit is evidence logging only, explicitly not a
security boundary (it cannot prevent import-time side effects
or permitted-builtin misuse, and the packet no longer implies
otherwise). supervise.sh launches the harness in a systemd
scope with PrivateNetwork=yes, ProtectSystem=strict,
ReadWritePaths limited to $STAGE_ROOT and the Docker socket,
MemoryMax 2G, CPUQuota 200%, TasksMax 512, and verifies the
scope exists before trusting it; fallback is an unshare
mount+network namespace; if neither mechanism is available the
run is BLOCKED - the harness never runs unconfined. The proxy
flow is pinned by the module design (worker network none, Unix
socket relay): the only permitted application flow is the
proxy's outbound to the single synthetic target over HTTPS with
strict TLS; DNS for the target is resolved host-side by the
proxy and the resolved addresses are recorded in the evidence.
Negative probes, both required PASS before the scan call: a
direct connection from inside the scope to a non-allowlisted
address must fail, and a proxy request for a non-allowlisted
host must be refused.

R4.3 Cleanup identity. A bare recorded PID is never trusted.
Each run has a random job id; the harness writes job.json with
(pid, /proc starttime); every stop/kill decision re-verifies
that pair. Lifetime is tracked by the systemd unit/cgroup (or
the namespace in fallback). Docker-daemon containers are
handled independently of the harness tree: before/after
container-id diff on the dedicated staging host, leftovers
removed by exact id within 10s and re-verified absent; while
the job container lives, its HostConfig limits are verified
against the declared worker caps (805306368 bytes, 1000000000
NanoCpus, 160 PidsLimit). Resource scope: the 2 GiB / 2 CPU /
1 GiB figures bind the harness tree via the scope properties
and a $STAGE_ROOT sized as the only writable tree; daemon-owned
workers sit outside that cgroup and are bounded by their own
verified HostConfig caps; the read-only image and host browser
sit outside the writable disk quota. Harness logs are capped
at 1 MiB at the sink; overflow is a FAIL stage, never a limit
imposed on producers. Cleanup failure or missing evidence is
UNKNOWN/FAIL and stops further tests.

R4.4 Pairing: the machine-readable manifest supersedes the
line-wrapped digest text of Revision 3 as the verification
input. CHOSEN PAIRING: path (b), the captured-runtime pairing -
the installed release tree used read-only, inventoried by the
manifest, with declared limitations (exact Git correspondence
UNKNOWN; private-capture comparison UNKNOWN; not a
reproducible build). The choice is recorded here; its USE
remains BLOCKED until Quintin approves path (b) by name, and
the harness itself refuses to run without that named approval
recorded in its environment gate. Missing inputs for path (b),
still BLOCKED: a complete runnable-tree inventory beyond the
files Arch hashed (the copy step generates a full-tree hash
inventory and the return reports gaps, never hides them), and
the host Chrome library closure (ldd output), an Arch delta to
request when the pairing approval is given. Path (a) remains
admissible if complete reviewed manifests/locks ever exist.

R4.5 Host and operator: operator is Arch (designated in the
packet since Rev 2). The non-production staging HOST is
explicitly BLOCKED - none is designated yet, and no production
VPS may serve as the test host.

R4.6 Freshness, read consistently with P03: change-based
revalidation governs. Any changed relevant identity invalidates
correspondence immediately; P03 Revision 4's 24-hour figure is
a maximum age for observations, never proof that installed
state is unchanged. The preflight verifier re-runs at
execution time.
