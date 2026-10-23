#!/usr/bin/env bash
# Fixture in-unit launcher (Rev 6 semantics): shim first on PATH,
# output spooled uncapped to producer.log, confinement evidence
# written, then the fixture harness replaces this process.
set -uo pipefail
export PATH="$STAGE_HARNESS_DIR/bin:$PATH"
export STAGE_AUDIT_LOG="${STAGE_AUDIT_LOG:-$STAGE_ROOT/audit.log}"
exec >>"$STAGE_ROOT/producer.log" 2>&1
node "$STAGE_HARNESS_DIR/confinement-check.mjs" > "$STAGE_ROOT/confinement.json" || exit $?
exec node "$STAGE_HARNESS_DIR/run-scan-once.mjs"
