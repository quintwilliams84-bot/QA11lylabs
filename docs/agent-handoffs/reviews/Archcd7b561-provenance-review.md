# Arch cd7b561: P03 metadata review

Reviewer: Codex. Date: 2026-10-22 UTC.
Exact report: QA11lylabs cd7b56146469e5851d76a29bacc37bd5634392aa,
docs/agent-handoffs/returns/customer-path-p03-provenance-arch.md.
Disposition: accepted as attributed static metadata for packet revision, not
independent live verification, reproducible-build approval or staging permission.
No new proposal/task, runtime code or production change is created by this review.

## What the return resolves

- Lines 9-27 identify observation time, the installed image/runner pin comparison,
  browser executable hash, owning package/version and configured package origin.
  Historical download authenticity and real-browser compatibility remain unproven.
- Lines 33-52 supply release/component and selected dependency metadata, including
  absence of deps/package.json and deps/package-lock.json. The hidden install-tree
  lock must not be presented as an npm ci input.
- Lines 54-84 establish the ACTUAL source contract rather than the proposed RPC:
  runScan(raw, {signal, timeoutMs=90000}) returns a Promise; exports also include
  normaliseUrl, dockerArgs and validateResult. There is no durable submit/status/
  cancel API. Returned data is {lh, axe}, not a job/stage envelope.
- Lines 86-108 distinguish declared resource/security settings from tested controls,
  and mutable observations from an immutable release. The change-based revalidation
  rule is appropriate. Browser hashing and metadata inspection are not scan tests.

These are observations reported by Arch. Codex inspected the committed report,
not the VPS, Docker metadata or browser binary. No application code was executed.

## Required updates to Muse's existing packet and Slice 1/P03

1. Replace the assumption of an installed submit/status/cancel service with the
   real function/Promise/AbortSignal/result contract above. A future narrow RPC
   broker remains a separate reviewed design. Do not expose Docker access/sudo to
   an unprivileged web service just to make the current direct-module call work.
2. Preserve both actual result fields, report null Lighthouse truthfully, and map
   axe pageTitle/metaDesc deliberately (metaDesc currently empty). No fabricated
   report/delivery stage may be inferred from successful {lh, axe} validation.
3. Treat 90 seconds as attached-worker phase timing, not the complete request
   deadline. Include proxy readiness, create/start, cancellation, proxy-exit wait,
   directory removal and verified job cleanup within independently bounded outer
   deadlines. Some current waits lack independent bounds; source finally is not
   cleanup proof or durable restart reconciliation.
4. Validate timeout overrides and define bounded caller cancellation in the test
   contract. Do not patch production as part of this metadata task.
5. Record the observed browser/image/dependency values in the revised packet with
   timestamp and pre-execution revalidation. Do not upgrade or reinstall them.
   Preserve declared worker caps (768 MiB, 1 CPU, 160 PIDs, bounded tmp/shm) while
   defining the staging host's full resource budget separately.
6. Resolve the runnable-source/assembly gap before execution: provide complete
   reviewed manifests/locks, or a separately approved complete captured-runtime
   diagnostic pairing with content inventory and declared provenance limitations.
   Do not guess dependencies, run sanitized material, or silently claim the latter
   is a reproducible build. The currently unverified private capture is not proof
   of an available full pairing; no new capture/upload is authorized here.

## Remaining gates

Exact Git/source correspondence, complete runtime/dependency pairing, image build
provenance (or explicitly reviewed diagnostic trust limits), operator/runbook and
isolation/stubs remain unresolved for staging. Real browser/sandbox/TLS/egress/
cleanup compatibility is NOT RUN; it is future staging evidence, not a metadata
field Arch should try to prove by a production launch. Customer failure remains
UNKNOWN. DOC-001 is a separate document candidate and still has its own gates.

Arch can pause this metadata task. Do not repeat hashes/browser reads or broaden
capture searches without a specific remaining decision. Muse should return one
revised exact-SHA packet on the existing task, including the actual runbook and
all remaining differences/blocked stages. Codex reviews before any execution
approval request. No installs, launches, scans, sends, repairs, dispatch or merge.
