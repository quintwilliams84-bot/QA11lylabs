#!/usr/bin/env bash
# Synthetic regression suite for harness Rev 7 (test doubles and
# stubs ONLY - never the real runner, never a real client target).
# Covers Codex's Rev 5 findings (root follow-up + independent
# review of e9aca987):
#   A. pairing verifier: schema validation, error kinds, approval
#      record BOUND to manifest bytes + host + run (Rev 6)
#   B. harness: ACTUAL score contract (nullable integer 0..100;
#      fractional/negative/101/wrong-type reject), score
#      availability recorded separately from stage outcome, env
#      gate incl. bound approval record
#   C. aggregate.sh: authoritative status rules
#   D. confinement-check on this unconfined machine must FAIL
#   E. supervisor under stubs: baseline failure launches NOTHING,
#      stale ownership never removes a baseline container,
#      unrelated temp files preserved, hard deadline stops the
#      unit even with UNKNOWN identity, evidence log bounded
#      without capping the producer, shim cidfile capture (a
#      64-hex workload log line is NOT an identity), assembly
#      digest gate, cidfile harvest after a killed shim, unit
#      termination as a required cleanup component, E4 gated on
#      its expected stub outcome (BLOCKED via identity only)
#   F. REAL launcher + preload + identity writer against a
#      fixture runner: job-private audit log, canonical job.json,
#      integer score; missing target BLOCKS with no default
#   G. executable modes on all package scripts
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
msha = h(f"{va}/manifest.json")
base = {"path": "b", "approved_by": "test-fixture", "approved_at": "2026-10-22",
        "manifest_sha256": msha, "host_id": "test-host", "run_id": "test-run"}
with open(f"{va}/approval.json", "w") as fh: json.dump(base, fh)
wrong = dict(base); wrong["manifest_sha256"] = "0" * 64
with open(f"{va}/approval-wrong-manifest.json", "w") as fh: json.dump(wrong, fh)
wrong2 = dict(base); wrong2["host_id"] = "other-host"
with open(f"{va}/approval-wrong-host.json", "w") as fh: json.dump(wrong2, fh)
PYEOF
IMG="sha256:$(printf 'b%.0s' $(seq 1 64))"
verify() { "${CLEANENV[@]}" node "$PKG/pairing/preflight-verify.mjs" --manifest "$1" --release-root "$VA/release" --chrome-path "$VA/chrome" --image-id "$IMG" ${2:+--pairing-approval "$2"} ${3:+--host-id test-host} ${4:+--run-id test-run} 2>&1; }
OUT="$(verify "$VA/manifest.json" "$VA/approval.json" h r)"; RC=$?
[ $RC -eq 0 ] && echo "$OUT" | grep -q "OVERALL: PASS" && ok "A1 verifier exit 0 with bound approval record" || bad "A1" "rc=$RC out=$OUT"
OUT="$(verify "$VA/manifest.json" "" )"; RC=$?
[ $RC -eq 3 ] && ok "A2 verifier BLOCKED without approval record" || bad "A2" "rc=$RC out=$OUT"
OUT="$(verify "$VA/manifest-bad-digest.json" "$VA/approval.json" h r)"; RC=$?
[ $RC -eq 2 ] && echo "$OUT" | grep -q "schema:file:worker.cjs" && ok "A3 verifier catches 52-char digest as schema FAIL" || bad "A3" "rc=$RC out=$OUT"
cp "$VA/release/worker.cjs" "$WORK/worker.bak"; echo tampered >> "$VA/release/worker.cjs"
OUT="$(verify "$VA/manifest.json" "$VA/approval.json" h r)"; RC=$?
[ $RC -eq 2 ] && echo "$OUT" | grep -q "file:worker.cjs.*hash mismatch" && ok "A4 verifier catches hash mismatch" || bad "A4" "rc=$RC out=$OUT"
cp "$WORK/worker.bak" "$VA/release/worker.cjs"
mkdir -p "$WORK/a5/release"; echo notadir > "$WORK/a5/release/deps"
OUT="$("${CLEANENV[@]}" node "$PKG/pairing/preflight-verify.mjs" --manifest "$VA/manifest.json" --release-root "$WORK/a5/release" --chrome-path "$VA/chrome" --image-id "$IMG" --pairing-approval "$VA/approval.json" 2>&1)"
echo "$OUT" | grep -q "absent:deps/package.json.*ENOTDIR" && ok "A5 absence check names ENOTDIR, not PASS" || bad "A5" "out=$OUT"
OUT="$(verify "$VA/manifest.json" "$VA/approval-wrong-manifest.json" h r)"; RC=$?
[ $RC -eq 2 ] && echo "$OUT" | grep -q "manifest_sha256 does not match" && ok "A6 approval bound to wrong manifest FAILs" || bad "A6" "rc=$RC out=$OUT"
OUT="$(verify "$VA/manifest.json" "$VA/approval-wrong-host.json" h r)"; RC=$?
[ $RC -eq 2 ] && echo "$OUT" | grep -q "host_id does not match" && ok "A7 approval bound to wrong host FAILs" || bad "A7" "rc=$RC out=$OUT"

