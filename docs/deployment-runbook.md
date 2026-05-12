# Deployment Runbook

## Safe deployment flow

1. Confirm the working tree is clean and the intended commit is present.
2. Create a production snapshot of `/var/www/qa11ylabs` before deploy.
3. Sync the repository contents to `/var/www/qa11ylabs` with destructive delete only after backup exists.
4. Run `nginx -t`.
5. Smoke test `https://www.qa11ylabs.com/` and key routes.
6. Record a broker receipt with commit, deploy time, smoke-test status, and rollback path.

## Suggested command

Use `scripts/deploy-to-vps-webroot.sh` from the VPS clone after approval.
