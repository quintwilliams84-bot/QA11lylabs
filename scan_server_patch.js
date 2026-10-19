/**
 * QA11Y Labs — Free Scan API v2
 * Replaces the existing /api/scan POST route in server.js
 *
 * New: GET /api/scan-stream  (Server-Sent Events — live progress)
 * Keep: POST /api/scan       (legacy fallback, still works)
 *
 * SSE stream emits JSON events:
 *   { stage: 'init',       message: '...', pct: 0  }
 *   { stage: 'lighthouse', message: '...', pct: 20 }
 *   { stage: 'axe',        message: '...', pct: 50 }
 *   { stage: 'pdf',        message: '...', pct: 75 }
 *   { stage: 'email',      message: '...', pct: 90 }
 *   { stage: 'done',       message: '...', pct: 100, results: { ... } }
 *   { stage: 'error',      message: '...' }
 *
 * Abuse protection (4 layers):
 *   L1 — nginx rate limit: 2 req/min per IP (in nginx config, burst=3)
 *   L2 — Node: 5 scans per IP per 10 min (persisted to disk across restarts)
 *        + FIFO scan queue (waits its turn instead of reject-when-busy)
 *   L3 — Honeypot field: bots fill it, humans don’t
 *   L4 — Email+domain dedup: same combo blocked for 24 hours (persisted)
 *
 * Client IP: X-Forwarded-For is only trusted past TRUSTED_PROXIES
 * (default: localhost + Tailscale range) — rightmost untrusted address wins.
 *
 * Phase 2 hardening:
 *   - Persistent rate-limit/dedup store (RATE_STORE_PATH, default
 *     /root/qa11y-ops/rate-store.json) — survives restarts
 *   - FIFO scan queue with 10-min max wait and queue-position events
 *   - Per-scan timeout (SCAN_TIMEOUT_MS, default 3 min) on axe/PDF/email
 *
 * Codex review track (corrective):
 *   - X-Forwarded-For ignored unless the direct peer is a trusted proxy
 *   - Scan slots held until the underlying work terminates; disconnects and
 *     timeouts abort the owned work (AbortController) and await cleanup
 *   - Bounded queue (MAX_QUEUE_LENGTH=20); async supervised Lighthouse
 *     (execFile, abortable, never throws)
 *   - SSRF enforced per-request via browser context route interception
 *     (redirects + subresources), IPv4-mapped IPv6 normalized, short DNS cache
 *   - Sandboxed browser launch attempted first; --no-sandbox only via
 *     CHROME_NO_SANDBOX=1 (or root default) with a loud alert; TLS verified
 *     (no ignoreHTTPSErrors) — cert failures are clean user-facing errors
 *   - Dedup is reserve → confirm (on mailer acceptance) → release (on failure);
 *     user copy claims submission, never inbox delivery
 *
 * Browser resilience:
 *   - Startup browser self-test with Telegram alert on failure
 *   - Clean user-facing error when the browser can't launch (no raw internals)
 *   - GET /api/scan-health for uptime monitoring (includes queue depth)
 */

'use strict';