# ============ B. harness contract + env gate ============
HB="$WORK/hb"; mkdir -p "$HB"
python3 - "$HB" << 'PYEOF'
import json, hashlib, sys
hb = sys.argv[1]
def h(p):
    with open(p, 'rb') as fh: return hashlib.sha256(fh.read()).hexdigest()
with open(f"{hb}/manifest.json", "w") as fh: json.dump({"fixture": True}, fh)
rec = {"path": "b", "approved_by": "test-fixture", "approved_at": "2026-10-22",
       "manifest_sha256": h(f"{hb}/manifest.json"), "host_id": "test-host", "run_id": "test-run"}
with open(f"{hb}/approval.json", "w") as fh: json.dump(rec, fh)
PYEOF
mkcase() { mkdir -p "$HB/$1/stage/release"; printf '%s\n' "$2" > "$HB/$1/stage/release/runner.cjs"; }
run_harness() {
  "${CLEANENV[@]}" "${EXTRA_ENV[@]}" \
    STAGE_ROOT="$HB/$1/stage" STAGE_RELEASE_DIR="$HB/$1/stage/release" \
    STAGE_HARNESS_DIR="$PKG/harness" \
    STAGE_PAIRING_PATH=captured-runtime STAGE_PAIRING_APPROVAL_FILE="$HB/approval.json" \
    STAGE_PAIRING_MANIFEST="$HB/manifest.json" STAGE_HOST_ID=test-host STAGE_RUN_ID=test-run \
    STAGE_TARGET_URL=https://fixture.invalid/ \
    node "$PKG/harness/run-scan-once.mjs" > "$HB/$1/out.log" 2>&1
}
EXTRA_ENV=()
GOOD='module.exports = { runScan: async () => ({ lh: { score: %s, contrast: true, viewport: true }, axe: { violations: [], passes: [{}], pageTitle: "t", metaDesc: "" } }) };'
mkcase nullscore "$(printf "$GOOD" null)"; run_harness nullscore; RC=$?
if [ $RC -eq 0 ] && python3 -c "
import json
r=json.load(open('$HB/nullscore/stage/result.json'))
assert r['overall']=='PASS', r
assert r['lhScore'] is None and r['lhScoreStatus']=='UNAVAILABLE_STAGE_OUTCOME_UNKNOWN', r
"; then ok "B1 null score: PASS, availability recorded separately"; else bad "B1" "rc=$RC $(cat "$HB/nullscore/out.log")"; fi
mkcase s90 "$(printf "$GOOD" 90)"; run_harness s90; RC=$?
[ $RC -eq 0 ] && python3 -c "
import json
r=json.load(open('$HB/s90/stage/result.json'))
assert r['lhScore']==90 and r['lhScoreStatus']=='REPORTED', r
" && ok "B6 integer score 90 accepted (actual contract)" || bad "B6" "rc=$RC"
mkcase s0 "$(printf "$GOOD" 0)"; run_harness s0; RC=$?
[ $RC -eq 0 ] && ok "B9 integer score 0 accepted" || bad "B9" "rc=$RC"
mkcase sfrac "$(printf "$GOOD" 0.5)"; run_harness sfrac; RC=$?
[ $RC -eq 2 ] && grep -q "contract violation" "$HB/sfrac/stage/result.json" && ok "B7 fractional score 0.5 rejected" || bad "B7" "rc=$RC"
mkcase s101 "$(printf "$GOOD" 101)"; run_harness s101; RC=$?
[ $RC -eq 2 ] && ok "B8 score 101 rejected" || bad "B8" "rc=$RC"
mkcase sneg "$(printf "$GOOD" -- -1)"; run_harness sneg; RC=$?
[ $RC -eq 2 ] && ok "B11 negative score rejected" || bad "B11" "rc=$RC"
mkcase sstr "$(printf "$GOOD" '"90"')"; run_harness sstr; RC=$?
[ $RC -eq 2 ] && ok "B10 string score rejected" || bad "B10" "rc=$RC"
mkcase bad 'module.exports = { runScan: async () => ({ unexpected: true }) };'
run_harness bad; RC=$?
[ $RC -eq 2 ] && grep -q "contract violation" "$HB/bad/stage/result.json" && ok "B2 malformed result is FAIL, not PASS" || bad "B2" "rc=$RC"
mkcase noapproval 'module.exports = { runScan: async () => ({}) };'
"${CLEANENV[@]}" STAGE_ROOT="$HB/noapproval/stage" STAGE_RELEASE_DIR="$HB/noapproval/stage/release" \
  STAGE_HARNESS_DIR="$PKG/harness" STAGE_PAIRING_PATH=captured-runtime \
  STAGE_PAIRING_MANIFEST="$HB/manifest.json" STAGE_HOST_ID=test-host STAGE_RUN_ID=test-run \
  STAGE_TARGET_URL=https://fixture.invalid/ \
  node "$PKG/harness/run-scan-once.mjs" > "$HB/noapproval/out.log" 2>&1; RC=$?
