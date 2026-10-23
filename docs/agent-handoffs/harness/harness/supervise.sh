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
# Safeguards (Quintin, Oct 23): the launcher heals executable
# modes inside the assembled release before digesting, so a
# mode-stripped checkout still runs; the digest binds the
# healed modes, so the heal is verified, not assumed.
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
DEADLINE_S="${STAGE_HARD_DEADLINE_S:-240}"
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
stop_unit() {
  # Stop only a unit THIS invocation launched, and only while
  # the manager still reports the launch invocation identity.
  [ "$LAUNCHED" = 1 ] || return 0
  local cur=""
  cur="$("${SYSTEMCTL[@]}" show -p InvocationID --value "$UNIT" 2>/dev/null | tr -d '[:space:]')" || cur=""
  if [ -n "$INVOCATION_ID" ] && [ -n "$cur" ] && [ "$cur" != "$INVOCATION_ID" ]; then
    return 0
  fi
  "${SYSTEMCTL[@]}" stop "$UNIT" >/dev/null 2>&1 || true
}
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
  # HostConfig coverage: PASS is only honest if every owned
  # container was actually inspected at least once.
  if [ -s "$OWNED" ] && [ "$HOSTCONFIG" = "PASS" ]; then
    while read -r ocid; do
      if ! grep -qx "$ocid" "$INSPECTED" 2>/dev/null; then
        HOSTCONFIG="UNKNOWN (owned container $ocid never inspected)"
        break
      fi
    done < <(grep -E '^[0-9a-f]{64}$' "$OWNED" | sort -u)
  fi
  # --- harvest ownership: direct records + cidfiles the shim
  #     recorded before delegating (interruption-proof).
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
  # --- containers: current-job record only, baseline excluded,
  #     creation provenance required. FAIL is sticky.
  CONTAINER_CLEAN="PASS"
  local owned_ids=""
  owned_ids="$(grep -v '^#' "$OWNED" 2>/dev/null | grep -E '^[0-9a-f]{64}$' | sort -u || true)"
  local STILL="" NEWUNOWNED="" cid="" CISO="" CREATED_EPOCH=""
  if [ -n "$owned_ids" ]; then
    while IFS= read -r cid; do
      [ -z "$cid" ] && continue
      if printf '%s\n' "$BEFORE_ALL" | grep -qx "$cid"; then
        [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (baseline container in job record; not removed)"
        continue
      fi
      CREATED_EPOCH=""
      if CISO="$("${DOCKER[@]}" inspect -f '{{.Created}}' "$cid" 2>/dev/null)"; then
        CREATED_EPOCH="$(date -d "$CISO" +%s 2>/dev/null || echo "")"
      fi
      if [ -z "$CREATED_EPOCH" ] || [ "$CREATED_EPOCH" -lt "$RUN_START_EPOCH" ]; then
        [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (creation provenance unproven for $cid; not removed)"
        continue
      fi
      if ! "${DOCKER[@]}" rm -f "$cid" >/dev/null 2>&1; then
        CONTAINER_CLEAN="FAIL (rm $cid)"
      fi
    done <<EOF
$owned_ids
EOF
    if [ $((SECONDS - CLEANUP_START)) -gt "${STAGE_CLEANUP_DEADLINE_S:-30}" ]; then
      [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (cleanup ceiling ${STAGE_CLEANUP_DEADLINE_S:-30}s exceeded before re-verify)"
      STILL=""
    elif ! STILL="$("${DOCKER[@]}" ps -aq --no-trunc 2>/dev/null)"; then
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
    if ! STILL="$("${DOCKER[@]}" ps -aq --no-trunc 2>/dev/null)"; then
      CONTAINER_CLEAN="UNKNOWN (post-run inventory failed)"
    else
      NEWUNOWNED="$(comm -13 <(printf '%s\n' "$BEFORE_ALL" | sort -u) <(printf '%s\n' "$STILL" | sort -u) || true)"
      [ -n "$NEWUNOWNED" ] && CONTAINER_CLEAN="UNKNOWN (unowned containers appeared; left in place)"
    fi
  fi
  # --- temp: remove ONLY the job-private directory ------------------
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
  # --- unit termination is a REQUIRED cleanup component -------------
  # PASS requires explicit manager evidence; inspection errors and
  # ambiguous states stay UNKNOWN (never a silent PASS).
  stop_unit
  sleep 1
  if [ "$LAUNCHED" != 1 ]; then
    UNIT_CLEAN="PASS (unit never launched by this invocation; nothing owned to stop)"
  else
    SHOW_OUT="$("${SYSTEMCTL[@]}" show -p LoadState -p ActiveState -p MainPID -p InvocationID "$UNIT" 2>/dev/null)" || SHOW_OUT=""
    if [ -z "$SHOW_OUT" ]; then
      UNIT_CLEAN="UNKNOWN (manager inspection failed during cleanup)"
    else
      LS_="$(printf '%s\n' "$SHOW_OUT" | sed -n 's/^LoadState=//p')"
      AS_="$(printf '%s\n' "$SHOW_OUT" | sed -n 's/^ActiveState=//p')"
      MP_="$(printf '%s\n' "$SHOW_OUT" | sed -n 's/^MainPID=//p')"
      IV_="$(printf '%s\n' "$SHOW_OUT" | sed -n 's/^InvocationID=//p')"
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
  "${SYSTEMCTL[@]}" reset-failed "$UNIT" >/dev/null 2>&1 || true
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
# Self-heal executable modes in the harness tree (Rev 9 safeguard):
# the filing path stores files at 100644, so a fresh checkout may
# lack exec bits. The docker shim is reached through PATH and
# needs +x; healing here is idempotent and confined to this
# package's own tree. (Assembly content is unaffected: modes are
# bound separately by the v2 digest verification above.)
for f in bin/docker run-confined.sh aggregate.sh supervise.sh; do
  [ -f "$STAGE_HARNESS_DIR/$f" ] && chmod 0755 "$STAGE_HARNESS_DIR/$f" 2>/dev/null || true
done

if ! "${SYSTEMD_RUN[@]}" --unit="$UNIT" \
      -p PrivateNetwork=yes -p ProtectSystem=strict \
      -p ReadWritePaths="$STAGE_ROOT $TMP_JOB /var/run/docker.sock" \
      -p MemoryMax=2G -p CPUQuota=200% -p TasksMax=512 \
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
    if [ "$SPOOL_SIZE" -gt "${STAGE_SPOOL_MAX_BYTES:-67108864}" ]; then
      HARNESS="FAIL (producer spool exceeded ${STAGE_SPOOL_MAX_BYTES:-67108864} bytes; unit stopped)"
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
if unit_alive; then "${SYSTEMCTL[@]}" kill "$UNIT" >/dev/null 2>&1 || true; sleep 2; fi

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
    if [ -n "$INVOCATION_ID" ] && [ -n "$TIV" ] && [ "$TIV" != "$INVOCATION_ID" ]; then
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
