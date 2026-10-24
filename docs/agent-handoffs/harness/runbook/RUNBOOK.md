# Staging diagnostic runbook (operator copy)

Companion to the staging diagnostic packet, Revision 8 (amends the
harness source filed at faa347bf in response to Codex's Rev 6
review and Arch's enforcement-gaps handoff at ac468232). Status:
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
  only) plus a real-launcher integration section. Rev 8: 45
  synthetic checks including producer-spool and lifecycle cases.
  Rev 10: 67 synthetic checks - the Rev 9
  review's five findings carry regressions (ownership fail
  closed E25, harvest-before-coverage E26, packaging gate
  E24/E24b plus the shipped-manifest check H4, absolute
  cleanup deadline E27, strict verifier H3, numeric config
  validation E28-E30). Rev 9: 58 synthetic checks - the independent Rev 7 alignment
  review's six findings each carry regressions (launch
  ownership, unit-cleanup evidence, NanoCpus and inspection
  coverage, manager terminal status, digest v2 binding modes
  and link targets, preflight host/run binding) plus the
  upload safeguards (self-healing exec modes, TREE-MANIFEST
  and tools/verify-tree.mjs).
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

## Checkout step: restore executable bits

The package's scripts are executable in the author's tree, but
the filing path used to publish this package stores every file
as mode 100644 (verified 2026-10-23: local files 0770, branch
tree 100644). Git modes can only be corrected by an
authenticated git client (git update-index --chmod=+x and a
push); until that commit lands, ANY fresh checkout must run:

  chmod +x harness/supervise.sh harness/aggregate.sh \
    harness/run-confined.sh harness/bin/docker \
    tests/run-regression.sh tests/stubs/bin/* \
    tests/fixtures/harness/bin/* \
    tests/fixtures/harness/run-confined.sh

(paths relative to this package's root). Rev 10 note: the
supervisor ALSO gates on packaging before creating any job
state - the harness directory must be an absolute, normalized
path with no symlink components, and bin/docker,
run-confined.sh, aggregate.sh and supervise.sh must be regular
files at exactly mode 0755. Anything else exits 3 (BLOCKED).
The supervisor never repairs modes at run time; modes are
finalized in the tree (Git mode-fix commit) or the run does
not start.

## Configuration parameters (validated before job creation)

| Name | Unit | Default | Accepted range | Enforcement point |
| --- | --- | --- | --- | --- |
| STAGE_HARD_DEADLINE_S | seconds | 240 | 1..86400 | supervise.sh pre-job validation; watchdog deadline; RuntimeMaxSec is deadline + 60 |
| STAGE_CLEANUP_DEADLINE_S | seconds | 30 | 1..3600 | supervise.sh pre-job validation; one absolute cleanup deadline, checked before every phase and target |
| STAGE_SPOOL_MAX_BYTES | bytes | 67108864 | 1024..1099511627776 | supervise.sh pre-job validation; watchdog spool watchdog stops the unit |

Non-numeric, zero, negative or out-of-range values BLOCK
(exit 3) before any job state exists. The cleanup deadline
bounds the cleanup phase only and is independent of the hard
deadline (cleanup runs after the deadline fires by design).
The ranges are input sanity bounds, NOT operational budgets;
the limits register below governs what may be claimed as
enforced, and every figure there remains PROPOSED until
demonstrated on the staging host.

## Limits register (PROPOSED, NOT ENFORCED until demonstrated)

Per Arch's handoff at ac468232: the following limits are
PROPOSED. None is claimed as enforced by this package; each
becomes enforceable only when demonstrated on the exact
pairing on the staging host, and the return for that run must
say so explicitly.

- Navigation/request ceilings (incl. Lighthouse loads,
  redirects, subresources, failed attempts): NOT enforced by
  this harness. The harness admits exactly ONE runScan call;
  counting inside the browser belongs to the worker/proxy
  layer. TCP/byte limits do not prove request counting.
- Combined CPU/RAM/PID ceiling across harness + daemon-owned
  Docker workers: NOT enforced. The unit's MemoryMax/CPUQuota/
  TasksMax bound the harness processes only; worker values
  (768 MiB, swap 1000000000, 160 PIDs) are the runner's
  source-declared HostConfig, observed by spot check, not
  imposed by this package.
- Job ceiling 240s / cleanup ceiling 30s: PROPOSED figures.
  The supervisor enforces the job deadline on its owned unit
  and bounds cleanup inspections; whole-owned-lifecycle
  enforcement (hangs, uncertain identity, interrupted launch,
  failed daemon inspection) is demonstrated synthetically in
  the regression suite (E7, E13, E14, E15) and remains
  UNDEMONSTRATED against real systemd/Docker.
- Producer spool/storage bound (supervisor, 64 MiB default)
  and evidence collector bound (1 MiB copy): implemented and
  synthetically tested (E8, E16); the producer's own writes
  are never capped in place.
- Permitted egress on the exact pairing: UNDEMONSTRATED.
  Requires the staging host and the worker's proxy relay;
  a negative probe alone is not proof.
- No automatic retry and no next admission after an uncertain
  cleanup: enforced structurally (single-run supervisor,
  exclusive-root quarantine, aggregation blocks readiness on
  any non-PASS cleanup).

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
