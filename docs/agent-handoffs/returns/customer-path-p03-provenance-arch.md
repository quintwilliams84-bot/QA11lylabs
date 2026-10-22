# P03 metadata return — existing customer-path-current-evidence

Arch; independent reviewer Codex PENDING. Read Codex review
4d26b343e76ee8e0d64c4c4aeae16c995b59f272 at
reviews/Muse42aa3b3-staging-review.md. Canonical coordination index read at
26ce6c3daf3c4d1abff88b2e5caeea8780f815f6. This extends existing P03/customer-path
work only; no new task registry or changed shared index.

## Observed identity (2026-10-22 16:15–16:18 UTC)

Resolved once for initial inspection: /opt/qa11y-scanner/releases/20261017-r2.
The release name and current symlink are mutable filesystem identities, NOT
immutability guarantees. Content hashes below bind this observation only.
Installed image inspection succeeded (exit 0), without starting any container:
- ID: sha256:9bd26ad900bb5e0f4dee75839e957a89ae89c2b7ab1e76050e559790e946b948
- RepoDigest: mcr.microsoft.com/playwright@sha256:9bd26ad900bb5e0f4dee75839e957a89ae89c2b7ab1e76050e559790e946b948
- OS/architecture: linux/amd64.
This matches runner IMAGE. Build attestation, full image package inventory and
container Node version UNKNOWN. Digest does not prove compatibility or authorship.

Host browser /opt/google/chrome/chrome: 293195072 bytes;
SHA-256 0ba9d6c54dbc1a46dfaa5f95d5975bc9b963030c8647880f5b6a537f8af7d2e8.
Read-only dpkg-query identifies owning package google-chrome-stable,
153.0.8010.52-1, amd64, install ok installed. Configured google-chrome.sources
contains dl.google.com and stable. This is configured origin evidence, not proof
of the installed package's historical download/signature chain. Browser not
executed; dependency/library compatibility and sandbox operation remain NOT RUN.

## Release files and worker manifests

SHA-256 of installed files; no dependency URLs or raw manifests exported.

| Relative path | Bytes | SHA-256 | Selected package version |
|---|---:|---|---|
| runner.cjs | 8471 | d2b3167f8be4081822183ccd7022a9bf7b83cf3ba454a73edd6f0c747597b0dd | — |
| worker.cjs | 3993 | 9cba6bcd5ee33840622fa37fcc0eac0ca2538c5900589ed9fa44f68dea653459 | — |
| watchdog.cjs | 757 | be66dd6c6e5cfdc2c21efcaac9ca6e09e2202ff93943c07c5b2a216c42ccbecb | — |
| egress_proxy.py | 7352 | 8eb1e1df823e2a72ed27f1ceee16de7e6ad1d0a47d372a0e0ea87c7a25e8a8b5 | — |
| seccomp_profile.json | 16174 | b9b7007a80b8935859cd1cb7f766ff3ac485dc5bee6237568ab04025ce7dd33a | — |
| deps/.package-lock.json | 52468 | 4bbef0f0524728c4347891987d19b6dfe6eb2ebb3629820e41709f7f8a04beb8 | — |
| lighthouse-bundle/package.json | 55 | 1fdc5c8f02e652182722ef39c2b39c9212b330bdbd0d48152c9d6365a87c5af5 | not declared |
| lighthouse-bundle/package-lock.json | 48473 | bff36575a26b5b148513cb98fcda08147bd0e6d3ca491ac2d5f35a4e2cc11cda | — |
| deps/playwright/package.json | 1559 | 8be9edc5642a8c761b677e7af8b9937f36c0443a91e14765877716d70034e5bf | 1.60.0 |
| deps/playwright-core/package.json | 876 | 6f7b58cc55449321279f11ca97d4e451c391738b77db32cdbcedf02851e3f097 | 1.60.0 |
| deps/@axe-core/playwright/package.json | 2217 | f547cbb02bceaece9e0a5f90b95506fe47b92c69aa1128e1dc27ae5e7b027069 | 4.11.3 |
| deps/axe-core/package.json | 6691 | e4fe327ff998263b747888fc4e7f92a0ba24ff304df6dc946fa3153eb2b1c69d | 4.11.4 |
| lighthouse-bundle/node_modules/lighthouse/package.json | 11659 | 9a2acb5f3c0908842aacec66eb0bdd8307edd73469098e7eb186b5b79dfad1cf | 13.4.1 |

