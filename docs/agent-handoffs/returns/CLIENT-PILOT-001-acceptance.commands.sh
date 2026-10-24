#!/usr/bin/env bash
# SANITIZED REVIEW COMPANION — NOT EXECUTABLE APPROVAL. No client/private paths.
# Task CLIENT-PILOT-001. Governing QA11lylabs revision:
# 057ba70d7bb09450ad9285271aec5669313f5bbe
# Private draft correspondence: SHA256
# e496287c4a4c45fc7b5af64196b8d777cb27cf2377e89b1628900b49d479e024
# Deliberate unconditional hold: do not remove without a reviewed replacement.
printf '%s\n' 'HELD: corrected executor, pairing, fixture hosting and approval missing.' >&2
exit 3

# The following is command-review material only; none has been executed.
set -euo pipefail
umask 077

# Source identities: blocked packaging 4223f8144adbc3fc86fbaf791e49b9f66a158bfb;
# blocked content faa347bf870963998cec974ed89e22004bd6baa0. NEVER use as executor.
# Corrected harness/review/isolated-test SHAs MISSING, not replaced by placeholders
# represented as successful evidence. All parameters below bind private operator
# configuration through an approved channel; never source arbitrary env files.
: "${ACCEPT_HARNESS_ROOT:?MISSING approved local harness checkout}"
: "${ACCEPT_HARNESS_SHA:?MISSING corrected independently reviewed full SHA}"
: "${ACCEPT_RELEASE_ROOT:?MISSING complete approved runtime tree}"
: "${ACCEPT_CHROME_FILE:?MISSING approved browser path}"
: "${ACCEPT_MANIFEST:?MISSING complete tree manifest including modes and links}"
: "${ACCEPT_MANIFEST_SHA256:?MISSING exact manifest hash}"
: "${ACCEPT_APPROVAL_RECORD:?MISSING independently authenticated scope evidence}"
: "${ACCEPT_HOST_ID:?MISSING approved host identity}"
: "${ACCEPT_RUN_ID:?MISSING unique approved run identity}"
: "${ACCEPT_EVIDENCE_ROOT:?MISSING approved private job root}"
: "${ACCEPT_TMP_PARENT:?MISSING approved private temp parent}"
: "${ACCEPT_NODE:?MISSING pinned Node executable}"
: "${ACCEPT_FIXTURE_ROOT:?MISSING approved local fixture content checkout}"
: "${ACCEPT_FIXTURE_URL:?MISSING approved operator-controlled HTTPS HTML origin}"

# Known OBSERVED runtime identities; not a complete runnable pairing:
ACCEPT_IMAGE='sha256:9bd26ad900bb5e0f4dee75839e957a89ae89c2b7ab1e76050e559790e946b948'
ACCEPT_RUNNER_SHA256='d2b3167f8be4081822183ccd7022a9bf7b83cf3ba454a73edd6f0c747597b0dd'
ACCEPT_WORKER_SHA256='9cba6bcd5ee33840622fa37fcc0eac0ca2538c5900589ed9fa44f68dea653459'
ACCEPT_CHROME_SHA256='0ba9d6c54dbc1a46dfaa5f95d5975bc9b963030c8647880f5b6a537f8af7d2e8'
# Fixture source QA11lylabs 9330659c636c3a6ebf61fea81c69ef921fbf2e40,
# present at governing revision. Choose CONTROL ONLY for this single job:
ACCEPT_FIXTURE_SHA256='5940e11a51dfc2aa39377f539618d290e82d7fb38ba2f96625c9a77f25c16b11'
# control.html 1062 bytes. Seeded 1134 bytes, SHA256
# 3b54cf4b521950ed055d1946de2f96a4274adc6102c404513a813f1a2523d75d,
# is EXCLUDED: two fixtures would mean two jobs. No hosting commands here.