const { execFile, execFileSync } = require('child_process');
const path         = require('path');
const dns          = require('dns').promises;
const fs           = require('fs');
const crypto       = require('crypto');
const os           = require('os');
const { getRemediation } = require('./remediation-engine');
function loadRootEnv() {
  try {
    for (const line of fs.readFileSync('/root/.env', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (_) {}
}
loadRootEnv();

const TG_TOKEN   = process.env.TELEGRAM_BOT_TOKEN || '';
const TG_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '';
const QA11Y_PYTHON = process.env.QA11Y_PYTHON || '/root/qa11y-venv/bin/python';
const AGENTMAIL_SENDER = process.env.AGENTMAIL_SENDER || '/root/agentmail_send.py';
const FREE_SCAN_LEADS_DIR = '/root/qa11y-ops/leads/free-scan';
const FREE_SCAN_JSONL = path.join(FREE_SCAN_LEADS_DIR, 'free_scan_leads.jsonl');
const FREE_SCAN_CSV = path.join(FREE_SCAN_LEADS_DIR, 'free_scan_leads.csv');
const UNIFIED_LEAD_INBOX = '/root/qa11y-ops/leads/unified/lead_inbox.jsonl';

// ══ ABUSE PROTECTION ════════════════════════════════════════════════════════════════════
// Phase 2: rate-limit and dedup state persists to disk (a restart no longer wipes
// it), and scans queue FIFO instead of being rejected when busy.

const RATE_STORE_PATH = process.env.RATE_STORE_PATH || '/root/qa11y-ops/rate-store.json';

// ─ L2: IP rate limit (5 scans / 10 min per IP), persisted ────────────────────
const IP_WINDOW_MS   = 10 * 60 * 1000; // 10 minutes
const IP_MAX_SCANS   = 5;              // max 5 per window
let ipScanTimes      = new Map();      // ip → number[]

// ─ L4: Email+domain dedup (24-hour TTL), persisted ───────────────────────────
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
let dedupStore     = new Map();            // hash → expiresAt

function loadRateStore() {
  try {
    const data = JSON.parse(fs.readFileSync(RATE_STORE_PATH, 'utf8'));
    const now = Date.now();
    for (const [ip, times] of Object.entries(data.ipScanTimes || {})) {
      const fresh = (times || []).filter(t => now - t < IP_WINDOW_MS);
      if (fresh.length) ipScanTimes.set(ip, fresh);
    }
    for (const [k, exp] of Object.entries(data.dedup || {})) {
      if (exp > now) dedupStore.set(k, exp);
    }
    console.log(`[scan] Rate store loaded: ${ipScanTimes.size} IPs, ${dedupStore.size} dedup entries`);
  } catch (_) {
    console.log('[scan] No rate store found — starting fresh');
  }
}

function flushRateStore() {
  try {
    const now = Date.now();
    const ips = {};
    for (const [ip, times] of ipScanTimes.entries()) {
      const fresh = times.filter(t => now - t < IP_WINDOW_MS);
      if (fresh.length) ips[ip] = fresh;
    }
    const dedup = {};
    for (const [k, exp] of dedupStore.entries()) {
      if (exp > now) dedup[k] = exp;
    }
    fs.mkdirSync(path.dirname(RATE_STORE_PATH), { recursive: true });
    fs.writeFileSync(RATE_STORE_PATH, JSON.stringify({ ipScanTimes: ips, dedup }));
  } catch (e) {
    console.warn('[scan] Could not save rate store:', e.message);
  }
}

let saveTimer = null;
function saveRateStore() {
  if (saveTimer) return; // debounce: at most one disk write per 5s
  saveTimer = setTimeout(() => { saveTimer = null; flushRateStore(); }, 5000);
  if (saveTimer.unref) saveTimer.unref();
}

loadRateStore();
process.on('SIGTERM', flushRateStore);
process.on('SIGINT',  flushRateStore);

// Also prune in-memory hourly so the Maps don't grow forever
setInterval(() => {
  const now = Date.now();
  const cutoff = now - IP_WINDOW_MS;
  for (const [ip, times] of ipScanTimes.entries()) {
    const fresh = times.filter(t => t > cutoff);
    if (fresh.length === 0) ipScanTimes.delete(ip);
    else ipScanTimes.set(ip, fresh);
  }
  for (const [k, exp] of dedupStore.entries()) {
    if (now >= exp) dedupStore.delete(k);
  }
}, 60 * 60 * 1000).unref(); // unref: housekeeping timer must not keep the process alive (tests, clean shutdown)

function ipAllowed(ip) {
  const now   = Date.now();
  const times = (ipScanTimes.get(ip) || []).filter(t => now - t < IP_WINDOW_MS);
  if (times.length >= IP_MAX_SCANS) return false;
  times.push(now);
  ipScanTimes.set(ip, times);
  saveRateStore();
  return true;
}

function dedupKey(email, url) {
  const host = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  return crypto.createHash('sha256').update(`${email.toLowerCase()}|${host}`).digest('hex');
}

// Dedup is a two-phase commit, because a 24h block must never be set for a
// scan that never delivered:
//   reserveDedup → short-lived reservation (15 min) when a scan starts. Returns
//                  true if a live reservation or confirmed block already exists.
//   confirmDedup → extends to the full 24h window, called ONLY after the mailer
//                  accepted the report (submission, not inbox delivery).
//   releaseDedup → frees the reservation when the scan fails, so the user can
//                  retry immediately instead of being blocked for a day.
const DEDUP_RESERVE_MS = parseInt(process.env.DEDUP_RESERVE_MS || '', 10) || 15 * 60 * 1000; // 15 minutes: covers one scan attempt

function reserveDedup(email, url) {
  const key = dedupKey(email, url);
  const exp = dedupStore.get(key);
  if (exp && Date.now() < exp) return true;
  dedupStore.set(key, Date.now() + DEDUP_RESERVE_MS);
  saveRateStore();
  return false;
}

function confirmDedup(email, url) {
  dedupStore.set(dedupKey(email, url), Date.now() + DEDUP_TTL_MS);
  saveRateStore();
}

function releaseDedup(email, url) {
  dedupStore.delete(dedupKey(email, url));
  saveRateStore();
}

// ─ L2: FIFO scan queue (Phase 2 — replaces reject-when-busy) ─────────────────
// Scans wait their turn instead of being turned away. Waiters are cancellable
// so a disconnected client doesn't hold a queue slot.
let activeScans = 0;
const MAX_CONCURRENT  = 2;
const QUEUE_MAX_WAIT_MS = 10 * 60 * 1000; // 10 minutes max in queue
const MAX_QUEUE_LENGTH  = 20;             // bounded: beyond this, reject with 429
const scanWaiters = []; // FIFO of { resolve, reject, timer, settled }

function removeWaiter(w) {
  const i = scanWaiters.indexOf(w);
  if (i !== -1) scanWaiters.splice(i, 1);
}

function acquireScanSlot() {
  let waiter = null;
  const promise = new Promise((resolve, reject) => {
    if (activeScans < MAX_CONCURRENT) {
      activeScans++;
      resolve(0); // no wait; position 0
      return;
    }
    if (scanWaiters.length >= MAX_QUEUE_LENGTH) {
      reject(new Error('queue-full'));
      return;
    }
    const position = scanWaiters.length + 1;
    waiter = { resolve, reject, settled: false, timer: null };
    waiter.timer = setTimeout(() => {
      if (waiter.settled) return;
      waiter.settled = true;
      removeWaiter(waiter);
      reject(new Error('queue-timeout'));
    }, QUEUE_MAX_WAIT_MS);
    if (waiter.timer.unref) waiter.timer.unref();
    scanWaiters.push(waiter);
    // resolve with the position the scan held when it queued
    const origResolve = waiter.resolve;
    waiter.resolve = () => { if (!waiter.settled) { waiter.settled = true; clearTimeout(waiter.timer); } origResolve(position); };
  });
  return {
    promise,
    cancel: () => {
      if (waiter && !waiter.settled) {
        waiter.settled = true;
        clearTimeout(waiter.timer);
        removeWaiter(waiter);
        waiter.reject(new Error('cancelled'));
      }
    },
  };
}

function releaseScanSlot() {
  activeScans = Math.max(0, activeScans - 1);
  let next;
  do {
    next = scanWaiters.shift();
  } while (next && next.settled); // skip waiters that timed out/cancelled
  if (next) {
    next.settled = true;
    clearTimeout(next.timer);
    activeScans++;
    next.resolve();
  }
}

function queueDepth() { return scanWaiters.length; }

// ─ Per-scan timeout ──────────────────────────────────────────────────────────
// A hung scan can never wedge a worker slot forever. runAxeScan already closes
// its browser in a finally block, so timing out the promise cleans up.
const SCAN_TIMEOUT_MS = parseInt(process.env.SCAN_TIMEOUT_MS || '', 10) || 180_000; // 3 min

function withScanTimeout(promise, label, ctrl) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      // Cancel the owned work first so a timed-out scan can't keep burning
      // a browser/CPU in the background after we've given up on it.
      try { ctrl?.abort(); } catch (_) {}
      reject(new Error(`${label} timed out after ${Math.round(SCAN_TIMEOUT_MS / 1000)}s`));
    }, SCAN_TIMEOUT_MS);
  });
  if (timer.unref) timer.unref();
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// ─ Helper: get real client IP ───────────────────────────────────────────────
// ─ Helper: get real client IP ───────────────────────────────────────────────
// Pure IP-policy logic lives in ./lib/ip-policy.js (no side effects, directly
// testable). Env parsing stays here — it does not belong in the pure module.
// X-Forwarded-For is only consulted when the direct peer is one of OUR
// proxies; otherwise the header is attacker-controlled and ignored entirely.
const ipPolicy = require('./lib/ip-policy');
const TRUSTED_PROXIES = (process.env.TRUSTED_PROXIES || '127.0.0.1,::1,100.64.0.0/10')
  .split(',').map(s => s.trim()).filter(Boolean);

function clientIp(req) {
  return ipPolicy.clientIp(req, TRUSTED_PROXIES);
}

// ══ BROWSER HEALTH ═══════════════════════════════════════════════════════════
// Cached browser-launch status: null = unchecked, true = ok, false = unavailable.
// Verified once at startup (non-blocking) and re-checked lazily whenever a scan
// is requested while marked unavailable, so recovery doesn't need a restart.
let browserOk = null;

// ── Browser launch ──────────────────────────────────────────────────────────
// The sandboxed launch is always attempted first. The --no-sandbox fallback
// exists ONLY for root containers (Chrome cannot sandbox as root) and is
// never silent: it requires opt-in and alerts loudly every time it engages.
// Long-term fix (VPS-side): run the app as an unprivileged user.
function allowNoSandbox() {
  if (process.env.CHROME_NO_SANDBOX === '1') return true;
  if (process.env.CHROME_NO_SANDBOX === '0') return false;
  // Default: root containers (like the current VPS) can't use the sandbox;
  // anything else gets the sandbox by default.
  return typeof process.getuid === 'function' && process.getuid() === 0;
}

