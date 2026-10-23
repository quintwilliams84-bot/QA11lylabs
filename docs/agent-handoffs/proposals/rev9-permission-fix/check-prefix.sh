#!/usr/bin/env bash
# Supervisor v7 (Rev 9) for the staging diagnostic harness.
#
# Rev 9 answers the independent Rev 7 alignment review (six
# findings, all verified present in Rev 8 source by Muse):
# 1. Launch ownership: the supervisor stops a unit only when
#    THIS invocation launched it and the manager still reports
#    the same InvocationID recorded at launch.
# 2. UNIT_CLEAN starts UNKNOWN and reaches PASS only on explicit
#    manager evidence (LoadState not-found, or inactive/failed
#    with MainPID 0); inspection errors stay UNKNOWN.
# 3. HostConfig now inspects NanoCpus as well as Memory,
#    MemorySwap and PidsLimit; a failed inspection is a sticky
#    FAIL, and cleanup reconciles coverage: any owned container
#    never inspected downgrades PASS to UNKNOWN.
# 4. HARNESS PASS requires the manager terminal status of the
#    owned invocation (Result=success, ExecMainStatus=0,
#    InvocationID match) in addition to the result file.
# 5. tree_digest v2 binds entry type, mode, path, link target
#    and content; unsupported entry types fail the digest.
# 6. (pairing/preflight-verify.mjs) standalone preflight now
#    REQUIRES --host-id and --run-id and a record carrying both.
# Permission proposal: launch verifies package modes without changing them.
# Packaging repair belongs to a separate reviewed assembly step.
#
# Rev 8 answers Arch's enforcement-gaps handoff (ac468232):
# - The producer spool/storage is now bounded SEPARATELY from the
#   evidence collector: if the spool exceeds STAGE_SPOOL_MAX_BYTES
#   (default 64 MiB), the watchdog stops the unit and the run
#   FAILs. The producer's writes are never capped in place; the
#   bound is enforced by stopping the owned lifecycle, and the
#   evidence copy stays bounded at 1 MiB as before.
# - Cleanup has a total ceiling (STAGE_CLEANUP_DEADLINE_S,
#   default 30s, a PROPOSED figure): exceeding it marks the
#   remaining components UNKNOWN and finishes - missing evidence
#   blocks readiness, and no next admission follows an uncertain
#   cleanup (the root is quarantined by the exclusive-root rule).
# - Every other proposed limit (navigation/request ceilings,
#   combined harness+worker CPU/RAM/PID, permitted-egress proof)
#   is recorded in the runbook's limits register as PROPOSED and
#   UNENFORCED until demonstrated on the staging host. This
#   supervisor does not claim them.
#
# Answers Codex's Rev 6 review of 4296a5e7. Changes from v4:
# - A job-private STAGE_AUDIT_LOG is passed explicitly into the
#   unit; the audit preload requires it and fails closed without
#   it (Rev 6 never set it, so the real path could not run).
# - Exclusive root creation is reconciled with release assembly:
#   the operator assembles and preflight-verifies a release copy
#   in a SEPARATE assembly dir with a recorded tree digest
#   (assembly.json). The supervisor verifies that digest, copies
#   the tree into the job root, and re-verifies the copy before
#   launch (ASSEMBLY component). Stale/shared roots are still
#   refused; assembly never happens inside a live root.
# - Identity fields are aligned on ONE canonical writer format:
#   job.json {pid, proc_starttime}, with proc_starttime parsed
#   after the last ')' of /proc/<pid>/stat on BOTH sides.
# - Cleanup harvests container IDs from the cidfiles the shim
#   recorded before delegating (cidfiles.txt), so ownership is
#   captured even when an attached run is interrupted mid-flight;
#   caller-supplied cidfiles are honored by the shim.
# - FAIL is sticky everywhere: a recorded FAIL (safety, deadline,
#   cleanup) is never upgraded by a later observation.
# - Unit/cgroup termination is a required cleanup component
#   (UNIT_CLEAN): the unit must be inactive and its MainPID dead
#   before cleanup can PASS.
# - Total inspection time is bounded: every external inspection
#   has a 5s timeout, HostConfig checks are capped per watchdog
#   iteration, and the watchdog has an absolute ceiling of
#   deadline + 30s regardless of inspection behaviour.
#
# Exit codes come from aggregate.sh: 0 PASS, 4 FAIL, 3 BLOCKED.
set -uo pipefail

: "${STAGE_ROOT:?STAGE_ROOT required}"
: "${STAGE_TMP:?STAGE_TMP required}"
: "${STAGE_HARNESS_DIR:?STAGE_HARNESS_DIR required}"
: "${STAGE_ASSEMBLY_DIR:?STAGE_ASSEMBLY_DIR required (operator-assembled release copy + assembly.json)}"
# Fail before creating job state or contacting a supervisor. This is a
# packaging check, not proof of authenticated ownership or immutable storage.
if ! python3 - "$STAGE_HARNESS_DIR" <<'MODE_CHECK'
import os, stat, sys
root = sys.argv[1]
try:
    if not os.path.isabs(root) or os.path.normpath(root) != root:
        raise ValueError("harness directory must be an absolute normalized path")
    if os.path.realpath(root) != root or not os.path.isdir(root):
        raise ValueError("harness directory must be a real directory without symlink ancestors")
    for rel in ("bin/docker", "run-confined.sh", "aggregate.sh", "supervise.sh"):
        name = os.path.join(root, rel)
        info = os.lstat(name)
        if os.path.realpath(name) != name or not stat.S_ISREG(info.st_mode):
            raise ValueError("required launch file must be regular with no symlink components: " + rel)
        if stat.S_IMODE(info.st_mode) != 0o755 or not os.access(name, os.R_OK | os.X_OK):
            raise ValueError("required launch file must be readable/executable mode 0755: " + rel)
except (OSError, ValueError) as error:
    print("BLOCKED: invalid harness packaging: " + str(error), file=sys.stderr)
    sys.exit(3)
MODE_CHECK
then
  exit 3
fi

exit 0
