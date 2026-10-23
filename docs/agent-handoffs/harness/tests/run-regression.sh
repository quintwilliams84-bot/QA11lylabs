#!/usr/bin/env bash
# Synthetic regression suite for harness Rev 5 (test doubles and
# stubs ONLY - never the real runner, never a real client target).
# Covers the failure classes named in Codex's client-readiness
# review of 1ce5e4c8:
#   A. pairing verifier: schema validation (52-char digest), error
#      kinds (ENOENT vs ENOTDIR), coherent pairing gate (exit 0 path)
#   B. harness: bounded {lh, axe} contract validation, env gate
#      (credential patterns, symlink escape, approval record),
#      job.json written only after the gate
#   C. aggregate.sh: authoritative status rules
#   D. confinement-check on this unconfined machine must FAIL
#   E. supervisor under stubs: daemon down, HostConfig mismatch,
#      failed cleanup (happy path is informational: IDENTITY needs a
#      real scope cgroup, unavailable under stubs)
# Usage: bash tests/run-regression.sh   (from the package root)
# Exit 0 = all gated cases pass. Prints one line per case.
set -u
PKG="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
PASS=0 FAIL=0 FAILED_CASES=""
ok()   { PASS=$((PASS+1)); echo "PASS  $1"; }
bad()  { FAIL=$((FAIL+1)); FAILED_CASES="$FAILED_CASES $1"; echo "FAIL  $1 - $2"; }
info() { echo "INFO  $1"; }
CLEANENV=(env -i PATH="$PATH" HOME="$HOME")

# ============ A. pairing verifier ============
VA="$WORK/va"; mkdir -p "$VA/release/deps" "$VA/release/lighthouse-bundle"
for f in runner.cjs worker.cjs watchdog.cjs egress_proxy.py seccomp_profile.json; do echo "content-$f" > "$VA/release/$f"; done
echo lock > "$VA/release/deps/.package-lock.json"; echo lock2 > "$VA/release/lighthouse-bundle/package-lock.json"
echo chrome-binary > "$VA/chrome"
python3 - "$VA" << 'PYEOF'
import json, hashlib, os, sys
va = sys.argv[1]
def h(p):
    with open(p, 'rb') as fh: return hashlib.sha256(fh.read()).hexdigest()
files = ["runner.cjs", "worker.cjs", "watchdog.cjs", "egress_proxy.py",
         "seccomp_profile.json", "deps/.package-lock.json",
         "lighthouse-bundle/package-lock.json"]
manifest = {
  "manifest_version": 1,
  "release": {"name": "fixture"},
  "worker_image": {"id": "sha256:" + "b" * 64},
  "host_browser": {"sha256": h(f"{va}/chrome"), "bytes": os.path.getsize(f"{va}/chrome")},
  "release_files": [{"path": f, "sha256": h(f"{va}/release/{f}")} for f in files],
  "absent_inputs": ["deps/package.json", "deps/package-lock.json"],
}
with open(f"{va}/manifest.json", "w") as fh: json.dump(manifest, fh, indent=2)
bad = dict(manifest)
bad["release_files"] = [dict(x) for x in manifest["release_files"]]
for x in bad["release_files"]:
    if x["path"] == "worker.cjs": x["sha256"] = x["sha256"][:52]
with open(f"{va}/manifest-bad-digest.json", "w") as fh: json.dump(bad, fh, indent=2)
with open(f"{va}/approval.json", "w") as fh:
    json.dump({"path": "b", "approved_by": "test-fixture", "approved_at": "2026-10-22"}, fh)
