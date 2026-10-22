# Component evidence record: COMPONENT-ID

Fill this as part of an existing Arch evidence return; this is not a second task
registry or an executable service definition. Reuse earlier inventory facts with
timestamps and label unrefreshed data. Publish only sanitized operational metadata.
Record absent/UNKNOWN components honestly. Do not inspect private memory contents,
customer inputs or secret values to fill this template.

## Identity and provenance

- Stable component ID and purpose:
- Observation time; observer; source evidence reference:
- Repository/full source SHA/path, or UNKNOWN:
- Deployed executable/config hash; matches source / differs / UNKNOWN:
- Supervisor and unit/PM2/container/job identity:
- Runtime UID/GID and intended owner:
- Recovery owner; overlapping owners or UNKNOWN:

The desired owner is a proposal until installed state verifies it. A PID alone is
not a durable identity; service invocation/container/job identity may be needed.
Do not collect or publish full command lines that may contain credentials.

## Calls, permissions and dependencies

| Caller/tool role | Callee/interface role | Authentication and permission mechanism | Evidence / UNKNOWN |
| --- | --- | --- | --- |
| Fill from configuration/source | No secret values | Names and mechanisms only | UNKNOWN |

- Runtime/dependency/browser versions and manifest/lock/image provenance:
- Required variable/binding NAMES and presence only:
- Unneeded inherited bindings, root access, runtime socket or shared writers:
- Tool discovery versus verified runtime activation distinction:

## Persistence and recovery

| State role (queue, jobs, memory, vector, reports, mail, leads) | Storage/mount role | Writer/owner/mode | Restart behavior | Backup/restore evidence |
| --- | --- | --- | --- | --- |
| Only components actually present | Private paths aliased where needed | UNKNOWN | NOT RUN | UNKNOWN |

- Single recovery authority, maintenance inhibit and coordination:
- Retry/backoff/budget, lock/lease identity and stale-state handling:
- Idempotency/submission/job keys and duplicate/unknown outcome behavior:
- Scheduled callers and startup/boot persistence:

A configured volume or enabled schedule is not proof of durable recovery or a
successful restore. Do not invoke jobs, repair leases, rotate secrets or modify
permissions merely to establish these facts.

## Limits and lifecycle

- Memory/CPU/PID/storage limits and current bounded observation:
- Deadline/concurrency/queue/retry caps:
- Job-specific cancellation and cleanup-before-readmission proof:
- Log/artifact/state retention and capacity failure behavior:
- Existing health check versus last end-to-end evidence:

## Exceptions and next action

| Severity | Verified issue or explicit uncertainty | Evidence | Smallest proposed correction | Owner and test gate |
| --- | --- | --- | --- | --- |
| Choose from Critical/High/Medium/Low | Keep assumptions separate | Exact source/time | Plan only | Pending |

No production repair, restart, scheduling change, permission change or deployment
is authorized by filling this record. Feed findings into existing work orders.