if [ $RC -eq 3 ] && [ ! -f "$HB/noapproval/stage/job.json" ]; then ok "B3 missing approval record BLOCKS before job.json exists"; else bad "B3" "rc=$RC"; fi
mkcase cred 'module.exports = { runScan: async () => ({}) };'
EXTRA_ENV=(SOME_API_TOKEN=dummy)
run_harness cred; RC=$?
[ $RC -eq 3 ] && ok "B4 credential-pattern env BLOCKS" || bad "B4" "rc=$RC"
EXTRA_ENV=()
mkdir -p "$HB/outside" "$HB/escape/stage"
printf '%s\n' 'module.exports = { runScan: async () => ({}) };' > "$HB/outside/runner.cjs"
ln -s "$HB/outside" "$HB/escape/stage/release"
"${CLEANENV[@]}" STAGE_ROOT="$HB/escape/stage" STAGE_RELEASE_DIR="$HB/escape/stage/release" \
  STAGE_HARNESS_DIR="$PKG/harness" \
  STAGE_PAIRING_PATH=captured-runtime STAGE_PAIRING_APPROVAL_FILE="$HB/approval.json" \
  STAGE_PAIRING_MANIFEST="$HB/manifest.json" STAGE_HOST_ID=test-host STAGE_RUN_ID=test-run \
  STAGE_TARGET_URL=https://fixture.invalid/ \
  node "$PKG/harness/run-scan-once.mjs" > "$HB/escape/out.log" 2>&1; RC=$?
[ $RC -eq 3 ] && ok "B5 symlink escape of release dir BLOCKS" || bad "B5" "rc=$RC"
mkcase notarget 'module.exports = { runScan: async () => ({}) };'
"${CLEANENV[@]}" STAGE_ROOT="$HB/notarget/stage" STAGE_RELEASE_DIR="$HB/notarget/stage/release" \
  STAGE_HARNESS_DIR="$PKG/harness" \
  STAGE_PAIRING_PATH=captured-runtime STAGE_PAIRING_APPROVAL_FILE="$HB/approval.json" \
  STAGE_PAIRING_MANIFEST="$HB/manifest.json" STAGE_HOST_ID=test-host STAGE_RUN_ID=test-run \
  node "$PKG/harness/run-scan-once.mjs" > "$HB/notarget/out.log" 2>&1; RC=$?
[ $RC -eq 3 ] && grep -q "STAGE_TARGET_URL is required" "$HB/notarget/stage/result.json" && ok "B12 missing target BLOCKS (no hardcoded default)" || bad "B12" "rc=$RC"

