# Reviewed Chromium runtime for OpenClaw / Arch

This is an **isolated tooling bundle**, not the scanner application manifest or
an automatic production updater. It installs no services and never imports
`server.js`, reads production environment files, sends email, changes PM2,
connects to a VPS, or deploys. Default invocation prints a plan without installing.

## Versions and scope

Registry stable tags checked during preparation:

| Component | Exact version / requirement |
| --- | --- |
| Playwright | 1.64.1 |
| Chromium | Playwright revision 1248, Chrome for Testing 156.0.8078.4; launch remains unverified |
| axe Playwright | 4.14.0 |
| Lighthouse | 13.5.0 |
| Node | >=24.19.0, <25; validated here with 24.19.0 |
| npm | 11.x; packageManager 11.9.0; validated here with 11.9.0 |
| Python | Linux Python 3.12+; uses POSIX process groups, flock and waitid |

The latest independent Chromium release is not necessarily compatible with the
Playwright API. Install the managed revision, not an arbitrary system Chromium.
Sandboxing protects the host from pages; it supports normal public-web browsing,
JavaScript, redirects and accessibility inspection. It is not an offline browser.
The readiness **test** is offline/synthetic to prevent unsolicited network actions.

axe and Lighthouse are free and already part of the intended scanner stack.
No extra daemons, crawlers, extensions or duplicate browser installations are added.
Do not add multi-page crawling until the scanner's cancellation, queue and SSRF
boundaries have been repaired and reviewed.

## Cloud / staging preparation

Run from a checkout containing this reviewed commit, as an unprivileged user.
Choose an absolute, private directory outside the webroot and outside any live
runtime. The examples target the cloud workspace, not a production path.

```bash
# Plan only; no directory creation, download or service calls.
python3 ops/browser-runtime/manage.py --runtime-dir /workspace/.qa11y-browser-runtime-v2

# Explicitly install locked npm packages and their managed Chromium, then probe.
python3 ops/browser-runtime/manage.py --runtime-dir /workspace/.qa11y-browser-runtime-v2 --apply

# Read-only metadata check. Does not launch a browser or prove browser health.
python3 ops/browser-runtime/manage.py --runtime-dir /workspace/.qa11y-browser-runtime-v2 --check

# Functional probe; writes browser profile/temp files, no installation.
python3 ops/browser-runtime/manage.py --runtime-dir /workspace/.qa11y-browser-runtime-v2 --probe

# Repeat installer-safety tests independently of browser availability.
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s ops/browser-runtime -p 'test_*.py' -v
```

`--apply` first checks host namespace support, then uses `npm ci --ignore-scripts`
and the installed Playwright CLI directly,
never unpinned `npx`, a global package upgrade, or `sudo`. Installs and probes are
sequential, with 10s/300s/300s/60s deadlines. Each invocation is bounded to approximately
11 minutes plus cleanup grace and filesystem overhead. On timeout it sends TERM,
allows up to five seconds for cleanup, then kills its own child process group.
Concurrent installers fail on the same runtime lock. Repeated installs
use the same lockfile and Chromium cache. Unknown revision changes abort: use a new
runtime directory for upgrades and preserve the old one for rollback.

`--check` takes a shared lock on the existing lock file and compares source files
and installed dependency version metadata. It creates no directories, lock files,
npm configuration or browser profiles. It emits `metadata-pass` and
`browser_verified: false`; this is not a Chromium launch or package-byte integrity
attestation. Missing files cause failure rather than repair.

The fingerprint now covers **manage.py as well as manifests and probe**. Final
readiness output includes the full Git source commit, `source_dirty`, and the
installer SHA-256. Capture the complete invocation output, including the final
manager result, with staging evidence. A dirty source is explicitly disclosed,
not equivalent to validating the cited commit. Use a clean reviewed commit for
release evidence. The tool does not automatically persist a receipt.

Required download destinations include registry.npmjs.org and Playwright's
official browser download endpoints (currently cdn.playwright.dev and its official
redirect destinations). Respect the existing egress policy. A blocked download is
a failure, never a reason to turn off TLS, modify expected integrity, or use an
unverified mirror. No network allowlist is modified by this tool.

