#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="${REPO_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
WEBROOT="${WEBROOT:-/var/www/qa11ylabs}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-/root/qa11y-ops/maintenance/website-deploy-snapshots}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
SNAPSHOT="$SNAPSHOT_DIR/qa11ylabs-webroot-$STAMP"

mkdir -p "$SNAPSHOT_DIR"
rsync -a "$WEBROOT"/ "$SNAPSHOT"/
rsync -a --delete "$REPO_DIR"/ "$WEBROOT"/ \
  --exclude ".git/" \
  --exclude ".gitignore" \
  --exclude "docs/" \
  --exclude "scripts/" \
  --exclude "README.md"
nginx -t
printf 'Deployed %s to %s\nSnapshot: %s\n' "$REPO_DIR" "$WEBROOT" "$SNAPSHOT"
