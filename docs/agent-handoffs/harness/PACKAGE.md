# Package identity - staging diagnostic harness, Rev 9

Canonical local tree: `~/workspace/github-staging/harness-rev9/` in Muse's
workspace. Filed to `docs/agent-handoffs/harness/` on
`codex/staging-coordination`.

SHA-256:

- supervisor: `harness/supervise.sh` `e81fdfa5847c1e27421f79fcbbc03efb9768276c56293f25ea50143ff02031be`
- aggregator: `harness/aggregate.sh` `130a2317579abdf092d9a7845eca4955aec7863078afc63e92aaf31bc7236256`
- in-unit launcher: `harness/run-confined.sh` `c52a4abe700a0059f8a66f7d496c3ee73bb82171e9aa0a814558556ed335b4ea`
- shim (harness path): `harness/bin/docker` `34a0f471fcc17c45738085ae6bf9fc74b4c3a1be71c43ec6c89e7f76b5213e75`
- confinement check: `harness/confinement-check.mjs` `c491bb96927fd7c2891e2329ae126e688a12d5b9bf4b3039b16e08c2d57ee0b2`
- real harness: `harness/run-scan-once.mjs` `5640243ef6a23949ef6e5d4c2e469cf5a3322360c68fd140b647f15dd7a8c719`
- audit preload: `harness/audit-preload.cjs` `220657edafce6987264746e9e685bbfe6fed4ee1a17a3368ed64b639247d3751`
- pairing verifier: `pairing/preflight-verify.mjs` `2b23c047400c2ced64d4be293ca0481e9155c312da0b40522c992efb174614de`
- pairing manifest (example): `pairing/pairing.manifest.json` `d27f4e7de28c012a6e686da99db6efada9fc2fad49c7ceba2954f38a78cca035`
- tree verifier (Rev 9): `tools/verify-tree.mjs` `3583162def47f018cd12d00f25822648af9262471ee3356192b46b46eb5d83c2`
- tree manifest (Rev 9): `TREE-MANIFEST.json` `08bf6f72b494a83908f1b2d265578b57984a5a272e71cade5f5d5b6062b43c59`

Full-tree integrity (every file, hashes plus executable bits): see
`TREE-MANIFEST.json`, checked by `tools/verify-tree.mjs`.

Regression evidence: `tests/REGRESSION-RESULTS-2026-10-23-rev9.txt` -
**58 passed, 0 failed** (synthetic test doubles plus the real
launcher/preload/identity section).

Rev 9 purpose: answer the independent Rev 7 alignment review
(six findings, each verified present in Rev 8 source and each
carrying a regression) and add the upload-integrity safeguards
Quintin approved Oct 23: supervisor v7 launch ownership and
terminal-status gating, UNIT_CLEAN by explicit evidence,
HostConfig with NanoCpus and coverage reconciliation, digest
v2 binding modes and link targets, preflight host/run
binding, self-healing exec modes, and the tree manifest and
verifier. No new credential or token was created.

Known limitation (unchanged): an end-to-end supervisor PASS
requires the real non-production systemd host; under the
synthetic doubles the happy path aggregates BLOCKED on the
identity component, exactly as documented. All limits in
the runbook register remain PROPOSED, NOT ENFORCED until
demonstrated on that host.
