# Codex / Muse staging handoff

This is a review snapshot and proposed work queue, not runtime configuration,
merge approval or deployment authorization. No scheduler or worker is launched.
Quintin requires human approval and passing checks on the reviewed revision.
Production deployment is a separate decision. Existing repository gates apply;
no VPS preflight is claimed by this document.

## Collaboration path

Codex can read and push Git branches. Direct access to Muse's session is not
available. GitHub API operations were previously denied, so PR creation, reviews,
comments, labels and branch protections are not assumed to be available or set.
Use this handoff branch for shared review context, exact commit links for evidence,
and Quintin's relay when a session cannot see the branch. A branch name alone does
not prove that work, review, tests or integration are complete.

Each contributor should return: repository, branch, full candidate SHA, changed
files, actual test command/counts, failed/blocked/unrun checks and remaining risks.
Read the other contributor's exact revision before editing overlapping files.
Do not copy whole standalone scanner candidates over one another. Reconcile on a
reviewed branch, rerun combined tests, then request approval for that exact result.

## Source snapshot

| Workstream | Last verified revision | Status |
| --- | --- | --- |
| Scanner main | a6bf2761cf6efeb9979c86265563fe5a49d8ec20 | Production parity unknown |
| Muse client-IP candidate | f7950f3e2aa76c3f8655b2533f113fa31c5799ea | Partial follow-up; findings below |
| Muse lifecycle branch | e7e314965a4b1db34da48fceb5e27e1c1185215b | Branch exists; no lifecycle-specific delta established |
| Codex browser candidate | 44deb239b15fad767129d2e6cba81f4ccbb5b72f | Isolated staging preparation only |
| OpenclawOps coordinator candidate | 60d7a72bf5c47ed040674d812e3bebc8ad17465a | Separate repo; not installed production orchestration |

Browser details: [reviewed runtime runbook](https://github.com/quintwilliams84-bot/QA11lylabs/blob/44deb239b15fad767129d2e6cba81f4ccbb5b72f/ops/browser-runtime/README.md)
and [validation](https://github.com/quintwilliams84-bot/QA11lylabs/blob/44deb239b15fad767129d2e6cba81f4ccbb5b72f/ops/browser-runtime/VALIDATION.md).
These files are on the browser branch, not yet on main or this handoff's base.
The coordinator's autonomous merge policy remains disabled pending real protection,
check-provider and human-review configuration. It is not a deployment receiver.

## Review of Muse f7950f3 — not approval to merge

Progress: `lib/ip-policy.js` has no imports or startup I/O and rejects malformed
IPv4 octets and incomplete CIDR masks. Five isolated assertions on that module
passed: untrusted peer, trusted proxy chain, malformed octet, valid CIDR and
malformed mask. No scanner module was imported and no existing test suite ran.

Remaining findings at this exact snapshot:

1. **IPv6 regression in the new helper:** `lib/ip-policy.js` exact matches require
   parseIpv4(), so isTrustedProxy('::1', ['::1']) returns false. The existing
   configured loopback proxy includes ::1. Preserve valid IPv6 exact matches and
   mapped IPv4 semantics; either support IPv6 CIDRs deliberately or reject them
   clearly. Add tests for both address families and invalid syntax.
2. **Helper not integrated:** `scan_server_patch.js` still contains its old IP
   helpers, and `test/scan-hardening.test.js` still imports the full scanner.
   Test import attempts /root/.env loading and browser verification. Merely adding
   a pure module does not make those tests side-effect-free. Wire scanner and
   tests to the same pure implementation; isolate route-registration tests with
   explicit dependency injection and no production credentials or processes.
3. **Shared temporary filename remains:** the test deletes
   /tmp/qa11y-test-rate-store.json. Use unique private temporary state and clean up
   only files owned by the test invocation.
4. **Release checker is not wired:** scripts/release-check.js is present, but
   package.json has no release:check script. No CI/release integration was verified.
   Its regex also accepts ranges such as >=1.2.3, and lockfile existence alone does
   not establish manifest/lock agreement or integrity. Add strict exact-version and
   lock-consistency validation plus negative tests. Keep release blocked while
   application dependencies are wildcarded and no lockfile exists.

These are observations on a moving branch, not a claim about later Muse commits.
Do not infer deployment permission from a passing helper or syntax check.

## Proposed next tasks and ownership

| Task | Proposed owner | Evidence needed / boundary |
| --- | --- | --- |
| Finish pure IP implementation, wiring and safe regression tests | Muse | Exact updated SHA; production import absent from unit tests; IPv6 preserved |
| Scanner queue/abort/deadline lifecycle | Muse, reviewed by Codex | Slot held until owned work ends; finite queue; disconnect/timeout tests; no live mail |
| Review incoming candidates and maintain this handoff | Codex | Exact-SHA review; synthetic tests only; avoid concurrent scanner edits |
| Browser isolation and runtime preparation | Codex candidate; staging operator TBD | Supported isolated host, approved resources, official downloads, real browser tests |
| Sanitized live ownership/version/resource inventory | Arch | Read-only report requested by Quintin; no restart, installation, model call or send |
| Agent routing, memory and AgentMail next repair packets | Design after inventory | One owner per operation, bounded jobs, durable state and explicit credential boundaries |

Do not add multi-page crawling, paid-depth features, new background agents or more
VPS daemons while the scanner's existing safety and resource gates remain unresolved.
No Perplexity service or additional paid provider is required for these tasks.

## Work held pending supporting evidence

- Browser download was denied by the cloud network policy. A narrow official-CDN
  allowlist addition was saved as a draft; it was not published or proven active.
- The current cloud host denies user namespace setup (uid_map is read-only).
  No host restriction, TLS verification or Chromium sandbox was disabled.
- Actual Chromium/axe/Lighthouse execution and detached-process cleanup are
  unverified. Test success, timeout, interruption and forced manager termination
  under the intended isolation/supervisor before claiming readiness.
- VPS deployed versions, current services, active jobs, supervisor ownership,
  permissions and current memory headroom await Arch's report.
- Production concurrency, OpenClaw RAM budget, downtime allowance, deployment
  receiver and rollback behavior cannot be finalized from repository files alone.

## Evidence packet for the next gate

Record full source/base SHAs, dirty status, installer checksum, runtime/tool
versions, test command/counts, timestamps and sanitized artifact references. Use
pass/fail/blocked/unrun explicitly. Candidate-supplied evidence is not independent
authorization; required checks must come from the trusted review/test runner.

Unit tests must not import production bootstrap, read production environment files,
launch browsers or send notifications. Functional browser tests use isolated
staging with synthetic documents and stub mail/Telegram. Begin with one heavy job
at a time and an explicitly approved resource ceiling; measure before choosing VPS
concurrency. Unknown required gates block promotion. Human approval of the current
revision and a separate deployment approval remain required.
