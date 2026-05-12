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
 *   L2 — Node in-memory: 5 scans per IP per 10 min + max 2 concurrent scans
 *   L3 — Honeypot field: bots fill it, humans don’t
 *   L4 — Email+domain dedup: same combo blocked for 24 hours
 */

'use strict';

const { execSync, execFileSync } = require('child_process');
const path         = require('path');
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

// ══ ABUSE PROTECTION ════════════════════════════════════════════════════════════════════

// ─ L2: In-memory IP rate limit (5 scans / 10 min per IP) ─────────────────────
// Map: ip → [timestamp, timestamp, ...]
const IP_WINDOW_MS   = 10 * 60 * 1000; // 10 minutes
const IP_MAX_SCANS   = 5;              // max 5 per window
const ipScanTimes    = new Map();      // ip → number[]

function ipAllowed(ip) {
  const now  = Date.now();
  const times = (ipScanTimes.get(ip) || []).filter(t => now - t < IP_WINDOW_MS);
  if (times.length >= IP_MAX_SCANS) return false;
  times.push(now);
  ipScanTimes.set(ip, times);
  return true;
}

// Purge stale IP entries every 15 minutes so the Map doesn’t grow forever
setInterval(() => {
  const cutoff = Date.now() - IP_WINDOW_MS;
  for (const [ip, times] of ipScanTimes.entries()) {
    const fresh = times.filter(t => t > cutoff);
    if (fresh.length === 0) ipScanTimes.delete(ip);
    else ipScanTimes.set(ip, fresh);
  }
}, 15 * 60 * 1000);

// ─ L2: Concurrent scan cap (max 2 simultaneous scans) ───────────────────────
let activeScans = 0;
const MAX_CONCURRENT = 2;

// ─ L4: Email+domain dedup (24-hour TTL) ─────────────────────────────────────
const DEDUP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const dedupStore   = new Map();            // hash → expiresAt

function dedupKey(email, url) {
  const host = (() => { try { return new URL(url).hostname; } catch { return url; } })();
  return crypto.createHash('sha256').update(`${email.toLowerCase()}|${host}`).digest('hex');
}

function isDuplicate(email, url) {
  const key = dedupKey(email, url);
  const exp = dedupStore.get(key);
  if (exp && Date.now() < exp) return true;
  dedupStore.set(key, Date.now() + DEDUP_TTL_MS);
  return false;
}

// Purge expired dedup entries hourly
setInterval(() => {
  const now = Date.now();
  for (const [k, exp] of dedupStore.entries()) {
    if (now >= exp) dedupStore.delete(k);
  }
}, 60 * 60 * 1000);

// ─ Helper: get real client IP (respects X-Forwarded-For from nginx) ─────────
function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

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

// ── axe-core + Playwright scan ─────────────────────────────────────────────
async function runAxeScan(url, onProgress) {
  const { chromium }   = require('playwright');
  const { AxeBuilder } = require('@axe-core/playwright');

  onProgress('Launching browser and navigating to your site…');
  let browser;
  try {
    browser = await chromium.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const ctx  = await browser.newContext({ ignoreHTTPSErrors: true, userAgent: 'QA11YLabsScanner/2.0' });
    const page = await ctx.newPage();
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
  } finally {
    if (browser) await browser.close();
  }
}

