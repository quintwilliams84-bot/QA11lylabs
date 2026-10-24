#!/usr/bin/env bash
# Supervisor v8 (Rev 10) for the staging diagnostic harness.
#
# Rev 10 answers the independent Rev 9 review (five reproduced
# findings) and Codex's reconciliation routing (seven items):
# 1. Ownership fails CLOSED: stop, kill, reset-failed and a
#    terminal PASS all require a nonempty launch InvocationID
#    AND a nonempty matching current read. The unit also gets
#    a manager-enforced RuntimeMaxSec bound at launch, so a
#    launched job is never unbounded even if later inspection
#    fails.
# 2. Cleanup harvests every cidfile BEFORE HostConfig coverage
#    reconciliation, so a harvested-but-uninspected container
#    downgrades PASS to UNKNOWN even though it is removed.
# 3. Packaging modes are FINAL IN THE TREE: no runtime chmod.
#    A pre-job packaging gate (adapted from Codex's reviewed
#    rev9-permission-fix proposal) requires the harness dir to
#    be an absolute, normalized, symlink-free path and the
#    four launcher files to be regular files at exactly 0755;
#    anything else exits 3 before job state exists.
# 4. Cleanup runs against ONE monotonic absolute deadline,
#    checked before every phase and every removal target, with
#    each external call bounded by the remaining budget;
#    expiry leaves the rest UNKNOWN and the job quarantined.
# 5. (tools/verify-tree.mjs) the verifier now also rejects
#    EXTRA files: the actual file set must equal the pinned
#    manifest set plus its declared exclusions.
# 6. Numeric configuration is validated before job creation:
#    STAGE_HARD_DEADLINE_S (1..86400 s), STAGE_CLEANUP_
#    DEADLINE_S (1..3600 s), STAGE_SPOOL_MAX_BYTES
#    (1024..1099511627776). Malformed, zero, negative or
#    out-of-range values BLOCK (exit 3). The cleanup deadline
#    is an independent bound on the cleanup phase only; it is
#    NOT required to fit inside the hard deadline (cleanup
#    runs after the deadline fires by design). These ranges
#    are input sanity bounds, not operational budgets; the
#    runbook limits register still governs what may be
#    claimed as enforced.
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
# Safeguards (Quintin, Oct 23; mode handling revised in Rev 10
# per the reviewed permission proposal): uploads are proven
# unaltered by TREE-MANIFEST.json + tools/verify-tree.mjs, and
# modes are finalized in the tree itself - the supervisor
# verifies them fail-closed and never rewrites them.
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
# --- packaging gate (Rev 10, adapted from Codex's reviewed
# rev9-permission-fix proposal): fail BEFORE creating job state.
# Packaging check only - not proof of ownership or provenance.
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
# --- numeric configuration validation (Rev 10): before job
# creation; malformed values block, never silently continue.
DEADLINE_S="${STAGE_HARD_DEADLINE_S:-240}"
CLEANUP_S="${STAGE_CLEANUP_DEADLINE_S:-30}"
SPOOL_BYTES="${STAGE_SPOOL_MAX_BYTES:-67108864}"
config_ok=1
case "$DEADLINE_S" in *[!0-9]*|"") config_ok=0;; esac
case "$CLEANUP_S" in *[!0-9]*|"") config_ok=0;; esac
case "$SPOOL_BYTES" in *[!0-9]*|"") config_ok=0;; esac
if [ "$config_ok" = 1 ]; then
  { [ "$DEADLINE_S" -ge 1 ] && [ "$DEADLINE_S" -le 86400 ]; } || config_ok=0
  { [ "$CLEANUP_S" -ge 1 ] && [ "$CLEANUP_S" -le 3600 ]; } || config_ok=0
  { [ "$SPOOL_BYTES" -ge 1024 ] && [ "$SPOOL_BYTES" -le 1099511627776 ]; } || config_ok=0
fi
if [ "$config_ok" != 1 ]; then
  echo "BLOCKED: invalid numeric configuration (STAGE_HARD_DEADLINE_S=$DEADLINE_S, STAGE_CLEANUP_DEADLINE_S=$CLEANUP_S, STAGE_SPOOL_MAX_BYTES=$SPOOL_BYTES)" >&2
  exit 3
