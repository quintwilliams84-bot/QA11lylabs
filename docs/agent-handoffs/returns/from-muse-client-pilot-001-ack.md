# Return - Muse acknowledges CLIENT-PILOT-001 and the harness readiness review

From: Muse. To: Codex (target_agent codex). Date: 2026-10-22.
Metadata only, never permission. No client name, URL, contact, findings or
report content in this file, per the work order.

## Exact sources read

- docs/work-orders/CLIENT-PILOT-001.md on branch
  agent/codex/customer-path-recovery at commit
  c298d8be6c6a52f07631abacab8d9a5b8490eb44 (work order status: HELD).
- docs/agent-handoffs/reviews/Muse1ce5e4c8-client-readiness.md at the same
  commit c298d8be (Codex review of Muse harness source
  1ce5e4c8cb026fa8979360907db999572f9b0c02; verdict: CHANGES REQUESTED, not
  ready for isolated execution or a real-client scan).
- CURRENT_ASSIGNMENTS.md supplement (same commit): Muse provides the exact
  target privately, then repairs the EXISTING harness per the blocking
  review. Arch prepares only. Hermes prepares an empty outline only.

## Role acknowledged

Muse owns exactly two things in CLIENT-PILOT-001:

1. Gate 1 input: supply the exact target and a bounded initial page list
   through an approved private reference. The target stays out of this
   public repo. Quintin has already confirmed public pages only, nothing
   behind login; no further public-page permission will be requested.
2. Harness repair: amend the EXISTING customer-path-integration-scope
   harness (source 1ce5e4c8) per the blocking review. No new scanner
   architecture, no overwrite of other agents branches, no client request, no
   VPS install or production change from this lane.

Muse does NOT run the client scan. Execution stays HELD until work-order
gates 1 to 3 resolve and are reviewed: scope and private handling agreed,
harness revision independently reviewed with real synthetic validation,
and scoped authorization covering the named packet, operator and path.
Preparation proceeds now; execution does not.

## Blocking findings accepted (review of 1ce5e4c8)

High:
- supervise.sh status aggregation: OVERALL can stay PASS while HOSTCONFIG
  is FAIL or UNKNOWN, SCOPE_CLEAN is UNKNOWN, or cleanup fails; error
  swallowing (|| true) turns missing evidence into empty sets, then PASS.
  Fix: authoritative combined status; a failed safety check fails the run;
  a missing inspection stays UNKNOWN and blocks readiness.
- Cleanup ownership not proven: global before/after diff removes resources
  the job may not own and misses non-running lifecycle states. Fix: job
  bound resource IDs captured at creation, owner binding inspected across
  lifecycle states, finally/trap cleanup entry, containment and ownership
  checks for directories, never remove unrelated resources.
- Confinement not demonstrated: checks assert command availability, not
  effective policy; the unshare fallback is weaker than the systemd scope
  claims; the runner starts before scope verification and failed setup
  does not stop the flow; HPID starttime is not bound to job.pid. Fix:
  a supported reviewed confinement mechanism verified before runner
  import, no silent weaker fallback, launcher and child identity bound,
  whole owned group plus daemon resources handled on timeout and
  interruption.
- Pairing gate incoherent: pairing.manifest.json worker.cjs digest has 52
  hex characters, not SHA-256 (correct digest per Arch cd7b561:
  9cba6bcd5ee33840622fa37fcc0eac0ca2538c5900589ed9fa44f68dea653459);
  the preflight verifier always BLOCKED with no successful resolved path,
  while run-scan-once accepts an environment string as the gate. Fix:
  schema and length validation on every identity, absence checks that
  distinguish ENOENT from permission errors, one coherent separately
  authorized operator gate, no bypass of failed identity checks. A full
  runnable-tree identity remains missing and stays named as missing.

Medium (all accepted): environment filtering beyond AGENTMAIL_* only;
startsWith containment does not reject sibling or symlink escapes and
runtime identity files are written before the gate; audit-preload header
must not claim a security boundary; supervisor log sink has no enforced
cap; no negative network probes implemented; run-scan-once accepts any
resolved value as PASS instead of validating the bounded (lh, axe)
contract, so a malformed test-double result must fail; RUNBOOK identity
still names the prior revision and cancellation coverage must be
corrected with the packet and approval identities.

## Repair plan (preparation, starting now)

Amend the existing harness as the next revision and add safe synthetic
regression checks for each failure above: daemon down, permission denied,
HostConfig mismatch, failed cleanup, launcher/child identity, missing
identity, timeout, interruption, malformed double output. Return the exact
source SHA and real synthetic results with failures, skips and unrun paths
explicit. Then Antigravity reviews that exact revision independently
(per the review's next gate), before any synthetic fixture run in isolated
staging. No client is the first sandbox or cleanup validation target.

## Scope reconciliation note for Codex

Muse's Quintin-directed proposal P06 (full-site audit plan) landed on
this branch at commit 6d91ffb395f485beb85e596c529c80a220c1a7f0. Where P06
framing differs from CLIENT-PILOT-001 (one complete crawl versus the
work order's homepage-first bounded list, then expansion), the work order
governs execution. Under Gate 1, Muse will supply the bounded initial
page list sized from the target's actual page inventory through the
private reference, so full coverage of a small site remains reachable
inside the pilot's method without an unbounded crawl.

## Verified versus not

Verified by reading: work order, review, assignments supplement and
README section at c298d8be; the review's own verification record (six
PACKAGE.md digests recomputed and matched, manifest digest length
failure, syntax checks passed) is Codex's, quoted here as his record.
Not verified by Muse: any runtime behaviour of the harness (none run),
the target's page inventory (not yet supplied), staging host identity
(still pending in the packet work). No scan, staging run, deployment or
external send was performed for this acknowledgment.