# Read-only preconditions; stdout retained privately, sanitized before disclosure.
timeout 5s date -u +%FT%TZ
timeout 5s free -m
timeout 5s cat /proc/pressure/memory
timeout 5s df -Pk "$ACCEPT_EVIDENCE_ROOT" "$ACCEPT_TMP_PARENT"
timeout 5s git -C "$ACCEPT_HARNESS_ROOT" rev-parse HEAD
# Require HEAD == ACCEPT_HARNESS_SHA and no unreviewed local bytes/modes/links.
# Path printed by sha256sum is PRIVATE; never paste its raw output publicly.
printf '%s  %s\n' "$ACCEPT_MANIFEST_SHA256" "$ACCEPT_MANIFEST" | sha256sum --check --status
printf '%s  %s\n' "$ACCEPT_FIXTURE_SHA256" "$ACCEPT_FIXTURE_ROOT/control.html" | sha256sum --check --status
printf '%s  %s\n' "$ACCEPT_RUNNER_SHA256" "$ACCEPT_RELEASE_ROOT/runner.cjs" | sha256sum --check --status
printf '%s  %s\n' "$ACCEPT_WORKER_SHA256" "$ACCEPT_RELEASE_ROOT/worker.cjs" | sha256sum --check --status
printf '%s  %s\n' "$ACCEPT_CHROME_SHA256" "$ACCEPT_CHROME_FILE" | sha256sum --check --status
timeout 10s docker image inspect --format '{{.Id}}' "$ACCEPT_IMAGE"
timeout 5s docker ps -aq --no-trunc --filter name=qa11y-scan-
# IDs above are observations, NOT cleanup authorization or proof of exclusive idle.
# MISSING: reviewed cross-process admission/active-job observation and atomic claim.
# MISSING: effective full-pairing/mode/link validator. Hash checks above insufficient.
# MISSING: installed fixture serving receipt: HTTPS, Content-Type text/html,
# final approved origin, exact body hash. No HTTP probe or server setup in this draft.

# PROPOSED, NOT ENFORCED: 1 job/concurrency 1/no retry; 3 navigations,
# 200 requests incl subresources/failed attempts; 25 MiB response total,
# 8 MiB per response; no redirects/external asset origins for control fixture.
# 90s worker / 180s caller / 240s entire job / 30s independent cleanup ceilings.
# Worker: 768 MiB RAM+swap total, 1 CPU, 160 PIDs, 64 MiB shm, 128 MiB tmpfs.
# Aggregate incl Docker daemon-owned workers: 1 GiB RAM, 1 CPU, 192 PIDs.
# Writable 1 GiB; log sink 1 MiB each, 16 MiB total. No producer RLIMIT_FSIZE.
# Preconditions proposed: >=1536 MiB available RAM, >=2 GiB free relevant disk,
# PSI full avg10 <0.5%, no new relevant OOM or active/competing heavy jobs.
# Abort on new OOM, <=512 MiB available, full avg10 >=1% sustained 10s,
# any unapproved traffic, quota, hash, manager inspection, ownership or result error.
# MISSING: demonstrated whole-run counters, group accounting, monitor and timers.

# Candidate verifier invocation shape ONLY; corrected reviewed implementation needed:
timeout 15s "$ACCEPT_NODE" "$ACCEPT_HARNESS_ROOT/pairing/preflight-verify.mjs" \
  --manifest "$ACCEPT_MANIFEST" --release-root "$ACCEPT_RELEASE_ROOT" \
  --chrome-path "$ACCEPT_CHROME_FILE" --image-id "$ACCEPT_IMAGE" \
  --pairing-approval "$ACCEPT_APPROVAL_RECORD" \
  --host-id "$ACCEPT_HOST_ID" --run-id "$ACCEPT_RUN_ID"
# Require exact bound authorization through Q's channel; JSON presence is not approval.

# Launch/request is ONE supervisor invocation; no separate curl or extra Node scan.
# Preserve current contract runScan(URL,{signal,timeoutMs:90000})->Promise<{lh,axe}>.
# Reviewed replacement must honor these inputs or this companion must be revised.
# NODE_DIR and PATH must be privately reviewed/pinned, not ambient shell values.
: "${ACCEPT_NODE_DIR:?MISSING pinned runtime executable directory}"
: "${ACCEPT_PAIRING_PATH:?MISSING approved a or b pairing choice}"
env -i PATH="$ACCEPT_NODE_DIR:/usr/bin:/bin" LANG=C.UTF-8 \
  STAGE_ROOT="$ACCEPT_EVIDENCE_ROOT" STAGE_TMP="$ACCEPT_TMP_PARENT" \
  STAGE_HARNESS_DIR="$ACCEPT_HARNESS_ROOT/harness" \
  STAGE_RELEASE_DIR="$ACCEPT_RELEASE_ROOT" \
  STAGE_PAIRING_PATH="$ACCEPT_PAIRING_PATH" \
  STAGE_PAIRING_APPROVAL_FILE="$ACCEPT_APPROVAL_RECORD" \
  STAGE_PAIRING_MANIFEST="$ACCEPT_MANIFEST" \
  STAGE_HOST_ID="$ACCEPT_HOST_ID" STAGE_RUN_ID="$ACCEPT_RUN_ID" \
  STAGE_TARGET_URL="$ACCEPT_FIXTURE_URL" STAGE_HARD_DEADLINE_S=240 \
  bash "$ACCEPT_HARNESS_ROOT/harness/supervise.sh"
# No outer timeout wrapper falsely represented as Docker cleanup. Corrected
# supervisor must bound all owned work + finally cleanup on EVERY exit path.
# Above is not ready to run: exact corrected supervisor and complete bindings absent.

