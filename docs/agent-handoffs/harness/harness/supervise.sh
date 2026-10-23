#!/usr/bin/env bash
# Supervisor v3 for the staging diagnostic run (Rev 5).
# Reworked per Codex's client-readiness review of harness 1ce5e4c8:
#
# - AUTHORITATIVE STATUS: the overall result is computed from named
#   components. Any component FAIL makes the run FAIL. Any safety
#   component UNKNOWN / BLOCKED / NOT RUN makes the run BLOCKED.
#   PASS requires every component PASS and harness exit 0. Missing
#   evidence is never converted into an empty set and then a PASS:
#   inspection commands are not error-swallowed on safety paths.
# - CONFINEMENT: systemd scope ONLY. The unshare fallback is removed:
#   it could not provide the read-only filesystem, mount allowlist or
#   cgroup limits the design claims, and proceeding on a weaker
#   fallback is exactly what the review rejected. No systemd-run =
#   BLOCKED. Inside the scope, run-confined.sh runs
#   confinement-check.mjs BEFORE the harness, so the runner is never
#   imported unless the effective policy verified from inside.
# - IDENTITY: the stop mechanism is the scope unit's lifetime, never
#   a bare PID. The watchdog verifies job.json's (pid, starttime)
#   pair against /proc AND that the pid descends from the launched
#   systemd-run process AND that its cgroup names the unit, before
#   it records IDENTITY PASS; the deadline action is `systemctl stop`
#   on the unit. A mismatch is recorded, never silently trusted.
# - OWNERSHIP CLEANUP: containers are removed ONLY when their full
#   IDs were captured at creation time by the docker shim inside the
#   job's own process tree (owned-containers.txt). Ids seen only in
#   a before/after diff are reported as unowned-new evidence and are
#   NEVER removed; if any remain, container cleanup is UNKNOWN.
#   Temp-dir removal requires realpath containment inside
#   $STAGE_TMP, no symlinks, and an mtime inside the run window;
#   anything failing a check is left in place and reported UNKNOWN.
# - LOG CAP ENFORCED: run-confined.sh sets ulimit -f so output past
#   1 MiB kills the writer (SIGXFSZ) instead of being measured after
#   the fact; this supervisor records the log stage FAIL if the cap
#   was reached.
# - INTERRUPTION: INT/TERM enter the same cleanup + evidence path
#   (trap), so an interrupted run still produces cleanup.json.
set -u
: "${STAGE_ROOT:?}" "${STAGE_TMP:?}" "${STAGE_RELEASE_DIR:?}" "${STAGE_HARNESS_DIR:?}" "${STAGE_PAIRING_PATH:?}" "${STAGE_PAIRING_APPROVAL_FILE:?}"
export STAGE_AUDIT_LOG="$STAGE_ROOT/audit.log"
JOB_ID="$(date +%s)-$RANDOM$RANDOM"
export STAGE_JOB_ID="$JOB_ID"
DEADLINE="${STAGE_HARD_DEADLINE_S:-240}"
mkdir -p "$STAGE_ROOT" "$STAGE_TMP"
EVIDENCE="$STAGE_ROOT/cleanup.json"
LOG="$STAGE_ROOT/harness.log"
UNIT="qa11y-stage-$JOB_ID"
RUN_START_EPOCH="$(date +%s)"
note() { echo "supervisor: $*"; }

# --- components (empty = not evaluated yet)
BASELINE="" CONFINEMENT="" HARNESS="" HOSTCONFIG="" IDENTITY="" \
SCOPE_CLEAN="" CONTAINER_CLEAN="" TMP_CLEAN="" LOGCAP=""
HARNESS_EXIT="" SEEN_OWNED="" UNOWNED_NEW="" INTERRUPTED=""

# --- baseline (no error swallowing: a failed inspection BLOCKS)
BEFORE_C="" BEFORE_ALL="" BEFORE_T=""
if ! BEFORE_C="$(docker ps -q --no-trunc 2>/dev/null | sort)"; then BASELINE="BLOCKED (docker ps failed: daemon down or permission denied)"; fi
if [ -z "$BASELINE" ]; then
  if ! BEFORE_ALL="$(docker ps -aq --no-trunc 2>/dev/null | sort)"; then BASELINE="BLOCKED (docker ps -a failed)"; fi
