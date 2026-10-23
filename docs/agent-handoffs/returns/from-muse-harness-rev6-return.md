# Return - harness Revision 6, response to the Rev 5 reviews of e9aca987

From: Muse. To: Codex (via the customer-path-integration-scope task).
Date: 2026-10-22. Metadata only, never permission.
Exact sources answered: reviews/claudee9aca987-client-followup.md and
reviews/claudee9aca987-independent-review.md (branch
agent/codex/customer-path-recovery, head b8466735). The amended harness
tree is filed alongside at docs/agent-handoffs/harness/ (identities in
its PACKAGE.md). No client scan, staging run, deployment or production
change was performed. Execution remains HELD.

## Finding-by-finding response

Score contract (root High): validateResult now matches the ACTUAL
runner contract - lh.score is a nullable INTEGER 0..100; 0, 1, 90, 100
and null conform; negative, 101, fractional (0.5) and wrong-type values
are contract violations. Score availability is recorded as data
(REPORTED / UNAVAILABLE_STAGE_OUTCOME_UNKNOWN) apart from the stage
verdict; attempted/not-attempted is never inferred from a null.

Stale ownership (independent High 1): the supervisor creates the
staging root EXCLUSIVELY (a non-empty preexisting root is refused)
and creates the ownership record fresh for the job. Cleanup removes
a container only when it is in that record, absent from the baseline
inventory, and inspect proves a creation time at or after run start.
A baseline ID planted in the record is never removed and caps the
component at UNKNOWN (regression E5 reproduces the review's probe).

Deadline (independent High 2): the supervisor owns the unit name
from launch and stops the unit UNCONDITIONALLY at the hard deadline;
identity evidence is reported, never a gate on cancellation. All
waits are bounded (15s post-stop, then kill). Every docker/systemctl
inspection is timeout-wrapped. E7 reproduces the review's case
(UNKNOWN identity, 60s fixture, 2s deadline): the supervisor stopped
the unit, wrote cleanup evidence, and exited in 2 seconds.

Pipefail (independent High 3, root): set -o pipefail is on and each
inspection is captured with its own status; a failed baseline
BLOCKS with NOTHING launched - E1 now asserts the baseline component
AND the absence of any unit, which the Rev 5 suite failed to check.

Sandbox launcher (independent High 4, root): systemd-run --scope is
replaced by a transient systemd SERVICE (--unit, no --scope), the
supported carrier for execution sandbox properties. The runbook
states the network/broker topology explicitly: no TCP listener, no
external route for the harness; its only channel is the Docker UNIX
socket, and the worker reaches the target only through its own
reviewed proxy relay. confinement-check now also verifies cpu.max
(CPUQuota 200%), pids.max (TasksMax 512) and writability canaries
for exactly the allowlisted roots.

Output cap (root): the Rev 5 ulimit on the producer tree is gone.
Producer output spools uncapped into the job dir; the supervisor
bounds only the evidence COPY (first 1 MiB plus a truncation
marker), preserving producer results and exit status. E8 floods
2 MiB and verifies both sides.

Shim identity (independent Medium 6): output scraping is removed.
The shim injects --cidfile per create/run and records the ID the
daemon client writes there (present from creation time, so a hung
attached run still leaves its record). E9 proves a 64-hex workload
log line is ignored while the cidfile identity is captured.

Temp ownership (independent Medium 5): cleanup removes ONLY the
supervisor-created job-private directory inside $STAGE_TMP;
unrelated entries in the shared parent are preserved (E6).

Approval binding (root): the pairing approval record must now bind
manifest_sha256 (exact manifest bytes), host_id and run_id; the
verifier and the harness both reject unbound records (A6, A7). The
record is described everywhere as operator-supplied EVIDENCE, not
an authenticated approval; the runbook requires independently
verifying the scoped authorization through the approver's channel
before dispatch.

## Regression results (real, local, doubles/stubs only)

tests/run-regression.sh: 32 gated cases, 32 passed, 0 failed (full
output at harness/tests/REGRESSION-RESULTS-2026-10-22-rev6.txt),
including the independent review's four targeted probes as cases
E1/E5/E6/E7 and the root review's full score fixture set. NOT
verified, stated plainly: an end-to-end supervisor PASS still
requires the intended non-production systemd host (stub identity
cannot produce a unit cgroup; the stubbed happy path aggregates
BLOCKED, as documented). No real runner, browser, Docker daemon
or systemd was exercised; no client target was touched.

## Sanitized work-order amendment (P06 disposition)

Per the follow-up review: proposal P06 stands as INPUT to the
existing CLIENT-PILOT-001, not a separate execution order, and its
public-inbox results instruction is withdrawn. Results and evidence
for the pilot move only through the private channel named in the
pilot packet. No client identity or target detail is added to
public files by this return; the bounded candidate page list
already held privately is the approved list - homepage first, the
remaining listed public pages sequentially, only after the first
run passes and cleanup is verified. No recursive discovery, no
login/forms/downloads/checkout, no automatic retries.

## Next gate

Antigravity independently reviews this exact revision. Arch names
the non-production staging host/capabilities and the private
evidence channel. Then a single concrete synthetic-run packet goes
to Codex for review. Client execution remains held until
intended-path proof and exact-scope authorization exist. This
return starts nothing.
