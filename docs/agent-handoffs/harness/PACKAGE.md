# Package identity - staging diagnostic harness, Rev 10

Canonical local tree: `~/workspace/github-staging/harness-rev10/` in Muse's
workspace. Filed to `docs/agent-handoffs/harness/` on
`codex/staging-coordination`.

SHA-256:

- supervisor: `harness/supervise.sh` `162f4ed8348fca12f73119bd2432b81764f1559b49b88b9abd91f0d3a67271f4`
- aggregator: `harness/aggregate.sh` `9edc2a8988f347f6a14e7f75391754d59b419c16a2d0ca4d6a2b8af46d8b05dc`
- in-unit launcher: `harness/run-confined.sh` `c52a4abe700a0059f8a66f7d496c3ee73bb82171e9aa0a814558556ed335b4ea`
- shim (harness path): `harness/bin/docker` `34a0f471fcc17c45738085ae6bf9fc74b4c3a1be71c43ec6c89e7f76b5213e75`
- confinement check: `harness/confinement-check.mjs` `c491bb96927fd7c2891e2329ae126e688a12d5b9bf4b3039b16e08c2d57ee0b2`
- real harness: `harness/run-scan-once.mjs` `5640243ef6a23949ef6e5d4c2e469cf5a3322360c68fd140b647f15dd7a8c719`
- audit preload: `harness/audit-preload.cjs` `220657edafce6987264746e9e685bbfe6fed4ee1a17a3368ed64b639247d3751`
- pairing verifier: `pairing/preflight-verify.mjs` `2b23c047400c2ced64d4be293ca0481e9155c312da0b40522c992efb174614de`
- pairing manifest (example): `pairing/pairing.manifest.json` `d27f4e7de28c012a6e686da99db6efada9fc2fad49c7ceba2954f38a78cca035`
- tree verifier (Rev 9, strict Rev 10): `tools/verify-tree.mjs` `1db7989216a86c4054b188f715ffbfb3f5e4e71db02c4432d975ee8af861288d`
- tree manifest (Rev 9, strict Rev 10): `TREE-MANIFEST.json` `afd743060bd0b4a2ca717e715675cbee968124e96748ba49f06ef1d7825328f3`

Full-tree integrity (every file, hashes plus executable bits,
strict set equality): see `TREE-MANIFEST.json`, checked by
`tools/verify-tree.mjs`.

Regression evidence: `tests/REGRESSION-RESULTS-2026-10-23-rev10.txt`.

Rev 10 purpose: answer the independent Rev 9 review (five
reproduced findings) and Codex's seven-item reconciliation
routing: ownership fails closed (nonempty matching
InvocationIDs before stop, kill, reset-failed or terminal
PASS; RuntimeMaxSec bounds the unit), cidfile harvest before
coverage reconciliation, packaging modes final in the tree
(pre-job 0755 packaging gate adapted from Codex's reviewed
rev9-permission-fix proposal; no runtime chmod), one
absolute cleanup deadline, a strict tree verifier, and
numeric configuration validation. Quintin's no-new-credential
decision stands.

Mode note: the ten executable files are intended at 100755
in Git. The filing path stores 100644, so - exactly as with
Rev 7 and Rev 8 - a mode-only commit on top of the filing
commit (the ten mode changes in Codex's proposal) finalizes
the tree; until it lands, verify-tree reports the mode
difference and the supervisor's packaging gate blocks runs
from a stripped tree. Nothing about that is silent anymore.

Known limitation (unchanged): an end-to-end supervisor PASS
requires the real non-production systemd host; under the
synthetic doubles the happy path aggregates BLOCKED on the
identity component, exactly as documented. All limits in
the runbook register remain PROPOSED, NOT ENFORCED until
demonstrated on that host.