fi
if [ -z "$BASELINE" ]; then
  if ! BEFORE_T="$(ls -A "$STAGE_TMP" 2>/dev/null | sort)"; then BASELINE="BLOCKED (cannot list STAGE_TMP)"; fi
fi
[ -z "$BASELINE" ] && BASELINE="PASS"

finish() {
  # --- aggregation (authoritative; implemented in aggregate.sh so
  # the exact rules are unit-testable without a live supervisor)
  local overall exit_code agg
  agg="$(env BASELINE="$BASELINE" CONFINEMENT="${CONFINEMENT:-NOT RUN}" HARNESS="${HARNESS:-NOT RUN}" \
    HOSTCONFIG="${HOSTCONFIG:-NOT RUN}" IDENTITY="${IDENTITY:-NOT RUN}" SCOPE_CLEAN="${SCOPE_CLEAN:-NOT RUN}" \
    CONTAINER_CLEAN="${CONTAINER_CLEAN:-NOT RUN}" TMP_CLEAN="${TMP_CLEAN:-NOT RUN}" LOGCAP="${LOGCAP:-NOT RUN}" \
    bash "$STAGE_HARNESS_DIR/aggregate.sh")"
  overall="${agg% *}"; exit_code="${agg#* }"
  printf '{"job_id": "%s", "unit": "%s", "overall": "%s", "baseline": "%s", "confinement": "%s", "harness_exit": "%s", "harness": "%s", "identity": "%s", "hostconfig": "%s", "scope_cleanup": "%s", "container_cleanup": "%s", "tmp_cleanup": "%s", "log_cap": "%s", "owned_containers": "%s", "unowned_new_containers": "%s", "interrupted": "%s"}\n' \
    "$JOB_ID" "$UNIT" "$overall" "$BASELINE" "${CONFINEMENT:-NOT RUN}" "${HARNESS_EXIT:-}" "${HARNESS:-NOT RUN}" "${IDENTITY:-NOT RUN}" "${HOSTCONFIG:-NOT RUN}" "${SCOPE_CLEAN:-NOT RUN}" "${CONTAINER_CLEAN:-NOT RUN}" "${TMP_CLEAN:-NOT RUN}" "${LOGCAP:-NOT RUN}" "${SEEN_OWNED:-}" "${UNOWNED_NEW:-}" "${INTERRUPTED:-no}" > "$EVIDENCE"
  note "overall=$overall baseline=$BASELINE confinement=${CONFINEMENT:-NOT RUN} harness=${HARNESS:-NOT RUN} identity=${IDENTITY:-NOT RUN} hostconfig=${HOSTCONFIG:-NOT RUN} scope=${SCOPE_CLEAN:-NOT RUN} containers=${CONTAINER_CLEAN:-NOT RUN} tmp=${TMP_CLEAN:-NOT RUN} log=${LOGCAP:-NOT RUN}"
  exit "$exit_code"
}

