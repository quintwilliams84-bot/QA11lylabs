# Staging diagnostic runbook (operator copy)

Companion to the staging diagnostic packet, Revision 7 (amends the
harness source filed at 4296a5e7 in response to Codex's Rev 6
review). Status:
PREPARED, NOT RUN. Execution requires: independent review of this
revision (Antigravity, per the review's next gate), a designated
non-production staging host named by Arch with a private evidence
channel, an approved synthetic-fixture packet, and Quintin's
explicit approval naming the packet and the target. Operator:
Arch (designated). Placeholders: $STAGE_ROOT (supervisor-created
staging root), $STAGE_TMP (shared temp parent; the supervisor
creates a job-private directory inside it), $STAGE_HOST_ID and
$STAGE_RUN_ID (recorded at approval). All commands run on the
staging host only.

## Execution topology (read first)

- The workload runs as a transient systemd SERVICE created by the
  supervisor (systemd-run --unit, no --scope: scopes cannot carry
  service execution sandbox properties). Properties requested:
  PrivateNetwork=yes, ProtectSystem=strict, ReadWritePaths =
  <job root> <job temp> /var/run/docker.sock, MemoryMax=2G,
  CPUQuota=200%, TasksMax=512.
- Network/broker topology: the harness needs no TCP listener and
  no external route. Its only external channel is the Docker UNIX
  socket (filesystem, unaffected by the private network
  namespace); the worker it starts reaches the target only
  through its own reviewed egress proxy relay on a UNIX socket.
  A successful negative egress probe alone is NOT the design;
  this topology is.
- Confinement is verified from inside the unit before any runner
  import (harness/confinement-check.mjs): read-only mounts, the
  three cgroup limits, private namespace, and writability
  canaries for exactly the allowlisted roots.

## Package contents (identities recorded in PACKAGE.md)

- pairing/pairing.manifest.json - the observed runtime pairing
  (Arch cd7b561, 2026-10-22), machine-checkable.
- pairing/preflight-verify.mjs - read-only revalidation of every
  manifest entry (change-based freshness); schema-validates every
  digest; absence proven only by ENOENT; the pairing gate
  resolves only from an operator-supplied approval record BOUND
  to the manifest SHA-256, host and run (see Phase 0).
- harness/run-scan-once.mjs - drives the real contract once:
  runScan(target, { signal, timeoutMs: 90000 }). Validates the
  result against the ACTUAL contract: lh.score is a nullable
  INTEGER 0..100 (fractional values violate it); score
  availability is recorded separately (REPORTED /
  UNAVAILABLE_STAGE_OUTCOME_UNKNOWN) and attempted/not-attempted
  is never inferred from a null.
- harness/confinement-check.mjs - effective-policy verification
  inside the unit (above).
- harness/run-confined.sh - in-unit launcher: docker shim first
  on PATH, producer output spooled UNCAPPED into the job dir
  (the 1 MiB bound applies to the supervisor's evidence copy,
  never to the producer tree), confinement check, then the
  harness. Its exit status is the harness's.
- harness/bin/docker - docker CLI shim: logs calls and captures
  container identity via the daemon client's CIDFILE protocol
  (--cidfile injected per create/run). Output scraping is not
  used: attached-run stdout is workload output, not identity.
  If the runner uses the Docker API directly, nothing is
  captured and cleanup reports UNKNOWN - stated, not hidden.
- harness/audit-preload.cjs - module-load EVIDENCE LOGGING ONLY.
  Not a security boundary (no ESM/child-process/network
  coverage).
- harness/aggregate.sh - authoritative aggregation: any FAIL
  fails; any safety component short of PASS blocks PASS;
  baseline failure blocks everything.
- harness/supervise.sh - supervisor v5: pipefail on, every
  inspection timeout-bounded (5s) and status-captured, total
  inspection time bounded (per-iteration caps); exclusive
  staging root (stale/shared roots refused) reconciled with
  assembly (below); transient-service launch with an explicit
  job-private STAGE_AUDIT_LOG; hard deadline stops the OWNED
  unit unconditionally (identity uncertainty triggers
  fail-closed cleanup, it never disables cancellation); FAIL
  sticky in every component; unit termination verified as a
  required cleanup component; job-private temp removal only.
- tests/run-regression.sh - synthetic suite (stubs/doubles
  only) plus a real-launcher integration section. Rev 7: 41
  gated cases.

## Ownership and cleanup protocol

- The supervisor creates the ownership record fresh for the job.
  A container is removed ONLY when its ID is in that record, is
  absent from the pre-launch baseline inventory, and inspects
  with a creation time at or after run start. Anything else is
  reported (UNKNOWN), never removed. Unowned newcomers are
  evidence, never targets.
- Temp cleanup removes only the supervisor-created job-private
  directory inside $STAGE_TMP. Unrelated entries in the shared
  parent are preserved by design.

## Assembly (how the release copy reaches the job root)

The supervisor never assembles inside a live root, and never
adopts a pre-populated root. Instead:
1. The operator assembles the release copy in a SEPARATE
   assembly dir and runs Phase 0 preflight verification against
   THAT copy.
2. The operator records assembly.json in the assembly dir:
   { tree_sha256, manifest_sha256, assembled_by, assembled_at },
   where tree_sha256 is the SHA-256 of the sorted
   (file digest, path) lines of the release tree.
3. The supervisor verifies the assembly tree against
   assembly.json, copies it into the fresh job root, and
   re-verifies the copy's digest before anything launches
   (ASSEMBLY component). Any mismatch stops the run.

## Target

STAGE_TARGET_URL is supplied by the supervisor from the approved
packet. There is NO hardcoded default target in the harness
(Rev 7 removed the example.com default): an unset or malformed
target BLOCKS the run, and no client target is ever substituted
in code.

## Phase 0 - preflight (no mutations)

1. Record $STAGE_HOST_ID, $STAGE_RUN_ID, operator, wall-clock
   start.
2. Obtain the pairing approval record through the approver's own
   channel and INDEPENDENTLY verify the scoped authorization it
   represents. The record file is operator-supplied EVIDENCE,
   not an authenticated approval: it must carry path (a|b),
   approved_by, approved_at, manifest_sha256 (of the exact
   manifest file), host_id and run_id, and both the verifier and
   the harness reject any record whose bindings do not match.
3. node pairing/preflight-verify.mjs --manifest pairing/pairing.manifest.json --release-root $RELEASE_ROOT --chrome-path $CHROME_PATH --image-id <digest> --pairing-approval <record> --host-id $STAGE_HOST_ID --run-id $STAGE_RUN_ID
   Exit 0 required. Exit 2 (FAIL): stop. Exit 3 (BLOCKED):
   pairing gate unresolved - stop.
4. Pairing path per the record: (a) assemble the release copy
   from reviewed manifests/locks into the job root; (b) copy the
   installed release tree read-only into the job root (hashes
   re-verified against the copy); the return restates path (b)'s
   declared limitations (Git correspondence UNKNOWN; not a
   reproducible build).

## Phase 1 - the run

5. Export STAGE_ROOT (a path that does not yet exist or is
   empty - the supervisor refuses anything else), STAGE_TMP,
   STAGE_HARNESS_DIR, STAGE_ASSEMBLY_DIR (the verified assembly
   from the section above), STAGE_PAIRING_PATH,
   STAGE_PAIRING_APPROVAL_FILE, STAGE_PAIRING_MANIFEST,
   STAGE_HOST_ID, STAGE_RUN_ID, STAGE_TARGET_URL. The supervisor
   itself sets the unit's STAGE_RELEASE_DIR (the in-root copy),
   STAGE_TMP (the job-private dir) and STAGE_AUDIT_LOG (inside
   the job dir).
6. bash harness/supervise.sh. Cancellation coverage: caller
   AbortController at 180s (harness), contract timeoutMs 90000,
   supervisor unit stop at $STAGE_HARD_DEADLINE_S (default
   240s) regardless of identity state, INT/TERM enters the same
   cleanup path. No retries. Any non-zero exit or BLOCKED ends
   the session; cleanup evidence is captured regardless.

## Phase 2 - evidence (read-only)

7. Collect from $STAGE_ROOT: cleanup.json (every component
   named, now including assembly and unit_cleanup; UNKNOWN
   blocks any readiness statement), run.log
   (evidence copy, first 1 MiB of the producer spool, truncation
   marked), and from the job dir: result.json (verbatim contract
   result + score availability), producer.log (uncapped spool),
   audit.log, confinement.json, docker-calls.log,
   owned-containers.txt.
8. Stage table for the return: preflight, pairing, confinement,
   load audit, admission, proxy readiness, container
   create/start, attached worker, result validation, cleanup -
   PASS / FAIL / BLOCKED / NOT RUN each.

## Stop conditions (any phase)

Hash mismatch; manifest schema failure; approval record unbound
or unverified; confinement check FAIL or missing; an audit DENY;
any cleanup component UNKNOWN or FAIL; the target reachable
through any path other than the worker's proxy relay. On any
stop: no further product requests, evidence still collected,
no in-session repair, no production contact.