# ============ C. aggregate ============
agg() { env BASELINE="$1" ASSEMBLY="$2" CONFINEMENT="$3" IDENTITY="$4" HOSTCONFIG="$5" HARNESS="$6" CONTAINER_CLEAN="$7" TMP_CLEAN="$8" UNIT_CLEAN="$9" bash "$PKG/harness/aggregate.sh"; }
OUT="$(agg PASS PASS PASS PASS PASS PASS PASS PASS PASS)"; [ "${OUT##* }" = 0 ] && ok "C1 all PASS aggregates PASS" || bad "C1" "$OUT"
OUT="$(agg PASS PASS PASS PASS PASS "FAIL (x)" PASS PASS PASS)"; [ "${OUT##* }" = 4 ] && ok "C2 any FAIL aggregates FAIL" || bad "C2" "$OUT"
OUT="$(agg PASS PASS PASS UNKNOWN PASS PASS PASS PASS PASS)"; [ "${OUT##* }" = 3 ] && ok "C3 UNKNOWN blocks PASS" || bad "C3" "$OUT"
OUT="$(agg "BLOCKED (x)" PASS PASS PASS PASS PASS PASS PASS PASS)"; [ "${OUT##* }" = 3 ] && ok "C4 baseline BLOCKED blocks" || bad "C4" "$OUT"
OUT="$(agg PASS PASS PASS PASS PASS PASS PASS PASS UNKNOWN)"; [ "${OUT##* }" = 3 ] && ok "C6 unit-cleanup UNKNOWN blocks PASS" || bad "C6" "$OUT"
OUT="$(env BASELINE=PASS CONFINEMENT=PASS bash "$PKG/harness/aggregate.sh")"; [ "${OUT##* }" = 3 ] && ok "C5 missing evidence blocks" || bad "C5" "$OUT"

# ============ D. confinement (real check, unconfined host) ============
"${CLEANENV[@]}" STAGE_ROOT="$WORK" STAGE_TMP="$WORK" node "$PKG/harness/confinement-check.mjs" > "$WORK/d.json" 2>&1; RC=$?
[ $RC -eq 66 ] && grep -q '"confinement":"FAIL"' "$WORK/d.json" && ok "D confinement-check FAILs unconfined (exit 66)" || bad "D" "rc=$RC"

# ============ E. supervisor under stubs ============
export STUB_DOCKER_STATE="$WORK/docker-state" STUB_SYSTEMD_STATE="$WORK/systemd-state"
mkdir -p "$STUB_DOCKER_STATE/containers" "$STUB_SYSTEMD_STATE/units"
export PATH="$PKG/tests/stubs/bin:$PATH"
export STAGE_REAL_DOCKER="$PKG/tests/stubs/bin/docker"
FIX="$PKG/tests/fixtures/harness"
mkassembly() { # $1 case-dir: release tree + assembly.json with tree digest
  mkdir -p "$1/assembly/release"
  printf '%s\n' 'module.exports = { runScan: async () => ({}) };' > "$1/assembly/release/runner.cjs"
  python3 - "$1/assembly" << 'PYEOF2'
import hashlib, json, os, sys
root = os.path.join(sys.argv[1], "release")
lines = []
for dirpath, _dirs, files in os.walk(root):
    for f in sorted(files):
        full = os.path.join(dirpath, f)
        rel = "./" + os.path.relpath(full, root)
        with open(full, "rb") as fh: digest = hashlib.sha256(fh.read()).hexdigest()
        lines.append(f"{digest}  {rel}\n")
tree = hashlib.sha256("".join(sorted(lines)).encode()).hexdigest()
with open(os.path.join(sys.argv[1], "assembly.json"), "w") as fh:
    json.dump({"tree_sha256": tree, "assembled_by": "regression", "assembled_at": "2026-10-22"}, fh)
PYEOF2
}
run_supervisor() { # $1 case-name; env via EXTRA_ENV; deadline via DEADLINE; target via TARGET_URL (default fixture)
  local C="$WORK/e-$1"; mkdir -p "$C/tmp"
  [ -d "$C/assembly" ] || mkassembly "$C"
  "${CLEANENV[@]}" PATH="$PATH" "${EXTRA_ENV[@]}" \
    STUB_DOCKER_STATE="$STUB_DOCKER_STATE" STUB_SYSTEMD_STATE="$STUB_SYSTEMD_STATE" \
    STAGE_REAL_DOCKER="$STAGE_REAL_DOCKER" \
    STAGE_ROOT="$C/root" STAGE_TMP="$C/tmp" STAGE_HARNESS_DIR="$FIX" \
    STAGE_ASSEMBLY_DIR="$C/assembly" STAGE_TARGET_URL="${TARGET_URL-https://fixture.invalid/}" \
    STAGE_RUN_ID="e-$1" STAGE_HARD_DEADLINE_S="${DEADLINE:-240}" \
    bash "$PKG/harness/supervise.sh" > "$C/out.log" 2>&1
  echo $?
}
# E1: daemon down -> baseline BLOCKED and NOTHING launched
EXTRA_ENV=(STUB_DOCKER_MODE=down)
RC="$(run_supervisor e1)"
if [ "$RC" = 3 ] && python3 -c "
import json
c=json.load(open('$WORK/e-e1/root/cleanup.json'))
assert c['components']['baseline'].startswith('BLOCKED'), c
" && [ ! -f "$STUB_SYSTEMD_STATE/units/qa11y-stage-e-e1.pid" ]; then
  ok "E1 daemon down: baseline BLOCKED, nothing launched"; else bad "E1" "rc=$RC $(cat "$WORK/e-e1/out.log")"; fi
