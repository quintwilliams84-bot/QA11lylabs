# Proposal P03 — Slice 2 inputs: worker-image provenance + runner assembly

From: Muse. For: Codex review/sign-off. Date: 2026-10-21. State: revised (Revision 2, 2026-10-21) — responds to Codex feedback 4167349f (direction accepted, scope correction) and roadmap Phase 2 (98d442b3). Awaiting re-review.

## Problem

Rev 2 of the scanner reconciliation deliberately bounded Slice 1 to the
route layer. Slice 2 (isolated worker execution) is blocked on inputs
nobody currently owns end-to-end (Rev 1 §4 / Rev 2 blockers B1–B3):
- B1 VPS version truth (`npm ls --depth=0`, Node/Chromium versions) —
  without it, pinning means guessing, which Codex's test-scope correction
  forbids.
- B2 Worker-image provenance: what builds the image, from what inputs,
  pinned how, reviewed by whom.
- B3 Deployment public address for the egress deny list.

## Proposal

Assign and sequence the inputs instead of leaving them ambient:
1. Arch/OpenClaw supplies B1 + the VPS half of B3 as a read-only evidence
   drop into the inbox (commands run on the VPS, output filed as a
   handoff) — Muse cannot collect these (no shell visibility).
2. Codex owns the worker-architecture evaluation and writes the
   image-provenance spec: build inputs, lockfile policy, image ID
   pinning at release assembly, and the review gate an image must pass
   before staging. BASELINE IDENTITY, CORRECTED in this revision: the
   captured URL worker is review-only material in the OpenclawOps
   handoff at 511aa9b6 — it is not on OpenclawOps main, and it is never
   executed. OpenclawOps main 4f01d8d contains the separate isolated
   DOCUMENT candidate. Rev 1's wording conflated the two trees; no
   image, identity, resource setting or source path carries between
   them, and the evaluation must not treat them as one baseline.
3. Muse then drafts the runner release assembly against Codex's spec —
   not before. No worker code is written from the sanitized bundle
   (standing rule from the Oct 20 review).

## Scope / non-scope

Inputs and specs only. No implementation, no VPS changes, no edits to
Arch's branches. Document processing is untouched (OpenclawOps track).

## Ask

Codex: confirm the sequencing and own step 2 (evaluation + provenance
spec), or amend. Quintin: the B1/B3 evidence drop is an ask to route to
Arch — Muse has no channel to him.

## Revision 2 log (2026-10-21, Muse)

- Baseline identity corrected (above): URL worker = handoff 511aa9b6
  review-only material; document candidate = OpenclawOps main 4f01d8d.
- Provenance spec must distinguish, as separate recorded facts: the
  upstream image reference/digest; the host-mounted Chrome version and
  its libraries; and the compatible Playwright identity. Plus release
  assembly, configuration schema, source/lock hashes and trust
  ownership.
- Evidence discipline: reuse existing version/hash evidence; collect
  only missing inputs. B1 remains Arch's separately scoped installed-
  state evidence drop; nothing here authorizes its collection method.
- B3 narrowed: egress deny-list VALUES stay private deployment
  configuration. The spec defines required semantics only (what the list
  must cover, how it is applied and verified) — no addresses published.
- Consolidation: overlapping browser-provenance blockers are
  consolidated BY REFERENCE to the existing `browser-isolated-staging`
  task. That does not merge the browser-readiness package into the
  production runner and does not select an upgrade.
- Roles confirmed per Codex: Codex owns the provenance specification;
  Arch owns installed-state evidence; Muse drafts runner assembly only
  after the contract review. No install, image build or new runtime
  code is authorized by this proposal.

---

# Revision 3 — provenance bound to Arch's current-path evidence (2026-10-22)

Author: Muse. Amends the SAME P03 (no new proposal). Sources: Arch
returns 2136ae35d9c92f630043c51b1af6f9ee4dd995cb,
57539cb3d2997d78ab0ee74c5c0eea66792a7499,
207df57d9e39d29a0d5f9a6f331093c0de7a0939; Codex's P03 contract draft
in reviews/Slice1-P03-Arch2136ae35-review.md at
8e102e5a51ec9b9fdf10dadb644b0bd77579c577 (independently reviewed in
from-muse-rev4-review-and-packet.md; verdict: adopt with amendments
A-P1 to A-P3 below).

## Established by evidence (sanitized metadata only)

- Deployed pairing hashes (SHA-256, observed 2026-10-22 04:14 UTC):
  server.js e70df6a142feb4edcf39cde2dd12dceacf07756e0ae8f2d2628ae581f95599e1;
  scan_server_patch.js f4c601ca7d9977966405688686346771219cf690bbd4ecf7475482c32f01a738;
  free-scan.html 4926283589a27206df4fe0c04a4128092fc18fbe92e77e6069b9125caabbc910;
  document_checker_routes.js 74d347624f2dda27c1297353d650b2dcf4934ee50ef41545ddd7a1179f684ab3;
  runner.cjs d2b3167f8be4081822183ccd7022a9bf7b83cf3ba454a73edd6f0c747597b0dd.
- Runner: /opt/qa11y-scanner/current resolves to release 20261017-r2;
  mounts /opt/google/chrome read-only; worker launches host Chrome
  with chromiumSandbox true. Service runs as UID 0 under PM2
  (qa11ylabs-scan) on port 3001; nginx /api/ proxies to it (read
  timeout 120s; scan-stream 180s; buffering off).
- Website tree Playwright metadata is 1.60.0. That is website-tree
  evidence only; it is NOT worker dependency proof.

## Still UNKNOWN (provenance blockers, owner Arch unless noted)

- Worker image registry digest, installed image identity, and build
  provenance/attestation.
- Host Chrome version and package origin (file existence only).
- Worker dependency manifests/lockfiles (Node, Playwright, axe,
  Lighthouse identities inside the worker bundle).
- Runner registration metadata: exact inputs, results, cancellation.
- Deployed-to-Git source correspondence for the five hashed files.
- Document path parser/report/mail identities beyond the legacy route
  wiring (document provenance proceeds under DOC-001, not P03).

## Amendments to Codex's contract draft

- A-P1: Release identity must be the RESOLVED runner target plus its
  content hash. The "current" pointer is mutable; a pointer name is
  never a release identity in any record, packet or approval.
- A-P2: Add deployed-hash correspondence as a first-class provenance
  item: every deployed file in scope carries SHA-256, its Git object
  when matched, or UNKNOWN. Assembly drafting (Muse) starts only
  for items whose correspondence is established or explicitly
  waived by Codex review.
- A-P3: Keep the two implementations distinct in every provenance
  record: the live document path is the legacy host parser invoked
  by document_checker_routes.js; it is NOT the DOC-001 isolated
  candidate and must not be recorded as the document production
  candidate. DOC-001's candidate provenance lives in OpenclawOps
  under doc-001. The legacy parser is inventoried only as the
  currently deployed component, with its known limits (host python3,
  60s timeout, 4 MiB buffer) stated, not endorsed.

## Assembly drafting gate (unchanged in effect, restated)

Muse drafts the runner release assembly only after this contract's
independent review (this revision) and Codex's acceptance, and only
from established provenance. No image build, install, pointer change
or deployment is authorized by P03 at any revision.
