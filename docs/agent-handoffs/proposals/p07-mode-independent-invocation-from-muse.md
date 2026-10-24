# Proposal P07 — Mode-independent harness invocation (delete the mode-commit step)

From: Muse. For: Codex review and disposition.
Date: 2026-10-23. State: proposed.
Directed by Quintin (Oct 23, 2026): file this proposal to the inbox.
This proposal is not permission and starts nothing on its own.
No new keys, tokens, or credentials are proposed or required, per
Quintin's Oct 23 decision.

## Problem

Muse's GitHub write path (the app integration's push-files) stores every
file at mode 100644. The harness packaging gate, adopted in Rev 10 from
Codex's reviewed rev9-permission-fix proposal, requires the four launcher
files at exactly 0755. Consequence: every harness revision Muse files is
un-runnable as published until a real-Git-client holder (Codex or Quintin)
lands a separate mode-only commit setting the ten executable modes
(precedent 4223f81). The step is small but it is recurring friction, it
splits one logical revision across two commits from two actors, and it
leaves a window where the published tree fails its own packaging gate.

## Proposal

Make file modes irrelevant to correctness by invoking every harness
entry point through an explicit interpreter, everywhere:

1. The transient unit's ExecStart runs /bin/bash with supervise.sh as an
   argument, never the script path directly.
2. Internal cross-calls follow the same pattern: supervise.sh invokes
   run-confined.sh and aggregate.sh via bash, the docker shim via bash,
   and node entry points via node, including self re-invocation paths.
3. The packaging gate stops checking modes. It keeps every other check
   (absolute normalized symlink-free harness path, regular files) and
   verifies launcher identity by the manifest's pinned SHA-256 digests,
   which the strict verifier already enforces. Content identity replaces
   mode identity.
4. Shebangs stay in the files for human use; they stop being load-bearing.
5. The runbook's release path drops the mode-commit step; a revision
   Muse files is complete and runnable as published.

## What does not change

- No runtime self-modification returns. Rev 10 removed the chmod
  self-heal on reviewed advice; this proposal does not revive it. The
  tree is correct as published because modes no longer matter.
- All fail-closed gates, the strict tree verifier, invocation ownership,
  cleanup deadlines, and numeric config validation are untouched.
- Execution stays HELD under CLIENT-PILOT-001 gates. This proposal is
  about packaging mechanics only.
- Confinement is unchanged: the unit's properties apply to the ExecStart
  process regardless of whether it is bash reading a script or the
  script executed directly.

## Alternatives considered

- Deploy key or token for Muse (rejected by Quintin Oct 23 unless
  absolutely necessary; this problem does not require one).
- Status quo mode commits (works; recurring two-actor friction and an
  un-runnable window remain).
- Assembly-time chmod on the target host (moves the mode dependency to
  the assembly step instead of deleting it).

## Scope if approved

Harness tree invocation sites, the packaging gate's mode check, the
regression suite (add a case: packaged tree at 0644 throughout runs the
full supervisor path green under stubs), and the runbook. Muse
implements as a harness revision for independent review through the
normal lane. Estimated size: small, comparable to one Rev 9 finding fix.

## Refinement (Oct 23, 2026, per Quintin's recorded distinction)

Quintin recorded, and Muse verified against the Rev 10 source, that
interpreter invocation does NOT cover the docker shim:

- The supervisor's cleanup path calls `docker "$@"` resolved through
  PATH (supervise.sh, the cdocker wrapper), and the supervised Node
  process resolves `docker` from PATH through libuv execvp. Both are
  kernel exec of the shim file. No shell interprets it, and bash hands
  a PATH-resolved command to execve as well. A non-executable shim
  fails with EACCES in every one of these paths.
- Reaching the shim through an interpreter would require changing the
  supervised program's own spawn call. That is outside the supervision
  boundary and would defeat the shim's purpose, which is transparent
  interception of the program as it actually runs. The supervision
  boundary does not change under this refinement.

Revised scope:

1. Interpreter invocation applies to the harness-internal direct calls
   only: the unit ExecStart (supervise.sh), run-confined.sh, and
   aggregate.sh. These leave the mode problem entirely.
2. The three docker shims (harness/bin/docker, tests/stubs/bin/docker,
   tests/fixtures/harness/bin/docker) remain mode-bearing by design.
   The packaging gate keeps its exact-mode check scoped to the shims
   and drops it for everything else.
3. For the shims, the mode is set at ASSEMBLY time by the operator's
   assembly tooling on the assembled tree, never at runtime and never
   by the supervisor (the Rev 10 removal of runtime self-heal stands).
   The manifest records the shims as assembly-set, and the packaging
   gate verifies the assembled tree it actually runs from. The Git
   tree is complete as published for everything else; if assembly
   tooling is unavailable, the fallback is the existing mode commit
   shrunk to the three shim files only.
4. Regression addition: packaged tree at 0644 throughout, assembly
   step applied, full supervisor path green under stubs, and the gate
   still exits 3 when a shim lacks its mode in the assembled tree.
