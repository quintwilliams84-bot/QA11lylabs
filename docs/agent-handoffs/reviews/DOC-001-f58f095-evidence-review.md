# DOC-001 evidence amendment review — changes requested

Reviewer: Codex. Date: 2026-10-22 UTC.
Reviewed OpenclawOps revision: f58f095a091c8c16401417434188b1568231f353.
This is technical feedback, not staging, merge or deployment approval.

## Blocking finding: log ceiling changes test fixture semantics

Severity: High for validation correctness; blocks this staging candidate.

Evidence:
- .github/workflows/document-candidate-checks.yml lines 64, 73, 79 and 142 set
  `ulimit -f 2048` in the parent shell before launching the test producers.
- templates/document-checker/isolated/tests/integration.py lines 51-54 creates
  the oversized fixture with `truncate(8*1024*1024+1)` before invoking the
  upload guard whose rejection the test is intended to check.

The file-size resource limit is inherited by the test process and descendants,
not just tee. On Linux Bash here, the resulting limit is 2,097,152 bytes.
The existing 8,388,609-byte fixture cannot be created under it. Validation would
fail at fixture setup instead of exercising the upload-size rejection. Runtime
and test source files being unchanged does not make test execution semantics
unchanged when the workflow imposes this inherited limit.

Independent minimal cloud probe (not the document suite): a child Bash with
`ulimit -f 2048` ran a small standard-library Python process using TemporaryFile.
Reading RLIMIT_FSIZE returned 2097152. Truncating the temporary file to
8*1024*1024+1 raised EFBIG. SIGXFSZ was ignored inside the probe only to report
that error safely. No document, app import, Docker, package installation, email,
model call or production operation was involved. This does not claim a complete
hosted-suite replay or that the oversized guard itself is broken.

## Required correction

Scope the output-file ceiling to the log collector only, leaving producer and
fixture limits unchanged. For example, review this pattern for each log:

```bash
set -euo pipefail
python3 TEST_COMMAND 2>&1 | (ulimit -f 2048; exec tee "$LOG_PATH")
```

This is an illustrative cloud workflow pattern, not a production command.
Keep the exact existing test commands and runtime limits. A collector overflow
must fail the step; never truncate logs and return success. Preserve producer
failure through pipefail. Test the logging helper with tiny synthetic limits:
normal output succeeds; producer failure fails; log overflow fails; a legitimate
oversized sparse fixture can still be created by the producer. Do not reduce
fixture size or skip the original oversize test to make the workflow green.

## Positive controls and remaining limits

The source diff is restricted to the workflow and DOC-001 work order. Read-only
repository token permission, pinned action refs, GitHub-hosted runners, scoped
checkout, disabled npm lifecycle scripts, job timeouts, explicit artifact paths,
seven-day retention, identity/version/hash/image records and always-run cleanup
inspection are appropriate controls. They are source settings, not a hosted pass.

`if-no-files-found: error` does not require every listed path to exist; reconcile
expected per-job evidence against actual steps and conclusions. Cancelled/lost
runners may leave missing evidence, which must remain UNKNOWN, as the work order
already states. Artifacts must be inspected before a readiness conclusion.

After revision: update the exact candidate/workflow SHA and work-order target.
Antigravity should independently review the replacement and this finding. Then
Quintin can consider one exact hosted run once a designated operator can retrieve
run identity, jobs, logs and artifacts. Do not dispatch f58f095, silently retry,
open a PR that starts unapproved tests, broaden credentials, or change production.

No formal GitHub PR approval, implementation authorization or suite result is
provided by this document. All 73 expected DOC-001 cases remain unrun by Codex.
