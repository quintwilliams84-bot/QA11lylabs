#!/usr/bin/env bash
# In-scope launcher (Rev 5): run BY systemd-run inside the scope.
# Phase 1 verifies the effective confinement from inside
# (confinement-check.mjs); the harness - and therefore any runner
# import - starts only if that check exits 0.
# The output cap is ENFORCED, not measured afterwards: ulimit -f
# caps file growth (harness log, audit log, result files) at
# 1024 x 1024 bytes; a writer past the cap is killed by SIGXFSZ and
# the supervisor records the log stage as FAIL.
# The docker shim is first on PATH so container creation inside the
# job's process tree is captured at creation time (owned ids).
set -u
ulimit -f 1024
export PATH="$STAGE_HARNESS_DIR/bin:$PATH"
node "$STAGE_HARNESS_DIR/confinement-check.mjs" || exit 66
exec node --require "$STAGE_HARNESS_DIR/audit-preload.cjs" \
  "$STAGE_HARNESS_DIR/run-scan-once.mjs"
