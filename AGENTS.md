# Agent guide — QA11lylabs

Read [the shared operating standard](docs/OPERATING_STANDARD.md) and
[the project adapter](docs/PROJECT_ADAPTER.md) before acting. They define the
revision-bound review and separate deployment approval requirements.

Use a task branch and a PR. Quintin's approval plus passing current checks are
required before merge. Do not merge, publish a release, deploy, restart services,
change schedules or secrets merely because a coding task is authorized.

Preserve other agents' changes and dirty VPS files. Use synthetic test data.
Never load production credentials into cloud, print secrets, or claim unrun tests.
No GitHub merge automatically changes production. Installed controls must be
verified separately; this guide is not evidence that they exist.

Follow any applicable nested safety instructions. If instructions conflict with
these release boundaries, report the conflict rather than bypassing approval.