The child environment contains no inherited provider credentials, `.env`,
`NODE_OPTIONS`, or TLS-disable setting. The cache and npm configuration are private
to the runtime. The installer rejects root execution and symlinked runtime paths.
The invoking user, reviewed source and private directory ancestors remain trusted;
this is not a defense against another process with the same UID or a hostile root.

The functional probe runs via util-linux `unshare` in fresh user, network, mount
and PID namespaces, with no network interface attached. It validates namespace
identity differs from the invoking host and that only loopback exists before
loading browser code. It requires a sandboxed Chromium launch, checks Chromium's
sandbox status, keeps TLS checks enabled, blocks context requests as additional
defense, and requires axe to detect a
deliberate accessibility defect. It reports PASS only after those checks.
It does **not** establish live scanner, Lighthouse audit, PDF, email or lead health.
No browser security flags are disabled if a host cannot support sandboxing.
The PID namespace and `--kill-child=KILL` are intended to contain detached Chromium
descendants when the probe exits. Real-browser success, timeout and interruption
tests under the intended supervisor are still required; process-group unit tests
alone do not establish those claims. This is not a full filesystem/container
security boundary or a production supervisor configuration.

Host namespace restrictions are never relaxed. If `unshare` is missing or denied,
the tool fails before installation/probing. Use an approved isolated staging host
that supports this launcher, or prepare a separately reviewed network-disabled
container adapter. There is no direct host-network browser fallback. The current
Codex host denies writing uid_map, so successful isolated probing is unverified.

## Arch / OpenClaw promotion checklist — not an authorization to deploy

1. Reconcile the actual scanner application's manifest, lockfile, Node version,
   service UID, supervisor, cache location and permissions. This repo currently
   lacks that application manifest/lockfile. Do not replace them with this bundle.
2. Review this exact branch and the scanner fixes with Quintin. A successful
   GitHub push is not a production deployment. Do not run the old VPS preflight
   as a cloud prerequisite: it sources production configuration and disables the
   browser sandbox.
3. After separate staging approval, run this installer as the intended service
   user in a new private runtime directory. Missing OS libraries or unsupported
   sandboxing must be reported. OS package installation and user provisioning
   require a separate reviewed host change; they are not done here.
4. In a separate scanner adapter PR, load the reviewed Playwright/axe/Lighthouse
   from the selected release's tool directory. Set PLAYWRIGHT_BROWSERS_PATH to
   that runtime's browsers directory. Derive Lighthouse's Chrome path from that
   exact Playwright's chromium.executablePath(), never assume a global binary.
   Use chromiumSandbox: true and keep ignoreHTTPSErrors: false. Remove insecure
   launch flags from **all** launch paths, including Lighthouse and preflight.
   Do not silently change NODE_PATH or symlink global modules to select versions.
5. Fix the known scanner blockers: trusted-peer validation before XFF, owned
   cancellation before slot release, finite queue, asynchronous supervised
   Lighthouse, outbound SSRF controls, and success-aware deduplication. Installing
   a browser does not repair those application defects.
6. Run synthetic staging scans with stub email/Telegram and a controlled target.
   Establish process-tree cleanup, actual RAM peak, concurrency and health under
   load. On the approximately 4 GB VPS, choose concurrency from measured headroom;
   do not assume two browser jobs are safe alongside OpenClaw.
7. Obtain production deployment approval, then activate the coordinated release
   using its existing verified supervisor. Preserve the previous complete app /
   tool / cache pairing. Never update packages inside a running release.

Rollback selects the previous reviewed release and its browser cache after
approval. This tool intentionally has no restart, activation, deletion or rollback
command. Do not delete new evidence or rate/dedup state when rolling back.

## Ongoing freshness

Prepare dependency updates on a task branch, regenerate and review this lockfile,
run installer tests and sandboxed synthetic browser tests, and obtain approval
before promotion. A scheduled **read-only dependency report** can open a reviewed
maintenance task later; no unattended npm/browser update cron is introduced here.
An environment with older pins must report that fact, not fetch `latest` at startup.