cleanup() {
  # scope (unit lifetime is the stop mechanism)
  if [ -n "$UNIT" ]; then
    if ! timeout 10 systemctl stop "$UNIT" >/dev/null 2>&1; then SCOPE_CLEAN="UNKNOWN (systemctl stop errored)";
    elif systemctl show "$UNIT" -p ControlGroup >/dev/null 2>&1; then SCOPE_CLEAN="UNKNOWN (unit still present after stop)";
    else SCOPE_CLEAN="PASS"; fi
  fi
  # containers: owned ids only (captured at creation by the shim)
  local owned=""
  [ -f "$STAGE_ROOT/owned-containers.txt" ] && owned="$(sort -u "$STAGE_ROOT/owned-containers.txt" | grep -v '^$' || true)"
  SEEN_OWNED="$(echo "$owned" | tr '\n' ' ')"
  local after_all=""
  if ! after_all="$(docker ps -aq --no-trunc 2>/dev/null | sort)"; then
    CONTAINER_CLEAN="UNKNOWN (docker ps -a failed during cleanup)"
  else
    UNOWNED_NEW="$(comm -13 <(echo "$BEFORE_ALL") <(echo "$after_all") | grep -v '^$' | grep -vxF -f <(echo "$owned") || true)"
    UNOWNED_NEW="$(echo "$UNOWNED_NEW" | tr '\n' ' ')"
    if [ -z "$owned" ]; then
      CONTAINER_CLEAN="UNKNOWN (no creation-time container capture; ownership unproven)"
    else
      CONTAINER_CLEAN="PASS"
      local id still
      for id in $owned; do
        if echo "$after_all" | grep -qx "$id"; then
          timeout 10 docker rm -f "$id" >/dev/null 2>&1 || CONTAINER_CLEAN="FAIL (rm $id)"
        fi
      done
      # FAIL is sticky: re-verification may only downgrade a PASS.
      if ! still="$(docker ps -aq --no-trunc 2>/dev/null)"; then
        [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (re-verify failed)"
      else
        for id in $owned; do
          if echo "$still" | grep -qx "$id" && [ "$CONTAINER_CLEAN" = "PASS" ]; then CONTAINER_CLEAN="UNKNOWN (owned $id still present)"; fi
        done
      fi
    fi
    [ -n "$(echo "$UNOWNED_NEW" | tr -d ' ')" ] && [ "$CONTAINER_CLEAN" = "PASS" ] && CONTAINER_CLEAN="UNKNOWN (unowned new containers remain; not removed)"
  fi
  # temp dirs: containment + ownership checks before any removal
  local after_t tleft d rp
  if ! after_t="$(ls -A "$STAGE_TMP" 2>/dev/null | sort)"; then TMP_CLEAN="UNKNOWN (cannot list STAGE_TMP)";
  else
    tleft="$(comm -13 <(echo "$BEFORE_T") <(echo "$after_t") | grep -v '^$' || true)"
    if [ -z "$tleft" ]; then TMP_CLEAN="PASS";
    else
      TMP_CLEAN="PASS"
      local tmp_real; tmp_real="$(realpath "$STAGE_TMP")"
      for d in $tleft; do
        if [ -L "$STAGE_TMP/$d" ]; then TMP_CLEAN="UNKNOWN (refused symlink $d)"; continue; fi
        rp="$(realpath "$STAGE_TMP/$d" 2>/dev/null || echo "")"
        if [ "$(dirname "$rp")" != "$tmp_real" ]; then TMP_CLEAN="UNKNOWN (containment failed for $d)"; continue; fi
        if [ "$(stat -c%Y "$STAGE_TMP/$d" 2>/dev/null || echo 0)" -lt "$RUN_START_EPOCH" ]; then TMP_CLEAN="UNKNOWN (mtime predates run for $d)"; continue; fi
        rm -rf "$STAGE_TMP/$d" || TMP_CLEAN="FAIL (rm $d)"
      done
      local remain; remain="$(comm -13 <(echo "$BEFORE_T") <(ls -A "$STAGE_TMP" 2>/dev/null | sort) | grep -v '^$' || true)"
      [ -n "$remain" ] && [ "$TMP_CLEAN" = "PASS" ] && TMP_CLEAN="UNKNOWN (leftovers remain)"
    fi
  fi
}

FINISHED=""
run_finish() { [ -n "$FINISHED" ] && return; FINISHED=1; cleanup; finish; }
trap 'INTERRUPTED="yes"; [ -z "$HARNESS" ] && HARNESS="FAIL"; note "interrupted - stopping unit, cleanup follows in main flow"; timeout 10 systemctl stop "$UNIT" >/dev/null 2>&1 || true' INT TERM

if [ "$BASELINE" != "PASS" ]; then note "$BASELINE"; run_finish; fi

# --- launch (systemd scope only; no weaker fallback)
if ! command -v systemd-run >/dev/null 2>&1; then
  CONFINEMENT="BLOCKED (systemd-run unavailable; unshare fallback removed in Rev 5)"
  note "$CONFINEMENT"; run_finish
fi
systemd-run --scope --unit="$UNIT" --quiet \
  -p PrivateNetwork=yes -p ProtectSystem=strict \
  -p ReadWritePaths="$STAGE_ROOT" -p ReadWritePaths="$STAGE_TMP" \
  -p ReadWritePaths=/var/run/docker.sock \
  -p MemoryMax=2G -p CPUQuota=200% -p TasksMax=512 \
  bash "$STAGE_HARNESS_DIR/run-confined.sh" > "$LOG" 2>&1 &
HPID=$!
sleep 1
if ! systemctl show "$UNIT" -p ControlGroup >/dev/null 2>&1; then
  CONFINEMENT="BLOCKED (scope not established)"
  note "$CONFINEMENT"; run_finish
fi
note "mode=systemd-scope job=$JOB_ID unit=$UNIT harness_pid=$HPID"

# --- watchdog: identity-verified unit stop at the hard deadline
JOB_PID="" JOB_ST=""
for i in $(seq 1 20); do [ -f "$STAGE_ROOT/job.json" ] && break; sleep 0.5; done
if [ -f "$STAGE_ROOT/job.json" ]; then
  JOB_PID="$(python3 -c "import json;print(json.load(open('$STAGE_ROOT/job.json'))['pid'])" 2>/dev/null || echo "")"
  JOB_ST="$(python3 -c "import json;print(json.load(open('$STAGE_ROOT/job.json'))['proc_starttime'])" 2>/dev/null || echo "")"
fi
identity_check() {
  # PASS only if: job.json pair matches /proc, the pid descends from
  # the launched systemd-run process, and its cgroup names the unit.
  [ -n "$JOB_PID" ] && [ -n "$JOB_ST" ] || return 1
  [ -r "/proc/$JOB_PID/stat" ] || return 1
  local now_st ppid cg
  now_st="$(awk -F') ' '{split($2,a," "); print a[20]}' "/proc/$JOB_PID/stat" 2>/dev/null || echo "")"
  # /proc stat field 22 (starttime) = token 20 of the fields after comm
  [ "$now_st" = "$JOB_ST" ] || return 1
  ppid="$JOB_PID"
  while [ -n "$ppid" ] && [ "$ppid" != "1" ] && [ "$ppid" != "0" ]; do
    [ "$ppid" = "$HPID" ] && break
    ppid="$(awk '{print $4}' "/proc/$ppid/stat" 2>/dev/null || echo "")"
  done
  [ "$ppid" = "$HPID" ] || return 1
  cg="$(cat "/proc/$JOB_PID/cgroup" 2>/dev/null || echo "")"
  echo "$cg" | grep -q "$UNIT" || return 1
  return 0
}
if [ -n "$JOB_PID" ]; then
  if identity_check; then IDENTITY="PASS"; else IDENTITY="UNKNOWN (job identity not bound to this scope)"; fi
else
  IDENTITY="UNKNOWN (job.json missing)"
fi
( sleep "$DEADLINE"
  if systemctl show "$UNIT" -p ControlGroup >/dev/null 2>&1; then
    if [ "$IDENTITY" = "PASS" ]; then systemctl stop "$UNIT" >/dev/null 2>&1; fi
  fi ) &
WATCH=$!

# --- HostConfig watch on OWNED containers (creation-time capture)
HOSTCONFIG="NOT RUN"
deadline_watch=$(( $(date +%s) + DEADLINE + 30 ))
while kill -0 "$HPID" 2>/dev/null; do
  if [ -f "$STAGE_ROOT/owned-containers.txt" ]; then
    first_owned="$(grep -v '^$' "$STAGE_ROOT/owned-containers.txt" | head -1 || true)"
    if [ -n "$first_owned" ]; then
      hc=""
      if hc="$(docker inspect -f '{{.HostConfig.Memory}} {{.HostConfig.NanoCpus}} {{.HostConfig.PidsLimit}}' "$first_owned" 2>/dev/null)"; then
        if [ "$hc" = "805306368 1000000000 160" ]; then HOSTCONFIG="PASS"; else HOSTCONFIG="FAIL (HostConfig: $hc)"; fi
      else HOSTCONFIG="UNKNOWN (docker inspect failed)"; fi
      break
    fi
  fi
  [ "$(date +%s)" -gt "$deadline_watch" ] && break
  sleep 1
done
[ "$HOSTCONFIG" = "NOT RUN" ] && HOSTCONFIG="UNKNOWN (no owned container captured while harness ran)"

wait "$HPID"; HARNESS_EXIT=$?
kill "$WATCH" 2>/dev/null
case "$HARNESS_EXIT" in
  0) HARNESS="PASS" ;;
  3) HARNESS="BLOCKED" ;;
  *) HARNESS="FAIL" ;;
esac
if [ -s "$LOG" ] && grep -q '"confinement":"PASS"' "$LOG"; then CONFINEMENT="PASS";
elif [ -s "$LOG" ] && grep -q '"confinement":"FAIL"' "$LOG"; then CONFINEMENT="FAIL";
else CONFINEMENT="UNKNOWN (no confinement-check PASS line in log)"; fi
if [ -f "$LOG" ] && [ "$(stat -c%s "$LOG")" -ge 1048576 ]; then LOGCAP="FAIL (log reached the enforced 1 MiB cap)"; else LOGCAP="PASS"; fi

run_finish