# Post-inspection parameters MUST come from trusted current-job creation receipts,
# not untrusted output, guessed PID, global diff, or name-prefix discovery.
: "${ACCEPT_OWNED_UNIT:?MISSING proven manager unit ownership}"
: "${ACCEPT_INVOCATION_ID:?MISSING exact owned invocation identity}"
: "${ACCEPT_OWNED_CONTAINER_ID:?MISSING trusted full creation identity}"
timeout 5s systemctl show "$ACCEPT_OWNED_UNIT" \
  -p InvocationID -p ActiveState -p SubState -p Result \
  -p ExecMainCode -p ExecMainStatus -p ControlGroup
timeout 5s docker inspect --format '{{.Id}} {{.State.Status}} {{.HostConfig.Memory}} {{.HostConfig.MemorySwap}} {{.HostConfig.NanoCpus}} {{.HostConfig.PidsLimit}}' "$ACCEPT_OWNED_CONTAINER_ID"
# Capture this while owned container exists; after removal verify absence through
# successful daemon inspection/listing. Nonzero inspect is NOT automatically absence.
# Output checks: actual bounded {lh,axe}, nullable integer score 0..100, expected
# fixture DOM/title; image-alt/button-name/label expected absent in control. Record
# additional findings, no exact LH score promise. Null stage result => unresolved,
# not automatically NOT RUN. Require service terminal success plus valid artifacts.

# OWNED CLEANUP COMMAND: integrated finally/trap path of the ONE supervisor launch
# above, not a second invocation. MISSING corrected exact implementation + receipt.
# Cannot safely supply systemctl stop/docker rm/rm -rf until proven ownership and
# collision-safe cleanup are implemented/reviewed. No invented --cleanup flag.
# Require owned invocation cgroup empty, each trusted created container absent,
# only exclusively owned temp removed, bounded evidence retained; 30s proposed.
# Any error/UNKNOWN: hold admission, no retries, preserve evidence, report to Q.
# No production resets/restarts/lease deletion, host fixture, main merge or sends.

