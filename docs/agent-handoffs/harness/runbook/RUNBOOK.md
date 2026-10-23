# Staging diagnostic runbook (operator copy)

Companion to the staging diagnostic packet, Revision 5 (amends the
harness source filed at 1ce5e4c8 in response to Codex's
client-readiness review of that source, on branch
agent/codex/customer-path-recovery at c298d8be). Status: PREPARED,
NOT RUN. Execution requires: independent review of this revision
(Antigravity, per the review's next gate), an approved synthetic
fixture run in isolated staging, a named pairing-path approval
record, and Quintin's explicit approval naming the packet and the
target. Operator: Arch (designated). Placeholders: $STAGE_ROOT
(disposable staging root), $STAGE_TMP (dedicated temp dir on the
staging host), $STAGE_HOST_ID (recorded at approval). All commands
run on the staging host only.

## Package contents (identities recorded in PACKAGE.md)

- pairing/pairing.manifest.json - the observed runtime pairing
  (Arch cd7b561, 2026-10-22 16:15-16:18 UTC), machine-checkable.
  Rev 5 corrects the worker.cjs digest (Rev 4 truncated it at 52
  hex chars; full SHA-256 now recorded).
- pairing/preflight-verify.mjs - read-only revalidation of every
  manifest entry (change-based freshness). Rev 5: schema-validates
  every digest, distinguishes ENOENT from other read errors by
  name, and resolves the pairing gate only from an operator
  supplied approval record (--pairing-approval).
- harness/run-scan-once.mjs - drives the real contract once:
  runScan('https://example.com', { signal, timeoutMs: 90000 }).
  Rev 5: validates the resolved value against the bounded
  { lh, axe } contract (malformed = FAIL), credential-pattern env
  gate, realpath containment, approval-record pairing gate,
  job.json written only after the gate passes.
- harness/confinement-check.mjs - Rev 5, new: runs INSIDE the
  scope before the harness; verifies effective policy (read-only
  /usr and /etc mounts, cgroup memory.max, private net namespace,
  writability) and prints a JSON verdict the supervisor requires.
- harness/run-confined.sh - Rev 5, new: in-scope launcher; sets
  the enforced 1 MiB output cap (ulimit -f), puts the docker shim
  first on PATH, runs the confinement check, then the harness.
- harness/bin/docker - Rev 5, new: docker CLI shim capturing
  created container IDs at creation time (ownership evidence for
  cleanup). If the runner uses the Docker API directly, nothing
  is captured and cleanup reports UNKNOWN - stated, not hidden.
- harness/audit-preload.cjs - module-load EVIDENCE LOGGING ONLY.
  Not a security boundary (it cannot see ESM imports, child
  processes, or network); a tripwire plus the load log.
- harness/aggregate.sh - Rev 5, new: authoritative status
  aggregation used by the supervisor (any FAIL fails the run;
  any UNKNOWN/BLOCKED/missing safety evidence blocks PASS).
- harness/supervise.sh - supervisor v3: systemd scope ONLY (the
  unshare fallback is removed - it could not provide the claimed
  policy), baseline inspections that BLOCK on error instead of
  swallowing it, identity-verified unit stop at the deadline
  (job.json pid + starttime + ancestry + cgroup unit binding),
  ownership-aware cleanup (shim-captured ids only; diff-seen ids
  are evidence, never removed), containment-checked temp
  cleanup, interruption enters the same cleanup path.
- tests/run-regression.sh - synthetic regression suite (stubs and
  test doubles only): verifier, harness contract/gates,
  aggregation, confinement refusal, supervisor failure classes.

## Phase 0 - preflight (5 min, no mutations)

1. Record $STAGE_HOST_ID, operator, wall-clock start.
2. node pairing/preflight-verify.mjs --manifest pairing/pairing.manifest.json --release-root $RELEASE_ROOT --chrome-path $CHROME_PATH --image-id <digest from docker image inspect> --pairing-approval <approval record>
   Exit 0 required to proceed. Exit 2 (FAIL): stop. Exit 3
   (BLOCKED): the pairing gate is unresolved - stop unless an
   approval record naming a pairing path is supplied (step 3).
3. Pairing path, as named in the approval record:
   - a (manifests): assemble the release copy from reviewed
     manifests/locks into $STAGE_ROOT/release; re-run step 2
     against it; proceed only on exit 0.
   - b (captured-runtime): copy the installed release tree
     read-only into $STAGE_ROOT/release (hashes re-verified by
     step 2 against the copy); the run return must restate the
     declared limitations (Git correspondence UNKNOWN; not a
     reproducible build).
4. Export: STAGE_ROOT, STAGE_TMP, STAGE_RELEASE_DIR=$STAGE_ROOT/release,
   STAGE_HARNESS_DIR=<package harness dir>, STAGE_PAIRING_PATH=
   manifests|captured-runtime, STAGE_PAIRING_APPROVAL_FILE=
   <approval record path>. The harness re-checks the environment
   itself (credential patterns, containment, approval match) and
   BLOCKS if violated.

## Phase 1 - assembly check (10 min, mutations inside $STAGE_ROOT only)

5. Env allowlist file for the run: PORT loopback-only, state
   and lead dirs under $STAGE_ROOT. The runner subject needs no
   application env beyond the harness variables above.
6. Egress negative probe: from the staging host context, one
   connection attempt to a non-allowlisted address must fail;
   record the result. The worker's own network is none plus the
   Unix-socket proxy relay (module design); the harness scope
   itself runs with PrivateNetwork=yes.

## Phase 2 - the run (outer bounds enforced by supervise.sh)

7. bash harness/supervise.sh (v3: systemd scope with sandbox
   properties only; confinement verified from inside before any
   runner import; identity-verified unit stop at
   $STAGE_HARD_DEADLINE_S, default 240s; owned-container
   HostConfig verification and cleanup; temp cleanup with
   containment checks; cleanup.json always written, including
   on interruption). The harness aborts its caller at 180s and
   fixes timeoutMs at 90000.
   Cancellation coverage: caller AbortController at 180s
   (harness), worker timeoutMs 90000 (contract), supervisor unit
   stop at the hard deadline, INT/TERM trap enters cleanup; the
   harness package has no other cancel surface - the runner
   contract exposes no cancel RPC.
8. No retries. Any non-zero exit or BLOCKED result ends the
   session; cleanup evidence is captured regardless.

## Phase 3 - evidence (5 min, read-only)

9. Collect from $STAGE_ROOT: result.json (stage table and the
   verbatim { lh, axe } result - a null lh.score is recorded
   as null; metaDesc as returned), audit.log (every module load
   ALLOW/DENY - evidence logging, not a boundary), cleanup.json
   (every component named; UNKNOWN blocks any readiness
   statement), docker-calls.log and owned-containers.txt
   (creation-time capture).
10. Stage table for the return: preflight, pairing, assembly,
    load audit, egress probe, admission, proxy readiness,
    container create/start, attached worker, result validation,
    cleanup - PASS / FAIL / BLOCKED / NOT RUN each, log suffixes
    capped at 1 MiB per stage.

## Stop conditions (any phase)

Hash mismatch; manifest schema failure; pairing gate unresolved;
confinement check FAIL or missing; an audit DENY; egress probe
succeeds when it should fail; any cleanup component UNKNOWN or
FAIL. On any stop: no further product requests, Phase 3 evidence
still collected, no in-session repair, no production contact.
