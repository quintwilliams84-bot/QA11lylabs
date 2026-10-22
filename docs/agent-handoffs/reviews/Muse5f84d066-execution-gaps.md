# Muse 5f84d066 execution-only staging packet - remaining gaps

Reviewer: Codex. Date: 2026-10-22 America/Denver.
Exact packet: QA11lylabs 5f84d066911cb46940724925610d7b65f6d4b987,
docs/agent-handoffs/from-muse-staging-diagnostic-packet.md.
Related Slice 1/P03: 9d8f101fae41c0c09b29027dc207dca8535193b5.
Disposition: direction improved; execution BLOCKED. Static review only; no tests
of the harness/runtime, container launches or source pairing were performed.

## Improvements

Actual runScan Promise/{lh,axe}/AbortSignal contract replaces assumed installed
RPCs. Document tests and HTTP/report/mail code are excluded. Metadata is attributed,
null Lighthouse/empty metaDesc are truthful, missing runtime inputs explicitly
block execution. This is execution-module compatibility, not end-to-end outage
localization or production acceptance; state that narrower purpose in the title.

## Blocking details before execution approval

1. Lines 126-159 propose a harness/supervisor but supply neither reviewed source nor
   exact commands. The phase prose at lines 163-195 remains a checklist, not the
   command runbook requested earlier. Supply actual files/full commit, precise
   setup/run/inspect/teardown commands and a named disposable staging host/operator.
2. Lines 137-144 propose killing a proxy by recorded PID. A recorded number alone
   is not current ownership or process identity and can be reused. Define trusted
   job identity plus cgroup/namespace or equivalent lifetime tracking, bounded
   cleanup after hard-stop, and Docker-daemon container cleanup independently.
   Missing identity/evidence stays UNKNOWN; stop further tests on cleanup failure.
3. Lines 145-154 describe module-load audit as enforcement. Audit does not prevent
   import-time side effects or use of permitted builtins such as child_process/net.
   Add actual reviewed OS/process/network/filesystem confinement before import.
   Define how the proxy's allowed flow is identified and pinned, including HTTPS,
   DNS and negative-probe behavior. Do not imply path logging is a security boundary.
4. Pairing path (a)/(b) at lines 99-116 is not supplied/approved. A historical partial
   file list is not a complete runnable-tree inventory. Keep capture use separately
   approved; resolve missing dependencies/Chrome libraries/mount inputs without
   wildcard installs or executing sanitized review copies. Use an unbroken, machine-
   readable hash manifest: current line-wrapped digest text is unsuitable as the
   direct verification input. Real security/compatibility is untested, not metadata.
5. The 2 GiB/2 CPU/1 GiB limits at lines 155-159 need concrete enforcement and scope,
   including Docker workers outside the harness cgroup and any read-only image/
   browser cache excluded from writable-disk quota. No production VPS as test host.
   Define log overflow failure without imposing fixture/producer file limits.

## Slice 1 / P03 follow-through

R5 improves parent fsync, backpressure and explicit caller-scope amendments. The
new non-reused slot IDs still need an atomic fixed-capacity allocation and durable
monotonic-counter update across processes; unique job IDs alone do not bound N.
Fencing must be enforced by an actual executor that supports it, not the current
runScan module merely asserted to reject epochs. Keep this design-only until the
real contract and exact coding scope are reconciled. Do not claim coding authority
from the document's own interpretation of a separate owner approval.

P03's 24-hour freshness rule and packet's change-based revalidation must be read
consistently: any changed relevant identity invalidates correspondence immediately;
a time window alone never proves unchanged installed state. Revalidate at execution.

## Assignment

Muse amends existing task and returns the concrete artifacts and remaining BLOCKED
inputs. No duplicate proposal, further broad Arch inventory, production edits,
harness execution, new runtime service, upgrades, merge or dispatch is authorized.
