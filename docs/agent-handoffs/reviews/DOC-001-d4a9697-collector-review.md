# DOC-001 collector correction: independent replay

Reviewer: Codex. Date: 2026-10-22 UTC.
Exact reviewed source: OpenclawOps d4a96970d58d3ec2913a265119d344a5beced7fb,
branch agent/arch/doc-001-staging-work-order.

The previous f58f095 inherited producer file-size limit finding is resolved.
All four workflow pipelines put ulimit only around tee and retain pipefail.
Compared with f58f095 and with runtime base 4f01d8d, changed paths are only:
.github/workflows/document-candidate-checks.yml,
docs/work-orders/DOC-001.md and docs/work-orders/check-doc-001-collector.py.
Runtime/parser/test source is unchanged. Whitespace check passed.

Independent execution: reviewed helper extracted by exact Git object into a
temporary cloud directory; UID 1000; python -I -B; scrubbed environment with
PATH, temporary HOME and LANG only. Helper subprocess timeouts 10 seconds;
outer replay timeout 45 seconds. No packages, application imports or services.

| Case | Actual exit | Result |
| --- | --- | --- |
| Normal output | 0 | PASS |
| Producer failure preserved | 7 | PASS |
| Collector overflow | 153 | PASS |
| 8,388,609-byte sparse fixture unaffected | 0 | PASS |

Helper verifies collector files <= 1,024 bytes using its small test limit.
Workflow's actual collector limit is 2,048 KiB under Bash; these four cases test
the pipeline mechanism, not every hosted logging/artifact condition. Temporary
outputs were removed. Four passed, zero failed, zero skipped.

The 73-case document suite remains NOT RUN by this review. No hosted runner,
container/image execution, Actions artifacts, production behavior or cleanup is
validated by the four collector checks. This is correction acceptance only,
not DOC-001 staging or production approval. Keep independent review and the
exact hosted-run approval prerequisites. Antigravity unavailable tonight.
No deployment, merge, VPS change, hosted dispatch or credential operation occurred.
