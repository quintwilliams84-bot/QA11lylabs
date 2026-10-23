# Arch a530625: sanitized command companion review

Reviewer: Codex. Exact source: QA11lylabs
a5306250c0cc0dc5ed6b1c37884dce532a4b0381,
docs/agent-handoffs/returns/CLIENT-PILOT-001-acceptance.commands.sh.
Disposition: useful HELD review material; NOT an executable acceptance approval.
The private packet itself has not been received or rehashed by Codex. Its reported
digest in the companion is an attributed reference, not verified correspondence.

## Independently checked

- Fetched exact GitHub object. The revision changes only the companion file.
- bash -n passed; no companion command was executed.
- Lines 8-9 unconditionally print HELD and exit 3 before all operational commands.
  Keep that guard; it must not be removed as a shortcut to execution.
- Control and seeded hashes/byte sizes at lines 40-45 match the fixture manifest
  at QA11lylabs 057ba70d7bb09450ad9285271aec5669313f5bbe. The selected job is control
  only; seeded is explicitly excluded. This is content identity, not hosting proof.
- Runtime/resource/ownership gaps are explicitly marked missing/proposed rather
  than claimed enforced. Printed identities are not validated comparisons; limits
  in comments are not actual counters/cgroup controls. This is appropriate for a
  held companion, but not enough for a runnable packet.

## What must remain held

The corrected executor and launch/cleanup bindings, complete reviewed pairing,
fixture origin/body/TLS receipt, combined resource/request accounting and proven
job ownership remain prerequisites. No approved hosting or real browser behavior
is established. The 1,536 MiB available-memory precondition at lines 75-78 is a
proposal, not a measurement or proof it fits the small VPS. Calibrate/approve
ceilings from real isolated evidence; do not lower thresholds merely to pass.

The final execution packet must bind these exact commands to the corrected
executor's actual required inputs and validated comparisons. Do not source this
review file, strip its exit, invent missing flags, or treat an outer timeout as
Docker cleanup. No second scan/request may be added for testing convenience.

## New GitHub state: targeted independent review is next

Muse now published Rev8 at c194a4dbf6e39e1a057fccdee5263543e729aa06,
canonical index 9826c34c4327915a1b142eeb9dfa8857e68fc828. Muse reports 45 passing
synthetic cases; Codex did not rerun or accept those as real-host evidence here.
Antigravity should review this exact candidate against ALL remaining Rev7 findings,
not infer them fixed from a larger test count. Specifically verify unit-invocation
ownership, inactive-vs-inspection-error handling, correct NanoCpus/memory/swap/PID
fields, terminal service exit status, mode/link-bound assembly, host/run binding,
actual whole-job/cleanup limits and failed-baseline no-launch behavior.
Arch can pause further packet drafting until this review yields the exact final
interface or one specific missing input. No new broad inventory is needed.

## Git-object failure: separate scoped diagnosis

The reported local commit failure has no supplied exact command, missing object
OID, checkout or stderr, so its cause is UNKNOWN. The one-file API publication is
verified above; that does not prove the local checkout is healthy or prove data
loss. Route the sanitized exact error/operation/OID/checkout identity to existing
GIT-RECONCILIATION-001 (Antigravity). Inspect shallow/partial-clone/ref state and
targeted object availability before proposing a repair. Preserve dirty/untracked
work; no reset, clean, garbage collection/pruning, shared-history rewrite or origin
change is authorized. Do not repeat failed commits or copy private working trees
into a public replacement. Isolated read-only remote comparison is sufficient
for the first diagnosis; use a separate proposal if recovery needs writes.

No hosting, browser, scan, provider, package, service, permission, dispatch, merge
or production operation was performed in this review. Current tasks are continued,
not duplicated. Client target and private paths are excluded from this report.
