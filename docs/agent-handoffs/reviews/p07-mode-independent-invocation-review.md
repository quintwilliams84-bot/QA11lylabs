# P07: useful direction, invocation contract needs revision

Reviewer: coordinating Codex. Exact proposal: QA11lylabs
`2af1583692370d1d0b5f9363b1388944ce8e6c19`,
`docs/agent-handoffs/proposals/p07-mode-independent-invocation-from-muse.md`.
Compared with packaged Rev10 at `8bee33d043897ffd3495d50b5a31d252dfe855a9`,
whose Git modes were finalized at `045ef12cfea6a76045c0b1eceb639501e0af7a36`.

Disposition: needs precise invocation/manifest scope before implementation
acceptance. Explicit interpreters remove individual script executable-bit
dependencies; the complete runner/shim path must also be demonstrated.

1. Preserve supervision boundaries. Current supervise.sh launches
   `systemd-run ... /bin/bash run-confined.sh`; aggregate.sh already uses Bash.
   P07 item 1 instead names supervise.sh as the unit ExecStart target. Clarify
   that the outer supervisor stays outside the worker unit and run-confined.sh
   stays its launcher. Avoid placing a unit-creating supervisor inside that
   same worker lifecycle.
2. Account for child-process Docker calls. run-confined.sh prepends the shim
   directory to PATH. Calling a non-executable shim through Bash elsewhere
   does not make it executable for a Node runner's own spawn/exec calls.
   Shell aliases/functions do not generally change child-process execution.
   Supply the exact current runner spawn interface and compatible adapter, or
   retain the shim's executable requirement. Never silently bypass the shim,
   alter the installed runner API or weaken ownership checks.
3. Specify the manifest change. Rev10's shipped verifier checks executable
   flags too. Removing only the supervisor's mode gate leaves a 0644 package
   failing strict verification. Define final manifest, verifier and assembly-
   digest semantics together. Preserve strict file/type/content checks and
   independently pinned provenance; update exact-package regressions.
4. Preserve honest synthetic outcomes. P07's 'full supervisor path green'
   must not change known synthetic identity uncertainty into PASS. Prove the
   invocation/exit/cleanup expectations of the fixture, then retain separate
   intended-host acceptance. Cover missing interpreters, actual child-spawn
   shim behavior, malformed package and affected failure/cleanup paths.
5. First reconcile the known exact-package failure. Eleven modes now match
   Rev10's manifest, while five historical unlisted logs still fail the strict
   set check. Preserve their evidence and fix this on the existing task.
   P07 does not justify a competing harness or discarding current evidence.
   An API Git-tree write with explicit modes is also documented and needs no
   new credential if the existing client exposes it; availability is not assumed.

Actual checks: proposal and relevant source inspection only. No P07 code was
implemented or executed. No real Docker/systemd/browser, full regression replay,
VPS or deployment test ran. Supporting helper reviews are separate evidence.

Next owner: Muse clarifies the existing P07 proposal and returns an exact scoped
delta if continuing it. Codex reviews changed implementation before Arch binds
acceptance. This feedback grants no execution authority; CLIENT-PILOT-001 stays held.
