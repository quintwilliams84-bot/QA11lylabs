#!/usr/bin/env bash
# Supervisor v4 (Rev 6) for the staging diagnostic harness.
#
# Answers Codex's Rev 5 reviews (root follow-up + independent
# review of e9aca987). Changes from v3:
# - pipefail is ON and every inspection is captured with its own
#   exit status and a hard timeout; a failed inspection is
#   BLOCKED/UNKNOWN evidence, never an empty inventory, and a
#   failed baseline prevents any launch.
# - The staging root is created EXCLUSIVELY by the supervisor
#   (a non-empty preexisting root is refused: stale or shared
#   state is never adopted). The ownership record is a fresh
#   job file created by the supervisor; cleanup removes a
#   container only when it is in that record, absent from the
#   baseline inventory, and provably created after run start.
# - The workload runs as a transient systemd SERVICE (scopes
#   cannot carry service execution sandbox properties). The
#   supervisor owns the unit name from launch, and the hard
#   deadline stops that unit UNCONDITIONALLY - identity
#   uncertainty triggers fail-closed cleanup, never disables
#   cancellation. Every wait is bounded.
# - Temp cleanup removes only the job-private directory the
#   supervisor created inside $STAGE_TMP; unrelated entries are
#   preserved and reported, never deleted.
# - The run log evidence copy is bounded by the supervisor
#   (first 1 MiB plus a truncation marker); the producer's own
#   output spool and runtime files are never capped in place.
#
# Exit codes come from aggregate.sh: 0 PASS, 4 FAIL, 3 BLOCKED.
set -uo pipefail

: "${STAGE_ROOT:?STAGE_ROOT required}"
: "${STAGE_TMP:?STAGE_TMP required}"
: "${STAGE_HARNESS_DIR:?STAGE_HARNESS_DIR required}"
DEADLINE_S="${STAGE_HARD_DEADLINE_S:-240}"
RUN_ID="${STAGE_RUN_ID:-run-$$-$(date +%s)}"
UNIT="qa11y-stage-${RUN_ID}.service"
DOCKER=(timeout 10 docker)
SYSTEMCTL=(timeout 10 systemctl)
SYSTEMD_RUN=(timeout 10 systemd-run)

BASELINE="NOT RUN"; CONFINEMENT="NOT RUN"; IDENTITY="NOT RUN"
HOSTCONFIG="NOT RUN"; HARNESS="NOT RUN"
CONTAINER_CLEAN="NOT RUN"; TMP_CLEAN="NOT RUN"
RUN_START_EPOCH="$(date +%s)"
INTERRUPTED=0

# --- exclusive staging root: refuse stale/shared state -----------
if [ -e "$STAGE_ROOT" ] && [ -n "$(ls -A "$STAGE_ROOT" 2>/dev/null)" ]; then
  echo "BLOCKED: STAGE_ROOT exists and is not empty (stale/shared root refused)" >&2
  exit 3
fi
mkdir -p "$STAGE_ROOT" || { echo "BLOCKED: cannot create STAGE_ROOT" >&2; exit 3; }
JOB_DIR="$STAGE_ROOT/job-$RUN_ID"
mkdir -p "$JOB_DIR" || { echo "BLOCKED: cannot create job dir" >&2; exit 3; }
OWNED="$JOB_DIR/owned-containers.txt"
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
    "confinement": "$CONFINEMENT",
    "identity": "$IDENTITY",
    "hostconfig": "$HOSTCONFIG",
    "harness": "$HARNESS",
    "container_cleanup": "$CONTAINER_CLEAN",
    "tmp_cleanup": "$TMP_CLEAN"
  },
  "overall": "$overall",
  "exit_code": $rc
}
JSON
}
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
aggregate_now() {
  BASELINE="$BASELINE" CONFINEMENT="$CONFINEMENT" IDENTITY="$IDENTITY" \
  HOSTCONFIG="$HOSTCONFIG" HARNESS="$HARNESS" \
  CONTAINER_CLEAN="$CONTAINER_CLEAN" TMP_CLEAN="$TMP_CLEAN" \
  bash "$SELF_DIR/aggregate.sh"
}

stop_unit() { "${SYSTEMCTL[@]}" stop "$UNIT" >/dev/null 2>&1 || true; }
on_interrupt() { INTERRUPTED=1; HARNESS="FAIL (interrupted)"; stop_unit; }
trap on_interrupt INT TERM

# --- baseline inventory (failure BLOCKS, nothing launches) -------
BEFORE_ALL=""
if ! BEFORE_ALL="$("${DOCKER[@]}" ps -aq --no-trunc 2>/dev/null)"; then
  BASELINE="BLOCKED (docker ps failed before launch)"
  write_cleanup BLOCKED 3
  echo "overall: BLOCKED (baseline inspection failed; nothing launched)"
  exit 3
fi
BASELINE="PASS"
BEFORE_FILE="$JOB_DIR/baseline.txt"; printf '%s\n' "$BEFORE_ALL" > "$BEFORE_FILE"

