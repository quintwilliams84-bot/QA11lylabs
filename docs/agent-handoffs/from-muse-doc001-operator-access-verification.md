# DOC-001 operator access verification (read-only)

From: Muse. Date: 2026-10-21 (America/Denver). Requested by Quintin.
Method: GitHub MCP (OAuth) read tools + anonymous web UI pass. Nothing was
dispatched, created, re-run, or changed. No tokens shared; no permissions
changed. Sanitized evidence only.

## Operator account
- Identity call (get_me) succeeded: the operator acts as GitHub user
  **quintwilliams84-bot** (id 279873787) via GitHub's official MCP server
  over an OAuth user token.

## API surface (MCP)
- The connected MCP server advertises exactly 9 read tools: get_file_contents,
  get_me, list_commits, list_issues, list_pull_requests, search_code,
  search_issues, search_repositories, search_users.
- NO Actions tools are advertised: no workflow listing, no run listing, no
  log retrieval, no artifact endpoints. Actions access via this API path:
  NOT AVAILABLE (not a 403 — the surface does not exist here).
- Prior write-side evidence stands: pushing .github/workflows/scan-tests.yml
  via the app integration returned HTTP 403 "Resource not accessible by
  integration" (Oct 18-21); root cause UNKNOWN (see P04 Rev 2).

## Workflow / run presence
- search_code: 0 files under .github/workflows/ in QA11lylabs and in
  OpenclawOps (default-branch index).
- Web UI (anonymous, public view) QA11lylabs Actions page: HTTP 200.
  Workflows listed: 1 — "Dependabot Updates" (GitHub-managed; the repo's
  .github folder on main contains only dependabot.yml and
  pull_request_template.md — no workflows folder).
- Runs listed: 1 — Dependabot run 39361825303, completed success,
  2026-10-19 20:58 MDT, 1m 12s, branch main.
- OpenclawOps Actions page and code tab: HTTP 404 anonymously (private
  repo; expected — the operator API path reads it, the public web does not).

## Logs access
- The one existing run's job list renders publicly, but log contents show
  "Sign in to view logs" — the verification browser carries no operator
  session, and the API path has no logs tool.
- Result: run-log access for the operator = NOT DEMONSTRATED.

## Artifact download access
- The only existing run carries no artifacts (run summary: Artifacts: none).
  No completed run with an artifact exists in either repo to sample.
- Result: artifact download access = **UNKNOWN** (per the task rule: no
  suitable existing evidence exists).

## Remaining access prerequisites for DOC-001 (evidence path)
1. A credential path that can create/commit a workflow file (the workflows
   write currently 403s via the app integration).
2. An operator surface that can list runs and read logs/artifacts (absent
   from the MCP catalog; would need the web UI signed in as the operator,
   the REST API with an appropriately scoped token, or an expanded MCP
   toolset).
3. One real completed run carrying an artifact, to convert download access
   from UNKNOWN to verified.

No validation ref was created and nothing was dispatched, per instructions.
