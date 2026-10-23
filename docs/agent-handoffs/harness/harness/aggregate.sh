#!/usr/bin/env bash
# Authoritative status aggregation (Rev 9 semantics), used by supervise.sh and
# unit-tested directly by tests/run-regression.sh. Component statuses
# arrive via the environment: BASELINE ASSEMBLY CONFINEMENT
# IDENTITY HOSTCONFIG HARNESS CONTAINER_CLEAN TMP_CLEAN UNIT_CLEAN.
# Rules (Codex client-readiness review of 1ce5e4c8, High 1):
#   - baseline not PASS            -> BLOCKED (inspections failed)
#   - any component FAIL           -> FAIL
#   - every component PASS         -> PASS
#   - anything else (UNKNOWN, BLOCKED, NOT RUN, missing evidence)
#                                  -> BLOCKED; absence of evidence is
#                                     never a PASS.
# Prints "<OVERALL> <EXIT_CODE>": PASS 0, FAIL 4, BLOCKED 3.
set -u
if [ "${BASELINE:-}" != "PASS" ]; then echo "BLOCKED 3"; exit 0; fi
for c in ASSEMBLY CONFINEMENT IDENTITY HOSTCONFIG HARNESS CONTAINER_CLEAN TMP_CLEAN UNIT_CLEAN; do
  v="${!c:-}"
  case "$v" in FAIL|FAIL\ *) echo "FAIL 4"; exit 0 ;; esac
done
allpass=1
for c in ASSEMBLY CONFINEMENT IDENTITY HOSTCONFIG HARNESS CONTAINER_CLEAN TMP_CLEAN UNIT_CLEAN; do
  [ "${!c:-}" = "PASS" ] || allpass=0
done
if [ "$allpass" = "1" ]; then echo "PASS 0"; else echo "BLOCKED 3"; fi
