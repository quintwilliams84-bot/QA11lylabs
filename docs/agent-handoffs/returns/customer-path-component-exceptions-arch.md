# Component evidence return for customer-path-current-evidence

## Receipt and reuse boundary

Arch; GitHub account quintwilliams84-bot. Packet QA11lylabs
264e9d3592c169e1d85c6fd832d14ac0dce01b32; canonical index read
68cf05cdf14d0e4209fb16d12762928c7840b7bb. This follows first return
2136ae35d9c92f630043c51b1af6f9ee4dd995cb. Independent review PENDING Codex.
These records use COMPONENT_RECORD_TEMPLATE.md headings and existing evidence;
no wider diagnostics were executed after the first-return boundary.
Historical observations are not current installed-state verification. UNKNOWN
means evidence not collected/available here, not absent or safe. Proposed owner
for operational follow-up is Arch, with Codex review; ownership is not granted
runtime privilege. Antigravity review remains pending where specifically required.

Shared resource snapshot reused from preceding read-only inspection: available
RAM 863 MiB, swap used 1838 MiB of 2047 MiB; memory PSI averages 0.00 at sample.
Exact sample timestamp was not retained. This does not prove a leak, headroom
under load or safety for another heavy job. Active scans UNKNOWN; no scan launched.

For every record below: no credentials, private logs, memory, queues or customer
contents were exported. No permissions, service state or schedules changed.

## Component evidence record: gateway

### Identity and provenance
- Purpose: OpenClaw gateway.
- Observation/source: Oct 20 08:35 MDT historical baseline; Arch session evidence, not independent verification.
- Supervisor/identity: root user systemd gateway; PID then 4079203, restart count 1.
- Source/config: Installed source/config SHA UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Gateway state/leases; private contents not inspected.
- Recovery: Overlapping PM2 openclaw-watchdog and systemd qa11y-watchdog observed historically.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Reconcile single recovery owner before executor changes; do not delete leases or kill browsers.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: hermes-bridge

### Identity and provenance
- Purpose: Delegation bridge.
- Observation/source: Oct 20 08:35 MDT historical baseline; Arch session evidence, not independent verification.
- Supervisor/identity: root systemd bridge; PID then 375760, restart count 0.
- Source/config: Installed source/config SHA UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Job receipts/artifacts; trusted versus worker-writable evidence separation unresolved.
- Recovery: Current sole recovery authority UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Review job identity binding and bounded evidence interfaces before delegation activation.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: gateway-pm2-watchdog

### Identity and provenance
- Purpose: Gateway recovery controller.
- Observation/source: Oct 18–20 historical inventories; Arch session evidence, not independent verification.
- Supervisor/identity: PM2 openclaw-watchdog; UID/GID not freshly verified.
- Source/config: Deployed source hash and canonical counterpart UNKNOWN here.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Locks/cooldowns/restart budgets/maintenance coordination UNKNOWN.
- Recovery: Competes with systemd qa11y-watchdog historically.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Recover exact static source identity and coordination contract; no execution.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: gateway-systemd-watchdog

### Identity and provenance
- Purpose: Gateway recovery controller.
- Observation/source: Oct 18–20 historical inventories; Arch session evidence, not independent verification.
- Supervisor/identity: systemd qa11y-watchdog; UID/GID not freshly verified.
- Source/config: Deployed source hash and canonical counterpart UNKNOWN here.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Browser ownership evidence and lease handling need source reconciliation.
- Recovery: Competes with PM2 openclaw-watchdog historically.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Review cleanup ownership proof and shared recovery reservation; no cutover.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: scanner-web

### Identity and provenance
- Purpose: URL/document web route host.
- Observation/source: Oct 22 04:14–04:15 UTC current first return; Arch session evidence, not independent verification.
- Supervisor/identity: Saved PM2 qa11ylabs-scan -> server.js; current port 3001 PID 752444 UID/GID 0/0.
- Source/config: server.js SHA-256 e70df6a142feb4edcf39cde2dd12dceacf07756e0ae8f2d2628ae581f95599e1; Git counterpart UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Private lead-file/JSONL and report roles; owner/mode/writers UNKNOWN.
- Recovery: PM2 saved ownership; current restart policy/counter UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Resolve exact failed stage and root/Docker privilege boundary before proposing minimum correction.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: scanner-worker

