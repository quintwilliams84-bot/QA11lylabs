#!/usr/bin/env bash
# Supervisor v2 for the staging diagnostic run.
# Confinement is established BEFORE any runner code is imported, at OS
# level; the audit preload is evidence logging only, never the boundary.
# Preferred confinement: a systemd scope (lifetime tracked by unit +
# cgroup) with sandbox properties. Fallback: unshare mount+net
# namespaces. If neither is available the run is BLOCKED - the harness
# never runs unconfined.
# Identity: the run has a random JOB_ID; the harness writes job.json
# with (pid, /proc starttime). Every later kill/stop decision re-verifies
# that pair before acting - a bare PID is never trusted.
# Docker workers are daemon-owned and OUTSIDE the harness cgroup: they
# are handled independently by before/after container-id diff, and the
# created container's HostConfig limits are verified against the
# declared worker caps (768 MiB, 1 CPU, 160 PIDs) while it lives.
set -u
: "${STAGE_ROOT:?}" "${STAGE_TMP:?}" "${STAGE_RELEASE_DIR:?}" "${STAGE_HARNESS_DIR:?}" "${STAGE_PAIRING_PATH:?}"
export STAGE_AUDIT_LOG="$STAGE_ROOT/audit.log"
JOB_ID="$(date +%s)-$RANDOM$RANDOM"
export STAGE_JOB_ID="$JOB_ID"
mkdir -p "$STAGE_ROOT" "$STAGE_TMP"
EVIDENCE="$STAGE_ROOT/cleanup.json"
LOG="$STAGE_ROOT/harness.log"
OVERALL="PASS"; note() { echo "supervisor: $*"; }

# --- container baseline (daemon-owned workers tracked independently)
BEFORE_C=$(docker ps -q 2>/dev/null | sort || true)
BEFORE_T=$(ls -A "$STAGE_TMP" 2>/dev/null | sort || true)

# --- launch confined
if command -v systemd-run >/dev/null 2>&1; then
  MODE="systemd-scope"; UNIT="qa11y-stage-$JOB_ID"
  systemd-run --scope --unit="$UNIT" --quiet \
    -p PrivateNetwork=yes -p ProtectSystem=strict \
    -p ReadWritePaths="$STAGE_ROOT" -p ReadWritePaths=/var/run/docker.sock \
    -p MemoryMax=2G -p CPUQuota=200% -p TasksMax=512 \
    node --require "$STAGE_HARNESS_DIR/audit-preload.cjs" \
    "$STAGE_HARNESS_DIR/run-scan-once.mjs" > "$LOG" 2>&1 &
  HPID=$!
  # verify the scope actually exists before trusting confinement
  sleep 1
  systemctl show "$UNIT" -p ControlGroup >/dev/null 2>&1 || { OVERALL="BLOCKED (scope not established)"; }
elif command -v unshare >/dev/null 2>&1; then
  MODE="unshare"
  unshare -m -n bash -c '
    ip link set lo up 2>/dev/null
    exec node --require "$1" "$2"' _ \
    "$STAGE_HARNESS_DIR/audit-preload.cjs" "$STAGE_HARNESS_DIR/run-scan-once.mjs" \
    > "$LOG" 2>&1 &
  HPID=$!
else
  echo '{"mode":"none","overall":"BLOCKED - no confinement mechanism available"}' > "$EVIDENCE"
  echo "supervisor: BLOCKED - neither systemd-run nor unshare available"; exit 3
fi
note "mode=$MODE job=$JOB_ID harness_pid=$HPID"

# --- hard stop at 240s (identity-verified: pid + starttime from job.json)
START_TIME=""
for i in $(seq 1 20); do [ -f "$STAGE_ROOT/job.json" ] && break; sleep 0.5; done
[ -f "$STAGE_ROOT/job.json" ] && START_TIME=$(python3 -c "import json;print(json.load(open('$STAGE_ROOT/job.json'))['proc_starttime'])" 2>/dev/null || echo "")
( sleep 240
  if [ -n "$START_TIME" ] && [ -r "/proc/$HPID/stat" ]; then
    NOW_ST=$(awk '{print $22}' "/proc/$HPID/stat" 2>/dev/null || echo "")
    [ "$NOW_ST" = "$START_TIME" ] && kill -KILL "$HPID" 2>/dev/null
  fi ) &