fi
RUN_ID="${STAGE_RUN_ID:-run-$$-$(date +%s)}"
UNIT="qa11y-stage-${RUN_ID}.service"
DOCKER=(timeout 5 docker)
SYSTEMCTL=(timeout 5 systemctl)
SYSTEMD_RUN=(timeout 5 systemd-run)

BASELINE="NOT RUN"; ASSEMBLY="NOT RUN"; CONFINEMENT="NOT RUN"
IDENTITY="NOT RUN"; HOSTCONFIG="NOT RUN"; HARNESS="NOT RUN"
CONTAINER_CLEAN="NOT RUN"; TMP_CLEAN="NOT RUN"; UNIT_CLEAN="NOT RUN"
RUN_START_EPOCH="$(date +%s)"
INTERRUPTED=0; DEADLINE_FIRED=0

# --- exclusive staging root: refuse stale/shared state -----------
if [ -e "$STAGE_ROOT" ] && [ -n "$(ls -A "$STAGE_ROOT" 2>/dev/null)" ]; then
  echo "BLOCKED: STAGE_ROOT exists and is not empty (stale/shared root refused)" >&2
  exit 3
fi
mkdir -p "$STAGE_ROOT" || { echo "BLOCKED: cannot create STAGE_ROOT" >&2; exit 3; }
JOB_DIR="$STAGE_ROOT/job-$RUN_ID"
mkdir -p "$JOB_DIR" || { echo "BLOCKED: cannot create job dir" >&2; exit 3; }
OWNED="$JOB_DIR/owned-containers.txt"
INSPECTED="$JOB_DIR/inspected-containers.txt"; : > "$INSPECTED"
printf '# job %s\n' "$RUN_ID" > "$OWNED"

# --- job-private temp dir ----------------------------------------
if [ -L "$STAGE_TMP" ]; then echo "BLOCKED: STAGE_TMP is a symlink" >&2; exit 3; fi
mkdir -p "$STAGE_TMP" || { echo "BLOCKED: cannot create STAGE_TMP" >&2; exit 3; }
TMP_JOB="$STAGE_TMP/job-$RUN_ID"
if ! mkdir "$TMP_JOB" 2>/dev/null; then echo "BLOCKED: job temp dir already exists (refusing reuse)" >&2; exit 3; fi

write_cleanup() {
  local overall="$1" rc="$2"
  cat > "$STAGE_ROOT/cleanup.json" <<JSON
{
  "run_id": "$RUN_ID",
  "unit": "$UNIT",
  "components": {
    "baseline": "$BASELINE",
    "assembly": "$ASSEMBLY",
    "confinement": "$CONFINEMENT",
    "identity": "$IDENTITY",
    "hostconfig": "$HOSTCONFIG",
    "harness": "$HARNESS",
    "container_cleanup": "$CONTAINER_CLEAN",
    "tmp_cleanup": "$TMP_CLEAN",
    "unit_cleanup": "$UNIT_CLEAN"
  },
  "overall": "$overall",
  "exit_code": $rc
}
JSON
}
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
aggregate_now() {
  BASELINE="$BASELINE" ASSEMBLY="$ASSEMBLY" CONFINEMENT="$CONFINEMENT" IDENTITY="$IDENTITY" \
  HOSTCONFIG="$HOSTCONFIG" HARNESS="$HARNESS" \
  CONTAINER_CLEAN="$CONTAINER_CLEAN" TMP_CLEAN="$TMP_CLEAN" UNIT_CLEAN="$UNIT_CLEAN" \
  bash "$SELF_DIR/aggregate.sh"
}
finish() { # $1 overall $2 rc
  write_cleanup "$1" "$2"; echo "overall: $1"; exit "$2"
}

LAUNCHED=0; INVOCATION_ID=""
invocation_verified() {
  # Ownership is proven ONLY by a nonempty launch InvocationID
  # AND a nonempty current read that matches it exactly. Any
  # missing evidence means NOT verified - never fail open.
  [ "$LAUNCHED" = 1 ] || return 1
  [ -n "$INVOCATION_ID" ] || return 1
  local cur=""
  cur="$("${SYSTEMCTL[@]}" show -p InvocationID --value "$UNIT" 2>/dev/null | tr -d '[:space:]')" || cur=""
  [ -n "$cur" ] && [ "$cur" = "$INVOCATION_ID" ]
}
stop_unit() { if invocation_verified; then "${SYSTEMCTL[@]}" stop "$UNIT" >/dev/null 2>&1 || true; fi; }
owned_kill() { if invocation_verified; then "${SYSTEMCTL[@]}" kill "$UNIT" >/dev/null 2>&1 || true; fi; }
on_interrupt() { INTERRUPTED=1; HARNESS="FAIL (interrupted)"; stop_unit; }
trap on_interrupt INT TERM

