# Proposal P06 — Full-site audit of coveredbridgecollective.com (partner request, execution lane OpenClaw)

From: Muse. For: Codex review, then Codex assigns execution to OpenClaw/Arch.
Date: 2026-10-22. State: proposed.
Directed by Quintin (Oct 22, 2026, after his call with the site owner):
file this plan to the inbox; Quintin notifies Codex himself; Codex reviews
and assigns it to OpenClaw. This proposal is not permission and starts
nothing on its own.

## Background

On the Oct 22 call, the owner of Covered Bridge Collective (LER and digital
credential strategy consultancy, a QA11yLabs partner) asked Quintin for an
accessibility audit of his website in its entirety. He is also listing
QA11yLabs on his partners page as his accessibility audits and remediation
professional, so this audit is the first deliverable in a partner
relationship. Quintin told him the audit is underway on our end.

## Proposed work (bounded)

1. Crawl coveredbridgecollective.com and enumerate every reachable page
   (homepage plus all internal pages discovered from it). Record the page
   list in the run output so coverage is auditable.
2. Run each page through the existing deployed scanner path (the runner
   contract Arch documented: runScan into the release 20261017-r2 Docker
   worker, axe-core plus Lighthouse), one bounded run per page, no new
   tooling.
3. Return the per-page results (axe violations and passes counts, Lighthouse
   accessibility score including null recorded as NOT RUN where it occurs)
   plus the page inventory as one results file in this inbox, addressed to
   Quintin via Codex.
4. Quintin reviews the results and personally decides what is shared with
   the site owner and in what form. No agent contacts the site owner.

## Scope / non-scope

- Target is a single public website: coveredbridgecollective.com and its
  same-host pages only. No other hosts, no authenticated areas, no form
  submissions, no load beyond one sequential pass per page.
- Read-only against the target site. Nothing on the target site changes.
- No changes to qa11ylabs.com production, the VPS, or the scanner stack.
  If the deployed scanner path cannot complete a page, the executor records
  the failure stage as evidence (the customer-path failure stage is still
  UNKNOWN per the staging packet work) instead of working around it or
  building anything new.
- No client data in the repo beyond this plan: the site is public, the
  request is Quintin-directed, and results contain only the scanner output
  for public pages.

## Risks and open questions

- The public scanner endpoint has been down since Oct 18 and the deployed
  source correspondence is unresolved (P0 in the packet work). The internal
  runner path may or may not complete; a clean failure with a named stage
  is an acceptable first result and feeds the reconciliation work.
- Site size is unconfirmed (believed small, new site). If the crawl finds
  more than 50 pages, stop, report the count, and let Codex re-scope before
  running the rest.
- Results are automated-only (axe plus Lighthouse). Any report Quintin
  later sends the owner should say so plainly; manual screen-reader testing
  is a separate, later step Quintin may offer, not part of this plan.

## Ask

Codex: review the scope, then assign execution to OpenClaw/Arch as a
bounded work order naming the page cap and the results-file destination.
Quintin has already approved the audit itself with the site owner; the
remaining approvals are Codex sign-off on this plan and Quintin's review
of results before anything reaches the owner.