PYEOF
IMG="sha256:$(printf 'b%.0s' $(seq 1 64))"
OUT="$("${CLEANENV[@]}" node "$PKG/pairing/preflight-verify.mjs" --manifest "$VA/manifest.json" --release-root "$VA/release" --chrome-path "$VA/chrome" --image-id "$IMG" --pairing-approval "$VA/approval.json" 2>&1)"; RC=$?
[ $RC -eq 0 ] && echo "$OUT" | grep -q "OVERALL: PASS" && ok "A1 verifier exit 0 with approval record" || bad "A1" "rc=$RC out=$OUT"
OUT="$("${CLEANENV[@]}" node "$PKG/pairing/preflight-verify.mjs" --manifest "$VA/manifest.json" --release-root "$VA/release" --chrome-path "$VA/chrome" --image-id "$IMG" 2>&1)"; RC=$?
[ $RC -eq 3 ] && echo "$OUT" | grep -q "pairing-gate - \|pairing-gate.*BLOCKED" && ok "A2 verifier BLOCKED without approval record" || bad "A2" "rc=$RC out=$OUT"
OUT="$("${CLEANENV[@]}" node "$PKG/pairing/preflight-verify.mjs" --manifest "$VA/manifest-bad-digest.json" --release-root "$VA/release" --chrome-path "$VA/chrome" --image-id "$IMG" --pairing-approval "$VA/approval.json" 2>&1)"; RC=$?
[ $RC -eq 2 ] && echo "$OUT" | grep -q "schema:file:worker.cjs" && ok "A3 verifier catches 52-char digest as schema FAIL" || bad "A3" "rc=$RC out=$OUT"
echo tampered >> "$VA/release/worker.cjs"
OUT="$("${CLEANENV[@]}" node "$PKG/pairing/preflight-verify.mjs" --manifest "$VA/manifest.json" --release-root "$VA/release" --chrome-path "$VA/chrome" --image-id "$IMG" --pairing-approval "$VA/approval.json" 2>&1)"; RC=$?
[ $RC -eq 2 ] && echo "$OUT" | grep -q "file:worker.cjs.*hash mismatch" && ok "A4 verifier catches hash mismatch" || bad "A4" "rc=$RC out=$OUT"
# A5: absence check must distinguish ENOTDIR from ENOENT
mkdir -p "$WORK/a5/release"; echo notadir > "$WORK/a5/release/deps"
OUT="$("${CLEANENV[@]}" node "$PKG/pairing/preflight-verify.mjs" --manifest "$VA/manifest.json" --release-root "$WORK/a5/release" --chrome-path "$VA/chrome" --image-id "$IMG" --pairing-approval "$VA/approval.json" 2>&1)"; RC=$?
echo "$OUT" | grep -q "absent:deps/package.json.*ENOTDIR" && ok "A5 absence check names ENOTDIR, not PASS" || bad "A5" "out=$OUT"

# ============ B. harness contract + env gate ============
HB="$WORK/hb"; mkdir -p "$HB"
echo '{"path":"b","approved_by":"test-fixture","approved_at":"2026-10-22"}' > "$HB/approval.json"
mkcase() { # $1 name $2 runner-body
  mkdir -p "$HB/$1/stage/release"
  printf '%s\n' "$2" > "$HB/$1/stage/release/runner.cjs"
}
run_harness() { # $1 case-dir; extra env via global EXTRA_ENV array
  "${CLEANENV[@]}" "${EXTRA_ENV[@]}" \
    STAGE_ROOT="$HB/$1/stage" STAGE_RELEASE_DIR="$HB/$1/stage/release" \
    STAGE_HARNESS_DIR="$PKG/harness" STAGE_JOB_ID="test-$1" \
    STAGE_PAIRING_PATH=captured-runtime STAGE_PAIRING_APPROVAL_FILE="$HB/approval.json" \
    node "$PKG/harness/run-scan-once.mjs" > "$HB/$1/out.log" 2>&1
}
EXTRA_ENV=()
mkcase good 'module.exports = { runScan: async () => ({ lh: { score: null, contrast: "ok", viewport: "ok" }, axe: { violations: [], passes: [{}], pageTitle: "t", metaDesc: "" } }) };'
run_harness good; RC=$?
if [ $RC -eq 0 ] && python3 -c "
import json,sys
r=json.load(open('$HB/good/stage/result.json'))
assert r['stages']['scan']['status']=='PASS', r
assert r['stages']['lh-score']['status']=='NOT RUN', r
import os; assert os.path.exists('$HB/good/stage/job.json')
"; then ok "B1 valid contract, null score NOT RUN, job.json written"; else bad "B1" "rc=$RC $(cat "$HB/good/out.log")"; fi
mkcase bad 'module.exports = { runScan: async () => ({ unexpected: true }) };'
run_harness bad; RC=$?
if [ $RC -eq 2 ] && grep -q "contract violation" "$HB/bad/stage/result.json"; then ok "B2 malformed result is FAIL, not PASS"; else bad "B2" "rc=$RC $(cat "$HB/bad/out.log")"; fi
mkcase noapproval 'module.exports = { runScan: async () => ({}) };'
EXTRA_ENV=()
"${CLEANENV[@]}" STAGE_ROOT="$HB/noapproval/stage" STAGE_RELEASE_DIR="$HB/noapproval/stage/release" \
  STAGE_HARNESS_DIR="$PKG/harness" STAGE_JOB_ID="test-noapproval" STAGE_PAIRING_PATH=captured-runtime \
  node "$PKG/harness/run-scan-once.mjs" > "$HB/noapproval/out.log" 2>&1; RC=$?
