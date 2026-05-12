#!/usr/bin/env bash
# webroot-drift-detector.sh
#
# Compares the canonical QA11Y website repo clone (REPO_DIR) against the live
# webroot (WEBROOT) and emits a clear receipt: CLEAN, WARNING, or DRIFT.
#
# Non-destructive by default: the script only reads, diffs, and writes a
# receipt under RECEIPT_DIR. It never modifies the webroot or the repo.
#
# Suitable for daily cron. Designed to be quiet on success and verbose on
# drift, so cron output stays useful.
#
# Exit codes:
#   0  CLEAN    — webroot matches the repo (after ignores)
#   1  WARNING  — only ignorable / low-signal differences
#   2  DRIFT    — meaningful differences detected
#   3  ERROR    — script could not run (missing paths, missing rsync, etc.)
#
# Usage:
#   scripts/webroot-drift-detector.sh                 # default daily mode
#   scripts/webroot-drift-detector.sh --quiet         # only print on drift
#   scripts/webroot-drift-detector.sh --verbose       # always print full diff
#   scripts/webroot-drift-detector.sh --no-fetch      # skip "git fetch" step
#   scripts/webroot-drift-detector.sh --json          # emit a JSON receipt to stdout
#
# Environment overrides:
#   REPO_DIR      Path to the canonical repo clone on the VPS.
#                 Default: parent dir of this script.
#   WEBROOT       Path to the live webroot. Default: /var/www/qa11ylabs
#   RECEIPT_DIR   Where receipts are written.
#                 Default: /root/qa11y-ops/maintenance/website-drift-receipts
#   IGNORE_FILE   Path to a newline-separated ignore list.
#                 Default: <REPO_DIR>/scripts/webroot-drift.ignore
#   GIT_REMOTE    Remote name used for the no-fetch / fetch behavior. Default: origin
#   GIT_BRANCH    Branch expected on REPO_DIR. Default: main
#
# Safety:
#   * Never deletes or overwrites files in REPO_DIR or WEBROOT.
#   * Writes receipts under RECEIPT_DIR only.
#   * Refuses to run if REPO_DIR or WEBROOT is missing.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="${REPO_DIR:-$(cd "$SCRIPT_DIR/.." && pwd)}"
WEBROOT="${WEBROOT:-/var/www/qa11ylabs}"
RECEIPT_DIR="${RECEIPT_DIR:-/root/qa11y-ops/maintenance/website-drift-receipts}"
IGNORE_FILE="${IGNORE_FILE:-$REPO_DIR/scripts/webroot-drift.ignore}"
GIT_REMOTE="${GIT_REMOTE:-origin}"
GIT_BRANCH="${GIT_BRANCH:-main}"

QUIET=0
VERBOSE=0
NO_FETCH=0
JSON_MODE=0

while [ $# -gt 0 ]; do
  case "$1" in
    --quiet)    QUIET=1 ;;
    --verbose)  VERBOSE=1 ;;
    --no-fetch) NO_FETCH=1 ;;
    --json)     JSON_MODE=1 ;;
    -h|--help)
      sed -n '1,60p' "$0"; exit 0 ;;
    *)
      echo "unknown flag: $1" >&2; exit 3 ;;
  esac
  shift
done

log() { [ "$QUIET" -eq 1 ] || printf '%s\n' "$*"; }
err() { printf '%s\n' "$*" >&2; }

# ── Preflight ───────────────────────────────────────────────────────────────
if ! command -v rsync >/dev/null 2>&1; then
  err "ERROR: rsync is required but not installed."
  exit 3
fi

if [ ! -d "$REPO_DIR" ]; then
  err "ERROR: REPO_DIR not found: $REPO_DIR"
  exit 3
fi

if [ ! -d "$WEBROOT" ]; then
  err "ERROR: WEBROOT not found: $WEBROOT"
  exit 3
fi

mkdir -p "$RECEIPT_DIR"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
RECEIPT="$RECEIPT_DIR/drift-$STAMP.txt"
RAW_DIFF="$(mktemp -t qa11y-drift-raw.XXXXXX)"
FILTERED_DIFF="$(mktemp -t qa11y-drift-filtered.XXXXXX)"
cleanup() { rm -f "$RAW_DIFF" "$FILTERED_DIFF"; }
trap cleanup EXIT

# ── Git status of repo (informational; we don't act on it) ──────────────────
REPO_HEAD=""
REPO_BRANCH=""
REPO_BEHIND=""
REPO_DIRTY="unknown"
if [ -d "$REPO_DIR/.git" ] && command -v git >/dev/null 2>&1; then
  REPO_HEAD="$(git -C "$REPO_DIR" rev-parse --short HEAD 2>/dev/null || true)"
  REPO_BRANCH="$(git -C "$REPO_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || true)"
  if git -C "$REPO_DIR" diff --quiet 2>/dev/null && git -C "$REPO_DIR" diff --cached --quiet 2>/dev/null; then
    REPO_DIRTY="clean"
  else
    REPO_DIRTY="dirty"
  fi
  if [ "$NO_FETCH" -eq 0 ] && git -C "$REPO_DIR" remote get-url "$GIT_REMOTE" >/dev/null 2>&1; then
    git -C "$REPO_DIR" fetch --quiet "$GIT_REMOTE" "$GIT_BRANCH" 2>/dev/null || true
    REPO_BEHIND="$(git -C "$REPO_DIR" rev-list --count HEAD.."$GIT_REMOTE/$GIT_BRANCH" 2>/dev/null || echo "?")"
  fi
