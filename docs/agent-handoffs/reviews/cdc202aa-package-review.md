# Independent exact-package reconciliation review

Reviewed package: QA11lylabs `cdc202aa31c1e9e2d5bc9f37cf6088f2f0b204d3`.
Reviewed handoff: `25ffca5ac16b9dbbb780c6bb08cf8ebf45333ecc`.
Branch: `agent/arch/package-reconciliation`.
Reviewer: coordinating Codex, with separate static review by Codex agent
`review_workflow_tools`. This is not Antigravity/human approval or authority
to execute, merge to main, deploy or scan a target.

## Submitted package: no blocking finding in the reviewed delta

The package commit changes exactly PACKAGE.md, TREE-MANIFEST.json and the P07
proposal; its handoff adds exactly two return files. No runtime code changes
or deletions were found. All eleven executable blob identities and 100755 modes
are preserved. All original 21 manifest entries remain unchanged; exactly five
existing historical logs are added with their real hashes. Exclusions remain
exactly PACKAGE.md and TREE-MANIFEST.json.

Root independently reconstructed all 28 package files from exact Git blob
identities and modes. Unchanged blobs were reused from the locally available
object database only after checking their Git object hashes; the two changed
metadata files were read from the exact submitted revision and checked against
the Git tree. No arbitrary local working-copy bytes were assumed equivalent.

Actual independent checks:

| Check | Result |
| --- | --- |
| Git blob identity and mode reconstruction | PASS, all 28 files |
| Manifest identities, counts and declared exclusions | PASS, 26 entries / 11 executables |
| Manifest SHA-256 against PACKAGE.md and handoff | PASS, 072b8a24bf914a99e4ea120f1858d72d0c0cc16718dd21c2965cddcfeca44ff5 |
| Shipped Node tree verifier against reconstructed exact package | PASS, exit 0, verify-tree: OK (26 files) |
| Separate reviewed Python validator against staged reconstructed Git tree | PASS, exact set / hashes / Git modes for 26 manifest files; no --apply |
| Evidence-return JSON from exact handoff | PASS with existing reviewed stdlib validator |

The separate review agent independently inspected commit/tree scope, unchanged
executable/log identities, original manifest entries, exclusions, manifest hash
and P07 clarification. It did not run the package verifier or full suite; the
root checks above supply the independent reconstruction/verifier evidence.

The P07 appendix addresses the prior supervision, child-spawn/absolute Docker,
strict manifest, honest synthetic BLOCKED and preservation findings. P07 remains
a proposal, not an accepted mode-independent implementation. No runtime gate is
removed by this review.

## Canonical reconciliation: one remaining documentation issue

While reviewing, Codex discovered Muse's parallel return on canonical staging
`8423efeaf6a1eb03e290ff71b0c6b54d42db2642`:
`returns/from-muse-rev10-package-reconciliation-return.md`, with package source
`6dbd3c16399e66b1b86abe3026608113fc0bd018`.

Its 26 manifest entries and exclusions are semantically identical to the
submitted Arch package. All other package content and modes match except the
two metadata files. Canonical manifest serialization/note differs, so its real
SHA-256 is **51096632690b376c55ad912545c0cc09433dfdadf9dc2ee67f98b7ffa1b0384d**,
not Arch's 072b8a24... identity. Codex reconstructed the canonical snapshot,
checked all Git blob IDs/modes and ran the shipped verifier: PASS, OK (26 files).

However, canonical PACKAGE.md still records the earlier **afd743...** manifest
identity and says **ten** executables. The verifier excludes PACKAGE.md, so its
PASS does not validate that stale provenance statement. This is a documentation
consistency blocker for promoting the canonical package record, not a newly
found executable defect.

Muse remains the sole harness integrator. Preserve the canonical 26-entry
manifest and update only PACKAGE.md to the current full manifest hash and eleven
executables/mode-finalization state, plus a small return if needed. Do not copy
Arch's entire manifest or replace the canonical index. Recheck the exact
committed metadata/hash/modes afterward; no runtime change means this finding
alone does not require another 67-case replay.

Muse's canonical return reports a new 67-pass replay; that is attributed evidence,
not execution performed by this review. Arch's return explicitly says it did
not replay that suite. Preserve the distinction between their two reports.

## Remaining execution gates

The full executor review, approved exact runner/assembly/dependency pairing,
fixture origin and binding, isolated environment/operator authority, effective
limits and intended-host success/timeout/interruption/cleanup evidence remain
separate. Neither this review nor a green manifest supplies them. The acceptance
companion's exit-3 hold remains; no retry/client scan/send/deployment is granted.
Hermes remains outline-only.

No full harness suite, application runner, real systemd, Docker, browser, client
request, VPS operation or production change ran in this review. Only metadata,
Git and the inspected read-only tree verifier were exercised locally.