Absent: deps/package.json and deps/package-lock.json. Existing hidden npm install
lock is not a substitute for a complete root dependency declaration. Do not
reconstruct missing inputs by guessing wildcard dependencies. Mounted deps are
/node_modules; separate Lighthouse bundle is mounted /lhbundle.

## Actual runner input/result/cancellation contract (static only)

Exports: runScan, normaliseUrl, dockerArgs, validateResult. No submit/status/cancel
RPC or durable external job-ID API exists in this module. Actual entrypoint:
`runScan(raw, { signal, timeoutMs = 90000 } = {})` returns a Promise.

Input: string URL maximum 4096 characters, no whitespace/control characters,
credentials or fragment; http/https only and default protocol ports. Missing
scheme is normalized to https. Worker stdin receives JSON {url}, input maximum
8192 bytes. Caller timeout override is not itself range-validated by this module.
Admission uses process-local active/unhealthy state; internal random container
identity is not caller-supplied. Shared proxy lease is separate from that state.

Result: validated object {lh:{score,contrast,viewport}, axe:{violations,passes,
pageTitle,metaDesc}}. Wire schema must be 1 but is removed in returned object.
Score may be null (not successful Lighthouse proof); integer score 0–100 otherwise.
Counts bounded 0–100000; <=250 violations, <=500 passes, <=10000 nodes per violation,
<=40 tags. Text limits include title 300, node HTML 160, ID/tag 100, help and
description 1500, help URL 500 with the allowed Deque HTTPS prefix. metaDesc is
returned empty. Worker stdout ceiling 1 MiB; stderr ceiling 128 KiB.
Lighthouse errors are caught separately; axe can still return with null LH score.

Cancellation: AbortSignal prechecks before work/create/start, abort listener and
90-second default timer for the attached worker phase; not a whole-request
90-second bound. Proxy readiness timeout 5s, container create timeout 10s,
container removal timeout 10s. Cancel/result/error enters finally: remove owned
container when created or uncertain, latch unhealthy on cleanup failure, kill
local CLI/proxy and delete owned temporary directory. This is source intent,
not tested cleanup proof. Proxy-exit wait and directory removal have no explicit
independent deadline here. No durable status API or independently verified
restart reconciliation can be inferred from these functions.

Source-declared worker controls: UID/GID 61990; network none plus Unix-socket
proxy relay; readonly root; capabilities dropped; no-new-privileges; seccomp file;
768 MiB memory/swap cap, 1 CPU, 160 PIDs, 64 MiB shm, 128 MiB /tmp tmpfs.
Chrome is host-mounted readonly; worker headless launch uses chromiumSandbox true,
disables setuid sandbox (not equivalent to --no-sandbox), and keeps HTTPS errors
strict in Playwright context. Effective real-browser controls remain NOT RUN.
No web-tier privilege change or new adapter implementation is proposed here.

## Capture/source correspondence and freshness limits

The eight release hashes match the earlier live hashes reported in this thread.
Lookup under the previously recorded private capture location returned no matching
files; private-capture comparison is UNKNOWN, not verified reuse. No replacement
capture created and no broad snapshot search performed. Exact Git counterparts
remain UNKNOWN; sanitized handoff material is not runnable source. Existing
source hashes are reused, not an assertion of complete reproducible assembly.

Revalidation rule: these observations expire for execution approval if any release
pointer, file, package, image or mount pairing changes. Before any separately
approved run, recheck the full relevant hashes/IDs against its exact reviewed
packet; no time-only TTL establishes freshness. Missing inputs block reproduction.
The inspection was not an atomic multi-file snapshot; concurrent changes were
not ruled out. Individual hashes identify bytes read, not immutable deployment.

## Commands, limits and effects

Read-only Python pathlib/hashlib/json inspection of the named release files;
runner/worker read as source, never imported/executed. Initial source output was
bounded to 24000 characters per file, both smaller than that. Browser hashing
streamed in 1 MiB chunks; one 293 MB local sequential read, no browser launch.
Selected dpkg-query -W/-S metadata and docker image inspect of the exact single
image above; each subprocess timeout 10s, selected output capped 1500 characters.
No image listing of unrelated workloads, container launch, package install,
network download, log/UI repeat, Actions probe or production mutation.
Report generation rehashed only the named small manifests/source files.

PASS: metadata reads/image identity/package ownership. NOT RUN: browser, scans,
parser, dependency execution, image build, staging or cleanup tests. UNKNOWN:
full reproducibility/source correspondence, effective security and current fault.
Independent review is next; Muse incorporates this existing runner contract and
remaining gaps into its own revised packet. DOC-001 remains a separate isolated
document candidate; this URL metadata does not validate the deployed host parser.
