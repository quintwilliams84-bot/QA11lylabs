# Package modes and agent inbox tools

Status: implemented repository helpers, pending independent review/adoption.
These helpers do not authorize execution, install an agent dispatcher, grant
permissions, create receipts, change task state, commit, push or deploy.
Use a reviewed local checkout, trusted Git configuration and one writer per
worktree. Run commands from the repository root. Python 3.9+ and Git are required;
the existing reader also requires the Unix file APIs it already uses.

## What changed since the permission proposal

The reviewed non-applied Rev9 permission proposal is at recovery
`7f0dc6af3a836fe03c8d536fc3cdc456522c23c5`, under
`docs/agent-handoffs/proposals/rev9-permission-fix/`.
Exact patch SHA256:
`e57f28e6de18756597827dc3f540a496e4b8167c51ad78f9fd9757d8c041193d`.
Its limited review does not approve the complete executor.

Muse's Rev10 return, published by staging snapshot
`8bee33d043897ffd3495d50b5a31d252dfe855a9`, says it adapted that
proposal and removed runtime chmod. Do not apply the old patch wholesale to
Rev10. Review the new exact source and its changed behavior.

Independent packaging inspection found eleven manifest entries marked
executable, including `tools/verify-tree.mjs`; the text return says ten.
Mode-only finalization follows the manifest, preserving the original blobs.
The verifier is invoked with Node, not as a standalone shebang script.

After intended modes, the exact published package still contains FIVE unlisted
historical logs. Its shipped verifier exits 2 with EXTRA-FILE reports:

- `tests/REGRESSION-RESULTS-2026-10-22-rev6.txt`
- `tests/REGRESSION-RESULTS-2026-10-22-rev7.txt`
- `tests/REGRESSION-RESULTS-2026-10-22-rev8.txt`
- `tests/REGRESSION-RESULTS-2026-10-22.txt`
- `tests/REGRESSION-RESULTS-2026-10-23-rev9.txt`

Muse remains the sole harness integrator. Move historical evidence outside the
strict runnable package with references preserved, or deliberately include it
in the manifest and regenerate identities. Do not delete history, widen
exclusions to hide code, or regenerate a manifest during tests to bless input.
These helpers fail on the present extras rather than silently fixing them.
The attributed 67-pass suite was not independently replayed in this change.
No supervisor, Docker, browser or real-host test was run.

## Preserve executable state before publication

Bash does not intrinsically strip modes. Git records executable state separately
from bytes. A content-only filing API that writes `100644` needs explicit tree
modes, even if the local file was executable. `core.fileMode=false` is not a
repair; it only affects detection. ZIP/text uploads can also lose Unix modes.

For a Git-capable agent, stage only its intended package changes, then:

```sh
python3 scripts/prepare-harness-modes.py --apply
```

This verifies STAGED content hashes and the exact file set against the STAGED
manifest first, rejects symlinks/submodules/path traversal and unsupported
exclusions, then changes only missing declared `+x` bits in the Git index.
It does not run package code, stage content, mutate worktree permissions or
regenerate the manifest. Unrelated staged files remain unchanged, but a later
plain `git commit` would include those files: inspect your scoped diff.

Commit immediately after checking the staged diff. Any later `git add` on a
mode-stripped worktree can reset modes, so rerun preparation after staging.
Check the resulting commit before pushing using its FULL SHA:

```sh
python3 scripts/prepare-harness-modes.py --ref FULL_COMMIT_SHA
```

No automatic hook is installed. Add this trusted check to a required CI/release
gate after independent review. Until then it is an explicit tool, not enforced
protection. Checking an untrusted candidate's self-modified validator or manifest
does not authenticate that candidate; pin the approved manifest/checker externally.

For an API-only agent, use the Git tree API and set the mode for every modified
file deliberately: `100755` for intended executables, `100644` for normal files,
retaining unchanged entries from the exact base tree. Create one commit and use a
non-force branch update with an expected head SHA. Inspect the resulting tree;
never assume a content-only upload retained an existing executable mode.