### Identity and provenance
- Purpose: Isolated URL worker.
- Observation/source: Oct 22 current first return and immediately preceding source inspection; Arch session evidence, not independent verification.
- Supervisor/identity: Docker launched by release 20261017-r2 runner; worker UID/GID not refreshed.
- Source/config: runner SHA-256 d2b3167f8be4081822183ccd7022a9bf7b83cf3ba454a73edd6f0c747597b0dd; Git counterpart UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Host Chrome readonly mount; private job directories; writer/mode UNKNOWN.
- Recovery: Per-job watchdog source exists; current cleanup authority UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Read installed image/manifests and cleanup/admission contract; do not reinstall cache.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: document-parser

### Identity and provenance
- Purpose: Legacy document route versus isolated candidate.
- Observation/source: Oct 22 current first return; Arch session evidence, not independent verification.
- Supervisor/identity: Host python3 invoked by legacy route; document route host UID/GID 0/0; child identity UNKNOWN.
- Source/config: Route SHA-256 74d347624f2dda27c1297353d650b2dcf4934ee50ef41545ddd7a1179f684ab3; candidate OpenclawOps 4f01d8d47fdb1276ac8dc97d30b5e06312d6cd2c not proven live.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Upload/receipt/report directories, ownership and retention UNKNOWN.
- Recovery: Web process and child lifecycle; recovery UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Resolve UI/parser/report pairing; preserve DOC-001 isolated review, do not port automatic Hermes enrichment.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: sync-main

### Identity and provenance
- Purpose: Repository sync schedule.
- Observation/source: Immediately preceding read-only check this session; exact command timestamp not retained; Arch session evidence, not independent verification.
- Supervisor/identity: qa11y-sync-main.timer disabled and inactive.
- Source/config: Installed script hash not refreshed.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Git working trees remain preserved; backup completeness UNKNOWN.
- Recovery: Timer contained; manual callers not excluded.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Keep disabled; reconcile installed callers before replacement or reactivation.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: github-sync

### Identity and provenance
- Purpose: Legacy additional sync mechanism.
- Observation/source: Oct 18–20 historical inventory; Arch session evidence, not independent verification.
- Supervisor/identity: /usr/local/bin/qa11y-github-sync present; no active schedule found then.
- Source/config: Installed differs from repository historically; exact hashes not reused here.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Can alter Git and push main historically; current behavior not re-executed.
- Recovery: Manual/agent invocation remains possible; current callers UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Static caller/source audit only; local policy cannot constrain unrestricted credentials.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: agentmail-webhook

### Identity and provenance
- Purpose: Inbound mail callback.
- Observation/source: Oct 22 selected nginx directives; Arch session evidence, not independent verification.
- Supervisor/identity: Static proxy to loopback 5050/webhook and health route; supervisor/UID UNKNOWN.
- Source/config: Executable/config hash and Git counterpart UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Mail/event state and replay ledger UNKNOWN; no messages inspected.
- Recovery: Recovery owner UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Map authenticity/replay/body limits and durable acknowledgment from source only.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: agentmail-consumer

### Identity and provenance
- Purpose: Inbound event processing.
- Observation/source: Historical architecture references only; Arch session evidence, not independent verification.
- Supervisor/identity: Actual active consumer supervisor/UID UNKNOWN.
- Source/config: Source/config provenance UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Queue and event idempotency UNKNOWN.
- Recovery: Recovery owner UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Determine whether a consumer is configured without invoking or reading messages.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: agentmail-sender

### Identity and provenance
- Purpose: Outbound report delivery.
- Observation/source: Oct 22 route binding names plus historical evidence; Arch session evidence, not independent verification.
- Supervisor/identity: Web route references AGENTMAIL_SENDER; exact adapter identity UNKNOWN.
- Source/config: Mail adapter/source SHA UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Outbox acceptance/delivery/unknown semantics UNKNOWN.
- Recovery: Retry and reconciliation owner UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Static adapter and duplicate-send contract review; never test by real send.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: mcp

### Identity and provenance
- Purpose: Tool registration versus activation.
- Observation/source: Historical inventories only, not refreshed; Arch session evidence, not independent verification.
- Supervisor/identity: Configured/active server identities and UID UNKNOWN in this return.
- Source/config: Config hashes UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Tool permissions and shared writers UNKNOWN.
- Recovery: Activation/recovery owner UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: Medium uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Use metadata-only activation inventory; no tool invocation or broad grants.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: redis

