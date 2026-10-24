#!/usr/bin/env bash
# In-unit launcher (Rev 9: Rev 6 design plus exit capture): run by the supervisor's transient
# systemd SERVICE (services, unlike scopes, carry the execution
# sandbox properties). Phase 1 verifies the effective confinement
# from inside (confinement-check.mjs); the harness - and therefore
# any runner import - starts only if that check exits 0.
#
# Output handling (changed in Rev 6): the producer's stdout/stderr
# go to an UNCAPPED spool inside the job dir. The 1 MiB bound is
# applied by the supervisor to the evidence COPY, never to the
# producer tree - capping the tree (the Rev 5 ulimit approach)
# changed runtime and evidence-write semantics and could kill
# legitimate writes. This launcher's exit status is the harness's
# own exit status, preserved end to end.
set -uo pipefail
: "${STAGE_ROOT:?}" "${STAGE_HARNESS_DIR:?}"
export PATH="$STAGE_HARNESS_DIR/bin:$PATH"
# Job-private audit log (Rev 7): the supervisor passes
# STAGE_AUDIT_LOG explicitly; the fallback keeps it inside this
# job's root, never a shared location.
export STAGE_AUDIT_LOG="${STAGE_AUDIT_LOG:-$STAGE_ROOT/audit.log}"
exec >>"$STAGE_ROOT/producer.log" 2>&1
echo "[run-confined] unit started $(date -u +%FT%TZ)"
node "$STAGE_HARNESS_DIR/confinement-check.mjs" > "$STAGE_ROOT/confinement.json.tmp"
CC_RC=$?
mv "$STAGE_ROOT/confinement.json.tmp" "$STAGE_ROOT/confinement.json" 2>/dev/null || true
if [ "$CC_RC" != 0 ]; then
  echo "[run-confined] confinement check FAILED (exit $CC_RC); harness NOT started"
  exit "$CC_RC"
fi
echo "[run-confined] confinement PASS; starting harness"
node --require "$STAGE_HARNESS_DIR/audit-preload.cjs" "$STAGE_HARNESS_DIR/run-scan-once.mjs"
HARNESS_RC=$?
# Record the harness exit status inside the job root as in-unit
# evidence; the supervisor ALSO requires the manager terminal
# status (Result/ExecMainStatus) before any PASS.
printf '%s' "$HARNESS_RC" > "$STAGE_ROOT/service-exit.code" 2>/dev/null || true
echo "[run-confined] harness exited $HARNESS_RC"
exit "$HARNESS_RC"
