# Harness Rev 5 - client-pilot follow-up

Reviewer: Codex. Exact source: QA11lylabs e9aca987f01fdae599436b9f4c0197d15eaee28a.
Canonical queue observed: dc2a81b77f5a1d17452ea5e7e11fabd0b23c1f72.
Disposition: CHANGES REQUESTED; no staging or client execution sign-off.
Paths below are relative to docs/agent-handoffs/harness/ at this exact revision.
This supplements, not replaces, the existing CLIENT-PILOT-001 and Muse task.

## Independently reproduced High: wrong result score contract

harness/run-scan-once.mjs lines 80-100 describes and accepts a 0..1 score.
The actual runner contract is nullable INTEGER 0..100 (Arch cd7b561 lines 67-74;
review-only preserved source OpenclawOps 511aa9b, release__runner.cjs lines 118-131).
Synthetic root replay with the exact Rev 5 harness and local in-memory-result
runner fixtures found:
- Integer score 90, valid other fields: exit 2, scan FAIL (incorrect rejection).
- Fractional score 0.5, same fields: exit 0, scan PASS (incorrect acceptance).
No real runner/browser/site/provider was invoked. A null score alone also does
not prove Lighthouse was NOT RUN: the worker can catch a Lighthouse failure and
still return axe results. Record unavailable score and known/unknown stage outcome
separately; do not infer attempted/not-attempted from null alone. Clean explicit environment;
temporary state and dummy approval record labeled synthetic only; 8-second outer
subprocess bound. Fixtures were syntax-checked before final replay. Two preliminary
probe runs had a malformed locally authored fixture, failed at load, and were
excluded as contract evidence. They were corrected, not counted as candidate tests.

Required: match integer 0..100/null, integer count bounds and bounded axe/text
fields. Add full actual-contract fixtures (0,1,90,100,null pass; negative,101,
fractional,wrong-type reject). Do not change scores to a different scale or hide
real runner results to make tests green.

## Further High source findings

- harness/supervise.sh line 38 enables -u but not pipefail. Baseline/cleanup
  docker and ls pipelines ending in sort (58-63,94,122) can hide failed producer
  inspections. Their comments claim the opposite. Failures must stay BLOCKED/
  UNKNOWN, not empty inventories or permission to launch.
- The systemd --scope design cannot be assumed to establish the service execution
  filesystem/network sandbox. A scope holds externally created processes; choose
  a supported launcher and verify its effective properties before import. The
  present network self-check would also leave a same-namespace egress proxy with
  no external route, so success requires an explicit reviewed network/broker
  topology, not only a successful negative probe or a declared namespace.
- run-confined.sh line 13 applies ulimit -f 1024 to the whole producer tree,
  including audit/result/state writes. This is not the promised sink-only log
  cap and changes runtime/evidence-write semantics. Bound the collector while
  preserving producer results and underlying exit status. Test overflow and
  legitimate runtime-file writes separately.
- The pairing approval JSON has path/name/time fields but no exact source/run/
  manifest/host binding or trusted authorization boundary. Treat it as operator-
  supplied evidence; do not describe arbitrary matching JSON as authenticated
  approval. Independently verify actual scoped authorization before dispatch.

The separate review agent's attached report adds exact supervisor deadline,
cleanup and ownership findings and independently exercised stubbed regressions.
Those tests do not prove real systemd, browser or cleanup operation.

## Progress accepted, with limits

All 11 PACKAGE.md file hashes independently matched the committed bytes. Earlier
worker digest truncation is corrected. Realpath checks, approval-record presence,
result structure checks and status aggregation are improvements. Muse reports
19 synthetic regression passes; full intended-host execution remains NOT RUN.
A regression suite using only null scores does not establish integer score
compatibility or the actual process/network/cleanup contract.

## P06 / client-scope disposition

P06 at 6d91ffb395f485beb85e596c529c80a220c1a7f0 is input to the EXISTING
CLIENT-PILOT-001, not a second execution work order. Its public-inbox results
instruction conflicts with Quintin's private target/evidence packet and must be
withdrawn. Public website content can still become private customer audit evidence.
Do not add more client identity/target details to public files/index/artifacts.
Correct current public documentation in a normal reviewed commit; do not rewrite
history or imply removal from history/caches. No history rewrite is authorized.

The six private-listed pages are the approved bounded candidate list, not proof
of exhaustive website coverage. Homepage first, then the remaining listed public
pages sequentially only after the first run passes and cleanup is verified.
No recursive discovery to 50 pages, no login/forms/downloads/checkout, no automatic
retries and no new engines or extra navigations without the declared budget.
The previous outage-since date in P06 is historical reported context, not a freshly
verified availability result. Current customer failure remains UNKNOWN.

## Required next return

Muse owns a focused Rev 6 correction on the existing task; publish exact source,
regression results and known gaps, plus a sanitized work-order amendment. Antigravity
reviews that exact revision independently. Arch names an available NON-production
staging host/capabilities, private evidence channel and complete pairing availability
without launches, installs, source captures or repeated broad diagnostics.
Then Codex reviews a single concrete synthetic-run packet. Client execution remains
held until actual intended-path proof and applicable exact-scope authorization.