# E2: HostConfig mismatch -> FAIL
EXTRA_ENV=(STUB_HC="1 2 3" STUB_FIXTURE_CREATE=1)
RC="$(run_supervisor e2)"
[ "$RC" = 4 ] && ok "E2 HostConfig mismatch FAILs the run" || bad "E2" "rc=$RC $(cat "$WORK/e-e2/out.log")"
# E3: failed cleanup -> FAIL (sticky)
EXTRA_ENV=(STUB_DOCKER_MODE=rmfail STUB_FIXTURE_CREATE=1)
RC="$(run_supervisor e3)"
if [ "$RC" = 4 ] && python3 -c "
import json
c=json.load(open('$WORK/e-e3/root/cleanup.json'))
assert c['components']['container_cleanup'].startswith('FAIL'), c
"; then ok "E3 failed cleanup FAILs the run"; else bad "E3" "rc=$RC"; fi
# E5: planted baseline id in the job record is NEVER removed
PRE="$(echo -n "preexisting-container-id-for-e5-padding" | sha256sum | cut -d' ' -f1)"
date +%s > "$STUB_DOCKER_STATE/containers/$PRE.created"
EXTRA_ENV=(STUB_FIXTURE_CREATE=1 STUB_PLANT_ID="$PRE")
RC="$(run_supervisor e5)"
if [ -f "$STUB_DOCKER_STATE/containers/$PRE.created" ] && python3 -c "
import json
c=json.load(open('$WORK/e-e5/root/cleanup.json'))
assert c['components']['container_cleanup'].startswith('UNKNOWN'), c
"; then ok "E5 baseline container in job record: not removed, UNKNOWN"; else bad "E5" "rc=$RC"; fi
rm -f "$STUB_DOCKER_STATE/containers/$PRE.created"
# E6: unrelated file in the shared temp parent survives
EXTRA_ENV=(STUB_FIXTURE_TMP_UNRELATED=1)
RC="$(run_supervisor e6)"
if [ -f "$WORK/e-e6/tmp/unrelated-new-artifact" ] && python3 -c "
import json
c=json.load(open('$WORK/e-e6/root/cleanup.json'))
assert c['components']['tmp_cleanup']=='PASS', c
"; then ok "E6 unrelated temp artifact preserved, tmp cleanup PASS"; else bad "E6" "rc=$RC"; fi
# E7: hard deadline fires with UNKNOWN identity (no job.json, 60s sleep)
EXTRA_ENV=(STUB_FIXTURE_SLEEP=60 STUB_FIXTURE_NOJOB=1)
DEADLINE=2
T0=$SECONDS
RC="$(run_supervisor e7)"
ELAPSED=$((SECONDS - T0))
if [ "$ELAPSED" -lt 30 ] && [ -f "$WORK/e-e7/root/cleanup.json" ] && python3 -c "
import json
c=json.load(open('$WORK/e-e7/root/cleanup.json'))
assert c['components']['harness'].startswith('FAIL'), c
"; then ok "E7 deadline stops unit with UNKNOWN identity (${ELAPSED}s)"; else bad "E7" "rc=$RC elapsed=${ELAPSED}"; fi
DEADLINE=240
# E8: producer flood -> evidence copy bounded, producer intact
EXTRA_ENV=(STUB_FIXTURE_FLOOD_MB=2)
RC="$(run_supervisor e8)"
JD="$(ls -d "$WORK/e-e8/root"/job-* 2>/dev/null | head -1)"
if [ -n "$JD" ] && [ "$(stat -c %s "$WORK/e-e8/root/run.log")" -le 1100000 ] \
   && [ "$(stat -c %s "$JD/producer.log")" -gt 2000000 ] \
   && grep -q "truncated at 1 MiB" "$WORK/e-e8/root/run.log" \
   && [ -f "$JD/runtime-file.txt" ]; then
  ok "E8 evidence log bounded at 1 MiB, producer spool + runtime file intact"; else bad "E8" "rc=$RC"; fi
