#!/usr/bin/env bash
#
# QA11yLabs VPS preflight — Gate 1 of the deploy pipeline.
#
# Run ON THE VPS (never on an agent's dev machine) before any PR is opened.
# All checks are read-only: nothing is installed, restarted, or modified.
# Exit 0 = preflight passed. Exit 1 = preflight failed (fix before opening a PR).
#
# Usage: bash ops/preflight.sh
#
set -u

PASS=0
FAIL=0

ok()   { PASS=$((PASS+1)); echo "  [PASS] $1"; }
fail() { FAIL=$((FAIL+1)); echo "  [FAIL] $1"; }

echo "=== QA11yLabs preflight — $(date -u +%Y-%m-%dT%H:%M:%SZ) ==="
echo

# ── 1. Node.js ───────────────────────────────────────────────────────────────
echo "--- node ---"
if command -v node >/dev/null 2>&1; then
  NODE_V=$(node --version)
  echo "  node version: $NODE_V"
  # Require Node 18+ (Playwright + modern Express need it)
  MAJOR=$(node -p "process.versions.node.split('.')[0]")
  if [ "$MAJOR" -ge 18 ]; then ok "node >= 18 ($NODE_V)"; else fail "node < 18 ($NODE_V)"; fi
else
  fail "node not found on PATH"
fi

# ── 2. App dependencies ──────────────────────────────────────────────────────
echo "--- dependencies ---"
APP_DIR="${QA11Y_APP_DIR:-/root/qa11ylabs}"
if [ -d "$APP_DIR/node_modules" ]; then
  ok "node_modules present at $APP_DIR"
else
  fail "node_modules missing at $APP_DIR (run npm install)"
fi
for pkg in playwright express; do
  if node -e "require.resolve('$pkg')" >/dev/null 2>&1; then
    ok "node can resolve '$pkg'"
  else
    fail "node cannot resolve '$pkg'"
  fi
done

# ── 3. Playwright Chromium launches ──────────────────────────────────────────
echo "--- browser ---"
if node -e "
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  console.log('  browser version: ' + await b.version());
  await b.close();
})().catch(e => { console.error('  launch error: ' + e.message.split('\n')[0]); process.exit(1); });
" 2>&1; then
  ok "headless Chromium launches"
else
  fail "headless Chromium does NOT launch (run: npx playwright install chromium && npx playwright install-deps chromium)"
fi

# ── 4. Required environment variables (presence only — never print values) ───
echo "--- env vars ---"
ENV_FILE="${QA11Y_ENV_FILE:-/root/.env}"
if [ -f "$ENV_FILE" ]; then
  ok "env file present at $ENV_FILE"
  # shellcheck disable=SC1090
  set -a; . "$ENV_FILE"; set +a
else
  fail "env file missing at $ENV_FILE"
fi
for var in PORT TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID AGENTMAIL_INBOX; do
  if [ -n "${!var:-}" ]; then ok "\$$var is set"; else fail "\$$var is NOT set"; fi
done

# ── 5. Ports ─────────────────────────────────────────────────────────────────
echo "--- ports ---"
APP_PORT="${PORT:-3001}"
if command -v ss >/dev/null 2>&1; then
  if ss -ltn 2>/dev/null | grep -q ":$APP_PORT "; then
    ok "app port $APP_PORT is listening"
  else
    fail "app port $APP_PORT is NOT listening (is the service running?)"
  fi
else
  echo "  [SKIP] 'ss' not available — cannot check port $APP_PORT"
fi

# ── 6. nginx config ──────────────────────────────────────────────────────────
echo "--- nginx ---"
if command -v nginx >/dev/null 2>&1; then
  if nginx -t 2>&1 | grep -q "test is successful"; then
    ok "nginx config valid"
  else
    fail "nginx config test failed"
  fi
else
  echo "  [SKIP] nginx not installed on this machine"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo
echo "=== preflight: $PASS passed, $FAIL failed ==="
[ "$FAIL" -eq 0 ]
