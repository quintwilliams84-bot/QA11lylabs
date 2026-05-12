# Webroot Drift Detector Runbook

`scripts/webroot-drift-detector.sh` compares the canonical repo clone on the
VPS to the live `/var/www/qa11ylabs` webroot and writes a receipt. It is
non-destructive: it never edits the webroot or the repo. It is safe to run
daily from cron.

The repo is the source of truth. The webroot is what nginx serves. Drift
between them is almost always a sign that someone (or something) wrote to the
webroot outside the deploy workflow described in `docs/deployment-runbook.md`.

## What it does

1. Resolves `REPO_DIR` (the repo clone) and `WEBROOT` (the live root).
2. Optionally runs `git fetch` to surface how far behind the repo is.
3. Runs `rsync -rcni --delete --exclude ...` as a **dry run** to compute a
   per-file list of differences using content checksums (not just mtime).
4. Classifies each line:
   - `*deleting …` — file exists in webroot but not in repo (extra files)
   - `>f…` / `cd+…` — file is missing from webroot or has different content
   - `.f…` — metadata only (permissions, mtime) — treated as **WARNING**
5. Writes a timestamped receipt under `RECEIPT_DIR` and exits with a code
   that reflects the status: `0` CLEAN, `1` WARNING, `2` DRIFT, `3` ERROR.

The default ignore list strips noise the repo deliberately excludes from the
webroot (the deploy script already excludes these): `.git/`, `docs/`,
`scripts/`, `README.md`, `node_modules/`, runtime report directories, log
files, and common backup/archive extensions. Add site-specific exceptions to
`scripts/webroot-drift.ignore` (one rsync `--exclude` pattern per line).

## Installation

The script is in-repo. After the next deploy (or `git pull` on the VPS clone)
it is available at:

```
$REPO_DIR/scripts/webroot-drift-detector.sh
```

No additional dependencies beyond `rsync` and `git`, both of which are already
required for the deploy workflow.

Ensure the receipt directory exists and is writable by whoever runs the
script (typically `root` on the VPS):

```
mkdir -p /root/qa11y-ops/maintenance/website-drift-receipts
```

## Manual usage

From the VPS clone:

```
# Default daily mode — quiet on success, full receipt on drift
scripts/webroot-drift-detector.sh

# Always print the full receipt
scripts/webroot-drift-detector.sh --verbose

# Quiet mode — only print if drift detected (good for chatty cron)
scripts/webroot-drift-detector.sh --quiet

# Skip the "git fetch" step (offline / restricted environments)
scripts/webroot-drift-detector.sh --no-fetch

# JSON output — useful for ops dashboards / brokered receipts
scripts/webroot-drift-detector.sh --json
```

Exit codes:

| Code | Status   | Meaning                                                |
| ---- | -------- | ------------------------------------------------------ |
| 0    | CLEAN    | Webroot matches the repo (after ignores).              |
| 1    | WARNING  | Only metadata-level differences (permissions, mtime).  |
| 2    | DRIFT    | Content drift detected — review the receipt.          |
| 3    | ERROR    | Could not run (missing paths, missing `rsync`, etc.). |

## Scheduling (cron)

Recommended: once per day, off the hour, so it does not clash with deploys.

Edit root's crontab on the VPS (`crontab -e`) and add:

```
# QA11Y webroot drift detector — daily at 04:17 UTC, quiet on clean
17 4 * * * /opt/qa11y/qa11ylabs-website/scripts/webroot-drift-detector.sh --quiet >> /var/log/qa11y-webroot-drift.log 2>&1
```

Adjust the absolute path to wherever the VPS clone lives. The script writes
its own timestamped receipt under `RECEIPT_DIR` regardless of stdout
redirection — the log file above is purely a cron convenience.

If you prefer a brokered/Telegram alert path, wrap the call:

```
17 4 * * * /opt/qa11y/qa11ylabs-website/scripts/webroot-drift-detector.sh --json | /usr/local/bin/qa11y-broker-post drift-receipt
```

`qa11y-broker-post` is intentionally outside this repo — keep secrets and
broker tokens out of the source tree.

## When the script reports DRIFT

Drift means the webroot contains content the repo does not, or differs from
what the repo says it should be. Follow this sequence:

1. **Read the receipt.** It is dated and lives under
   `/root/qa11y-ops/maintenance/website-drift-receipts/drift-<UTC>.txt`.
2. **Confirm whether the drift is expected.** Examples of expected drift:
   - An emergency hotfix was applied directly to the webroot and has not
     been backported to the repo yet.
   - A runtime-generated file legitimately lives in the webroot. Add its
     pattern to `scripts/webroot-drift.ignore`.
3. **If unexpected**, snapshot the webroot before doing anything else (the
   deploy script writes snapshots to
   `/root/qa11y-ops/maintenance/website-deploy-snapshots/`).
4. **Reconcile.** Either:
   - Backport webroot changes into the repo, commit, and re-deploy via
     `scripts/deploy-to-vps-webroot.sh`; or
   - If the webroot is wrong, redeploy from the repo to overwrite it
     (after the snapshot is confirmed).
5. **Record a broker receipt** describing what was found, why, and which
   side won.

## When the script reports WARNING

Only metadata differs (permissions, mtime). Common causes:

- The webroot was rsync'd with a different `--chmod` policy.
- A file was touched in the webroot without a content change.

Action: usually no action. If repeated WARNING is noisy, normalize
permissions during deploy or add the path to `webroot-drift.ignore`.

## What it intentionally does NOT do

- It does not write to the webroot. Ever.
- It does not commit, push, or pull repo changes.
- It does not contact external services. There are no tokens, secrets, or
  credentials in the script.
- It does not delete receipts. Rotate `RECEIPT_DIR` separately with logrotate
  or a periodic cron sweep if disk usage matters.

## Related runbooks

- `docs/deployment-runbook.md` — how to deploy the repo to the webroot.
- `docs/rollback-runbook.md` — how to restore a snapshot when something goes
  wrong.
