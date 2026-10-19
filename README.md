# QA11Y Labs Website

Source-of-truth repository for the public QA11Y Labs website currently deployed to `https://www.qa11ylabs.com/`.

## Workflow

1. Make changes in this repository, not directly in `/var/www/qa11ylabs` except for emergency hotfixes.
2. Use Hermes for website/code production work where practical.
3. Use the broker for production deploy requests, approval receipts, and rollback records.
4. Preview and test changes before deploying to production.
5. Client-facing or public publishing changes require explicit approval from Quintin unless a narrow pre-approved workflow exists.

## Evidence preference

For reviewed Chromium installation and synthetic browser readiness checks, see
[the browser runtime runbook](ops/browser-runtime/README.md). This tooling does
not activate a scanner release or authorize production changes.

For accessibility QA, prefer accessibility-tree, DOM, and session/video-intercept evidence before screenshots. Use screenshots only when visual proof is needed.

## Business identity

Client-facing contact and business workflow should use `quintin@qa11ylabs.com`.