WATCH=$!

# --- watch for the job container while it lives; verify HostConfig caps
SEEN_CONTAINER=""; HOSTCONFIG="NOT RUN"
for i in $(seq 1 200); do
  kill -0 "$HPID" 2>/dev/null || break
  NOW_C=$(docker ps -q 2>/dev/null | sort || true)
  NEW_C=$(comm -13 <(echo "$BEFORE_C") <(echo "$NOW_C") | grep -v '^$' | head -1 || true)
  if [ -n "$NEW_C" ]; then
    SEEN_CONTAINER="$NEW_C"
    HC=$(docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}} {{.HostConfig.PidsLimit}}' "$NEW_C" 2>/dev/null || echo "")
    if [ "$HC" = "805306368 1000000000 160" ]; then HOSTCONFIG="PASS (768MiB/1CPU/160PIDs as declared)";
    elif [ -n "$HC" ]; then HOSTCONFIG="FAIL (HostConfig: $HC)"; else HOSTCONFIG="UNKNOWN"; fi
    break
  fi
  sleep 1
done

wait "$HPID"; HARNESS_EXIT=$?
kill "$WATCH" 2>/dev/null
[ -s "$LOG" ] && [ "$(stat -c%s "$LOG")" -gt 1048576 ] && OVERALL="FAIL (log overflow > 1 MiB)"

# --- cleanup: bounded, identity-based, verified; failure = UNKNOWN/FAIL
if [ "$MODE" = "systemd-scope" ]; then
  timeout 10 systemctl stop "$UNIT" >/dev/null 2>&1 || true
  systemctl show "$UNIT" -p ControlGroup >/dev/null 2>&1 && SCOPE_CLEAN="UNKNOWN (unit still present)" || SCOPE_CLEAN="PASS"
else SCOPE_CLEAN="NOT RUN (unshare mode: namespace dies with the process)"; fi
AFTER_C=$(docker ps -q 2>/dev/null | sort || true)
LEFTOVER=$(comm -13 <(echo "$BEFORE_C") <(echo "$AFTER_C") | grep -v '^$' || true)
CONTAINER_CLEAN="PASS"
if [ -n "$LEFTOVER" ]; then
  for id in $LEFTOVER; do timeout 10 docker rm -f "$id" >/dev/null 2>&1 || CONTAINER_CLEAN="FAIL (rm $id)"; done
  STILL=$(docker ps -q 2>/dev/null | grep -Ff <(echo "$LEFTOVER") || true)
  [ -n "$STILL" ] && CONTAINER_CLEAN="UNKNOWN (leftover: $STILL)"
fi
AFTER_T=$(ls -A "$STAGE_TMP" 2>/dev/null | sort || true)
TLEFT=$(comm -13 <(echo "$BEFORE_T") <(echo "$AFTER_T") | grep -v '^$' || true)
TMP_CLEAN="PASS"
if [ -n "$TLEFT" ]; then
  for d in $TLEFT; do rm -rf "${STAGE_TMP:?}/$d" || TMP_CLEAN="FAIL (rm $d)"; done
  [ -n "$(comm -13 <(echo "$BEFORE_T") <(ls -A "$STAGE_TMP" | sort))" ] && TMP_CLEAN="UNKNOWN"
fi
printf '{"job_id": "%s", "mode": "%s", "harness_exit": %s, "overall": "%s", "scope_cleanup": "%s", "container_seen": "%s", "hostconfig": "%s", "container_cleanup": "%s", "tmp_cleanup": "%s"}\n' \
  "$JOB_ID" "$MODE" "$HARNESS_EXIT" "$OVERALL" "$SCOPE_CLEAN" "$SEEN_CONTAINER" "$HOSTCONFIG" "$CONTAINER_CLEAN" "$TMP_CLEAN" > "$EVIDENCE"
note "exit=$HARNESS_EXIT scope=$SCOPE_CLEAN hostconfig=$HOSTCONFIG containers=$CONTAINER_CLEAN tmp=$TMP_CLEAN overall=$OVERALL"
[ "$OVERALL" = "PASS" ] || exit 4
exit "$HARNESS_EXIT"
