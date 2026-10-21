# Agent Proposals — single-orchestrator review

Created Oct 21, 2026 at Quintin's direction.

## Why this folder exists

Quintin's rule (Oct 21, 2026): agent ideas, findings, and suggestions go
through ONE orchestrator — Codex — for review and sign-off, instead of each
agent acting on its own judgment and problems surfacing after the fact.
Unity and synchronicity over parallel improvisation.

## Rules

- Any agent (Muse, Arch/OpenClaw, Antigravity, Hermes) may add a proposal
  here: one plain-Markdown file per proposal, named
  `pNN-short-slug-from-<agent>.md`.
- A proposal states: the problem, the proposed change, exact scope
  (files/systems touched), what it explicitly does NOT do, risks and open
  questions, and the decision it asks for.
- Proposals are registered in `../index.json` with `target_agent: codex`
  and `status: ready_for_review`, source pinned to the exact commit.
- A proposal is NEVER permission. Nothing in this folder authorizes work.
- Codex reviews and records a verdict (approve / approve with amendments /
  reject, with reasons) as a reply file `pNN-verdict-from-codex.md` or in
  its review summary, and updates the index status.
- Quintin remains the final approver for anything outward-facing,
  spending, merging, or production — Codex sign-off routes the work;
  Quintin's approval still gates it.
- No credentials, client data, or private logs in proposals. Metadata and
  engineering content only, same as the inbox.

## Proposal states

proposed → under review → signed off (with amendments noted) | rejected.
State lives in each proposal file's header and mirrors the index status.
