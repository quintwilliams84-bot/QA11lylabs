# Muse review return — Codex 264e9d3 / 8e102e5, templates, index, P03 contract

Author: Muse. Date: 2026-10-22 (America/Denver). Task:
customer-path-integration-scope. This file is my independent review
of Codex-authored material plus the disposition of corrections to my
own earlier work. It creates no proposal and authorizes nothing.

Exact sources reviewed: QA11lylabs 264e9d3592c169e1d85c6fd832d14ac0dce01b32
and 8e102e5a51ec9b9fdf10dadb644b0bd77579c577 (branch
agent/codex/customer-path-recovery); Arch returns
2136ae35d9c92f630043c51b1af6f9ee4dd995cb,
57539cb3d2997d78ab0ee74c5c0eea66792a7499,
207df57d9e39d29a0d5f9a6f331093c0de7a0939.

## 1. Index reconciliation (264e9d3) — VERIFIED, adopt

Mechanical diff, branch index vs canonical staging index at
68cf05cdf14d0e4209fb16d12762928c7840b7bb: 18 tasks vs 15; NO task
dropped; 3 added (customer-path-current-evidence,
customer-path-integration-scope, doc-001-amendment-independent-review);
all targets and source objects preserved except doc-001 source
advanced b7df5def to d4a96970d58d3ec2913a265119d344a5beced7fb
(OpenclawOps, verified below) and arch-chromium-restore-evidence
status ready_for_review to needs_revision (see section 4).
Subject normalization was NECESSARY and is confirmed: the reader
(scripts/read-agent-handoffs.py line 50) accepts only
[A-Za-z0-9 ,.:()/+-]{1,160}. Six canonical subjects I authored
violate it (semicolons; P03 also an equals sign):
scanner-source-reconciliation-review,
proposal-p02-leads-zero-loss-bridge,
proposal-p03-slice2-worker-provenance,
proposal-p04-ci-gate-interim,
proposal-p05-booking-availability-hardening,
doc001-operator-access-verification. Originals are preserved in the
branch README. The staging index is repaired to reader-valid
subjects in the same registration as this return; going forward I
validate subjects against the reader charset before pushing.

## 2. Templates (HANDOFF_RETURN_TEMPLATE, COMPONENT_RECORD_TEMPLATE) — ADOPT

Both preserve existing task IDs, force PASS/FAIL/BLOCKED/NOT RUN/
UNKNOWN honesty, separate observation from repair, prohibit private
content, and create no dispatcher, schema or registry. The component
template's insistence that a PID is not a durable identity matches
Slice 1 R3.1/R4.1. No changes requested. One note: the templates are
manual scaffolding; returns remain attributable evidence, not
receipts — the templates already say this.

## 3. DOC-001 access correction — ACCEPTED, with my correction recorded

Codex is right and my 4d5740ef report overreached. Independently
re-verified by my own read this session:
.github/workflows/document-candidate-checks.yml EXISTS in
OpenclawOps main at 4f01d8d47fdb1276ac8dc97d30b5e06312d6cd2c
(3,894 bytes) and on agent/arch/doc-001-staging-work-order at
d4a96970d58d3ec2913a265119d344a5beced7fb (8,418 bytes); both declare
workflow_dispatch. My search returning zero was a search-index
result, not evidence of absence, and my sentence claiming no
artifact-carrying run exists in either repo was not established for
OpenclawOps, whose Actions inventory is inaccessible to me.
Corrected positions: the DOC-001 candidate workflow is published;
what remains unverified is run/log/artifact ACCESS for a designated
operator, and OpenclawOps Actions inventory stays UNKNOWN. The
MCP-catalog finding (no Actions tools) and the app-integration
workflows-push 403 stand as separate, narrower facts. I concur with
the scaffold review's Low finding: Arch's PAT 403 report needs an
exact evidence reference before it is cited as established.

DOC-001 collector state: I accept Codex's replay record at d4a9697
(4 checks: normal 0, producer failure 7, collector overflow 153,
oversized fixture 0) as attributed Codex evidence; the f58f095
inherited-limit blocker is resolved by that correction. The 73-case
suite remains NOT RUN. Hosted flight still requires Antigravity's
independent review, verified access, and Quintin's exact-run
approval. Nothing here changes those gates.

## 4. Chromium-restore work order — needs_revision ACCEPTED

Codex's conflict findings are correct against Arch's evidence: the
live URL path is the isolated runner with host-mounted Chrome; a
managed-cache outage is not established; my work order's Step 1
premise is withdrawn, its Step 5 (Slack) is out of the task's
boundary, and verbatim output returns are replaced by sanitized
selected metadata. The work order file at a3a20bbe remains as
Quintin's record; its diagnostic role is superseded by the
staging diagnostic packet (from-muse-staging-diagnostic-packet.md).
needs_revision is the correct index disposition. No reinstall,
restart or scan is justified by current evidence.

## 5. P03 contract draft (Codex, at 8e102e5) — independent review: ADOPT WITH AMENDMENTS

The contract's provenance table is complete on the dimensions that
matter (pairing, image, browser independent of image, runtime,
assembly, configuration, admission, security, egress semantics,
results/delivery) and its warnings are correct (a digest proves
identity, not compatibility or authorship; sanitized handoff files
are design reference, not an install tree). Amendments A-P1 to
A-P3 are recorded in P03 Revision 3 (same file): resolved-target
release identity, deployed-hash correspondence as a first-class
item, and strict separation of the legacy document path from the
DOC-001 candidate. One addition of my own: the contract should
name the evidence timestamp/expiry for installed-state items —
Arch's component records mix historical and current observations,
and provenance built on stale identity is a false pin. I have
recorded this as a requirement in P03 Rev 3's UNKNOWN list handling
(items are stated with their observation time or marked UNKNOWN).

## 6. Slice 1 Revision 4 and packet

Filed in this same return: Slice 1 Revision 4 (candidate role as
runner adapter, one authoritative capacity claim, send-intent
durability, registration-time configuration, normalized B1 gates,
new prerequisite P0 on deployed-source correspondence) and the
staging diagnostic packet prepared to Quintin's specification
(exact identities, isolated operator/limits, one synthetic request
per product, document coverage backend-only, stubbed mail/model,
disposable persistence, stage results, verified cleanup, exact
commands by runbook, prerequisites, approval boundary). URL and
document implementations remain distinct throughout; the legacy
host parser is not treated as the document production candidate
anywhere in these documents.
