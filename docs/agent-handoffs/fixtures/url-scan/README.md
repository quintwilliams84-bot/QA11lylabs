# Owned URL-scan fixture content

Prepared by Codex for the EXISTING CLIENT-PILOT-001. This fills the missing test
CONTENT input only; it is not an executed browser test, an approved hosting origin,
a complete runtime pairing or a scanner readiness certificate. No client data.

Files: control.html supplies image/button/input names; seeded.html intentionally
omits them. manifest.json binds the bytes and lists expected axe rule IDs:
image-alt, button-name and label. The rule expectations are NOT RUN until verified
with the actual pinned axe/browser pair. Additional findings must be recorded and
reviewed, not hidden; neither page is claimed WCAG conformant from static checks.
Do not assert an exact Lighthouse score or infer NOT RUN from a null score alone.

Both pages are standalone HTML with inline CSS and an embedded data-URL SVG.
No scripts, external assets, links, forms, send endpoints, storage or authentication.
Buttons have type=button and do nothing; the synthetic text input stores nothing.
The seeded page is deliberately inaccessible and must not be presented as product UI.

## Review and hosting gate

Antigravity independently reviews the content, manifest, expected rules and side-
effect claims. Muse binds the selected fixture file/hash to the corrected harness
packet after its own review. Arch names an existing approved, operator-controlled
HTTPS staging origin or a reviewed isolated fixture topology. The present runner
rejects loopback/private targets, so do not disable SSRF/egress/TLS controls to make
a local server pass. A GitHub repository URL/raw-text endpoint is not automatically
an equivalent rendered HTML target. Record Content-Type, actual response/final URL,
byte identity and any intentional topology adaptation in the run approval.

No GitHub Pages enablement, public hosting, DNS/config change, VPS webroot copy,
new server/container, package download or client scan is authorized here. Do not
use a customer page as the first fixture or deploy this bundle to production.
Any approved hosting method must be a concrete reviewed action; bytes existing
on a Git branch do not establish that the runner can reach/render them.

## Proposed bounded validation, NOT RUN

Use control first in an independently approved isolated session. Verify actual
sandbox/TLS/egress, integer 0..100/null score contract, bounded results, resource
caps and owned cleanup. Then seeded can be a separately named job in the same
explicitly approved session; these are two scan jobs, not one request. Keep
concurrency one, no automatic retries, exact engine/navigation/subresource budget
and truthful failures/unknowns. If only one job is approved, do not run the other.

The expected defects establish that the engine inspected the intended DOM; success
on these pages does not prove customer UI/API, PDF/report, mail, durable lead state,
manual accessibility coverage or production readiness. Later end-to-end acceptance
must prove those stages separately with synthetic/stubbed external effects.

## Arch acceptance-packet next return

Quintin supplied a private draft path and its claimed digest ending d479e024.
Codex has not received or rehashed the actual private draft and does not claim to
have reviewed its contents. Arch should supply one deliberately sanitized command-
only companion: existing task ID, exact candidate source/pairing/fixture identities,
parameterized precondition/launch/request/inspect/cleanup commands, resource and
request limits, private evidence roles, actual missing inputs and stop conditions.
Keep execution HELD; no secrets, private paths, client identity or content in public
Git. If the command companion cannot be safely sanitized, deliver it via the
approved private channel rather than replacing commands with vague prose.