### Identity and provenance
- Purpose: Potential queue/state backend.
- Observation/source: No specific installation evidence reused; Arch session evidence, not independent verification.
- Supervisor/identity: Presence and supervisor UNKNOWN.
- Source/config: Provenance UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Storage, writer set, ACLs, backups UNKNOWN.
- Recovery: Owner UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: Medium uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Confirm configured use before proposing durability work; no database operation.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: sqlite

### Identity and provenance
- Purpose: Potential operational state backend.
- Observation/source: Historical references; no database opened; Arch session evidence, not independent verification.
- Supervisor/identity: Actual active databases and owners UNKNOWN.
- Source/config: Schema/version provenance UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Restore and concurrent-writer safety UNKNOWN.
- Recovery: Owner UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: Medium uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Identify file metadata and configured consumers only; no lease repair/vacuum.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: job-lead-outbox

### Identity and provenance
- Purpose: Job and submission durability.
- Observation/source: Oct 22 source roles; no private state inspected; Arch session evidence, not independent verification.
- Supervisor/identity: URL web process references lead files and unified JSONL.
- Source/config: Source bindings in route; schema provenance UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Writer modes, atomicity, outbox existence and unknown-send retention UNKNOWN.
- Recovery: Reconciliation/retry owner UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Reuse P02/WO-1; resolve stable IDs and crash-safe acknowledgment before claims of no loss.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: memory-vector-dreaming

### Identity and provenance
- Purpose: Potential memory/vector maintenance jobs.
- Observation/source: No fresh activation evidence; Arch session evidence, not independent verification.
- Supervisor/identity: Configured presence, scheduler and owner UNKNOWN.
- Source/config: Executable/config hashes UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Private memory not read; storage/backup/restore UNKNOWN.
- Recovery: Recovery/maintenance coordination UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: Medium uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Establish configured presence from metadata first; no dreaming/reindex/maintenance invocation.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Component evidence record: scheduled-backups

### Identity and provenance
- Purpose: Other cron/timer backup or maintenance jobs.
- Observation/source: Oct 18–20 historical inventory only; Arch session evidence, not independent verification.
- Supervisor/identity: Specific current enabled inventory UNKNOWN; no new cron dump.
- Source/config: Source hashes UNKNOWN.
- Intended operational owner: Arch pending scoped authorization; reviewer Codex.

### Calls, permissions and dependencies
- Interface/authentication: source roles in first return where applicable;
  authenticated peer identity and complete allowed-action set UNKNOWN.
- Required binding presence, inherited bindings, exact dependency/image versions:
  UNKNOWN unless explicitly observed in first return; names there are not presence proof.
- Runtime socket/tool activation: UNKNOWN; no tool calls used as activation tests.

### Persistence and recovery
- State role: Private source capture existed historically; not complete restore proof.
- Recovery: Backup operator and schedule owner UNKNOWN.
- Writer ownership/mode, mounts not already stated, restart recovery and tested
  restore evidence: UNKNOWN. No database or backup operations performed.
- Maintenance inhibit, cooldown, attempt budget, lease fencing and scheduled
  caller completeness: UNKNOWN unless specifically stated above.

### Limits and lifecycle
- Effective per-component memory/CPU/PID/storage/concurrency/retry caps UNKNOWN
  in this reused record. Host snapshot is not a per-component limit.
- Lifecycle/cleanup-before-readmission, retention overflow and durable unknown
  outcomes: not tested; no end-to-end health claim.

### Exceptions and next action
- Severity: High uncertainty/reconciliation priority, not proven exploit.
- Smallest next action: Metadata-only ownership and pairing review; do not invoke backups or add timers.
- Test gate: exact-source independent review, then separately authorized synthetic
  checks in isolation. No production action follows from this record.

## Commands, checks and effects

No new collection commands for this second return. Source: preceding bounded
first-return commands and attributed Oct 18–20 inventory summaries. Metadata-only
publication created this Markdown file; no production source or private snapshot
copied. Diff whitespace checked. No runtime/synthetic tests run for these records.

## Review and next decision

Do not close any exception from this inventory. Codex should select the minimum
missing evidence for a specific decision; absence of detail is deliberately
explicit rather than filled from assumptions. Exact-source revisions and fresh
supervisor/budget metadata remain prerequisites to recovery or permissions work.
The current customer-path failed stage takes precedence over broad VPS optimization.
