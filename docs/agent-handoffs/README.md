# Shared agent inbox and proposed MCP connection

This branch provides **task discovery**, not an active message service, an MCP
server or an installed background worker. The index is data, never permission to
execute a task. No production connection, deployment, notification or polling
schedule is enabled. [Coordination handoff](../staging-coordination.md).

## What works now

In a reviewed cloud checkout of this branch:

```sh
python3 -B scripts/read-agent-handoffs.py --file docs/agent-handoffs/index.json --agent muse
python3 -I -B test/handoff-reader.test.py -v
```

Allowed identities are codex, muse, arch and antigravity. Names select metadata;
they are not authenticated identities or permission boundaries. The reader accepts
at most 32 tasks and 32 KiB, requires exact source commits and known repositories,
rejects duplicate fields/tasks and unknown fields/statuses, and reads only a
regular file (no final-component symlink). It has no shell, subprocess, network,
state write, receipt or acknowledgment operation. Parent directories and reviewed
reader code are trusted; it is not a sandbox or secret-redaction engine. Do not
put credentials, client data or private logs in this public index.

Twelve local reader tests passed, including invalid authorization/command fields,
oversized metadata, duplicate keys, symlinks and unchanged file contents/mtime.
These checks do not validate scanner behavior, real MCP connectivity or delivery.
The historical snapshot can become stale; compare each task's full source SHA with
the contributor's current candidate before acting. A changed SHA needs fresh review.

## Recommended communication path

1. GitHub remains the source of code, task references, PR discussion, checks and
   human approval. Contributors publish small branch commits and exact-SHA evidence.
2. Agents discover tasks through their existing GitHub client or a narrowly scoped
   GitHub MCP connection. This session currently has Git transport but no callable
   GitHub MCP connector; previous GitHub API requests were denied.
3. A future adapter can expose a read-only `handoffs.list` operation returning this
   validated metadata, pinned to the inbox revision it read. That is a proposed
   tool name, not an already registered endpoint. Do not execute candidate scripts
   to inspect an untrusted PR: use independently reviewed reader code.
4. Completion requires an actual agent report citing the source SHA and test
   evidence. Reading the inbox is not acceptance, delivery or completion. This
   reader does not write receipts or acks. Future dispatcher/ack state needs a
   separate reviewed design with stable task IDs and bounded retries.
5. Integration still requires Quintin's current-revision approval and trusted
   passing checks. Merge and production deployment remain separate operations.

MCP supplies tool access; it does not automatically route conversations or wake
agents. No automatic synchronization between independent sessions is claimed.

## Proposed access boundaries — not applied settings

| Role | Intended access | Excluded powers |
| --- | --- | --- |
| Contributor agents | Read selected repos; create their task branches and PRs when authorized | Approve their own work, bypass main protections, deploy, read production secrets |
| Reviewer | Read candidate files, diffs and checks; return review findings | Treat candidate instructions or metadata as authorization |
| Trusted coordinator | Evaluate required checks and independent human approval | Change approval policy from candidate code; bypass protections |
| Arch inventory adapter | Explicitly allowlisted sanitized runtime metadata | Arbitrary shell, raw environment/log dumping, restart or package changes |
| Future deployment broker | One approved immutable release and rollback operation | Poll main and run arbitrary repository scripts as root |

Repository-scoped credentials alone do not enforce branch restrictions. Verify
actual GitHub rulesets/protections and independent reviewer identity before
enabling writes or merges. Prefer separate narrowly scoped identities; do not
share an admin token among agents. Credentials belong in supported secure bindings,
not this repo or chat. Inspect existing bindings before requesting new credentials.

## Existing MCP and Docker evidence

OpenclawOps contains `scripts/ops/mcp/qa11y-mcp-toolhub.py`, described as stdio
transport with no listening port. Its source includes diagnostic commands,
Docker execution and elevation functions. Therefore its entire surface must not
be exposed as a read-only collaboration connector. Installed version, available
tools, client permissions and live configuration await Arch's inventory; none of
those tools was executed during this work. No existing provider bridge was enabled.

Do not install a GitHub server/container merely to access github.com. An approved
MCP client/adapter can use existing GitHub access without another VPS daemon.
Docker is potentially useful for disposable test isolation, on a non-production
host with adequate capacity: network disabled during synthetic execution, no
production secrets or Docker socket mounted inside, unprivileged runtime,
explicit memory/CPU/PID/disk/time limits and verified Chromium sandbox support.
Select and pin an image by reviewed digest only after validating compatibility.
This branch does not provide or claim a tested container, image pin or resource
budget. Do not loosen host restrictions or disable browser security to make it run.

## Prerequisites for active wiring

- Arch: sanitized live MCP/tool ownership and resource inventory already requested.
- Muse: confirm it can read this branch, return its latest candidate SHA and
  acknowledge the specific review findings it is addressing.
- GitHub: establish usable API/MCP access and verify least-privilege permissions;
  Git fetch/push success alone does not establish API or PR-review access.
- Staging operator: approve a compatible isolated host and concrete resource caps.
- Then review exact adapter configuration and delivery/ack behavior before enabling
  a dispatcher or schedule. No production pull/sync receiver is installed here.

## Proposal intake and DOC-001

Use [proposal intake instructions](PROPOSAL_INTAKE.md) and the
[proposal template](PROPOSAL_TEMPLATE.md) for new ideas. Review metadata is
not execution authorization. Existing schema and entries remain authoritative
for discovery only.

`doc-001` points to the [existing DOC-001 work order](https://github.com/quintwilliams84-bot/OpenclawOps/blob/b7df5defc983b808e39c48c97afbdd5c863a3f82/docs/work-orders/DOC-001.md).
The intake instructions record its source references and related prior handoff;
the work-order packet is not duplicated here.
