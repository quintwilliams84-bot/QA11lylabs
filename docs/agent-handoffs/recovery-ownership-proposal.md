# Recovery ownership proposal

Cloud specification candidate is now available in OpenclawOps:
`agent/codex/recovery-policy` at `1586a7a29b7d19277584bb96d573e07c7217e00b`.
Its pure decision-policy suite passed 16 synthetic tests. It has no executor,
state store, service integration or production authority; all outputs are
unauthorized proposals. See
[candidate scope and blockers](https://github.com/quintwilliams84-bot/OpenclawOps/blob/1586a7a29b7d19277584bb96d573e07c7217e00b/docs/agent-operations/RECOVERY_POLICY_CANDIDATE.md).
Full deployed source is still needed before drafting exact replacement adapters.

DESIGN ONLY. No active policy, service change, restart, permission change or
deployment is authorized. Reconcile exact deployed source before implementation.
Detailed live findings remain outside the public repository.

| Responsibility | Proposed owner | Boundary |
| --- | --- | --- |
| Process lifecycle | Verified native supervisor | No competing direct launch |
| Health escalation | One designated controller, identity TBD | Other monitors observe |
| Scanner deadline | Exact per-job owner | No browser-name/age/PPID cleanup |
| Proven owned orphan reconciliation | One bounded reconciler | Exact job/container identity required |
| Lease/database repair | Supported application maintenance path | No deletion from generic health checks |
| Provider failures | Bounded request policy/circuit breaker | Quota/auth failures alone do not restart a healthy gateway |
| Code/browser updates | Reviewed release workflow | No watchdog installation, pull or general doctor/fix |

Native restart-on-exit and external health checks may coexist with distinct
responsibilities. A lock coordinates only participants that honor it; adding a
lock does not neutralize legacy recovery writers. Cutover must reconcile them.

Before activation, require:

- Bounded probes separating liveness, readiness and provider availability.
- Startup grace, maintenance mode and respect for intentional stops.
- One health-action owner and serialized actions per service.
- Durable restart budget/cooldown that survives controller restarts.
- Explicit active-job interruption/retry policy; preserve queue/evidence/state.
- No automatic lease deletion or mutating repair from a failed port check.
- Cleanup by proven job/container identity; names, age and PPID 1 are insufficient.
- Bounded escalation to a sanitized diagnostic state, not repeated recovery.
- Readiness verification after any approved recovery and a reviewed rollback.

## Synthetic acceptance tests to implement

1. Concurrent requests cause one authorized recovery action.
2. Healthy gateway plus provider quota/auth failure causes no restart.
3. Startup grace, transient failure and intentional stop cause no repair.
4. Restart budget survives controller restart; corrupt state fails safely.
5. Hung action reaches deadline without parallel recovery.
6. Active/unrelated browser jobs survive reconciliation.
7. Only proven owned orphan jobs are cleaned; failed cleanup preserves evidence
   and cannot delete unrelated directories.
8. Database errors never trigger opportunistic lease deletion.
9. Repeated recovery failure reaches a bounded diagnostic state.

These tests are proposed, not executed. No live failure injection is authorized.

## Phases

1. Get exact deployed watchdog source paths/hashes and relevant decision/action
   functions. Preserve dirty/untracked implementation through an approved private
   export before integration; do not pull/reset over it.
2. Build a candidate with injected probes/actions/state. Test synthetic failures
   without real service commands, notifications or database writes.
3. Shadow-evaluate sanitized recorded observations; emit proposed decisions only.
4. Review owner, thresholds, budget, cutover, rollback and service interruption
   allowance with Quintin before enabling any change.
5. After approval, coordinate existing recovery writers; do not add another daemon.

## MCP boundary

Declared server names do not establish active tools or permissions. Begin future
collaboration wiring with narrowly scoped task/metadata reads. Keep restarts,
Docker control, database repair and deployment outside the read-only surface.
Tool annotations and agent names are not authorization; enforce server-side
identity/capabilities. No GitHub MCP connector is activated by this proposal.