# E9: shim cidfile capture - workload hex line is NOT an identity
EXTRA_ENV=(STUB_DOCKER_MODE=hexlog STUB_FIXTURE_RUN=1)
RC="$(run_supervisor e9)"
JD="$(ls -d "$WORK/e-e9/root"/job-* 2>/dev/null | head -1)"
if [ -n "$JD" ] && ! grep -qx "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" "$JD/owned-containers.txt" \
   && [ "$(grep -cE '^[0-9a-f]{64}$' "$JD/owned-containers.txt")" -ge 1 ]; then
  ok "E9 cidfile identity captured; workload hex line ignored"; else bad "E9" "rc=$RC owned=$(cat "$JD/owned-containers.txt" 2>/dev/null)"; fi
# E4: GATED happy path under stubs. Expected outcome is BLOCKED
# with identity as the ONLY non-PASS component (a unit cgroup
# cannot exist under stub systemd-run), no FAIL anywhere, and
# unit cleanup PASS. Anything else is a regression.
EXTRA_ENV=(STUB_FIXTURE_CREATE=1)
RC="$(run_supervisor e4)"
if [ "$RC" = 3 ] && python3 -c "
import json
c=json.load(open('$WORK/e-e4/root/cleanup.json'))
comps=c['components']
assert c['overall']=='BLOCKED', c
assert comps['identity'].startswith('UNKNOWN'), comps
assert not any(v.startswith('FAIL') for v in comps.values()), comps
assert comps['unit_cleanup']=='PASS', comps
assert comps['assembly']=='PASS' and comps['baseline']=='PASS', comps
"; then ok "E4 stub happy path: BLOCKED via identity only, no FAILs, unit cleanup PASS"; else bad "E4" "rc=$RC $(cat "$WORK/e-e4/root/cleanup.json" 2>/dev/null)"; fi
# E10: cidfile harvest - owned record lost, cidfile record survives
EXTRA_ENV=(STUB_FIXTURE_CIDHARVEST=1)
RC="$(run_supervisor e10)"
JD10="$(ls -d "$WORK/e-e10/root"/job-* 2>/dev/null | head -1)"
HID10="$(cat "$JD10/harvest-id.txt" 2>/dev/null || echo missing)"
if python3 -c "
import json
c=json.load(open('$WORK/e-e10/root/cleanup.json'))
assert c['components']['container_cleanup']=='PASS', c
" && [ "$HID10" != missing ] && [ ! -f "$STUB_DOCKER_STATE/containers/$HID10.created" ]; then
  ok "E10 killed-shim harvest: cidfile record drives cleanup to PASS"; else bad "E10" "rc=$RC $(cat "$WORK/e-e10/root/cleanup.json" 2>/dev/null)"; fi
# E11: no target -> BLOCKED before launch
EXTRA_ENV=()
TARGET_URL=""
RC="$(run_supervisor e11)"
TARGET_URL="https://fixture.invalid/"
if [ "$RC" = 3 ] && python3 -c "
import json
c=json.load(open('$WORK/e-e11/root/cleanup.json'))
assert c['components']['harness'].startswith('BLOCKED'), c
"; then ok "E11 missing target BLOCKS before launch"; else bad "E11" "rc=$RC"; fi
# E12: tampered assembly -> BLOCKED, nothing launched
EXTRA_ENV=()
C12="$WORK/e-e12"; mkdir -p "$C12/tmp"; mkassembly "$C12"; echo tampered >> "$C12/assembly/release/runner.cjs"
"${CLEANENV[@]}" PATH="$PATH" STUB_DOCKER_STATE="$STUB_DOCKER_STATE" STUB_SYSTEMD_STATE="$STUB_SYSTEMD_STATE" \
  STAGE_REAL_DOCKER="$STAGE_REAL_DOCKER" STAGE_ROOT="$C12/root" STAGE_TMP="$C12/tmp" STAGE_HARNESS_DIR="$FIX" \
  STAGE_ASSEMBLY_DIR="$C12/assembly" STAGE_TARGET_URL="https://fixture.invalid/" STAGE_RUN_ID="e-e12" \
  bash "$PKG/harness/supervise.sh" > "$C12/out.log" 2>&1; RC=$?
