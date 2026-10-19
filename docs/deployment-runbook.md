# Deployment runbook — reconciliation required

Deployment is not authorized by a PR merge. Follow
[OPERATING_STANDARD.md](OPERATING_STANDARD.md) and
[PROJECT_ADAPTER.md](PROJECT_ADAPTER.md).

Historical procedures used a snapshot and direct synchronization into
/var/www/qa11ylabs. Do not execute that flow as the default release path. The
supplied inventory reports a separate deployed directory, a dirty checkout under
a misleading repository name, and isolated runtime sources without verified
committed provenance. A backup alone does not make destructive synchronization
or dependency replacement safe.

Before proposing deployment:

1. Reconcile origin, candidate commit, dirty sources and deployed file hashes.
2. Inventory runtime release, browser selection, supervisor, secrets bindings and
   persistent state without exposing values. Preserve the current isolated worker.
3. Build and test an immutable artifact in isolated staging with synthetic input;
   verify sandbox/egress protections, success, timeout, cancellation and cleanup.
4. Agree service-specific interruption and resource limits. Prove state-compatible
   rollback to a captured artifact; source checkout reset is insufficient.
5. Present exact artifact, target, activation, health checks, stop conditions and
   rollback procedure for Quintin's separate deployment approval.
6. Execute only that approved procedure; record actual deployed identity and
   post-activation results. Preserve new evidence if rollback is needed.

No receiver or automatic activation is established by this document. Existing
scripts/deploy-to-vps-webroot.sh and ops/preflight.sh are legacy/manual tools,
not mandatory PR gates or evidence of a safe installed deployment controller.
They require review of their exact contents and separately approved execution.
