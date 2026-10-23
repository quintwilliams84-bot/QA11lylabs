# GIT-RECONCILIATION-001 - preserve and reconcile repository state

Owner: Antigravity. Reviewer: Codex. Scope: read-only reconciliation and bounded
candidate preparation in development only. This work order is not authorization
for a production Git reset, package update, deployment or service change. Honor
separate exact approvals Quintin has given in the agent's own session; report any
scope conflict rather than guessing or requesting unchanged approval again.

## First return: one identity/drift table, not another architecture inventory

For each checkout actually in scope, record origin owner/repository (sanitized),
branch, full HEAD, clean/dirty counts, local-only commits, divergence from the
reviewed remote and executable/source hashes relevant to the task. A directory
called qa11ylabs-website on the VPS historically maps to QA11lylabs; do not confuse
it with the separate GitHub repo named qa11ylabs-website. Unknown origin of the
standalone scanner must remain UNKNOWN until established. Do not add/change an
origin just to make names look consistent.

Use existing local metadata first; an authorized read-only remote query/fetch in
an isolated review repo can establish remote refs. A clean checkout does not prove
live files match it. Compare source versus deployed state only within explicitly
authorized read-only scope. No broad secrets/config/log dumping or new capture.

## Preservation and repair proposal

Preserve dirty/untracked source and private original evidence. Do not use reset
--hard, git clean, blanket checkout, stash as a substitute for verified backup,
rebase/force-push shared history, automatic pulls into webroot, or direct-to-main
writes. Do not restore a retired synchronization path. A new branch is not a
license to publish private/unreviewed production files.

Return the smallest proposed repair per actual mismatch: exact base/source,
affected files, author/owner, retained work, intended resulting tree, tests and
rollback/stop condition. Distinguish a proposed branch integration from production
activation. Do not silently mix unrelated scanner, document and watchdog changes.
No fix is needed merely because a path name differs from its GitHub repository.

## Upgrade discipline

For a proposed dependency/tool update, record installed and candidate versions,
complete manifests/lock identities, specific reason/benefit, compatibility evidence,
resource cost, regression/security tests and rollback implications. Pin compatible
versions; do not float to latest or install unpinned alternatives. Browser/package
absence hypotheses have already been corrected: preserve host-mounted sandboxed
Chrome until a reviewed replacement is validated. No production npm/pip/browser/
OS/container upgrade is granted by this work order.

Cloud candidate code may be prepared only within applicable owner authorization
and on the agent's own task branch, with one writer per touched file. Muse owns
the active scanner harness; do not patch those same files concurrently. Independently
review the exact corrected harness instead. Root Codex must not self-approve its
own application changes. No merge/deployment follows from a technical review.

## Delivery

Publish a sanitized return on an authorized task branch referencing this work
order and the exact source revision. No client target/report, credentials, real
memory, database, private snapshot or raw logs in public GitHub. Return actual
checks and gaps; status vocabulary is PASS/FAIL/BLOCKED/NOT RUN/UNKNOWN, with
expected case counts distinct from results. Do not claim a GitHub folder is a
security boundary or an installed coordinator. No new Git daemon/webhook/receiver.