# PARAMETER REGISTER — amendment to existing CLIENT-PILOT-001 packet
# Read Codex reconciliation + independent review at
# 7f0dc6af3a836fe03c8d536fc3cdc456522c23c5. Rev9 remains needs_revision.
# Each row: name | units | proposed value | enforcement point | evidence | approval
# Names STAGE_* below are observed candidate inputs; other names are packet labels,
# NOT invented supported executor environment variables. Final binding awaits review.
# STAGE_HARD_DEADLINE_S | seconds | 240 | manager-enforced workload lifetime plus supervisor absolute clock | MISSING corrected behavior | PENDING
# STAGE_CLEANUP_DEADLINE_S | seconds | 30 | single monotonic deadline across stop/inspect/removal/temp/escalation, calls capped to remaining time | Rev9 total-loop defect | PENDING
# worker_timeoutMs | milliseconds | 90000 | existing runScan timer, worker phase only | historical source cd7b561, NOT whole-job proof | PENDING
# caller_abort | seconds | 180 | reviewed caller AbortSignal | intended-host evidence MISSING | PENDING
# inspection_timeout | seconds | <=5 and <=remaining cleanup budget | each manager/daemon observation | corrected implementation MISSING | PENDING
# worker_memory | bytes | 805306368 | Docker Memory | historical source only | PENDING
# worker_memory_plus_swap | bytes | 805306368 | Docker MemorySwap, verify semantics and effective cgroup | historical source only | PENDING
# worker_cpu | NanoCpus | 1000000000 | Docker NanoCpus, never compare swap field as CPU | Rev9 review requires per-ID coverage | PENDING
# worker_pids | tasks | 160 | Docker PidsLimit | historical source only | PENDING
# worker_shm | bytes | 67108864 | worker shm mount | live enforcement NOT RUN | PENDING
# worker_tmpfs | bytes | 134217728 | worker tmpfs mount | live enforcement NOT RUN | PENDING
# aggregate_memory | bytes | 1073741824 | account harness/proxy AND daemon-owned workers | implementation + measured isolated peak MISSING | PENDING
# aggregate_cpu | CPUs | 1 | combined accounting across those cgroups | NOT ENFORCED | PENDING
# aggregate_pids | tasks | 192 | combined owned-process/container accounting | NOT ENFORCED | PENDING
# STAGE_SPOOL_MAX_BYTES | bytes | 16777216 | actual producer spool/storage bound, not post-hoc copy, no producer RLIMIT_FSIZE | corrected validation/enforcement MISSING | PENDING
# log_sink | bytes/file | 1048576 | streaming collector, overflow fails and triggers owned cleanup | intended-path tests MISSING | PENDING
# log_total | bytes | 16777216 | cumulative log/spool quota, not two independent allowances | NOT ENFORCED | PENDING
# temp_plus_writable_disk | bytes | 1073741824 | job-owned quota incl spool/results/temp, separate immutable cache accounting | NOT ENFORCED | PENDING
# admission_memory_available | MiB | >=1536 | fresh bounded MemAvailable read before trusted claim | no fresh measurement; do not lower to pass | PENDING
# admission_disk_free | MiB | >=2048 | relevant writable filesystem observation | old inventory not clearance | PENDING
# admission_pressure | percent | full avg10 <0.5 | fresh PSI read | current readiness UNKNOWN | PENDING
# pressure_stop | percent/seconds | full avg10 >=1 for 10s | bounded owned monitor | implementation MISSING | PENDING
# memory_stop | MiB | <=512 available or new OOM | bounded owned monitor/cgroup counters | implementation MISSING | PENDING
# job_count/concurrency/retries | count | 1 / 1 / 0 | trusted cross-process admission, immutable run ID | process-local active flag insufficient | PENDING
# navigations | count/job | <=3 | actual engine/browser navigation accounting | NOT ENFORCED | PENDING
# network_requests | count/job | <=200 incl redirects/subresources/failures | actual HTTP/engine accounting, not tunnel counts | NOT ENFORCED | PENDING
# response_total | bytes/job | 26214400 | streaming egress accounting | intended-path proof MISSING | PENDING
# response_single | bytes/response | 8388608 | streaming response accounting | intended-path proof MISSING | PENDING
# redirects/additional_origins | count | 0 / 0 for selected fixture | reviewed HTTPS/egress allowlist | origin MISSING | PENDING
# fixture_identity | SHA256 | 5940e11a51dfc2aa39377f539618d290e82d7fb38ba2f96625c9a77f25c16b11 | exact control.html bytes + hosted body/content-type/final origin receipt | content manifest read at 057ba70; hosting absent | PENDING
# executor_identity | full Git SHA + tree hash/modes | MISSING corrected reviewed candidate | pinned exact-file/type manifest with explicit exclusions | Rev9 failed shipped modes/extras checks | PENDING
# pairing_identity | SHA256 + host_id + run_id | MISSING complete approved manifest | nonempty exact bindings before job creation | selected runtime hashes only, no complete tree | PENDING
# owned_cleanup | invocation ID/container IDs/cgroup + monotonic time | nonempty matching current identity for every operation | guard stop/kill/reset, harvest cidfiles FIRST, per-ID HostConfig and absence evidence | Rev9 failures reproduced by separate reviewer | PENDING
#
# Numeric gate requirement BEFORE filesystem mutation/launch:
# positive decimal integer only; reject missing/malformed/zero/negative/fraction/
# overflow and values outside approved finite range. For this first packet use
# exact proposed constants (min=max) after review; do not silently clamp or default.
# Relationships: worker 90 < caller 180 < job 240; cleanup 30 separately bounded;
# per-sink <= aggregate log <= writable quota; worker caps <= aggregate caps.
# Validate while preserving a working safety lifetime even when identity evidence
# is unavailable: no unauthorized kill, but no unbounded launched workload either.
# An approval file cannot authenticate its own contents.
#
# SMALLEST ISOLATED SYNTHETIC SCOPE FOR Q — HELD DRAFT, NOT RUN
# One corrected/reviewed exact package, one complete reviewed pairing, one hosted
# control fixture at an explicitly approved operator-controlled HTTPS origin,
# one sequential runScan job, zero retries. No seeded-page second job; no client,
# API/report/mail/document route, notification, model or production credentials.
# Proposed ceilings above must be implemented and calibrated from isolated evidence
# before a real VPS acceptance packet. Isolated host capabilities and approved
# operator surface remain MISSING; production is NOT a substitute test environment.
# Pure cloud negative regressions must first cover all reproduced Rev9 defects;
# this single success-path job does not replace isolated interruption/timeout tests.
# Expected evidence: exact package/mode verification, bound identities, pre-import
# effective confinement, live engine versions, validated control result, terminal
# service success, resource/request counters, all-owned HostConfig coverage and
# completed owned cleanup. Actual checks this amendment: document reads, Bash syntax;
# runtime cases 0, actual isolated results NOT RUN. No full compliance claim.
# Stop further requests on any failed/unknown check, drift, unsupported limit,
# extra origin, deadline or uncertain cleanup. Quarantine remains, no automatic retry.
# Muse alone integrates executor fixes. Arch binds commands only after independent
# review. Hermes stays outline-only, with no invocation/receipt claim.
