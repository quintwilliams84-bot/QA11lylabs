# Rollback Runbook

Production snapshots should live under `/root/qa11y-ops/maintenance/website-deploy-snapshots/`.

To rollback:

1. Identify the most recent known-good snapshot.
2. Restore it to `/var/www/qa11ylabs`.
3. Run `nginx -t`.
4. Smoke test the homepage and key routes.
5. Record a broker receipt with the rollback reason and restored snapshot.