if [ $RC -eq 3 ] && [ ! -f "$HB/noapproval/stage/job.json" ] && grep -q "BLOCKED" "$HB/noapproval/stage/result.json"; then
  ok "B3 missing approval record BLOCKS before job.json exists"; else bad "B3" "rc=$RC jobjson=$(ls "$HB/noapproval/stage")"; fi
mkcase cred 'module.exports = { runScan: async () => ({}) };'
EXTRA_ENV=(SOME_API_KEY=fixture)
run_harness cred; RC=$?
[ $RC -eq 3 ] && ok "B4 credential-pattern env BLOCKS" || bad "B4" "rc=$RC"
EXTRA_ENV=()
mkdir -p "$HB/outside" "$HB/escape/stage"
printf '%s\n' 'module.exports = { runScan: async () => ({}) };' > "$HB/outside/runner.cjs"
ln -s "$HB/outside" "$HB/escape/stage/release"
"${CLEANENV[@]}" STAGE_ROOT="$HB/escape/stage" STAGE_RELEASE_DIR="$HB/escape/stage/release" \
  STAGE_HARNESS_DIR="$PKG/harness" STAGE_JOB_ID="test-escape" \
  STAGE_PAIRING_PATH=captured-runtime STAGE_PAIRING_APPROVAL_FILE="$HB/approval.json" \
  node "$PKG/harness/run-scan-once.mjs" > "$HB/escape/out.log" 2>&1; RC=$?
[ $RC -eq 3 ] && ok "B5 symlink escape of release dir BLOCKS" || bad "B5" "rc=$RC $(cat "$HB/escape/out.log")"

# ============ C. aggregate.sh ============
agg() { env BASELINE="$1" CONFINEMENT="$2" HARNESS="$3" HOSTCONFIG="$4" IDENTITY="$5" SCOPE_CLEAN="$6" CONTAINER_CLEAN="$7" TMP_CLEAN="$8" LOGCAP="$9" bash "$PKG/harness/aggregate.sh"; }
[ "$(agg PASS PASS PASS PASS PASS PASS PASS PASS PASS)" = "PASS 0" ] && ok "C1 all PASS aggregates PASS" || bad "C1" "$(agg PASS PASS PASS PASS PASS PASS PASS PASS PASS)"
[ "$(agg PASS PASS PASS 'FAIL (x)' PASS PASS PASS PASS PASS)" = "FAIL 4" ] && ok "C2 any FAIL aggregates FAIL" || bad "C2" ""
[ "$(agg PASS PASS PASS PASS 'UNKNOWN (x)' PASS PASS PASS PASS)" = "BLOCKED 3" ] && ok "C3 UNKNOWN blocks PASS" || bad "C3" ""
[ "$(agg 'BLOCKED (x)' PASS PASS PASS PASS PASS PASS PASS PASS)" = "BLOCKED 3" ] && ok "C4 baseline failure BLOCKS" || bad "C4" ""
[ "$(agg PASS PASS PASS PASS PASS PASS PASS PASS '')" = "BLOCKED 3" ] && ok "C5 missing evidence BLOCKS" || bad "C5" ""

