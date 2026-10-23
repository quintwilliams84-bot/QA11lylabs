# Arch Rev9 intake — existing CLIENT-PILOT-001

Read Rev9 37b4982e2dda770a1b82664520817219a4b49e78 and canonical index update
138899b57859cee1e0042b00097b3af175c150bd. Read CURRENT_ASSIGNMENTS on the
review branch observed at df4e118aa8b90e534405762bbd03d3d7c41b4936.
No client inputs, private paths or findings included.

## Applied documentation reconciliation

Rev9 is now the next candidate for independent review; Rev8 is superseded as a
candidate, not deleted as historical evidence. Existing acceptance companion
exit-3 hold stays intact. Its older blocked hashes remain explicitly historical,
not replaced by an unreviewed executor. No additional scanner task created.

GitHub commit metadata lists 16 changed paths for the Rev9 commit. The reported
24 files may describe full package size rather than changed files; not assumed
identical counts. Muse reports 58 synthetic passes/0 failures; not rerun by Arch
and not real supervisor/browser/cleanup proof. The return states intended file
modes are again filed as 100644; executable packaging remains a review concern.

## Concrete changed behavior requiring independent review

Actual supervise.sh lines 377-378 loop over bin/docker, run-confined.sh,
aggregate.sh and supervise.sh beneath STAGE_HARNESS_DIR and run chmod 0755,
with errors swallowed by `2>/dev/null || true`. This is source mutation during
launch, not a read-only integrity check. The -f predicate alone follows links;
review whole-path containment/ownership, prior guards and the fail-open outcome
before accepting it as safe. This is a review question, not a proven exploit.
No chmod, mode repair or supervisor invocation was executed here.

Requested independent review: reconcile intended/actual modes before execution,
ensure the exact reviewed package is preserved, and fail closed on unsupported
packaging instead of treating successful stub counts as installation approval.
Muse remains sole harness writer; Arch does not patch their files concurrently.
The current assignment permits a separate Codex review agent under the weekend
arrangement; do not claim Antigravity sign-off or execution authorization from it.

## Stale-file disposition

No named deployed stale files or safe consumer-removal evidence were provided.
No files deleted. Historical reviews, receipts, original packet and old candidate
identities are retained as evidence. Future removal needs exact path, ownership,
consumer/reference check and recoverable disposition on the scoped candidate;
file age or a new revision alone is insufficient. No production checkout pulled,
reset, cleaned or switched. Existing missing-object issue stays with
GIT-RECONCILIATION-001, not a broad repair command.

## Next owner/action and limits

Independent reviewer: inspect Rev9 exact source and regressions; Muse addresses
findings. Arch binds the existing companion only after the actual executor and
interfaces are accepted. Hermes retains empty/synthetic report-outline scope;
no bridge invocation or fabricated Hermes contribution/receipt is claimed.
Actual checks: GitHub metadata/source reads and publication of this sanitized
return. No tests, source launch, installs, removals, scans, hosting, Actions probes,
service changes, main merge or deployment. All execution remains HELD.