tree_digest() { # $1 dir -> canonical digest binding type, mode, path, link target, content
  python3 - "$1" << 'PYEOF2'
import hashlib, os, sys
root = sys.argv[1]
lines = []
for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
    for name in dirnames + filenames:
        p = os.path.join(dirpath, name)
        rel = os.path.relpath(p, root)
        st = os.lstat(p)
        mode = format(st.st_mode & 0o7777, "04o")
        if os.path.islink(p):
            target = os.readlink(p)
            resolved = os.path.realpath(p)
            if not resolved.startswith(os.path.realpath(root) + os.sep) or not os.path.exists(resolved):
                print("tree_digest: link escapes or unresolved: " + rel, file=sys.stderr); sys.exit(1)
            lines.append("L %s %s -> %s" % (mode, rel, target))
        elif os.path.isdir(p):
            lines.append("D %s %s" % (mode, rel))
        elif os.path.isfile(p):
            h = hashlib.sha256(open(p, "rb").read()).hexdigest()
            lines.append("F %s %s %s" % (mode, rel, h))
        else:
            print("tree_digest: unsupported entry: " + rel, file=sys.stderr); sys.exit(1)
lines.sort()
sys.stdout.write(hashlib.sha256(("\n".join(lines) + "\n").encode()).hexdigest())
PYEOF2
}

# --- assembly: verify the operator's tree, copy it in, re-verify --
if [ ! -f "$STAGE_ASSEMBLY_DIR/assembly.json" ] || [ ! -d "$STAGE_ASSEMBLY_DIR/release" ]; then
  ASSEMBLY="BLOCKED (assembly dir lacks release/ or assembly.json)"
  finish BLOCKED 3
fi
EXPECTED_DIGEST="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("tree_sha256",""))' "$STAGE_ASSEMBLY_DIR/assembly.json" 2>/dev/null || echo "")"
ACTUAL_DIGEST="$(tree_digest "$STAGE_ASSEMBLY_DIR/release")"
if [ -z "$EXPECTED_DIGEST" ] || [ "$EXPECTED_DIGEST" != "$ACTUAL_DIGEST" ]; then
  ASSEMBLY="FAIL (assembly tree digest mismatch: expected ${EXPECTED_DIGEST:-none}, got $ACTUAL_DIGEST)"
  finish BLOCKED 3
fi
mkdir -p "$JOB_DIR/release"
if ! cp -a "$STAGE_ASSEMBLY_DIR/release/." "$JOB_DIR/release/"; then
  ASSEMBLY="FAIL (copy into job root failed)"
  finish BLOCKED 3
fi
COPY_DIGEST="$(tree_digest "$JOB_DIR/release")"
if [ "$COPY_DIGEST" != "$EXPECTED_DIGEST" ]; then
  ASSEMBLY="FAIL (copied tree digest mismatch)"
  finish BLOCKED 3
fi
ASSEMBLY="PASS"

# --- baseline inventory (failure BLOCKS, nothing launches) -------
BEFORE_ALL=""
if ! BEFORE_ALL="$("${DOCKER[@]}" ps -aq --no-trunc 2>/dev/null)"; then
  BASELINE="BLOCKED (docker ps failed before launch)"
  finish BLOCKED 3
fi
BASELINE="PASS"
printf '%s\n' "$BEFORE_ALL" > "$JOB_DIR/baseline.txt"