# ============ D. confinement check on an unconfined machine ============
OUT="$(STAGE_ROOT="$WORK" node "$PKG/harness/confinement-check.mjs" 2>&1)"; RC=$?
[ $RC -eq 66 ] && echo "$OUT" | grep -q '"confinement":"FAIL"' && ok "D confinement-check FAILs unconfined (exit 66)" || bad "D" "rc=$RC out=$OUT"

# ============ E. supervisor under stubs ============
ES="$WORK/es"; mkdir -p "$ES"
FH="$ES/fixture-harness"; mkdir -p "$FH/bin"
cp -r "$PKG/tests/fixtures/harness/." "$FH/"
cp "$PKG/harness/bin/docker" "$FH/bin/docker"
cp "$PKG/harness/aggregate.sh" "$FH/aggregate.sh"
chmod +x "$FH/bin/docker" "$PKG/tests/stubs/bin/"* "$FH/run-confined.sh"
sup_run() { # $1 case $2 docker-mode $3 fixture-create $4 fixture-exit
  local C="$ES/$1"; mkdir -p "$C/stage" "$C/tmp" "$C/state" "$C/release"
  echo x > "$C/release/runner.cjs"
  env -i PATH="$PKG/tests/stubs/bin:$PATH" HOME="$HOME" \
    STUB_STATE="$C/state" STUB_DOCKER_MODE="$2" STAGE_REAL_DOCKER="$PKG/tests/stubs/bin/docker" \
    FIXTURE_CREATE="$3" FIXTURE_EXIT="$4" FIXTURE_SLEEP_MS=2500 \
    STAGE_ROOT="$C/stage" STAGE_TMP="$C/tmp" STAGE_RELEASE_DIR="$C/release" \
    STAGE_HARNESS_DIR="$FH" STAGE_PAIRING_PATH=captured-runtime STAGE_PAIRING_APPROVAL_FILE="$HB/approval.json" \
    STAGE_HARD_DEADLINE_S=30 \
    bash "$PKG/harness/supervise.sh" > "$C/sup.log" 2>&1
  echo $?
}
RC="$(sup_run daemon-down down 0 0)"
if [ "$RC" = "3" ] && grep -q '"overall": "BLOCKED"' "$ES/daemon-down/stage/cleanup.json"; then ok "E1 daemon down BLOCKS, nothing launched"; else bad "E1" "rc=$RC $(cat "$ES/daemon-down/sup.log" 2>/dev/null)"; fi
RC="$(sup_run badcaps badcaps 1 0)"
if [ "$RC" = "4" ] && grep -q '"hostconfig": "FAIL' "$ES/badcaps/stage/cleanup.json"; then ok "E2 HostConfig mismatch FAILs the run"; else bad "E2" "rc=$RC $(cat "$ES/badcaps/sup.log" 2>/dev/null) $(cat "$ES/badcaps/stage/cleanup.json" 2>/dev/null)"; fi
RC="$(sup_run rmfail rmfail 1 0)"
if [ "$RC" = "4" ] && grep -q '"container_cleanup": "FAIL' "$ES/rmfail/stage/cleanup.json"; then ok "E3 failed cleanup FAILs the run"; else bad "E3" "rc=$RC $(cat "$ES/rmfail/sup.log" 2>/dev/null) $(cat "$ES/rmfail/stage/cleanup.json" 2>/dev/null)"; fi
RC="$(sup_run happy ok 1 0)"
OV="$(grep -o '"overall": "[A-Z]*"' "$ES/happy/stage/cleanup.json" 2>/dev/null || echo 'none')"
info "E4 happy-path under stubs: rc=$RC overall=$OV (PASS requires a real scope cgroup for IDENTITY; BLOCKED here is the documented stub limit, FAIL would be a regression)"
[ "$OV" = '"overall": "FAIL"' ] && bad "E4" "happy path FAILed under stubs: $(cat "$ES/happy/stage/cleanup.json")"

echo "----"
echo "regression: $PASS passed, $FAIL failed${FAILED_CASES:+ (failed:$FAILED_CASES)}"
[ $FAIL -eq 0 ]
