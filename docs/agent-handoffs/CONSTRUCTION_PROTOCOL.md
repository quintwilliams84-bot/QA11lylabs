# Construction protocol v1

Applies to the supporting package linked from CONSTRUCTION_START.md. Proposed
shared standard pending adoption; it does not overwrite AGENTS.md or a current
work order. Existing user authorization remains valid within its scope. When
documents conflict, cite the exact conflict and advance independent work;
do not invent approval, run broad preflight or overwrite another owner's work.

## Shared map and ownership

GitHub holds versioned implementation, review and sanitized coordination.
OpenClaw provides existing operational routing and brokered actions. Q should
receive concise exceptions and concrete approval packets. The canonical handoff
index remains a discovery surface, not a command language or authority store.
Keep one writer per implementation/worktree. Reviewers return findings without
editing the author's code unless that ownership is explicitly reassigned.

Source-of-truth mapping between QA11lylabs, qa11ylabs-website and OpenclawOps is
still an architecture decision. Do not relocate live code while preparing this
standard. Preserve dirty files, old evidence, operational safeguards and known
rollback paths. No main merge, deployment or service restart follows onboarding.

## Syntax and file design

| Purpose | Format / requirements |
| --- | --- |
| Instructions and review | Plain UTF-8 `.md`; directly readable, short role-specific entry points; no Base64 wrapping |
| Machine metadata | Strict `.json`; versioned contract, bounded fields, no duplicate keys or hidden executable commands |
| JSON contract | `.schema.json`, declared dialect; version incompatible changes and migrate consumers explicitly |
| Workflow/config | `.yml`/`.yaml`, spaces, no duplicate keys; tool-specific validation as well as syntax |
| Python | `.py`, four spaces, stdlib for these helpers; explicit inputs/outputs, no implicit privileged shell |
| Existing Node | Preserve existing `.js`/`.mjs`/`.cjs` module boundaries and dependency locks |
| Shell | `.sh`, explicit interpreter, checked failures, quoted variables, bounded external calls |
| UI/report | Semantic HTML and shared accessible status patterns; keyboard/screen-reader checks; verify actual PDF structure |

Text uses LF and final newline. Git executable state is explicit, independent
of extension: ordinary files `100644`, intended executables `100755`.
Invoke the supporting Python files with `python3` and the check script with
`bash`; they need no executable bit themselves. Do not normalize every file
to executable. Use the final Git tree, not local appearance, as upload evidence.

No new production runtime version or toolchain is mandated by this document.
Record actual versions and compatibility before choosing pins. Keep small
reviewable changes; isolate formatting changes from behavior changes.

## Three separate contracts

1. **Routing:** existing index fields exactly `id`, `target_agent`, `status`,
   `subject`, `source`; existing source subfields and validator remain unchanged.
   Routing agents remain codex/muse/arch/antigravity, and statuses remain
   ready_for_review/needs_revision/blocked.
2. **Evidence sidecar:** the new version-1 agent-return schema captures what
   a producer actually checked and who acts next. Hermes/Perplexity may be
   attributed producers here; this does not add routing identities or invoke
   them. `authorization` is always `none`. Source is the exact revision being
   described/reviewed, not a guessed latest commit. The containing publication
   commit identifies the return itself; do not fabricate a self-referential SHA.
3. **Runtime:** the current scanner interface remains
   `runScan(URL,{signal,timeoutMs}) -> Promise<{lh,axe}>`, nullable integer score
   0–100. No submit/status/cancel API is presumed. Future adapters, release
   manifests and resource policies need their own reviewed versioned contracts.

The evidence schema is a sidecar, not a second task index, authentication,
execution request or proof the claimed checks occurred. Validate its structure,
then independently inspect evidence. Do not put secrets, client domains,
contact details or raw private findings in public coordination.

The stdlib parser additionally requires UTF-8 bytes, at most 65536 bytes,
no duplicate JSON keys and a lexical integer version (not 1.0). Those are stricter
serialization rules beyond the declarative JSON Schema. A relative evidence_ref
resolves in the repository at the commit containing that return, not implicitly
at source.commit. source.commit identifies the code being described/reviewed;
use an allowlisted full-SHA GitHub link when evidence lives elsewhere. Evidence
references are not commands and the validator does not dereference them.

## Work and review protocol

Every task starts with existing ID, exact repo/branch/SHA, owner, allowed files,
required inputs, tests and next gate. Pull only necessary context. Each return
reports actual PASS/FAIL/BLOCKED/UNKNOWN/NOT RUN checks, remaining blockers and
one next action. Separate external attributed results from independent tests.
Read != accepted != completed != reviewed != authorized != deployed.

On a raced update, reread the current branch head and apply a minimal patch
with expected-head protection. Preserve unrelated tasks and their source SHAs.
Do not force push, reset/clean shared work, blanket chmod or delete historical
artifacts. A push makes evidence discoverable; an explicit agent return proves
receipt. Unchanged snapshots should not generate repeated messages.

Use [workflow tools](WORKFLOW_TOOLS.md) for explicit inbox reads. A future
adapter belongs inside the existing approved Arch path with per-agent cursors,
bounded retry/backoff, idempotent receipt handling and a kill switch. Do not
start an extra daemon, timer or unaudited natural-language shell runner.

## Tests, limits and promotion

Syntax/schema/mode/hash checks -> meaningful behavioral tests -> independent
exact-source review -> approved disposable integration -> bounded VPS acceptance
-> reviewed release/rollback -> production verification. Existing restrictive
AGENTS requirements need an explicit reconciled amendment before a conflicting
PR workflow is used; a helper script does not bypass them.

Resource register fields: parameter name/type/units/range, proposed value,
source rationale, enforcement point, measured result and approval state.
Include worker and aggregate memory/CPU/PIDs, concurrency/queue, job and cleanup
deadlines, spool/output/temp/disk, requests/navigations/response bytes and target
allowlist. Missing or malformed critical values block admission; no proposed
ceiling is called enforced. Cleanup uncertainty blocks retry/further admission.

Preserve CLIENT-PILOT-001's exact scope. Intensive scans start only after
representative calibration proves capacity and cleanup. The next control job
does not authorize broad recursive scanning, load/fault injection on production,
paid provisioning, client-data processing outside scope or notification sends.

Reports must preserve evidence provenance, distinguish tool impact from assessed
severity/manual confirmation, include executive summary and remediation detail,
and expose incomplete coverage. Verify readable HTML plus the actual exported
PDF's tags/reading order/links/headings. No generated score or issue is evidence.

## Supporting-package validation

From the repository root:

```sh
bash scripts/check-agent-workflow.sh
python3 -I -B test/agent-return.test.py -v
python3 scripts/validate-agent-return.py --file docs/agent-handoffs/templates/agent-return.example.json
```

These commands do not run the harness or prove a live VPS outcome. The new
schema and tools require review before adoption as trusted CI/broker inputs.
