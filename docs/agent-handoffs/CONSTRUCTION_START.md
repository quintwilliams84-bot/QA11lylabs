# Construction start: shared map and role briefs

Owner: Codex coordination. Version 1. Prepared October 23, 2026 America/Denver.

## Read only what your task needs

1. Read [construction protocol](CONSTRUCTION_PROTOCOL.md).
2. Read your brief: [Muse](briefs/muse.md), [Arch](briefs/arch.md),
   [Antigravity](briefs/antigravity.md), or [Codex](briefs/codex.md).
3. Read the exact source/review linked by that brief. Do not load the entire
   repository history or repeat old inventories merely for onboarding.
4. Return the small [evidence sidecar](templates/agent-return.example.json)
   validated against [its contract](schemas/agent-return.schema.json), plus
   detailed private evidence only where already approved.

This package is supporting work for the existing coordination/harness/Git/
acceptance work orders. Existing task IDs and implementation owners remain.
It does not replace their source SHAs or add another routing registry. Only
the canonical staging index determines current routing metadata; work orders
and exact reviews supply scope. Conflicts are returned as named blockers.

## Current facts, not inferred readiness

| Item | Exact reference / state |
| --- | --- |
| Canonical discovery | `codex/staging-coordination:docs/agent-handoffs/index.json`; read its current full snapshot SHA |
| Muse's existing task | `customer-path-integration-scope`, source `a5e7816d83d13008b11fadc92686a015b6fa5de3` as indexed at `8bee33d043897ffd3495d50b5a31d252dfe855a9`; needs_revision |
| Rev10 claimed results | 67 synthetic passes attributed to Muse; not independently replayed by this onboarding package |
| Permission proposal | Recovery `7f0dc6af3a836fe03c8d536fc3cdc456522c23c5`, `docs/agent-handoffs/proposals/rev9-permission-fix/`; adapted by Rev10, do not apply old patch wholesale |
| Mode finalization | `045ef12cfea6a76045c0b1eceb639501e0af7a36`: eleven executable entries from Rev10 manifest, original blobs preserved; source narrative says ten |
| Remaining exact-package finding | Five historical result logs absent from strict manifest; preserved, not silently deleted or excluded |
| Arch packet | `e575f5077b36af8ae786708497163ddc4ec765b6:docs/agent-handoffs/returns/CLIENT-PILOT-001-acceptance.commands.sh`; exit-3 hold remains |
| Communication helpers | [Workflow tools](WORKFLOW_TOOLS.md): direct Git inbox reads and changed-only snapshot filtering; no active dispatcher or agent receipt claim |
| New P07 proposal | Preserved at `2af1583692370d1d0b5f9363b1388944ce8e6c19`; [scoped review](reviews/p07-mode-independent-invocation-review.md) requests invocation/manifest clarification |

Always check whether a newer source exists before acting; these facts describe
the preparation snapshot. A later source invalidates only the affected review
evidence, not the stable task identity.

## Construction sequence for the next two working days

**First working session:** finish supporting schema/tool review; each agent
returns its understood scope and missing inputs once. Muse resolves exact
packaging and executor findings; Arch reconciles only changed packet rows;
Antigravity reviews and preserves existing Git work. Codex publishes one scoped
queue update per affected task after evidence, not an entire index replacement.

**Second working session:** if reviewed executor, complete pairing, approved
fixture origin, operator/evidence access and isolated-run scope are ready, run
one authorized isolated control fixture with no retry. Review real outcome and
cleanup before advancing. Otherwise return the precise blocker and continue
independent report-contract/gate preparation. Calendar time does not waive the
gates or promise that the entire VPS is production-ready in two days.

Then complete separate isolated timeout/interruption acceptance, bounded VPS
acceptance, scan-to-report integration and reviewed release/rollback. System-wide
upgrades follow measured service-by-service work, not a blanket upgrade command.

## What Q needs to relay now

Share only each agent's brief and this package's exact publication SHA. Agents
with existing Git access should read directly and return a commit/path, not make
Q relay large reports. Arch may route Hermes's existing outline-only work through
the attributed path it already uses. Perplexity is optional manual reference
research, not a critical dependency. No agent is claimed to have received this
package until its actual acknowledgment is returned.
