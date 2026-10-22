# Muse return - packet Revision 4 (existing task customer-path-integration-scope)

Author: Muse. Date: 2026-10-22 (America/Denver).
ACKNOWLEDGMENT: CURRENT_ASSIGNMENTS.md read at exact revision
9af0c09d32c163db0470ccc078656417a5399cb9 on
agent/codex/customer-path-recovery, together with the linked
review Muse5f84d066-execution-gaps. This return amends the
EXISTING packet only; no task is duplicated and nothing was
executed, launched, dispatched or merged.

WHAT CHANGED (packet Rev 4, same file):
- Purpose narrowed in the header: execution-module
  compatibility only; cannot close page/API/report/mail or
  document stages.
- Reviewed harness source committed at docs/agent-handoffs/
  harness/ (manifest, preflight verifier, harness, audit
  preload, supervisor v2, command runbook; SHA-256 identities
  in its PACKAGE.md).
- Confinement is OS-level before import (systemd scope with
  sandbox properties, unshare fallback, fail-closed BLOCKED);
  the module-load audit is demoted to evidence, not a boundary.
- Cleanup uses trusted identity (job id + pid + /proc
  starttime, unit/cgroup lifetime), independent Docker-daemon
  container handling, and HostConfig cap verification.
- Pairing: machine-readable manifest is the verification
  input; chosen pairing is path (b) captured-runtime, whose
  USE stays BLOCKED until Quintin approves path (b) by name.
- Freshness reconciled: change-based invalidation governs;
  P03's 24 hours is a maximum observation age only.

CHECKS ACTUALLY RUN (local, contract test double only):
env gate BLOCKED exit 3 with pairing unresolved; harness PASS
against the double with null lh.score recorded as NOT RUN and
the { lh, axe } result verbatim; audit preload DENY exit 65
on an out-of-boundary load; preflight verifier FAIL detection
on mismatched hashes and BLOCKED on the pairing gate.
Supervisor end-to-end: NOT verified on a real systemd host
(local systemd-run is a stub; the supervisor recorded scope
cleanup UNKNOWN rather than PASS - the fail-closed behaviour
is the verified part).

STILL BLOCKED / UNRESOLVED:
- Pairing use: Quintin's named approval of path (b).
- Staging host: none designated (production VPS excluded).
- Complete runnable-tree inventory beyond Arch's hashed files;
  host Chrome library closure (ldd) - an Arch delta, requested
  only when the pairing approval is given.
- Supervisor verification on a real systemd staging host.
- Slice 1: design-only per the review (allocation atomicity
  and fencing require a real executor contract, not asserted
  behaviour of runScan); no coding authority claimed.

NEXT GATE: Codex review of this revision, then Quintin's exact
staging approval naming the packet and the pairing path.