// ── Lighthouse score ───────────────────────────────────────────────────────
function runLighthouse(url, onProgress) {
  onProgress('Running Google Lighthouse accessibility score…');
  const outPath = `/tmp/lh-${Date.now()}.json`;
  try {
    execSync(
      `npx lighthouse "${url}" --output=json --output-path=${outPath} ` +
      `--only-categories=accessibility ` +
      `--chrome-flags="--headless --no-sandbox --disable-gpu" ` +
      `--quiet`,
      { timeout: 90_000, stdio: 'pipe' }
    );
    const data  = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    const score = data?.categories?.accessibility?.score != null
      ? Math.round(data.categories.accessibility.score * 100)
      : null;
    const contrast = data?.audits?.['color-contrast']?.details?.items?.length || 0;
    const viewport = data?.audits?.['meta-viewport']?.score === 0 ? 1 : 0;
    return { score, contrast, viewport };
  } catch (e) {
    return { score: null, contrast: 0, viewport: 0 };
  } finally {
    try { fs.unlinkSync(outPath); } catch (_) {}
  }
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
  const match = output.match(/message_id:\s*([A-Za-z0-9._:-]+)/i);
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

    const ip = clientIp(req);

    // ── L2a: Concurrent scan cap ─────────────────────────────────────────────
    if (activeScans >= MAX_CONCURRENT) {
      return sendErr('The scanner is busy right now. Please try again in a minute.');
    }

    // ── L2b: Per-IP rate limit ──────────────────────────────────────────────
    if (!ipAllowed(ip)) {
      console.log(`[scan] IP rate limited: ${ip}`);
      tgAlert(`⚠️ IP rate limit hit\nIP: ${ip}`);
      return sendErr('You’ve run several scans recently. Please wait a few minutes before trying again.');
    }

    // ── L4: Email+domain dedup ───────────────────────────────────────────────
    if (isDuplicate(email, url)) {
      const host = new URL(url).hostname;
      console.log(`[scan] Dedup block: ${email} already scanned ${host} within 24h`);
      return sendErr(`You already have a report for ${host}. Check your email — we sent it within the last 24 hours. Need a deeper audit? Visit qa11ylabs.com/services.html`);
    }

    // activeScans tracking
    activeScans++;
    res.on('close', () => { activeScans = Math.max(0, activeScans - 1); });

    const send = (stage, message, pct, extra = {}) => {
      try {
        res.write(`data: ${JSON.stringify({ stage, message, pct, ...extra })}\n\n`);
        if (res.flush) res.flush();
      } catch (_) {}
    };

    send('init', `Starting scan of ${new URL(url).hostname}…`, 5);

    try {
      // ── Lighthouse ─────────────────────────────────────────────────
      send('lighthouse', 'Running Lighthouse accessibility score…', 15);
      const lh = runLighthouse(url, msg => send('lighthouse', msg, 20));
      send('lighthouse', `Lighthouse score: ${lh.score !== null ? lh.score + '/100' : 'unavailable'}`, 30);

      // ── axe-core ───────────────────────────────────────────────────
      send('axe', 'Launching browser and running axe-core WCAG 2.2 AA analysis…', 35);
      const axeResult = await runAxeScan(url, msg => send('axe', msg, 50));
      const violations = sortViolations(axeResult.violations || []);
      const passes     = axeResult.passes || [];
      const pageTitle  = axeResult.pageTitle || new URL(url).hostname;

      send('axe', `Found ${violations.length} violation${violations.length !== 1 ? 's' : ''} across ${passes.length + violations.length} rules checked.`, 60);

      // ── PDF ────────────────────────────────────────────────────────
      send('pdf', 'Generating your branded PDF report…', 70);
      const pdfBuffer = await buildScanPdf(url, violations, passes, lh, pageTitle);
      send('pdf', `PDF ready — ${Math.round(pdfBuffer.length / 1024)}KB`, 80);

      // ── Email ──────────────────────────────────────────────────────
      send('email', `Sending report to ${email}…`, 88);
      const emailResult = await sendScanEmail(agentMailClient, AGENTMAIL_INBOX, email, url, pdfBuffer, violations.length);
      send('email', `Report delivered to your inbox. Message ID: ${emailResult.messageId}`, 95);

      // ── Telegram lead alert ────────────────────────────────────────
      const critC = violations.filter(v => v.impact === 'critical').length;
      const serC  = violations.filter(v => v.impact === 'serious').length;
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
      console.error('[scan-stream] Error:', err.message);
      send('error', `Scan failed: ${err.message.slice(0, 120)}. Please try again.`);
      tgAlert(`⚠️ Free scan error\nURL: ${url}\nError: ${err.message.slice(0, 100)}`);
    } finally {
      res.end();
    }
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

    const ip = clientIp(req);

    // L2: concurrent + rate
    if (activeScans >= MAX_CONCURRENT) {
      return res.status(429).json({ error: 'Scanner busy. Please try again in a minute.' });
    }
    if (!ipAllowed(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few minutes.' });
    }
    // L4: dedup
    if (isDuplicate(email, url)) {
      const host = new URL(url).hostname;
      return res.status(429).json({ error: `Report for ${host} already sent within 24 hours. Check your email.` });
    }

    activeScans++;
    try {
      const lh         = runLighthouse(url, () => {});
      const axeResult  = await runAxeScan(url, () => {});
      const violations = sortViolations(axeResult.violations || []);
      const passes     = axeResult.passes || [];
      const pageTitle  = axeResult.pageTitle || new URL(url).hostname;
      const pdfBuffer  = await buildScanPdf(url, violations, passes, lh, pageTitle);
      const emailResult = await sendScanEmail(agentMailClient, AGENTMAIL_INBOX, email, url, pdfBuffer, violations.length);
      tgAlert(`🔍 Free Scan (POST)\nURL: ${url}\nEmail: ${email}\nViolations: ${violations.length}`);
      return res.json({ success: true, violations: violations.length, passes: passes.length, message_id: emailResult.messageId });
    } catch (err) {
      console.error('[scan POST] Error:', err.message);
      return res.status(500).json({ error: 'Scan failed. Please try again.' });
    } finally {
      activeScans = Math.max(0, activeScans - 1);
    }
  });
}

module.exports = {
  registerScanRoutes,
  _internal: {
    buildScanPdf,
    sortViolations,
  },
};