cleanup_phase() {
  # --- containers: current-job record only, baseline excluded,
  #     creation provenance required. FAIL is sticky.
  CONTAINER_CLEAN="PASS"
  local owned_ids=""
  owned_ids="$(grep -v '^#' "$OWNED" 2>/dev/null | grep -E '^[0-9a-f]{64}$' || true)"
  local STILL="" NEWUNOWNED="" cid="" CISO="" CREATED_EPOCH=""
  if [ -n "$owned_ids" ]; then
    while IFS= read -r cid; do
      [ -z "$cid" ] && continue
      if printf '%s\n' "$BEFORE_ALL" | grep -qx "$cid"; then
        # provenance breach: a baseline container in the job record.
        # NEVER removed; caps the component at UNKNOWN.
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
    # re-verify (may only downgrade a PASS; FAIL is sticky)
    if ! STILL="$("${DOCKER[@]}" ps -aq --no-trunc 2>/dev/null)"; then
      [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (re-verify failed)"
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
  stop_unit
  "${SYSTEMCTL[@]}" reset-failed "$UNIT" >/dev/null 2>&1 || true
}

# --- launch as a transient service (sandbox properties apply) ----
LAUNCH_ENV=(
  --setenv=STAGE_ROOT="$JOB_DIR"
  --setenv=STAGE_TMP="$TMP_JOB"
  --setenv=STAGE_JOB_DIR="$JOB_DIR"
  --setenv=STAGE_RUN_ID="$RUN_ID"
  --setenv=STAGE_HARNESS_DIR="$STAGE_HARNESS_DIR"
  --setenv=STAGE_RELEASE_DIR="${STAGE_RELEASE_DIR:-}"
  --setenv=STAGE_PAIRING_PATH="${STAGE_PAIRING_PATH:-}"
  --setenv=STAGE_PAIRING_APPROVAL_FILE="${STAGE_PAIRING_APPROVAL_FILE:-}"
  --setenv=STAGE_PAIRING_MANIFEST="${STAGE_PAIRING_MANIFEST:-}"
  --setenv=STAGE_HOST_ID="${STAGE_HOST_ID:-}"
  --setenv=STAGE_TARGET_URL="${STAGE_TARGET_URL:-https://example.com}"
)
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
  OVERALL_RC="$(aggregate_now)"; OVERALL="${OVERALL_RC%% *}"; RC="${OVERALL_RC##* }"
  write_cleanup "$OVERALL" "$RC"; echo "overall: $OVERALL"; exit "$RC"
fi

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
START_S=$SECONDS
DEADLINE_FIRED=0
while :; do
  if [ "$INTERRUPTED" = 1 ]; then break; fi
  if [ -f "$JOB_DIR/confinement.json" ] && [ "$CONFINEMENT" = "NOT RUN" ]; then
    if grep -q '"confinement":"PASS"' "$JOB_DIR/confinement.json"; then CONFINEMENT="PASS";
    elif grep -q '"confinement":"FAIL"' "$JOB_DIR/confinement.json"; then CONFINEMENT="FAIL"; fi
  fi
  # identity evidence (reporting only; never gates the deadline)
  if [ -f "$JOB_DIR/job.json" ] && [ "$IDENTITY" != "PASS" ]; then
    read -r JPID JSTART < <(python3 -c 'import json,sys
try:
  d=json.load(open(sys.argv[1])); print(d["pid"], d["starttime"])
except Exception: print(0, 0)' "$JOB_DIR/job.json" 2>/dev/null || echo "0 0")
    if [ "${JPID:-0}" != "0" ] && [ -d "/proc/$JPID" ]; then
      ACTUAL_START="$(awk '{print $22}' "/proc/$JPID/stat" 2>/dev/null || echo x)"
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
  if [ $((SECONDS - START_S)) -ge "$DEADLINE_S" ]; then
    DEADLINE_FIRED=1
    stop_unit
    break
  fi
  # owned-container HostConfig spot check (bounded, current job
  # only) - runs before the liveness break so even a fast-exiting
  # workload gets one observation
  if [ -s "$OWNED" ]; then
    while IFS= read -r cid; do
      case "$cid" in \#*|"") continue;; esac
      HC="$("${DOCKER[@]}" inspect -f '{{.HostConfig.Memory}} {{.HostConfig.MemorySwap}} {{.HostConfig.PidsLimit}}' "$cid" 2>/dev/null)" || continue
      if [ "$HC" = "805306368 1000000000 160" ]; then HOSTCONFIG="PASS";
      else HOSTCONFIG="FAIL (HostConfig $HC)"; fi
    done < "$OWNED"
  fi
  unit_alive || break
  sleep 2
done

# bounded wait for the workload to actually exit (max 15s)
for _ in $(seq 1 15); do unit_alive || break; sleep 1; done
if unit_alive; then "${SYSTEMCTL[@]}" kill "$UNIT" >/dev/null 2>&1 || true; sleep 2; fi

# harness verdict from its own result file
if [ -f "$JOB_DIR/result.json" ]; then
  HV="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("overall",""))' "$JOB_DIR/result.json" 2>/dev/null || true)"
  case "$HV" in
    PASS) [ "$INTERRUPTED" = 1 ] || HARNESS="PASS";;
    FAIL) HARNESS="FAIL (harness reported FAIL)";;
    *) HARNESS="UNKNOWN (no harness overall verdict)";;
  esac
elif [ "$HARNESS" = "NOT RUN" ]; then
  if [ "$DEADLINE_FIRED" = 1 ]; then HARNESS="FAIL (hard deadline fired; unit stopped)";
  elif [ "$INTERRUPTED" = 1 ]; then HARNESS="FAIL (interrupted)";
  else HARNESS="UNKNOWN (no result.json)"; fi
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
OVERALL_RC="$(aggregate_now)"; OVERALL="${OVERALL_RC%% *}"; RC="${OVERALL_RC##* }"
write_cleanup "$OVERALL" "$RC"
echo "overall: $OVERALL"
exit "$RC"