if [ "$RC" = 3 ] && python3 -c "
import json
c=json.load(open('$WORK/e-e12/root/cleanup.json'))
assert c['components']['assembly'].startswith('FAIL'), c
" && [ ! -f "$STUB_SYSTEMD_STATE/units/qa11y-stage-e-e12.pid" ]; then
  ok "E12 tampered assembly FAILs the digest gate, nothing launched"; else bad "E12" "rc=$RC"; fi

# ============ F. real launcher + preload + identity writer ============
F="$WORK/f"; mkdir -p "$F/harness/bin" "$F/stage/release" "$F/tmp"
cp "$PKG/harness/run-confined.sh" "$PKG/harness/run-scan-once.mjs" "$PKG/harness/audit-preload.cjs" "$F/harness/"
cp "$PKG/harness/bin/docker" "$F/harness/bin/docker"
cp "$PKG/tests/fixtures/harness/confinement-check.mjs" "$F/harness/"
printf '%s\n' 'module.exports = { runScan: async () => ({ lh: { score: 88, contrast: true, viewport: true }, axe: { violations: [], passes: [{}], pageTitle: "t", metaDesc: "" } }) };' > "$F/stage/release/runner.cjs"
run_real_launcher() { # extra env via EXTRA_ENV
  "${CLEANENV[@]}" PATH="$PATH" "${EXTRA_ENV[@]}" \
    STUB_DOCKER_STATE="$STUB_DOCKER_STATE" STAGE_REAL_DOCKER="$STAGE_REAL_DOCKER" \
    STAGE_ROOT="$F/stage" STAGE_TMP="$F/tmp" STAGE_RELEASE_DIR="$F/stage/release" \
    STAGE_HARNESS_DIR="$F/harness" STAGE_AUDIT_LOG="$F/stage/audit.log" \
    STAGE_PAIRING_PATH=captured-runtime STAGE_PAIRING_APPROVAL_FILE="$HB/approval.json" \
    STAGE_PAIRING_MANIFEST="$HB/manifest.json" STAGE_HOST_ID=test-host STAGE_RUN_ID=test-run \
    ${TARGET_LINE} \
    bash "$F/harness/run-confined.sh" > "$F/out.log" 2>&1
}
EXTRA_ENV=()
TARGET_LINE="STAGE_TARGET_URL=https://fixture.invalid/"
run_real_launcher; RC=$?
if [ $RC -eq 0 ] && python3 -c "
import json
r=json.load(open('$F/stage/result.json'))
assert r['overall']=='PASS' and r['lhScore']==88, r
j=json.load(open('$F/stage/job.json'))
assert isinstance(j['pid'], int) and j['pid']>0, j
assert str(j['proc_starttime']).isdigit(), j
" && grep -q "ALLOW" "$F/stage/audit.log" && grep -q "runner.cjs" "$F/stage/audit.log"; then
  ok "F1 real launcher+preload+identity: PASS, job-private audit log, canonical job.json"; else bad "F1" "rc=$RC $(cat "$F/out.log")"; fi
TARGET_LINE=""
run_real_launcher; RC=$?
[ $RC -eq 3 ] && ok "F2 real launcher without target BLOCKS (no default)" || bad "F2" "rc=$RC"
TARGET_LINE="STAGE_TARGET_URL=https://fixture.invalid/"
EXTRA_ENV=()

# ============ G. executable modes ============
GMISS=""
for f in harness/supervise.sh harness/aggregate.sh harness/run-confined.sh harness/bin/docker tests/run-regression.sh; do
  [ -x "$PKG/$f" ] || GMISS="$GMISS $f"
done
[ -z "$GMISS" ] && ok "G1 all package scripts are executable" || bad "G1" "not executable:$GMISS"

echo "----"
echo "regression: $PASS passed, $FAIL failed${FAILED_CASES:+ (failed:$FAILED_CASES)}"
[ "$FAIL" -eq 0 ]