fi

# ── Build ignore list ───────────────────────────────────────────────────────
DEFAULT_IGNORES=(
  ".git/"
  ".gitignore"
  ".github/"
  ".vscode/"
  ".idea/"
  ".DS_Store"
  "docs/"
  "scripts/"
  "README.md"
  "node_modules/"
  "uploads/"
  "generated-reports/"
  "client-reports/"
  "reports/"
  "triage-reports/"
  "transcripts/"
  "evidence/"
  "*.log"
  "*.bak"
  "*.bak*"
  "*.tar.gz"
  "*.zip"
  "*.tmp"
  "*.swp"
)

RSYNC_EXCLUDES=()
for pat in "${DEFAULT_IGNORES[@]}"; do
  RSYNC_EXCLUDES+=( --exclude="$pat" )
done
if [ -f "$IGNORE_FILE" ]; then
  while IFS= read -r line; do
    case "$line" in ''|\#*) continue ;; esac
    RSYNC_EXCLUDES+=( --exclude="$line" )
  done < "$IGNORE_FILE"
fi

# ── Dry-run rsync to compute drift ──────────────────────────────────────────
# itemize-changes gives a per-file change reason. We never mutate the webroot.
rsync -rcni --delete \
  "${RSYNC_EXCLUDES[@]}" \
  "$REPO_DIR/" "$WEBROOT/" > "$RAW_DIFF" || {
    err "ERROR: rsync dry-run failed."
    exit 3
  }

# Heuristic: lines starting with "*deleting" mean the webroot has extra files
# that don't exist in the repo. Lines starting with ">f" or "cd+" are
# additions/changes the repo would push to the webroot. We treat both as drift.
TOTAL_LINES="$(wc -l < "$RAW_DIFF" | tr -d ' ')"

# Filter for noise: rsync emits trailing blank lines and stat-only diffs (".f")
# for files whose mtime differs but content matches. With -c we use checksums,
# so a ".f" line generally indicates only metadata drift — treat as warning.
WARN_ONLY="$(grep -E '^\.f' "$RAW_DIFF" || true)"
REAL_DIFF="$(grep -Ev '^(\.f|$)' "$RAW_DIFF" || true)"

WARN_COUNT=0
DRIFT_COUNT=0
[ -n "$WARN_ONLY" ] && WARN_COUNT=$(printf '%s\n' "$WARN_ONLY" | grep -c . || true)
[ -n "$REAL_DIFF" ] && DRIFT_COUNT=$(printf '%s\n' "$REAL_DIFF" | grep -c . || true)

STATUS="CLEAN"
EXIT=0
if [ "$DRIFT_COUNT" -gt 0 ]; then
  STATUS="DRIFT"
  EXIT=2
elif [ "$WARN_COUNT" -gt 0 ]; then
  STATUS="WARNING"
  EXIT=1
fi

# ── Receipt ─────────────────────────────────────────────────────────────────
{
  printf 'QA11Y Labs — Webroot Drift Receipt\n'
  printf 'Generated:   %s\n' "$STAMP"
  printf 'Status:      %s\n' "$STATUS"
  printf 'Repo:        %s\n' "$REPO_DIR"
  printf 'Webroot:     %s\n' "$WEBROOT"
  printf 'Repo HEAD:   %s (%s) [%s]\n' "${REPO_HEAD:-?}" "${REPO_BRANCH:-?}" "$REPO_DIRTY"
  if [ -n "$REPO_BEHIND" ]; then
    printf 'Behind %s/%s: %s commit(s)\n' "$GIT_REMOTE" "$GIT_BRANCH" "$REPO_BEHIND"
  fi
  printf 'Drift lines: %s\n' "$DRIFT_COUNT"
  printf 'Warn  lines: %s\n' "$WARN_COUNT"
  printf '\n'
  printf '── Differences (rsync -rcni --delete, ignores applied) ──\n'
  if [ "$TOTAL_LINES" = "0" ]; then
    printf '(no differences)\n'
  else
    cat "$RAW_DIFF"
  fi
} > "$RECEIPT"

# ── Output ──────────────────────────────────────────────────────────────────
if [ "$JSON_MODE" -eq 1 ]; then
  printf '{'
  printf '"status":"%s",' "$STATUS"
  printf '"exit":%s,' "$EXIT"
  printf '"generated":"%s",' "$STAMP"
  printf '"repo_dir":"%s",' "$REPO_DIR"
  printf '"webroot":"%s",' "$WEBROOT"
  printf '"repo_head":"%s",' "${REPO_HEAD:-}"
  printf '"repo_branch":"%s",' "${REPO_BRANCH:-}"
  printf '"repo_dirty":"%s",' "$REPO_DIRTY"
  printf '"behind":"%s",' "${REPO_BEHIND:-}"
  printf '"drift_lines":%s,' "$DRIFT_COUNT"
  printf '"warn_lines":%s,' "$WARN_COUNT"
  printf '"receipt":"%s"' "$RECEIPT"
  printf '}\n'
elif [ "$VERBOSE" -eq 1 ] || [ "$STATUS" != "CLEAN" ]; then
  if [ "$QUIET" -eq 0 ] || [ "$STATUS" != "CLEAN" ]; then
    cat "$RECEIPT"
  fi
else
  log "[$STATUS] webroot in sync with $REPO_DIR (receipt: $RECEIPT)"
fi

exit "$EXIT"
