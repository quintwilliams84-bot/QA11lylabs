# Independent supporting-tools review

Reviewer: separate Codex agent `review_workflow_tools`, October 23, 2026.
Author/integrator: coordinating Codex agent. User explicitly authorized delegation.
This is a limited technical review, not Antigravity/human approval, operational
readiness, deployment authorization or a claim of external agent receipt.

## Workflow helpers

Final limited disposition: no remaining blocking finding for reviewed-local-
checkout use. Independently ran `bash scripts/check-agent-workflow.sh`:
17 tests passed (2.459 seconds on the recorded run).

Two Low findings were reproduced and corrected:

1. A manifest whose root was `[]` originally emitted a traceback. The object
   guard now returns controlled failure. Independently reprobed exit 1, no
   traceback, staged tree unchanged.
2. `--ref` originally accepted a tree-object SHA despite documenting a commit.
   It now resolves `^{commit}`. Independently reprobed rejection of a valid tree.

Reviewed exact code hashes (SHA-256):

| File | Hash |
| --- | --- |
| `scripts/prepare-harness-modes.py` | `28145366656f057faa5bbc6a8eb5719fdcf826b851e126ff2a32f47c10462cef` |
| `scripts/agent-inbox.py` | `d542820ec89b6c3d712aa2cf1a50c1f3d8a02257683f12a43831957b47cfe76c` |
| `scripts/check-agent-workflow.sh` | `b3e5054abf886884da718c06c252f5a078119b8f1e65af2aa13b2e5bf62145cf` |
| `test/agent-workflow-tools.test.py` | `5ddb13fe18e0422c88710f4fc208c233c9329cc07f80d361ad5bba82d159cc9a` |

The reviewer read the construction protocol/start and all four role briefs and
found no blocking authority or existing-routing-schema issue. The workflow
guide's stale 15-test count was corrected to 17 after that review.

Preparation validates staged data and changes declared missing executable bits
only. It does not stage source, change worktree permissions, commit or push.
Inbox reads Git metadata using the trusted local reader, not fetched executable
code. `--since` is change filtering, not delivery or exactly-once execution.
Trusted Git configuration/credentials and one writer per worktree remain
prerequisites. No real network, harness, browser, Docker, systemd, delivery,
VPS or deployment test ran. Existing package failures remain separate.

## Evidence-sidecar review

The evidence schema, validator and tests receive a separate bounded review
before adoption. The final result is recorded in the adjacent sidecar review;
the workflow findings above do not automatically apply to those different files.
