#!/usr/bin/env bash
# Fixture in-scope launcher for supervisor stub tests: shim first on
# PATH (real shim, delegating to the stub docker), then the fixture
# confinement check, then the fixture harness. No ulimit: the stub
# environment is not the enforced-cap environment.
set -u
export PATH="$STAGE_HARNESS_DIR/bin:$PATH"
node "$STAGE_HARNESS_DIR/confinement-check.mjs" || exit 66
exec node "$STAGE_HARNESS_DIR/run-scan-once.mjs"