async function verifyBrowser() {
  // Verifies the REAL launch path (via launchScannerBrowser), never a laxer
  // stand-in — the check must not pass in a configuration scans won't use.
  let browser;
  try {
    browser = await launchScannerBrowser({ silent: true });
    browserOk = true;
    return true;
  } catch (err) {
    browserOk = false;
    console.error('[scan] Browser verification failed:', err.message);
    return false;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function isBrowserLaunchFailure(err) {
  return /executable doesn't exist|browserType\.launch|failed to launch/i.test((err && err.message) || '');
}

// Single launch path for all scans: detects a missing/unusable browser,
// alerts loudly, and throws a clean user-facing error (no raw internals).
// The sandbox is never bypassed silently — see allowNoSandbox().
async function launchScannerBrowser(opts = {}) {
  const { chromium } = require('playwright');
  const skipSandbox = opts.forceNoSandbox ?? allowNoSandbox();
  if (!skipSandbox) {
    try {
      return await chromium.launch({ args: [] }); // sandboxed: the default
    } catch (sandboxErr) {
      throw sandboxErr; // fail loud — no silent fallback
    }
  }
  if (!opts.silent) {
    console.warn('[scan] Browser running WITHOUT the Chrome sandbox (root container / CHROME_NO_SANDBOX=1)');
    tgAlert('⚠️ Scanner browser running WITHOUT the Chrome sandbox. Migrate the app to an unprivileged user to re-enable it.');
  }
  try {
    return await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  } catch (err) {
    browserOk = false;
    if (isBrowserLaunchFailure(err)) {
      if (!opts.silent) tgAlert(`🚨 Scanner browser failed to launch\nError: ${err.message.slice(0, 160)}`);
      const clean = new Error('Our scanner is temporarily unavailable — the team has been alerted and is restoring it.');
      clean.userFacing = true;
      throw clean;
    }
    throw err;
  }
}

// Verify at startup (non-blocking) — alerts loudly if the browser is missing
// so an outage is never silent again. The catch keeps module load safe in
// environments without a browser (tests, CI).
verifyBrowser().then(ok => {
  if (!ok) tgAlert('🚨 Scanner started WITHOUT a working browser. Free scans will fail until Chromium is restored.');
}).catch(() => {});

// ── Telegram helper ────────────────────────────────────────────────────────
async function tgAlert(msg) {
  try {
    if (!TG_TOKEN || !TG_CHAT_ID) return;
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: TG_CHAT_ID, text: msg }),
    });
  } catch (_) {}
}

// ── URL normaliser ─────────────────────────────────────────────────────────
function normaliseUrl(raw) {
  try {
    const u = new URL(raw.trim().startsWith('http') ? raw.trim() : `https://${raw.trim()}`);
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.href;
  } catch { return null; }
}

// ── SSRF guard: refuse non-public targets ────────────────────────────────────
// The scanner fetches attacker-chosen URLs and emails the results back, so it
// must never be pointed at localhost, private networks, or cloud metadata
// (e.g. 169.254.169.254). Note: DNS is checked at request time; a rebinding
// attack between check and fetch is a known residual risk.
function isPrivateIp(ip) {
  ip = ipPolicy.normalizeIp(ip);
  if (ip.includes(':')) {
    const low = ip.toLowerCase();
    return low === '::1' || /^(fc|fd)/.test(low) || low.startsWith('fe80');
  }
  const p = ipPolicy.parseIpv4(ip);
  if (!p) return true; // malformed → fail closed (treat as private)
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 ||
         (a === 172 && b >= 16 && b <= 31) ||
         (a === 192 && b === 168) ||
         (a === 169 && b === 254);
}

async function hostIsPublic(hostname) {
  if (/^(localhost|.*\.localhost)$/i.test(hostname)) return false;
  let addrs;
  try {
    addrs = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    return false; // unresolvable → not scannable
  }
  return addrs.every(({ address }) => !isPrivateIp(address));
}

async function assertPublicUrl(url) {
  const { hostname } = new URL(url);
  if (!(await hostIsPublic(hostname))) throw new Error('non-public scan target');
}

// ── SSRF request guard (per-scan) ────────────────────────────────────────────
// assertPublicUrl checks the initial target, but the page then follows
// redirects and loads subresources — each a fresh SSRF opportunity — and DNS
// can rebind between the check and the fetch. So every outbound request from
// the scan's browser context is intercepted and re-checked. DNS answers are
// cached briefly per scan to bound lookup volume while limiting the rebinding
// window. Residual risk: the separate Lighthouse process fetches the target
// URL with its own network stack (no interception hook available).
const SSRF_DNS_TTL_MS = 30_000;

function createRequestGuard() {
  const dnsCache = new Map(); // hostname → { public, expiresAt }
  async function checkHost(hostname) {
    const now = Date.now();
    const entry = dnsCache.get(hostname);
    if (entry && entry.expiresAt > now) return entry.public;
    const publik = await hostIsPublic(hostname);
    dnsCache.set(hostname, { public: publik, expiresAt: now + SSRF_DNS_TTL_MS });
    return publik;
  }
  async function isRequestAllowed(rawUrl) {
    let u;
    try { u = new URL(rawUrl); } catch { return false; }
    if (u.protocol === 'data:' || u.protocol === 'blob:') return true;
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    return checkHost(u.hostname);
  }
  return { isRequestAllowed };
}

function safeLeadText(value, limit = 400) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, limit);
}

function csvCell(value) {
  const text = safeLeadText(value, 1000);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function appendLine(filePath, line) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.appendFileSync(filePath, line + '\n', { encoding: 'utf8', mode: 0o600 });
}

