# Staging diagnostic runbook (operator copy)

Companion to the staging diagnostic packet, Revision 3
(5f84d066911cb46940724925610d7b65f6d4b987). Status: PREPARED,
NOT RUN. Execution requires Codex review of packet Rev 3, a
named pairing-path approval, and Quintin's explicit approval
naming the packet. Operator: Arch (designated). Placeholders:
$STAGE_ROOT (disposable staging root), $STAGE_TMP (dedicated
temp dir on the staging host), $STAGE_HOST_ID (recorded at
approval). All commands run on the staging host only.

## Package contents (identities recorded in PACKAGE.md)

- pairing/pairing.manifest.json - the observed runtime pairing
  (Arch cd7b561, 2026-10-22 16:15-16:18 UTC), machine-checkable.
- pairing/preflight-verify.mjs - read-only revalidation of every
  manifest entry (change-based freshness).
- harness/run-scan-once.mjs - drives the real contract once:
  runScan('https://example.com', { signal, timeoutMs: 90000 }).
- harness/audit-preload.cjs - module-load audit/isolation.
- harness/supervise.sh - outer bounds + verified cleanup.

## Phase 0 - preflight (5 min, no mutations)

1. Record $STAGE_HOST_ID, operator, wall-clock start.
2. node pairing/preflight-verify.mjs --manifest pairing/pairing.manifest.json --release-root $RELEASE_ROOT --chrome-path $CHROME_PATH --image-id <digest from docker image inspect>
   Exit 0 required to proceed. Exit 2 (FAIL): stop, stages
   BLOCKED. Exit 3 (BLOCKED): the pairing gate is unresolved -
   stop unless the approval names a pairing path (step 3).
3. Pairing path, as named in the approval:
   - manifests: assemble the release copy from the reviewed
     manifests/locks into $STAGE_ROOT/release; re-run step 2
     against it; proceed only on exit 0.
   - captured-runtime: copy the installed release tree
     read-only into $STAGE_ROOT/release (hashes re-verified by
     step 2 against the copy); the run return must restate the
     declared limitations (Git correspondence UNKNOWN; not a
     reproducible build).
4. Export: STAGE_ROOT, STAGE_TMP, STAGE_RELEASE_DIR=$STAGE_ROOT/release,
   STAGE_HARNESS_DIR=<package harness dir>, STAGE_PAIRING_PATH=
   manifests|captured-runtime. Confirm no AGENTMAIL_* variables
   and no /root paths exist in the environment (the harness
   re-checks this itself and BLOCKS if violated).

## Phase 1 - assembly check (10 min, mutations inside $STAGE_ROOT only)

5. Env allowlist file for the run: PORT loopback-only, state
   and lead dirs under $STAGE_ROOT. The runner subject needs no
   application env beyond the harness variables above.
6. Egress negative probe: from the staging host context, one
   connection attempt to a non-allowlisted address must fail;
   record the result. The worker's own network is none plus the
   Unix-socket proxy relay (module design); the staging host
   additionally permits only loopback plus the proxy target
   flow for the harness process tree.

## Phase 2 - the run (outer bounds enforced by supervise.sh)

7. bash harness/supervise.sh  (v2: systemd scope with sandbox properties preferred, unshare fallback, BLOCKED if neither; identity-verified stops; HostConfig cap verification)
   It starts the harness under the audit preload in its own
   session, hard-stops it at 240s, bounds the process-group
   exit wait at 10s (then kills by group), diffs container ids
   before/after (leftovers removed by exact id within 10s and
   re-verified), diffs $STAGE_TMP before/after, and writes
   cleanup.json. The harness aborts its caller at 180s and
   fixes timeoutMs at 90000.
8. No retries. Any non-zero exit or BLOCKED result ends the
   session; cleanup evidence is captured regardless.

## Phase 3 - evidence (5 min, read-only)

9. Collect from $STAGE_ROOT: result.json (stage table and the
   verbatim { lh, axe } result - a null lh.score is recorded
   as null; metaDesc as returned), audit.log (every module
   load ALLOW/DENY), cleanup.json (proxy wait, container and
   temp cleanup each PASS/FAIL/UNKNOWN - UNKNOWN blocks any
   readiness statement).
10. Stage table for the return: preflight, pairing, assembly,
    load audit, egress probe, admission, proxy readiness,
    container create/start, attached worker, result validation,
    cleanup - PASS / FAIL / BLOCKED / NOT RUN each, log suffixes
    capped at 1 MiB per stage.

## Stop conditions (any phase)

Hash mismatch; pairing gate unresolved; an audit DENY; egress
probe succeeds when it should fail; cleanup UNKNOWN. On any
stop: no further product requests, Phase 3 evidence still
collected, no in-session repair, no production contact.
