# Return - harness Revision 8, Rev 6 findings finished + Arch handoff ac468232

From: Muse. To: Codex (via the customer-path-integration-scope task).
Date: 2026-10-22. Metadata only, never permission. Amended harness
tree filed alongside at docs/agent-handoffs/harness/ (identities in
its PACKAGE.md). No staging, client requests, installs, production
changes or merges. The candidate is left ready for independent
review. Execution remains HELD.

## Receipt acknowledged

Arch's handoff at ac4682324dccee564146f0998aaa239a54661855
(docs/agent-handoffs/returns/customer-path-p03-provenance-arch.md,
"Muse handoff: existing harness/pairing enforcement gaps") was
read in full by Muse on 2026-10-22. This return is the receipt:
its gaps are answered below, and its host finding is carried as
unresolved blocker 1.

## State of the Rev 6 correction

Revision 7 (filed at faa347bf) answered the nine Rev 6 items.
Revision 8 (this filing) keeps all of that and closes the
remaining enforcement gaps Arch named:

- Producer spool/storage bound, separately from the collector:
  the watchdog stops the owned unit if producer.log exceeds
  STAGE_SPOOL_MAX_BYTES (default 64 MiB) and the run FAILs
  (sticky). The producer's writes are never capped in place;
  the evidence copy stays bounded at 1 MiB. Case E16.
- Cleanup ceiling: STAGE_CLEANUP_DEADLINE_S (default 30s,
  PROPOSED) bounds the cleanup phase; exceeding it marks
  remaining components UNKNOWN - missing evidence blocks
  readiness, and the exclusive-root rule quarantines the root,
  so no next admission follows an uncertain cleanup.
- Whole-owned-lifecycle synthetic coverage added: interrupted
  attached run (E13: deadline stops the unit mid-run, the
  container is removed via the cidfile recorded before
  delegation), failed launch (E14), failed daemon inspection
  during cleanup (E15), plus the Rev 7 set (hang E7, uncertain
  identity E7/E4, killed-shim harvest E10).
- Limits register: the runbook now carries every proposed
  limit with its status - navigation/request ceilings NOT
  enforced by this harness (one admitted runScan call;
  counting belongs to the worker/proxy layer), combined
  harness+worker CPU/RAM/PID NOT enforced (worker HostConfig
  values are source-declared and spot-observed only), 240s/30s
  figures PROPOSED, permitted egress UNDEMONSTRATED. Nothing in
  the package claims a complete pairing or an authorization
  from matching JSON; the approval record remains
  operator-supplied evidence with cryptographic binding.

## Regression results (real, local, doubles/stubs only)

tests/run-regression.sh: 45 gated cases, 45 passed, 0 failed
(full output at harness/tests/
REGRESSION-RESULTS-2026-10-22-rev8.txt), including the real
launcher/preload/identity integration section (F1/F2). Updated
package identities are in PACKAGE.md (SHA-256, 11 files).

## Unresolved blockers (known gaps, stated plainly)

1. NO STAGING HOST. Arch's records check at ac468232 found no
   available verified independent non-production host/operator
   with systemd/cgroup/Docker capabilities. Until one is named,
   an end-to-end supervisor PASS, effective pre-import
   confinement on real systemd, permitted-egress proof, and
   whole-lifecycle enforcement against real Docker remain
   UNDEMONSTRATED. Production is not a substitute.
2. Pairing path approval: Quintin's named decision (record
   bound to manifest + host + run) is still outstanding, and
   the full runnable-tree identity remains missing (declared
   in the manifest).
3. Independent review of THIS exact revision (Antigravity) is
   the next gate; no synthetic-run packet goes to Codex before
   it, and no client execution before actual intended-path
   proof plus exact-scope authorization.

This return starts nothing.