function writeFreeScanLead({ url, email, pageTitle, lighthouseScore, violations, passes, messageId, route }) {
  try {
    const createdAt = new Date().toISOString();
    const host = (() => { try { return new URL(url).hostname; } catch { return safeLeadText(url, 180); } })();
    const sorted = sortViolations(violations || []);
    const critC = sorted.filter(v => v.impact === 'critical').length;
    const serC = sorted.filter(v => v.impact === 'serious').length;
    const top = sorted[0] || {};
    const leadId = crypto.createHash('sha256')
      .update(`${createdAt}|${String(email || '').toLowerCase()}|${host}`)
      .digest('hex')
      .slice(0, 16);
    const lead = {
      created_at: createdAt,
      lead_id: leadId,
      source: 'free_url_scan',
      route: route || 'unknown',
      name: '',
      email: safeLeadText(email, 180),
      company: host,
      website: url,
      page_title: safeLeadText(pageTitle, 240),
      lighthouse_score: lighthouseScore ?? '',
      total_violations: sorted.length,
      critical: critC,
      serious: serC,
      passes: Array.isArray(passes) ? passes.length : (passes || 0),
      top_issue: safeLeadText(top.description || top.id || 'No automated violation recorded', 300),
      message_id: messageId || '',
      status: 'new_free_scan',
      next_action: 'Review automated scan result and decide whether to send a consultation follow-up.',
    };
    appendLine(FREE_SCAN_JSONL, JSON.stringify(lead));
    if (!fs.existsSync(FREE_SCAN_CSV)) {
      appendLine(FREE_SCAN_CSV, [
        'created_at','lead_id','email','company','website','lighthouse_score',
        'total_violations','critical','serious','top_issue','message_id','route'
      ].join(','));
    }
    appendLine(FREE_SCAN_CSV, [
      lead.created_at, lead.lead_id, lead.email, lead.company, lead.website,
      lead.lighthouse_score, lead.total_violations, lead.critical, lead.serious,
      lead.top_issue, lead.message_id, lead.route
    ].map(csvCell).join(','));
    appendLine(UNIFIED_LEAD_INBOX, JSON.stringify({
      approval_required: true,
      company: lead.company,
      created_at: lead.created_at,
      email: lead.email,
      grade: lead.lighthouse_score === '' ? '' : String(lead.lighthouse_score),
      last_touch: '',
      lead_id: lead.lead_id,
      name: '',
      next_action: lead.next_action,
      notes: `Free URL scan for ${lead.website}; violations=${lead.total_violations}; critical=${lead.critical}; serious=${lead.serious}; top=${lead.top_issue}`,
      priority: lead.critical > 0 || lead.serious > 0 ? 'warm' : 'normal',
      raw: lead,
      score: lead.lighthouse_score === '' ? '' : String(lead.lighthouse_score),
      source: 'free_url_scan',
      source_key: lead.lead_id,
      status: lead.status,
      top_issue: lead.top_issue,
      website: lead.website,
    }));
    return lead;
  } catch (err) {
    console.warn('[scan] Could not persist free scan lead:', err.message);
    return null;
  }
}

// ── axe-core + Playwright scan ─────────────────────────────────────────────
// Accepts an AbortSignal: on abort (client disconnect / scan timeout) the
// browser is closed immediately, which rejects the in-flight Playwright calls
// and lets the caller's finally blocks run. The slot is held by the caller
// until this promise settles — never released early.
function cancelledError() {
  const e = new Error('Scan cancelled');
  e.cancelled = true;
  return e;
}

async function runAxeScan(url, onProgress, opts = {}) {
  const { signal } = opts;
  // Abort check first: never load the browser stack for a dead scan.
  if (signal?.aborted) throw cancelledError();
  const { AxeBuilder } = require('@axe-core/playwright');

  onProgress('Launching browser and navigating to your site…');
  let browser;
  const onAbort = () => { if (browser) browser.close().catch(() => {}); };
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  try {
    browser = await launchScannerBrowser();
    // NOTE: no ignoreHTTPSErrors — TLS certificates are verified. A site with
    // an invalid certificate fails the scan with a clean user-facing error
    // instead of being scanned over an untrusted connection.
    const ctx  = await browser.newContext({ userAgent: 'QA11YLabsScanner/2.0' });
    // SSRF guard: intercept every outbound request (redirects, subresources)
    // and re-validate the target — the pre-scan DNS check alone is not enough.
    const ssrfGuard = createRequestGuard();
    await ctx.route('**/*', async (route) => {
      try {
        if (await ssrfGuard.isRequestAllowed(route.request().url())) {
          await route.continue();
        } else {
          await route.abort('aborted');
        }
      } catch (_) {
        try { await route.abort('aborted'); } catch (_) {}
      }
    });
    const page = await ctx.newPage();
    if (signal?.aborted) throw cancelledError();
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45_000 });

    onProgress('Running WCAG 2.2 AA axe-core analysis…');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', 'section508'])
      .analyze();

    // Grab page title and meta description for report personalisation
    const pageTitle = await page.title().catch(() => url);
    const metaDesc  = await page.$eval(
      'meta[name="description"]', el => el.content
    ).catch(() => '');

    return { ...results, pageTitle, metaDesc };
  } catch (err) {
    if (err && err.cancelled) throw err;
    if (/ERR_CERT|certificate/i.test(err.message || '')) {
      const clean = new Error("We couldn't verify this site's security certificate, so the scan can't proceed.");
      clean.userFacing = true;
      throw clean;
    }
    throw err;
  } finally {
    if (signal) signal.removeEventListener('abort', onAbort);
    if (browser) await browser.close().catch(() => {});
  }
}

// ── Lighthouse score ───────────────────────────────────────────────────────
// ── Lighthouse score (async, supervised, abortable) ─────────────────────────
// Runs without a shell (args array — no command injection). The child is
// supervised: execFile's timeout kills it, and an AbortSignal (client
// disconnect / scan timeout) kills it immediately. Never throws — a failed
// Lighthouse run degrades to score: null.
function lighthouseArgs(url, outPath) {
  return ['lighthouse', url,
    '--output=json', `--output-path=${outPath}`,
    '--only-categories=accessibility',
    '--chrome-flags=--headless --no-sandbox --disable-gpu',
    '--quiet',
  ];
}

function parseLighthouseOutput(outPath) {
  try {
    const data  = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    const score = data?.categories?.accessibility?.score != null
      ? Math.round(data.categories.accessibility.score * 100)
      : null;
    const contrast = data?.audits?.['color-contrast']?.details?.items?.length || 0;
    const viewport = data?.audits?.['meta-viewport']?.score === 0 ? 1 : 0;
    return { score, contrast, viewport };
  } catch (_) {
    return { score: null, contrast: 0, viewport: 0 };
  }
}

function runLighthouse(url, onProgress, opts = {}) {
  const { signal } = opts;
  onProgress('Running Google Lighthouse accessibility score…');
  const outPath = `/tmp/lh-${Date.now()}-${process.pid}.json`;
  return new Promise((resolve) => {
    const done = (result) => {
      try { fs.unlinkSync(outPath); } catch (_) {}
      resolve(result);
    };
    if (signal?.aborted) return done({ score: null, contrast: 0, viewport: 0 });
    let child;
    try {
      child = execFile('npx', lighthouseArgs(url, outPath),
        { timeout: 90_000, stdio: 'pipe' },
        () => done(parseLighthouseOutput(outPath)));
    } catch (_) {
      return done({ score: null, contrast: 0, viewport: 0 });
    }
    if (signal) {
      signal.addEventListener('abort', () => {
        try { child.kill('SIGKILL'); } catch (_) {}
      }, { once: true });
    }
  });
}

// ── Impact priority sort ───────────────────────────────────────────────────
const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };
function sortViolations(violations) {
  return [...violations].sort((a, b) =>
    (IMPACT_ORDER[a.impact] ?? 9) - (IMPACT_ORDER[b.impact] ?? 9)
  );
}