Primary mechanics: [git update-index](https://git-scm.com/docs/git-update-index)
and [GitHub Git trees](https://docs.github.com/en/rest/git/trees).

## Read assignments without relaying messages through Q

Each agent with an existing Git checkout and Git access can use:

```sh
python3 scripts/agent-inbox.py --agent muse --fetch
```

Replace `muse` with `arch`, `codex` or `antigravity`. This explicitly fetches only
the canonical staging branch through the existing origin credentials. It does
not checkout, merge, reset or execute fetched code. Origin's declared URL must
identify QA11lylabs on GitHub; trusted local Git transport rewrites/SSH settings
remain in effect. Git hooks/credential/transport configuration is outside the
tool's sandbox; use a controlled checkout. No new token is requested.

The trusted LOCAL handoff reader validates the fetched index. The output includes
an immutable snapshot SHA, selected task IDs/source SHAs, no authorization and
no acknowledgment. An empty result is distinct from failure: failure exits 1
with an explicit message and must never mark work completed or delivered.

On the next read, pass the last successfully read FULL snapshot SHA as `--since`.
Only changed/new assigned tasks plus removed/reassigned IDs are returned.
No shared cursor is written; each agent retains its own last successful snapshot.
This is change filtering, not exactly-once delivery. Changing a subject/status or
source returns the task again. Existing task IDs and schema remain unchanged.

Use `--ref FULL_SNAPSHOT_SHA` for an offline already-fetched snapshot instead of
`--fetch`. Without either option, the tool reads the existing origin tracking
ref; that local ref may be stale. Report its SHA, not a claim of current delivery.

This removes Q from the transport path once agents adopt the reader, but does
not wake sleeping agents or connect disconnected sessions. Next integration is
an explicit bounded call from Arch's existing approved command/heartbeat path,
not another independent daemon. First verify that path and identity. Add a
per-agent cursor, bounded backoff and a single durable acknowledgment record
only in a separately reviewed adapter. Keep read, acceptance, running, completed
and independently reviewed distinct. Avoid repeating unchanged alerts. No
polling timer, webhook or agent invocation is enabled by this commit.

## Validation and next acceptance scope

`bash scripts/check-agent-workflow.sh` runs local metadata/syntax checks and
17 disposable-Git tests. Cases cover altered/missing/extra files, symlinks,
traversal, exclusions, declared executable bits under `core.filemode=false`,
unchanged unrelated staging, committed modes, dirty-worktree preservation,
changed/reassigned tasks, unchanged snapshot suppression, invalid executable
metadata and explicit fetch via a LOCAL test transport. No real GitHub fetch
or cross-agent delivery was exercised by those tests.

One early transport test failed because Git expanded a configured local test
mirror before origin validation. The helper now checks the declared canonical
origin while retaining trusted transport configuration; all 17 cases passed.
Independent review also found malformed-manifest error handling and a commit-only
CLI check that accepted tree objects. Both were corrected and independently
rechecked, with regressions added.
This is not independent review of Codex-authored tools.

Arch's acceptance companion at
`e575f5077b36af8ae786708497163ddc4ec765b6` remains HELD. Its checklist predates
the observed Rev10 publication, so only the changed source/package rows need
reconciliation after review. Preserve the exit-3 hold, exact pairing/origin/
resource approvals, one isolated control-fixture job and no retry. Do not
restart another broad inventory or substitute the live VPS for fault injection.

After a verified scan path, report acceptance must bind every finding to that
job's source evidence. Require an executive summary, scope/method/limitations,
severity-ranked remediation with rationale, affected pages/elements, reproducible
examples and retest status. Preserve the tool's impact label separately from
business severity and manual confirmation. Dedupe instances without hiding page
coverage. Automated results do not certify full WCAG conformance. Produce an
accessible HTML report alongside PDF; test the actual PDF's reading order,
headings, links and tagging rather than assuming the exporter preserved them.
Hermes remains outline-only until verified private job artifacts and processing
scope are available. No report content, client scan or delivery is fabricated.
