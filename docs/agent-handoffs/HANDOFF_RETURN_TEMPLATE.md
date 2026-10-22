# Evidence return for EXISTING-TASK-ID

Template only. Replace placeholders with sanitized facts; UNKNOWN stays UNKNOWN.
Use one return on your task branch, normally returns/<task-id>-<agent>.md, and
update it in later commits. Link the existing work order; do not clone its scope.
This template is a report format, not a dispatcher or authorization schema.

## Receipt of task

- Existing task ID:
- Agent and responsible operator (role/account only, no personal contact):
- Packet read: repository, full commit SHA, document path:
- Candidate/source under review: repository, full commit SHA, paths:
- Coordination index revision read (full SHA):
- Observed at (UTC timestamp):
- Scope actually performed: read-only inspection / isolated synthetic check / other
  separately authorized action; name the authorization if applicable:
- Independent reviewer: PENDING, or reviewer identity plus exact reviewed SHA:

This is a manual acknowledgment of reading and scope, not acceptance by the reader
script. A named agent/account is not authenticated ownership or permission proof.

## Findings and evidence

| Stage or check | PASS / FAIL / BLOCKED / NOT RUN / UNKNOWN | Evidence time and exact sanitized reference | What it establishes and what it does not |
| --- | --- | --- | --- |
| Replace with a real check | UNKNOWN | Missing | No result yet |

Use PASS only for checks actually completed. Wiring/source inspection is not an
end-to-end test. External review/test reports are attributed, not relabeled as
independent execution. Keep expected, actual, skipped and unrun counts separate.
State what UNKNOWN means; it must not become PASS by missing evidence.

## Commands and effects

- Exact safe commands actually run (redact private arguments; label redactions):
- Environment and tool versions relevant to interpreting the result:
- Time/output/resource limits used:
- Files, receipts or other effects created, if any:
- Commands NOT RUN and why:
- Dirty work preserved; production effects, if any, explicitly authorized:

Do not paste raw environment, credentials, customer data, message contents or
unredacted logs. Reference private originals by an opaque locator if needed;
public copies must be deliberately sanitized. Read-only means no source/runtime/
state/receipt mutations during inspection; publishing this report is a separate
Git write, not proof the collection was read-only.

## Minimal next correction

- Smallest evidence-supported change, or no change recommended:
- Exact affected files/components and ownership:
- Existing task/proposal reused; overlapping work checked:
- Dependencies/blockers and named owner:
- Synthetic acceptance tests still required:
- Production activation/rollback prerequisites (planning only):

Do not execute a recommendation because it appears here. Technical review, coding,
workflow execution, merge and production activation have separate authority.

## Reviewer return

The independent reviewer appends feedback in a subsequent commit or review file,
referencing the full report/candidate commit. This avoids a self-referential SHA.
Record: exact SHA, findings/severity, independently run checks, attributed checks,
unrun checks, revisions needed and next gate. Never approve your own report as
independent evidence. Changed revisions need review of their changed scope.

## Delivery

Publish to your authorized task branch after inspecting workflow triggers. Return
repository, branch, full commit and path. Reading/pushing metadata alone does not
wake another agent or prove receipt. The coordinator links the return to the
existing task after review; do not independently rewrite the shared queue or
create duplicate task IDs. No approval or deployment is implied by a status field.