// ── Build branded PDF ──────────────────────────────────────────────────────
async function buildScanPdf(url, violations, passes, lh, pageTitle) {
  const PDFDocument = require('pdfkit');
  return new Promise((resolve, reject) => {
    const doc    = new PDFDocument({ margin: 50, size: 'LETTER', info: {
      Title:    `Accessibility Scan — ${new URL(url).hostname}`,
      Author:   'Quintin Williams, QA11Y Labs LLC',
      Subject:  'WCAG 2.2 AA Automated Accessibility Report',
      Creator:  'QA11Y Labs Scanner v2.0',
    }});
    const chunks = [];
    doc.on('data', c  => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W     = doc.page.width - 100;
    const now   = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    const host  = new URL(url).hostname;

    const C = {
      black:  '#0B0C10', cyan:   '#007a76', amber:  '#c47900',
      teal:   '#45A29E', muted:  '#5a5f6e', light:  '#f4f5f7',
      red:    '#c0392b', green:  '#1e8449', border: '#d0d4de',
    };

    const impactColor = { critical: C.red, serious: C.amber, moderate: C.muted, minor: C.muted };
    const impactBg    = { critical: '#fdf2f2', serious: '#fdf6e3', moderate: '#f8f8f8', minor: '#f8f8f8' };

    const sorted = sortViolations(violations);

    // ── Cover ──────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 120).fill(C.black);
    doc.fontSize(26).fillColor('#ffffff').font('Helvetica-Bold')
       .text('QA11Y', 50, 38, { continued: true })
       .fillColor('#66FCF1').text('Labs');
    doc.fontSize(11).fillColor('#C5C6C7').font('Helvetica')
       .text('Accessibility Scan Report', 50, 74);

    doc.y = 138;
    doc.fontSize(14).fillColor(C.black).font('Helvetica-Bold')
       .text(pageTitle || host, 50, doc.y);
    doc.fontSize(10).fillColor(C.muted).font('Helvetica')
       .text(url, 50)
       .text(`Generated: ${now}  ·  Standard: WCAG 2.2 Level AA  ·  Engine: axe-core + Lighthouse`);
    doc.moveTo(50, doc.y + 8).lineTo(50 + W, doc.y + 8).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.moveDown(0.8);

    // ── Score bar ─────────────────────────────────────────────────────
    if (lh.score !== null) {
      const scoreColor = lh.score >= 90 ? C.green : lh.score >= 50 ? C.amber : C.red;
      const barY = doc.y;
      doc.rect(50, barY, W, 52).fillColor(C.light).fill();
      doc.fontSize(28).fillColor(scoreColor).font('Helvetica-Bold')
         .text(String(lh.score), 62, barY + 10);
      doc.fontSize(9).fillColor(C.muted).font('Helvetica')
         .text('/100', 62 + 38, barY + 20);
      doc.fontSize(11).fillColor(C.black).font('Helvetica-Bold')
         .text('Lighthouse Accessibility Score', 130, barY + 10);
      doc.fontSize(9).fillColor(C.muted).font('Helvetica')
         .text('Automated scan — does not reflect screen reader usability', 130, barY + 28);
      doc.y = barY + 60;
    }

    doc.moveDown(0.5);

    // ── Summary tiles ─────────────────────────────────────────────────
    const critC  = sorted.filter(v => v.impact === 'critical').length;
    const serC   = sorted.filter(v => v.impact === 'serious').length;
    const modC   = sorted.filter(v => v.impact === 'moderate').length;
    const minC   = sorted.filter(v => v.impact === 'minor').length;
    const tiles  = [
      { label: 'Critical',  n: critC,         color: C.red   },
      { label: 'Serious',   n: serC,           color: C.amber },
      { label: 'Moderate',  n: modC,           color: C.muted },
      { label: 'Minor',     n: minC,           color: C.muted },
      { label: 'Passed',    n: passes.length,  color: C.green },
    ];
    const tw = W / tiles.length;
    const ty = doc.y;
    tiles.forEach(({ label, n, color }, i) => {
      const x = 50 + i * tw;
      doc.rect(x + 2, ty, tw - 4, 54).fillColor('#fff').fill()
         .rect(x + 2, ty, tw - 4, 54).strokeColor(C.border).lineWidth(0.5).stroke();
      doc.fontSize(24).fillColor(color).font('Helvetica-Bold')
         .text(String(n), x + 8, ty + 8, { width: tw - 16 });
      doc.fontSize(8).fillColor(C.muted).font('Helvetica')
         .text(label, x + 8, ty + 38, { width: tw - 16 });
    });
    doc.y = ty + 62;
    doc.moveDown(0.8);

    // ── Violations ────────────────────────────────────────────────────
    doc.fontSize(14).fillColor(C.black).font('Helvetica-Bold').text('Violations Found');
    doc.moveTo(50, doc.y + 3).lineTo(50 + W, doc.y + 3).strokeColor(C.cyan).lineWidth(1.5).stroke();
    doc.moveDown(0.6);

    if (sorted.length === 0) {
      doc.fontSize(11).fillColor(C.green).font('Helvetica')
         .text('No violations detected by automated scan. Manual screen reader testing recommended.');
    } else {
      sorted.forEach((v, idx) => {
        const remediation = getRemediation(v.id);
        const estHeight = 150 + Math.min(v.nodes.length, 2) * 22;
        if (doc.y + estHeight > doc.page.height - 80) doc.addPage();

        const iColor = impactColor[v.impact] || C.muted;
        const iBg    = impactBg[v.impact]    || '#f8f8f8';
        const vY     = doc.y;

        // Impact badge
        doc.rect(50, vY, 60, 16).fillColor(iColor).fill();
        doc.fontSize(7.5).fillColor('#fff').font('Helvetica-Bold')
           .text((v.impact || '').toUpperCase(), 53, vY + 4, { width: 54 });

        // Title
        doc.fontSize(10.5).fillColor(C.black).font('Helvetica-Bold')
           .text(`${idx + 1}. ${v.description}`, 118, vY, { width: W - 68 });

        doc.y = Math.max(doc.y, vY + 20);
        doc.fontSize(8.5).fillColor(C.muted).font('Helvetica')
           .text(`Rule: ${v.id}  ·  WCAG: ${(v.tags||[]).filter(t=>t.startsWith('wcag')).join(', ')||'N/A'}  ·  Nodes affected: ${v.nodes.length}`, 50);

        if (v.helpUrl) {
          doc.fontSize(8).fillColor(C.cyan)
             .text(`Reference: ${v.helpUrl}`, 50, undefined, { link: v.helpUrl });
        }

        // WCAG remediation guidance
        const remY = doc.y + 4;
        doc.rect(50, remY, W, 58).fillColor('#ffffff').fill()
           .rect(50, remY, W, 58).strokeColor(C.border).lineWidth(0.5).stroke();
        doc.fontSize(8.5).fillColor(C.black).font('Helvetica-Bold')
           .text(`QA11Y Remediation: ${remediation.wcag}`, 56, remY + 6, { width: W - 12 });
        doc.fontSize(8).fillColor(C.muted).font('Helvetica')
           .text(remediation.issue, 56, remY + 20, { width: W - 12 });
        doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
           .text(remediation.explanation, 56, remY + 33, { width: W - 12, height: 20 });
        doc.y = remY + 64;

        // Code snippets (up to 2)
        v.nodes.slice(0, 2).forEach(n => {
          const snippet = (n.html || '').replace(/\s+/g, ' ').trim().slice(0, 130);
          if (!snippet) return;
          const snY = doc.y + 2;
          doc.rect(50, snY, W, 14).fillColor(iBg).fill();
          doc.fontSize(7.5).fillColor(C.muted).font('Courier')
             .text(snippet, 54, snY + 3, { width: W - 8 });
          doc.y = snY + 16;
        });

        const fixY = doc.y + 2;
        if (doc.y + 44 > doc.page.height - 80) doc.addPage();
        doc.fontSize(8).fillColor(C.black).font('Helvetica-Bold')
           .text('Suggested fix examples:', 50, doc.y + 2);
        doc.fontSize(7.2).fillColor(C.muted).font('Courier')
           .text(`HTML: ${remediation.htmlFix}`, 54, doc.y + 4, { width: W - 8, height: 18 });
        doc.fontSize(7.2).fillColor(C.muted).font('Courier')
           .text(`React: ${remediation.reactFix}`, 54, doc.y + 2, { width: W - 8, height: 18 });
        doc.y = Math.max(doc.y, fixY + 42);

        doc.moveDown(0.5);
      });
    }

    // ── What's Next ───────────────────────────────────────────────────
    if (doc.y > doc.page.height - 180) doc.addPage();
    doc.moveDown(0.5);
    doc.fontSize(14).fillColor(C.black).font('Helvetica-Bold').text("What's Next?");
    doc.moveTo(50, doc.y + 3).lineTo(50 + W, doc.y + 3).strokeColor(C.cyan).lineWidth(1.5).stroke();
    doc.moveDown(0.6);
    doc.fontSize(10).fillColor(C.muted).font('Helvetica').text(
      'Automated tools catch roughly 30–40% of accessibility issues. Screen reader reading order, ' +
      'focus management, ARIA state announcements, and cognitive load require hands-on expert testing.\n\n' +
      'QA11Y Labs offers full WCAG 2.2 AA audits combining axe-core, Lighthouse, and 25+ years of ' +
      'daily JAWS screen reader expertise. Every finding comes with real HTML/ARIA code fixes — not just a checklist.\n\n' +
      'Bronze audit from $499  ·  Book at qa11ylabs.com/services.html',
      { width: W }
    );

    // ── Footer ────────────────────────────────────────────────────────
    const fY = doc.page.height - 48;
    doc.moveTo(50, fY - 8).lineTo(50 + W, fY - 8).strokeColor(C.border).lineWidth(0.5).stroke();
    doc.fontSize(7.5).fillColor(C.muted).font('Helvetica')
       .text(
         `© 2026 QA11Y Labs LLC  ·  Quintin Williams, Founder  ·  quintin@qa11ylabs.com  ·  qa11ylabs.com  ·  Architecting a more inclusive digital world.`,
         50, fY, { width: W, align: 'center' }
       );

    doc.end();
  });
}

// ── Send report email ──────────────────────────────────────────────────────
function sendAgentMailViaPython({ to, subject, text, html, replyTo, attachments = [] }) {
  const args = [
    AGENTMAIL_SENDER,
    '--to', to,
    '--subject', subject,
    '--text', text || '',
  ];
  if (html) args.push('--html', html);
  if (replyTo) args.push('--reply-to', replyTo);
  for (const attachment of attachments) args.push('--attachment', attachment);

  const output = execFileSync(QA11Y_PYTHON, args, {
    encoding: 'utf8',
    timeout: 45000,
    maxBuffer: 1024 * 1024,
  }).trim();
  const match = output.match(/message_id:\s*<?([A-Za-z0-9._:-]+)>?\.?/i);
  if (!match) {
    throw new Error(`AgentMail sender did not return a message_id. Output: ${output.slice(0, 240)}`);
  }
  return { messageId: match[1], output };
}

async function sendScanEmail(_mailAdapter, _inbox, toEmail, url, pdfBuffer, violationCount) {
  const host     = new URL(url).hostname;
  const filename = `QA11Y-Labs-Accessibility-Report-${host}.pdf`;
  const html = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">
  <div style="background:#0B0C10;padding:20px 24px;border-radius:8px;margin-bottom:28px;">
    <span style="font-size:20px;font-weight:700;">
      <span style="color:#fff;">QA11Y</span><span style="color:#66FCF1;">Labs</span>
    </span>
  </div>
  <h1 style="font-size:20px;color:#1a1d26;margin-bottom:12px;">Your accessibility report is ready.</h1>
  <p style="font-size:15px;color:#5a5f6e;line-height:1.7;">
    We completed a WCAG 2.2 AA automated scan of <strong>${url}</strong> and found
    <strong style="color:#c0392b;">${violationCount} violation${violationCount !== 1 ? 's' : ''}</strong>.
    Your full report is attached.
  </p>
  <div style="background:#f4f5f7;border-left:4px solid #F2A900;padding:16px 20px;border-radius:4px;margin:24px 0;">
    <p style="font-size:13px;color:#1a1d26;margin:0;line-height:1.7;">
      <strong>Keep in mind:</strong> Automated scans catch roughly 30–40% of accessibility issues.
      Screen reader usability, focus management, and ARIA state announcements require expert manual testing.
    </p>
  </div>
  <p style="font-size:15px;color:#5a5f6e;line-height:1.7;">
    Ready to go deeper?
    <a href="https://qa11ylabs.com/services.html" style="color:#45A29E;font-weight:600;">View full audit options →</a>
  </p>
  <div style="text-align:center;margin:28px 0;">
    <a href="https://qa11ylabs.com/schedule.html" style="background:#66FCF1;color:#0B0C10;font-weight:700;font-size:14px;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;">
      Book a Free Consultation →
    </a>
  </div>
  <hr style="border:none;border-top:1px solid #e0e3ec;margin:24px 0;">
  <p style="font-size:11px;color:#9aa0b0;text-align:center;margin:0;">
    © 2026 QA11Y Labs LLC · Architecting a more inclusive digital world.
  </p>
</div>`;

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa11y-scan-'));
  const pdfPath = path.join(tempDir, filename);
  try {
    fs.writeFileSync(pdfPath, pdfBuffer, { mode: 0o600 });
    return sendAgentMailViaPython({
      to: toEmail,
      replyTo: 'quintin@qa11ylabs.com',
      subject: `Your Accessibility Report — ${host}`,
      html,
      text: `Your accessibility report is ready.\n\nScan of: ${url}\nViolations found: ${violationCount}\n\nFull report attached as PDF.\n\nAutomated scans catch ~30-40% of issues. Book a full audit: qa11ylabs.com/services.html\n\nQA11Y Labs\nquintin@qa11ylabs.com`,
      attachments: [pdfPath],
    });
  } finally {
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (_) {}
  }
}

// ══════════════════════════════════════════════════════════════════════════
// ROUTE REGISTRATION — call this from server.js: registerScanRoutes(app, agentMailClient)
// ══════════════════════════════════════════════════════════════════════════
function registerScanRoutes(app, agentMailClient, AGENTMAIL_INBOX) {

  /**
   * GET /api/scan-stream?url=...&email=...
   * Server-Sent Events — live progress stream
   */
  app.get('/api/scan-stream', async (req, res) => {
    const { url: rawUrl, email, hp_check } = req.query; // hp_check = honeypot

    // ── SSE headers first (so error events are properly streamed) ──────────
    res.setHeader('Content-Type',      'text/event-stream');
    res.setHeader('Cache-Control',     'no-cache');
    res.setHeader('Connection',        'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const sendErr = (msg) => {
      try {
        res.write(`data: ${JSON.stringify({ stage: 'error', message: msg })}\n\n`);
        if (res.flush) res.flush();
      } catch (_) {}
      res.end();
    };

    // ── L3: Honeypot check ───────────────────────────────────────────────
    if (hp_check) {
      // Silent discard — bots don’t need a helpful error message
      console.log('[scan] Honeypot triggered — bot request discarded');
      tgAlert(`🤖 Honeypot triggered\nIP: ${clientIp(req)}`);
      res.end();
      return;
    }

    // ── Basic validation ──────────────────────────────────────────────────
    const url = rawUrl ? normaliseUrl(rawUrl) : null;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!url || !email || !emailRe.test(email)) {
      return sendErr('Invalid URL or email address.');
    }

    // ── SSRF guard: only public websites can be scanned ──────────────────────
    try {
      await assertPublicUrl(url);
    } catch (e) {
      return sendErr('That address can’t be scanned — please use a public website URL.');
    }

    const ip = clientIp(req);

    // ── L2b: Per-IP rate limit ──────────────────────────────────────────────
    if (!ipAllowed(ip)) {
      console.log(`[scan] IP rate limited: ${ip}`);
      tgAlert(`⚠️ IP rate limit hit\nIP: ${ip}`);
      return sendErr('You’ve run several scans recently. Please wait a few minutes before trying again.');
    }

    // ── L4: Email+domain dedup (reservation — NOT a delivery claim) ──────────
    if (reserveDedup(email, url)) {
      const host = new URL(url).hostname;
      console.log(`[scan] Dedup block: ${email} already has a report in flight for ${host}`);
      return sendErr(`You already have a report for ${host} on its way. Check your email — if nothing arrives shortly, try again. Need a deeper audit? Visit qa11ylabs.com/services.html`);
    }

    // ── Browser availability gate ────────────────────────────────────────────
    if (browserOk === false) await verifyBrowser(); // lazy re-check: may have been restored
    if (browserOk === false) {
      return sendErr('Our scanner is temporarily unavailable — the team has been alerted. Please try again shortly.');
    }

    // ── Scan slot: FIFO queue — held until the underlying work terminates ────
    // Disconnects abort the owned work (via scanCtrl); the slot is released
    // in the finally below, after the work has actually settled — never early.
    const slot = acquireScanSlot();
    const scanCtrl = new AbortController();
    let slotHeld = false;
    res.on('close', () => {
      scanCtrl.abort();
      if (!slotHeld) slot.cancel(); // still waiting in queue → leave it
    });
    let queuePosition = 0;
    try {
      queuePosition = await slot.promise;
    } catch (e) {
      if (e && (e.message === 'queue-full' || e.message === 'queue-timeout')) {
        return sendErr('The scanner is very busy right now — please try again in a few minutes.');
      }
      return; // client disconnected while waiting
    }
    slotHeld = true;

    const send = (stage, message, pct, extra = {}) => {
      try {
        res.write(`data: ${JSON.stringify({ stage, message, pct, ...extra })}\n\n`);
        if (res.flush) res.flush();
      } catch (_) {}
    };

    send('init', `Starting scan of ${new URL(url).hostname}…`, 5);
    if (queuePosition > 0) {
      send('queued', `You're #${queuePosition} in the queue — starting your scan shortly…`, 6);
    }

    let emailConfirmed = false;
    try {
      // ── Lighthouse ─────────────────────────────────────────────────
      send('lighthouse', 'Running Lighthouse accessibility score…', 15);
      const lh = await runLighthouse(url, msg => send('lighthouse', msg, 20), { signal: scanCtrl.signal });
      send('lighthouse', `Lighthouse score: ${lh.score !== null ? lh.score + '/100' : 'unavailable'}`, 30);

      // ── axe-core ───────────────────────────────────────────────────
      send('axe', 'Launching browser and running axe-core WCAG 2.2 AA analysis…', 35);
      const axeResult = await withScanTimeout(
        runAxeScan(url, msg => send('axe', msg, 50), { signal: scanCtrl.signal }),
        'axe-core scan',
        scanCtrl
      );
      const violations = sortViolations(axeResult.violations || []);
      const passes     = axeResult.passes || [];
      const pageTitle  = axeResult.pageTitle || new URL(url).hostname;

      send('axe', `Found ${violations.length} violation${violations.length !== 1 ? 's' : ''} across ${passes.length + violations.length} rules checked.`, 60);

      // ── PDF ────────────────────────────────────────────────────────
      send('pdf', 'Generating your branded PDF report…', 70);
      const pdfBuffer = await withScanTimeout(
        buildScanPdf(url, violations, passes, lh, pageTitle),
        'PDF generation',
        scanCtrl
      );
      send('pdf', `PDF ready — ${Math.round(pdfBuffer.length / 1024)}KB`, 80);

      // ── Email ──────────────────────────────────────────────────────
      send('email', `Sending report to ${email}…`, 88);
      const emailResult = await withScanTimeout(
        sendScanEmail(agentMailClient, AGENTMAIL_INBOX, email, url, pdfBuffer, violations.length),
        'report email',
        scanCtrl
      );
      // The mailer accepted the report (submission, not inbox delivery).
      // Only now does the 24h dedup window engage.
      confirmDedup(email, url);
      emailConfirmed = true;
      send('email', `Report sent to ${email}. Reference: ${emailResult.messageId}`, 95);

      // ── Telegram lead alert ────────────────────────────────────────
      const critC = violations.filter(v => v.impact === 'critical').length;
      const serC  = violations.filter(v => v.impact === 'serious').length;
      writeFreeScanLead({
        url,
        email,
        pageTitle,
        lighthouseScore: lh.score,
        violations,
        passes,
        messageId: emailResult.messageId,
        route: 'scan-stream',
      });
      tgAlert(
        `🔍 New Free Scan Lead\n` +
        `URL: ${url}\n` +
        `Email: ${email}\n` +
        `Violations: ${violations.length} (${critC} critical, ${serC} serious)\n` +
        `LH Score: ${lh.score ?? 'N/A'}`
      );

      // ── Top findings for inline display ───────────────────────────
      const topFindings = violations.slice(0, 5).map(v => ({
        remediation:  getRemediation(v.id),
        impact:      v.impact,
        description: v.description,
        id:          v.id,
        nodes:       v.nodes.length,
        helpUrl:     v.helpUrl,
        wcag:        (v.tags || []).filter(t => t.startsWith('wcag')).slice(0, 2).join(', '),
      }));

      send('done', 'Scan complete. Your report is on its way.', 100, {
        results: {
          url,
          pageTitle,
          emailMessageId: emailResult.messageId,
          lighthouseScore:  lh.score,
          totalViolations:  violations.length,
          critical:         critC,
          serious:          serC,
          moderate:         violations.filter(v => v.impact === 'moderate').length,
          minor:            violations.filter(v => v.impact === 'minor').length,
          passes:           passes.length,
          contrastIssues:   lh.contrast,
          topFindings,
        },
      });

    } catch (err) {
      // The scan failed before the mailer accepted the report: free the
      // reservation so the user can retry immediately.
      if (!emailConfirmed) releaseDedup(email, url);
      if (err && err.cancelled) {
        // Client disconnected or scan timed out — the work was aborted and
        // cleaned up; nothing left to send.
        console.log('[scan-stream] Scan cancelled for', url);
        return;
      }
      console.error('[scan-stream] Error:', err.message);
      const userMsg = err.userFacing ? err.message : `Scan failed: ${err.message.slice(0, 120)}. Please try again.`;
      send('error', userMsg);
      tgAlert(`⚠️ Free scan error\nURL: ${url}\nError: ${err.message.slice(0, 100)}`);
    } finally {
      res.end();
      if (slotHeld) { releaseScanSlot(); slotHeld = false; }
    }
  });

  // ── Browser + scanner health (for uptime monitoring) ───────────────────────
  app.get('/api/scan-health', async (req, res) => {
    if (browserOk === null) await verifyBrowser();
    res.json({
      browser: browserOk ? 'ok' : 'unavailable',
      activeScans,
      maxConcurrent: MAX_CONCURRENT,
      queued: queueDepth(),
      uptimeSec: Math.round(process.uptime()),
    });
  });

  // Keep legacy POST endpoint working
  app.post('/api/scan', async (req, res) => {
    const { url: rawUrl, email, hp_check } = req.body || {};

    // L3: honeypot
    if (hp_check) {
      return res.status(400).json({ error: 'Invalid request.' });
    }

    const url    = rawUrl ? normaliseUrl(rawUrl) : null;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!url || !email || !emailRe.test(email)) {
      return res.status(400).json({ error: 'Valid url and email are required.' });
    }

    // SSRF guard: only public websites can be scanned
    try {
      await assertPublicUrl(url);
    } catch (e) {
      return res.status(400).json({ error: 'That address can’t be scanned — please use a public website URL.' });
    }

    const ip = clientIp(req);

    // L2: rate limit
    if (!ipAllowed(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few minutes.' });
    }
    // L4: dedup (reservation — NOT a delivery claim)
    if (reserveDedup(email, url)) {
      const host = new URL(url).hostname;
      return res.status(429).json({ error: `A report for ${host} is already on its way. Check your email.` });
    }

    // Browser availability gate
    if (browserOk === false) await verifyBrowser();
    if (browserOk === false) {
      return res.status(503).json({ error: 'Our scanner is temporarily unavailable — the team has been alerted. Please try again shortly.' });
    }

    // Scan slot: FIFO queue — held until the underlying work terminates.
    // A client disconnect aborts the owned work; the finally below releases
    // the slot only after the work has actually settled.
    const slot = acquireScanSlot();
    const scanCtrl = new AbortController();
    let slotHeld = false;
    // res 'close' (not req): fires when the client connection actually drops.
    res.on('close', () => { scanCtrl.abort(); });
    try {
      await slot.promise;
    } catch (e) {
      return res.status(429).json({ error: 'The scanner is very busy right now. Please try again in a few minutes.' });
    }
    slotHeld = true;
    let emailConfirmed = false;
    try {
      const lh         = await runLighthouse(url, () => {}, { signal: scanCtrl.signal });
      const axeResult  = await withScanTimeout(runAxeScan(url, () => {}, { signal: scanCtrl.signal }), 'axe-core scan', scanCtrl);
      const violations = sortViolations(axeResult.violations || []);
      const passes     = axeResult.passes || [];
      const pageTitle  = axeResult.pageTitle || new URL(url).hostname;
      const pdfBuffer  = await withScanTimeout(buildScanPdf(url, violations, passes, lh, pageTitle), 'PDF generation', scanCtrl);
      const emailResult = await withScanTimeout(
        sendScanEmail(agentMailClient, AGENTMAIL_INBOX, email, url, pdfBuffer, violations.length),
        'report email',
        scanCtrl
      );
      // The mailer accepted the report (submission, not inbox delivery).
      // Only now does the 24h dedup window engage.
      confirmDedup(email, url);
      emailConfirmed = true;
      writeFreeScanLead({
        url,
        email,
        pageTitle,
        lighthouseScore: lh.score,
        violations,
        passes,
        messageId: emailResult.messageId,
        route: 'scan-post',
      });
      tgAlert(`🔍 Free Scan (POST)\nURL: ${url}\nEmail: ${email}\nViolations: ${violations.length}`);
      return res.json({ success: true, violations: violations.length, passes: passes.length, message_id: emailResult.messageId });
    } catch (err) {
      if (!emailConfirmed) releaseDedup(email, url);
      if (err && err.cancelled) return; // client disconnected; work was aborted
      console.error('[scan POST] Error:', err.message);
      const status = err.userFacing ? 503 : 500;
      const msg = err.userFacing ? err.message : 'Scan failed. Please try again.';
      return res.status(status).json({ error: msg });
    } finally {
      if (slotHeld) { releaseScanSlot(); slotHeld = false; }
    }
  });
}

module.exports = {
  registerScanRoutes,
  _internal: {
    buildScanPdf,
    sortViolations,
    // Test seams (no production calls — pure/stateful units only):
    // IP helpers come from the pure lib (./lib/ip-policy.js); bound here to
    // the module's TRUSTED_PROXIES so tests exercise the same wiring as prod.
    ipInCidr: ipPolicy.ipInCidr,
    isTrustedProxy: (ip) => ipPolicy.isTrustedProxy(ip, TRUSTED_PROXIES),
    clientIp,
    normalizeIp: ipPolicy.normalizeIp,
    ipPolicy, // the pure module itself, for direct unit tests
    isPrivateIp,
    hostIsPublic,
    assertPublicUrl,
    createRequestGuard,
    acquireScanSlot,
    releaseScanSlot,
    queueDepth,
    withScanTimeout,
    dedupKey,
    reserveDedup,
    confirmDedup,
    releaseDedup,
    lighthouseArgs,
    parseLighthouseOutput,
    runLighthouse,
    runAxeScan,
    allowNoSandbox,
    cancelledError,
  },
};