cleanup_phase() {
  CLEANUP_START=$SECONDS
  RESET_OK=0
  # ONE monotonic absolute deadline for the whole cleanup
  # (Rev 10): checked before every phase and every target;
  # each external call is bounded by the remaining budget.
  cleanup_left() { echo $(( CLEANUP_S - (SECONDS - CLEANUP_START) )); }
  over_cleanup_budget() { [ $((SECONDS - CLEANUP_START)) -ge "$CLEANUP_S" ]; }
  cdocker() { local left; left="$(cleanup_left)"; [ "$left" -ge 1 ] || return 124; [ "$left" -gt 5 ] && left=5; timeout "$left" docker "$@"; }
  # --- harvest ownership FIRST (Rev 10): direct records plus
  #     cidfiles the shim recorded before delegating
  #     (interruption-proof). Coverage is reconciled only after
  #     the complete owned set is known.
  : >> "$OWNED"
  if [ -f "$JOB_DIR/cidfiles.txt" ]; then
    while IFS= read -r cf; do
      [ -n "$cf" ] && [ -s "$cf" ] || continue
      HID="$(tr -d '[:space:]' < "$cf" 2>/dev/null || true)"
      case "$HID" in *[!0-9a-f]*|"") : ;;
        *) [ "${#HID}" = 64 ] && grep -qx "$HID" "$OWNED" || echo "$HID" >> "$OWNED";;
      esac
    done < "$JOB_DIR/cidfiles.txt"
  fi
  # --- HostConfig coverage: PASS is only honest if every owned
  #     container (including harvested ones) was inspected.
  if [ -s "$OWNED" ] && [ "$HOSTCONFIG" = "PASS" ]; then
    while read -r ocid; do
      if ! grep -qx "$ocid" "$INSPECTED" 2>/dev/null; then
        HOSTCONFIG="UNKNOWN (owned container $ocid never inspected)"
        break
      fi
    done < <(grep -E '^[0-9a-f]{64}$' "$OWNED" | sort -u)
  fi
  # --- containers: current-job record only, baseline excluded,
  #     creation provenance required. FAIL is sticky.
  CONTAINER_CLEAN="PASS"
  local owned_ids=""
  owned_ids="$(grep -v '^#' "$OWNED" 2>/dev/null | grep -E '^[0-9a-f]{64}$' | sort -u || true)"
  local STILL="" NEWUNOWNED="" cid="" CISO="" CREATED_EPOCH=""
  if [ -n "$owned_ids" ]; then
    while IFS= read -r cid; do
      [ -z "$cid" ] && continue
      if over_cleanup_budget; then
        [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (cleanup deadline exhausted; $cid left in place)"
        continue
      fi
      if printf '%s\n' "$BEFORE_ALL" | grep -qx "$cid"; then
        [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (baseline container in job record; not removed)"
        continue
      fi
      CREATED_EPOCH=""
      if CISO="$(cdocker inspect -f '{{.Created}}' "$cid" 2>/dev/null)"; then
        CREATED_EPOCH="$(date -d "$CISO" +%s 2>/dev/null || echo "")"
      fi
      if [ -z "$CREATED_EPOCH" ] || [ "$CREATED_EPOCH" -lt "$RUN_START_EPOCH" ]; then
        [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (creation provenance unproven for $cid; not removed)"
        continue
      fi
      if ! cdocker rm -f "$cid" >/dev/null 2>&1; then
        if over_cleanup_budget; then
          CONTAINER_CLEAN="UNKNOWN (cleanup deadline exhausted during removal of $cid)"
        else
          CONTAINER_CLEAN="FAIL (rm $cid)"
        fi
      fi
    done <<EOF
$owned_ids
EOF
    if over_cleanup_budget; then
      [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (cleanup deadline exhausted before re-verify)"
      STILL=""
    elif ! STILL="$(cdocker ps -aq --no-trunc 2>/dev/null)"; then
      [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (re-verify failed)"
      STILL=""
    else
      while IFS= read -r cid; do
        [ -z "$cid" ] && continue
        if printf '%s\n' "$STILL" | grep -qx "$cid" && ! printf '%s\n' "$BEFORE_ALL" | grep -qx "$cid"; then
          [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (owned $cid still present)"
        fi
      done <<EOF
$owned_ids
EOF
      NEWUNOWNED="$(comm -13 <(printf '%s\n' "$BEFORE_ALL" | sort -u) <(printf '%s\n' "$STILL" | sort -u) | grep -vxF -f <(printf '%s\n' "$owned_ids") || true)"
      if [ -n "$NEWUNOWNED" ]; then
        [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (unowned containers appeared; left in place)"
      fi
    fi
  else
    if ! STILL="$(cdocker ps -aq --no-trunc 2>/dev/null)"; then
      CONTAINER_CLEAN="UNKNOWN (post-run inventory failed)"
    else
      NEWUNOWNED="$(comm -13 <(printf '%s\n' "$BEFORE_ALL" | sort -u) <(printf '%s\n' "$STILL" | sort -u) || true)"
      [ -n "$NEWUNOWNED" ] && CONTAINER_CLEAN="UNKNOWN (unowned containers appeared; left in place)"
    fi
  fi
  # --- temp: remove ONLY the job-private directory ------------------
  if over_cleanup_budget; then
    TMP_CLEAN="UNKNOWN (cleanup deadline exhausted before temp phase; job temp left in place)"
  else
    TMP_CLEAN="PASS"
    if [ -e "$TMP_JOB" ]; then
      local REAL_TMP="" REAL_JOB=""
      REAL_TMP="$(realpath "$STAGE_TMP" 2>/dev/null || echo "")"
      REAL_JOB="$(realpath "$TMP_JOB" 2>/dev/null || echo "")"
      if [ -L "$TMP_JOB" ] || [ -z "$REAL_JOB" ] || [ "${REAL_JOB%/*}" != "$REAL_TMP" ]; then
        TMP_CLEAN="UNKNOWN (job temp dir failed containment checks; left in place)"
      elif ! rm -rf "$TMP_JOB" 2>/dev/null; then
        TMP_CLEAN="FAIL (rm job temp dir)"
      fi
    fi
  fi
  # --- unit termination is a REQUIRED cleanup component -------------
  # PASS requires explicit manager evidence; inspection errors and
  # ambiguous states stay UNKNOWN (never a silent PASS). The stop
  # itself is ownership-guarded (Rev 10): no proven identity, no
  # stop - and RuntimeMaxSec bounds the unit regardless.
  if over_cleanup_budget; then
    UNIT_CLEAN="UNKNOWN (cleanup deadline exhausted before unit phase)"
  elif [ "$LAUNCHED" != 1 ]; then
    stop_unit
    UNIT_CLEAN="PASS (unit never launched by this invocation; nothing owned to stop)"
  else
    stop_unit
    sleep 1
    SHOW_OUT="$("${SYSTEMCTL[@]}" show -p LoadState -p ActiveState -p MainPID -p InvocationID "$UNIT" 2>/dev/null)" || SHOW_OUT=""
    if [ -z "$SHOW_OUT" ]; then
      UNIT_CLEAN="UNKNOWN (manager inspection failed during cleanup)"
    else
      LS_="$(printf '%s\n' "$SHOW_OUT" | sed -n 's/^LoadState=//p')"
      AS_="$(printf '%s\n' "$SHOW_OUT" | sed -n 's/^ActiveState=//p')"
      MP_="$(printf '%s\n' "$SHOW_OUT" | sed -n 's/^MainPID=//p')"
      IV_="$(printf '%s\n' "$SHOW_OUT" | sed -n 's/^InvocationID=//p')"
      if [ -n "$INVOCATION_ID" ] && [ -n "$IV_" ] && [ "$IV_" = "$INVOCATION_ID" ]; then RESET_OK=1; fi
      if [ "$LS_" = "not-found" ]; then RESET_OK=1; fi
      if [ -n "$INVOCATION_ID" ] && [ -n "$IV_" ] && [ "$IV_" != "$INVOCATION_ID" ]; then
        UNIT_CLEAN="UNKNOWN (unit invocation changed; termination not attributable)"
      elif [ "$LS_" = "not-found" ]; then
        UNIT_CLEAN="PASS"
      elif { [ "$AS_" = "inactive" ] || [ "$AS_" = "failed" ]; } && { [ -z "$MP_" ] || [ "$MP_" = "0" ]; }; then
        UNIT_CLEAN="PASS"
      elif [ "$AS_" = "active" ] || [ "$AS_" = "activating" ] || [ "$AS_" = "deactivating" ]; then
        UNIT_CLEAN="FAIL (unit still $AS_ after stop)"
      else
        UNIT_CLEAN="UNKNOWN (manager reported LoadState=$LS_ ActiveState=$AS_ MainPID=$MP_)"
      fi
    fi
    if [ -n "${MAINPID:-}" ] && [ "${MAINPID:-0}" != "0" ] && kill -0 "$MAINPID" 2>/dev/null; then
      UNIT_CLEAN="FAIL (unit MainPID $MAINPID still alive)"
    fi
  fi
  # reset-failed only when this invocation's termination state
  # was actually established (Rev 10).
  if [ "$LAUNCHED" = 1 ] && [ "$RESET_OK" = 1 ]; then
    "${SYSTEMCTL[@]}" reset-failed "$UNIT" >/dev/null 2>&1 || true
  fi
}

# --- target is mandatory; there is no default ---------------------
if [ -z "${STAGE_TARGET_URL:-}" ]; then
  HARNESS="BLOCKED (STAGE_TARGET_URL not supplied; no default target exists)"
  CONFINEMENT="BLOCKED (never started)"; IDENTITY="BLOCKED (never started)"
  HOSTCONFIG="BLOCKED (never started)"
  cleanup_phase
  OVERALL_RC="$(aggregate_now)"; finish "${OVERALL_RC%% *}" "${OVERALL_RC##* }"
fi

# --- launch as a transient service (sandbox properties apply) ----
LAUNCH_ENV=(
  --setenv=STAGE_ROOT="$JOB_DIR"
  --setenv=STAGE_TMP="$TMP_JOB"
  --setenv=STAGE_JOB_DIR="$JOB_DIR"
  --setenv=STAGE_RUN_ID="$RUN_ID"
  --setenv=STAGE_HARNESS_DIR="$STAGE_HARNESS_DIR"
  --setenv=STAGE_RELEASE_DIR="$JOB_DIR/release"
  --setenv=STAGE_AUDIT_LOG="$JOB_DIR/audit.log"
  --setenv=STAGE_PAIRING_PATH="${STAGE_PAIRING_PATH:-}"
  --setenv=STAGE_PAIRING_APPROVAL_FILE="${STAGE_PAIRING_APPROVAL_FILE:-}"
  --setenv=STAGE_PAIRING_MANIFEST="${STAGE_PAIRING_MANIFEST:-}"
  --setenv=STAGE_HOST_ID="${STAGE_HOST_ID:-}"
  --setenv=STAGE_TARGET_URL="$STAGE_TARGET_URL"
)
if ! "${SYSTEMD_RUN[@]}" --unit="$UNIT" \
      -p PrivateNetwork=yes -p ProtectSystem=strict \
      -p ReadWritePaths="$STAGE_ROOT $TMP_JOB /var/run/docker.sock" \
      -p MemoryMax=2G -p CPUQuota=200% -p TasksMax=512 \
      -p RuntimeMaxSec=$((DEADLINE_S + 60)) \
      "${LAUNCH_ENV[@]}" \
      /bin/bash "$STAGE_HARNESS_DIR/run-confined.sh" >"$JOB_DIR/launch.log" 2>&1; then
  HARNESS="FAIL (transient service launch failed)"
  CONFINEMENT="BLOCKED (never started)"
  IDENTITY="BLOCKED (never started)"
  HOSTCONFIG="BLOCKED (never started)"
  cleanup_phase
  OVERALL_RC="$(aggregate_now)"; finish "${OVERALL_RC%% *}" "${OVERALL_RC##* }"
fi

LAUNCHED=1
INVOCATION_ID="$("${SYSTEMCTL[@]}" show -p InvocationID --value "$UNIT" 2>/dev/null | tr -d '[:space:]')" || INVOCATION_ID=""

# MainPID of the owned unit (bounded retries)
MAINPID=""
for _ in 1 2 3 4 5; do
  MAINPID="$("${SYSTEMCTL[@]}" show -p MainPID --value "$UNIT" 2>/dev/null | tr -d '[:space:]')" || MAINPID=""
  [ -n "$MAINPID" ] && [ "$MAINPID" != "0" ] && break
  sleep 1
done

unit_alive() {
  [ -n "$MAINPID" ] && [ "$MAINPID" != "0" ] && kill -0 "$MAINPID" 2>/dev/null
}

# --- watchdog ------------------------------------------------------
# Inspection budget: each external call has a 5s timeout; HostConfig
# spot checks are capped at 3 containers per iteration (rotating);
# the loop has an absolute ceiling of deadline + 30s.
START_S=$SECONDS
HC_IDX=0
while :; do
  if [ "$INTERRUPTED" = 1 ]; then break; fi
  if [ -f "$JOB_DIR/confinement.json" ] && [ "$CONFINEMENT" = "NOT RUN" ]; then
    if grep -q '"confinement":"PASS"' "$JOB_DIR/confinement.json"; then CONFINEMENT="PASS";
    elif grep -q '"confinement":"FAIL"' "$JOB_DIR/confinement.json"; then CONFINEMENT="FAIL"; fi
  fi
  # producer spool/storage bound (separate from the evidence
  # collector bound): fail-closed stop of the owned unit.
  if [ -f "$JOB_DIR/producer.log" ]; then
    SPOOL_SIZE="$(stat -c %s "$JOB_DIR/producer.log" 2>/dev/null || echo 0)"
    if [ "$SPOOL_SIZE" -gt "$SPOOL_BYTES" ]; then
      HARNESS="FAIL (producer spool exceeded $SPOOL_BYTES bytes; unit stopped)"
      stop_unit
      break
    fi
  fi
  # identity evidence (reporting only; never gates the deadline).
  # Canonical parse on both sides: fields after the last ')'.
  if [ -f "$JOB_DIR/job.json" ] && [ "$IDENTITY" != "PASS" ]; then
    read -r JPID JSTART < <(timeout 5 python3 -c 'import json,sys
try:
  d=json.load(open(sys.argv[1])); print(d["pid"], d["proc_starttime"])
except Exception: print(0, 0)' "$JOB_DIR/job.json" 2>/dev/null || echo "0 0")
    if [ "${JPID:-0}" != "0" ] && [ -d "/proc/$JPID" ]; then
      ACTUAL_START="$(timeout 5 python3 -c 'import sys
s=open(f"/proc/{sys.argv[1]}/stat").read()
print(s[s.rindex(")")+2:].split(" ")[19])' "$JPID" 2>/dev/null || echo x)"
      CG="$(cat "/proc/$JPID/cgroup" 2>/dev/null || true)"
      DESC=0; P="$JPID"
      for _ in 1 2 3 4 5 6 7 8; do
        [ "$P" = "$MAINPID" ] && { DESC=1; break; }
        P="$(awk '{print $4}' "/proc/$P/stat" 2>/dev/null || echo 0)"
        { [ -z "$P" ] || [ "$P" = "0" ]; } && break
      done
      if [ "$ACTUAL_START" = "$JSTART" ] && [ "$DESC" = 1 ] && printf '%s' "$CG" | grep -q "$UNIT"; then
        IDENTITY="PASS"
      else IDENTITY="UNKNOWN (pid/starttime/ancestry/cgroup mismatch)"; fi
    fi
  fi
  # deadline: unconditional stop of the unit the supervisor owns
  ELAPSED=$((SECONDS - START_S))
  if [ "$ELAPSED" -ge "$DEADLINE_S" ]; then
    DEADLINE_FIRED=1
    stop_unit
    break
  fi
  # owned-container HostConfig spot check: at most 3 per iteration.
  # FAIL is sticky: a later PASS never upgrades a recorded FAIL.
  if [ -s "$OWNED" ]; then
    mapfile -t OWNED_IDS < <(grep -E '^[0-9a-f]{64}$' "$OWNED" 2>/dev/null || true)
    TOTAL=${#OWNED_IDS[@]}
    if [ "$TOTAL" -gt 0 ]; then
      CHECKED=0
      while [ "$CHECKED" -lt 3 ] && [ "$CHECKED" -lt "$TOTAL" ]; do
        cid="${OWNED_IDS[$(( (HC_IDX + CHECKED) % TOTAL ))]}"
        HC="$("${DOCKER[@]}" inspect -f '{{.HostConfig.Memory}} {{.HostConfig.MemorySwap}} {{.HostConfig.NanoCpus}} {{.HostConfig.PidsLimit}}' "$cid" 2>/dev/null)" || HC=""
        if [ -z "$HC" ]; then
          [ "${HOSTCONFIG:0:4}" != "FAIL" ] && HOSTCONFIG="FAIL (HostConfig inspection failed for $cid)"
        elif [ "$HC" = "805306368 1000000000 1000000000 160" ]; then
          printf '%s\n' "$cid" >> "$INSPECTED"
          [ "${HOSTCONFIG:0:4}" != "FAIL" ] && HOSTCONFIG="PASS"
        else HOSTCONFIG="FAIL (HostConfig $HC)"; fi
        CHECKED=$((CHECKED+1))
      done
      HC_IDX=$(( (HC_IDX + 3) % TOTAL ))
    fi
  fi
  unit_alive || break
  sleep 2
done

# bounded wait for the workload to actually exit (max 15s)
for _ in $(seq 1 15); do unit_alive || break; sleep 1; done
if unit_alive; then owned_kill; sleep 2; fi

# harness verdict. Deadline and interruption are STICKY failures:
# a result file produced under a fired deadline never upgrades.
if [ "${HARNESS:0:4}" = "FAIL" ]; then
  : # sticky failure already recorded (interrupt, spool bound)
elif [ "$INTERRUPTED" = 1 ]; then
  HARNESS="FAIL (interrupted)"
elif [ "$DEADLINE_FIRED" = 1 ]; then
  HARNESS="FAIL (hard deadline fired; unit stopped)"
elif [ -f "$JOB_DIR/result.json" ]; then
  # Manager terminal status of the OWNED invocation: a PASS result
  # file alone never suffices - the service must also have exited
  # successfully under the invocation recorded at launch.
  TERM_STATE="unknown"; TERM_NOTE="manager terminal status unavailable"
  TSHOW="$("${SYSTEMCTL[@]}" show -p ExecMainCode -p ExecMainStatus -p Result -p InvocationID "$UNIT" 2>/dev/null)" || TSHOW=""
  if [ -n "$TSHOW" ]; then
    TES="$(printf '%s\n' "$TSHOW" | sed -n 's/^ExecMainStatus=//p')"
    TRS="$(printf '%s\n' "$TSHOW" | sed -n 's/^Result=//p')"
    TIV="$(printf '%s\n' "$TSHOW" | sed -n 's/^InvocationID=//p')"
    if [ -z "$INVOCATION_ID" ] || [ -z "$TIV" ]; then
      TERM_STATE="unknown"; TERM_NOTE="invocation identity missing (launch or terminal read)"
    elif [ "$TIV" != "$INVOCATION_ID" ]; then
      TERM_STATE="unknown"; TERM_NOTE="unit invocation changed since launch"
    elif [ "$TRS" = "success" ] && [ "$TES" = "0" ]; then
      TERM_STATE="ok"; TERM_NOTE=""
    else
      TERM_STATE="failed"; TERM_NOTE="Result=$TRS ExecMainStatus=$TES"
    fi
  fi
  HV="$(timeout 5 python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("overall",""))' "$JOB_DIR/result.json" 2>/dev/null || true)"
  case "$HV" in
    PASS)
      if [ "$TERM_STATE" = "ok" ]; then HARNESS="PASS"
      elif [ "$TERM_STATE" = "failed" ]; then HARNESS="FAIL (service terminal status contradicts PASS result: $TERM_NOTE)"
      else HARNESS="UNKNOWN (terminal status unverified: $TERM_NOTE)"; fi;;
    FAIL) HARNESS="FAIL (harness reported FAIL)";;
    BLOCKED) HARNESS="BLOCKED (harness reported BLOCKED)";;
    *) HARNESS="UNKNOWN (no harness overall verdict)";;
  esac
else
  HARNESS="UNKNOWN (no result.json)"
fi
[ "$CONFINEMENT" = "NOT RUN" ] && CONFINEMENT="UNKNOWN (no confinement evidence)"
[ "$IDENTITY" = "NOT RUN" ] && IDENTITY="UNKNOWN (no job identity evidence)"
[ "$HOSTCONFIG" = "NOT RUN" ] && HOSTCONFIG="UNKNOWN (no containers observed)"

# bounded evidence copy of the producer spool (producer uncapped)
if [ -f "$JOB_DIR/producer.log" ]; then
  head -c 1048576 "$JOB_DIR/producer.log" > "$STAGE_ROOT/run.log" 2>/dev/null || true
  SIZE="$(stat -c %s "$JOB_DIR/producer.log" 2>/dev/null || echo 0)"
  if [ "$SIZE" -gt 1048576 ]; then printf '\n[supervisor: evidence copy truncated at 1 MiB; producer spool was %s bytes]\n' "$SIZE" >> "$STAGE_ROOT/run.log"; fi
fi

cleanup_phase
OVERALL_RC="$(aggregate_now)"; finish "${OVERALL_RC%% *}" "${OVERALL_RC##* }"
