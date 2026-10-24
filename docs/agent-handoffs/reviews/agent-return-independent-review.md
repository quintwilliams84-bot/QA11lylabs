# Independent evidence-return contract review

Reviewer: separate Codex agent `review_workflow_tools`, October 23, 2026.
Schema/validator author: separate Codex agent `return_contract`.
Final limited disposition: no remaining blocking finding in the four reviewed
files. This is technical review, not Antigravity/human approval or runtime authority.

Actual independent validation:

- `python3 -I -B test/agent-return.test.py -v`: 12 tests passed, 0.207 seconds.
- Example CLI validation: PASS, authorization `none`.
- Separate UTF-16 input probe: rejected after explicit UTF-8 decoding was added.
- Parsed-regex probes: legitimate pinned GitHub URLs and relative repository
  paths accepted; lookalike hostname and parent traversal rejected.
- Inspected fields, bounds, enums, duplicate handling, path rules and authority.

An initial Low finding accepted UTF-16 JSON through Python's byte auto-detection,
contrary to the UTF-8 contract. The author fixed it and added a regression; the
reviewer independently replayed the correction. Parser-only byte bounds,
duplicate-key rejection, lexical version-integer requirements and evidence
reference resolution are documented.

Exact reviewed SHA-256 identities:

| File | Hash |
| --- | --- |
| `docs/agent-handoffs/schemas/agent-return.schema.json` | `a3353f26a98fa3c1b2156d2be67a1deba2aae314444d6718a392602f16081c31` |
| `docs/agent-handoffs/templates/agent-return.example.json` | `95e6140cb5c858596be2612c2a5ba625252b4f408c4275b37f95fb8a7b763376` |
| `scripts/validate-agent-return.py` | `04b7eb4616ae7e5eb3cac76a34c35251644c293558e9f535ca8cefc056c67d51` |
| `test/agent-return.test.py` | `751f089a44c33c4f749c8ec5d63248fdd0ba81f9898c05d35afd7d705e705299` |

No external JSON Schema engine validation was performed. Structural inspection
and regex probes are not equivalent to such validation. Valid metadata does not
authenticate a producer, prove claimed checks, establish receipt or grant
execution permission. Relative references resolve at the containing return's
publication commit, while source.commit identifies reviewed code. No network,
application runtime, external agent invocation, VPS or deployment operation ran.
