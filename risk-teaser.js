'use strict';

const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs').promises;
const path = require('path');
const { getRemediation } = require('./remediation-engine');

const DEFAULT_VIEWPORT = { width: 1280, height: 800 };
const HIGH_IMPACTS = new Set(['critical', 'serious']);

function slugify(value) {
  return String(value || 'risk-teaser')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'risk-teaser';
}

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function safeWaitForNetworkIdle(page, timeoutMs = 12000) {
  try {
    await page.waitForLoadState('networkidle', { timeout: timeoutMs });
  } catch (_) {
    // Analytics/chat/polling should not block teaser generation.
  }
}

function summarizeCounts(violations) {
  const byImpact = {};
  for (const violation of violations) {
    byImpact[violation.impact || 'unknown'] = (byImpact[violation.impact || 'unknown'] || 0) + 1;
  }
  return {
    totalViolations: violations.length,
    highImpactViolations: violations.filter((v) => HIGH_IMPACTS.has(v.impact)).length,
    byImpact,
  };
}

function issuePriority(violation) {
  const impactScore = { critical: 1000, serious: 700, moderate: 400, minor: 100 };
  const ruleBoost = {
    'button-name': 100,
    label: 95,
    'input-button-name': 90,
    'link-name': 85,
    'color-contrast': 50,
    'image-alt': 40,
  };
  return (impactScore[violation.impact] || 0) + (ruleBoost[violation.id] || 0) + (violation.nodes?.length || 0);
}

async function findVisibleTarget(page, violations) {
  const candidates = violations
    .filter((violation) => HIGH_IMPACTS.has(violation.impact) && Array.isArray(violation.nodes) && violation.nodes.length)
    .sort((a, b) => issuePriority(b) - issuePriority(a));

  for (const violation of candidates) {
    for (const node of violation.nodes) {
      const targetList = Array.isArray(node.target) ? node.target : [];
      const selector = targetList[0];
      if (!selector) continue;
      const result = await page.evaluate((sel) => {
        try {
          const el = document.querySelector(sel);
          if (!el) return null;
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);
          const visible = rect.width > 0
            && rect.height > 0
            && style.visibility !== 'hidden'
            && style.display !== 'none'
            && Number(style.opacity || 1) !== 0;
          if (!visible) return null;
          return {
            selector: sel,
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || el.textContent || el.value || el.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 160),
            rect: {
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
            },
          };
        } catch (_) {
          return null;
        }
      }, selector);
      if (result) return { violation, node, target: result };
    }
  }
  return null;
}

async function highlightTarget(page, selector) {
  return page.evaluate((sel) => {
    try {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
      el.setAttribute('data-qa11y-risk-highlight', 'true');
      const marker = document.createElement('div');
      marker.setAttribute('data-qa11y-risk-label', 'true');
      marker.textContent = 'QA11Y Labs detected a high-impact accessibility blocker here';
      Object.assign(marker.style, {
        position: 'absolute',
        zIndex: '2147483647',
        background: '#D32F2F',
        color: '#FFFFFF',
        font: '700 16px Arial, sans-serif',
        padding: '8px 12px',
        borderRadius: '6px',
        boxShadow: '0 4px 18px rgba(0,0,0,.35)',
      });
      const rect = el.getBoundingClientRect();
      marker.style.left = `${Math.max(12, window.scrollX + rect.left)}px`;
      marker.style.top = `${Math.max(12, window.scrollY + rect.top - 48)}px`;
      document.body.appendChild(marker);
      Object.assign(el.style, {
        outline: '6px solid #D32F2F',
        outlineOffset: '4px',
        boxShadow: '0 0 0 8px rgba(211,47,47,.18), 0 0 28px rgba(211,47,47,.95)',
        backgroundColor: 'rgba(211,47,47,.10)',
      });
      return true;
    } catch (_) {
      return false;
    }
  }, selector);
}

async function screenshotClipForSelector(page, selector, padding = 90) {
  return page.evaluate(
    ({ sel, pad }) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const x = Math.max(0, Math.floor(rect.left - pad));
      const y = Math.max(0, Math.floor(rect.top - pad));
      const right = Math.min(viewportWidth, Math.ceil(rect.right + pad));
      const bottom = Math.min(viewportHeight, Math.ceil(rect.bottom + pad));
      const minWidth = Math.min(viewportWidth, 760);
      const minHeight = Math.min(viewportHeight, 360);
      let width = Math.max(right - x, minWidth);
      let height = Math.max(bottom - y, minHeight);
      let finalX = Math.max(0, Math.min(x, viewportWidth - width));
      let finalY = Math.max(0, Math.min(y, viewportHeight - height));
      width = Math.min(width, viewportWidth - finalX);
      height = Math.min(height, viewportHeight - finalY);
      return {
        x: finalX,
        y: finalY,
        width,
        height,
      };
    },
    { sel: selector, pad: padding },
  );
}

function buildRiskNarrative(violation, remediation) {
  const rule = violation.id;
  if (['button-name', 'input-button-name'].includes(rule)) {
    return 'If a button has no programmatic name, screen reader users may not know what action they are about to take. On revenue pages, that can block ordering, booking, checkout, or lead submission.';
  }
  if (rule === 'label') {
    return 'If a form control has no programmatic label, customers using screen readers may not know what information to enter. That can break lead forms, checkout fields, appointment requests, and account flows.';
  }
  if (rule === 'link-name') {
    return 'If a link has no accessible name, assistive technology users may hear an empty or meaningless destination. That can hide key navigation paths, contact links, policies, or conversion actions.';
  }
  if (rule === 'color-contrast') {
    return 'Low contrast can make important text difficult to read for customers with low vision, glare sensitivity, aging eyes, or mobile users in bright conditions.';
  }
  if (rule === 'image-alt') {
    return 'Missing image text alternatives can hide product, navigation, or instructional information from screen reader users.';
  }
  return `This issue maps to ${remediation.wcag}. It can create friction for assistive technology users and should be reviewed before assuming the page is accessible.`;
}

function buildPdfHtml({ companyName, url, screenshotDataUri, selected, remediation, summary, generatedAt }) {
  const violation = selected.violation;
  const target = selected.target;
  const riskNarrative = buildRiskNarrative(violation, remediation);
  const legalRisk = 'Accessibility issues can increase exposure under WCAG-based procurement requirements, Section 508 expectations, state accessibility laws, and ADA-related demand letters. This teaser is not legal advice; it is a practical risk signal that should be validated through a full audit.';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>QA11Y Labs Executive Risk Teaser</title>
  <style>
    @page { size: Letter; margin: 0.30in; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: #111827;
      background: #F8FAFC;
      line-height: 1.32;
    }
    .page {
      padding: 14px;
      background: #F8FAFC;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 5px solid #0057B8;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }
    .brand {
      font-size: 24px;
      font-weight: 900;
      color: #0057B8;
      letter-spacing: .04em;
    }
    .tagline {
      color: #475569;
      font-size: 13px;
      margin-top: 3px;
    }
    .badge {
      background: #D32F2F;
      color: #fff;
      font-weight: 800;
      border-radius: 999px;
      padding: 8px 14px;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 24px;
      line-height: 1.12;
      color: #0F172A;
    }
    .lede {
      font-size: 13px;
      color: #334155;
      margin: 0 0 10px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1.05fr .95fr;
      gap: 12px;
      align-items: start;
    }
    .card {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 14px;
      padding: 10px;
      box-shadow: 0 8px 22px rgba(15,23,42,.08);
    }
    .screenshot {
      width: 100%;
      border: 3px solid #D32F2F;
      border-radius: 12px;
      display: block;
    }
    .label {
      color: #64748B;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: .08em;
      margin-bottom: 3px;
    }
    .value {
      font-size: 15px;
      margin-bottom: 12px;
    }
    .risk {
      background: #FFF1F2;
      border-left: 6px solid #D32F2F;
    }
    .fix {
      background: #EFF6FF;
      border-left: 6px solid #0057B8;
    }
    .code {
      font-family: Consolas, "Liberation Mono", monospace;
      font-size: 11px;
      white-space: pre-wrap;
      background: #0F172A;
      color: #E2E8F0;
      border-radius: 9px;
      padding: 7px;
      overflow-wrap: anywhere;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 10px 0;
    }
    .metric {
      background: #FFFFFF;
      border: 1px solid #CBD5E1;
      border-radius: 12px;
      padding: 8px;
      text-align: center;
    }
    .metric strong {
      display: block;
      font-size: 20px;
      color: #D32F2F;
    }
  </style>
</head>
<body>
  <main class="page">
    <section class="header">
      <div>
        <div class="brand">QA11Y LABS</div>
        <div class="tagline">Accessibility evidence for revenue, risk, and remediation decisions</div>
      </div>
      <div class="badge">Executive Risk Teaser</div>
    </section>

    <h1>${escapeHtml(companyName)}: one visible accessibility blocker worth reviewing</h1>
    <p class="lede">A headless browser scan found a high-impact accessibility issue and highlighted the affected element below. This is a teaser snapshot, not a full WCAG audit, but it shows why remediation needs developer-ready evidence.</p>

    <section class="metrics">
      <div class="metric"><strong>${summary.highImpactViolations}</strong>High-impact rules</div>
      <div class="metric"><strong>${escapeHtml(violation.impact || 'unknown')}</strong>Selected impact</div>
      <div class="metric"><strong>${violation.nodes.length}</strong>Affected nodes</div>
    </section>

    <section class="grid">
      <div class="card">
        <div class="label">Visual evidence</div>
        <img class="screenshot" src="${screenshotDataUri}" alt="Highlighted screenshot of detected accessibility blocker">
      </div>
      <div>
        <div class="card risk">
          <div class="label">Detected issue</div>
          <div class="value"><strong>${escapeHtml(violation.id)}</strong>: ${escapeHtml(violation.help || violation.description)}</div>
          <div class="label">WCAG mapping</div>
          <div class="value">${escapeHtml(remediation.wcag)}</div>
          <div class="label">Why it matters</div>
          <div class="value">${escapeHtml(riskNarrative)}</div>
          <div class="label">Risk framing</div>
          <div class="value">${escapeHtml(legalRisk)}</div>
        </div>
        <div class="card fix" style="margin-top: 8px;">
          <div class="label">Developer-ready remediation</div>
          <div class="value">${escapeHtml(remediation.issue)}</div>
          <div class="label">HTML pattern</div>
          <div class="code">${escapeHtml(remediation.htmlFix)}</div>
        </div>
      </div>
    </section>

    <section class="card" style="margin-top: 8px;">
      <div class="label">Evidence details</div>
      <div class="value" style="margin-bottom: 4px;">URL: ${escapeHtml(url)}</div>
      <div class="value" style="margin-bottom: 4px;">Selector: <code>${escapeHtml(target.selector)}</code> | Element: <code>&lt;${escapeHtml(target.tag)}&gt;</code> ${escapeHtml(target.text || '')}</div>
      <div class="value" style="margin-bottom: 0;">Generated: ${escapeHtml(generatedAt)}</div>
    </section>
  </main>
</body>
</html>`;
}

async function generateTeaser(url, companyName, config = {}) {
  const outDir = config.outDir || path.join(__dirname, 'risk-teasers');
  const viewport = config.viewport || DEFAULT_VIEWPORT;
  const generatedAt = new Date().toISOString();
  const base = `${slugify(companyName)}-${timestampForFile()}`;
  await fs.mkdir(outDir, { recursive: true });

  console.log(`\n[System] Booting Risk Teaser Engine for ${companyName}...`);
  const browser = await chromium.launch({ headless: config.headless !== false });
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(config.timeoutMs || 30000);

  try {
    console.log(`[+] Navigating to ${url}...`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: config.timeoutMs || 30000 });
    await safeWaitForNetworkIdle(page);

    console.log('[+] Hunting for Critical/Serious accessibility blockers...');
    const results = await new AxeBuilder({ page })
      .withTags(config.axeTags || ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'])
      .analyze();

    const selected = await findVisibleTarget(page, results.violations);
    const summary = summarizeCounts(results.violations);

    if (!selected) {
      const noFindingPath = path.join(outDir, `${base}-no-visual-high-impact.json`);
      await fs.writeFile(noFindingPath, JSON.stringify({
        generatedAt,
        url,
        companyName,
        summary,
        message: 'No visible critical or serious axe violation was found for a teaser on this page. Try a deeper URL, checkout path, form, menu, modal, or journey state.',
      }, null, 2));
      console.log(`[-] No visible critical/serious issue found. Wrote ${noFindingPath}`);
      return { ok: false, noFindingPath, summary };
    }

    const { violation, node, target } = selected;
    const remediation = getRemediation(violation.id);
    console.log(`[+] Found target: ${violation.id} (${violation.impact}) at ${target.selector}`);

    const highlighted = await highlightTarget(page, target.selector);
    if (!highlighted) throw new Error(`Could not highlight selector: ${target.selector}`);
    await page.waitForTimeout(450);

    const screenshotPath = path.join(outDir, `${base}-evidence.png`);
    const clip = await screenshotClipForSelector(page, target.selector);
    await page.screenshot({ path: screenshotPath, fullPage: false, clip: clip || undefined });
    console.log(`[+] Evidence screenshot saved: ${screenshotPath}`);

    const imgBuffer = await fs.readFile(screenshotPath);
    const screenshotDataUri = `data:image/png;base64,${imgBuffer.toString('base64')}`;
    const html = buildPdfHtml({
      companyName,
      url,
      screenshotDataUri,
      selected,
      remediation,
      summary,
      generatedAt,
    });

    const htmlPath = path.join(outDir, `${base}.html`);
    const pdfPath = path.join(outDir, `${base}.pdf`);
    const jsonPath = path.join(outDir, `${base}.json`);
    await fs.writeFile(htmlPath, html);

    const pdfPage = await context.newPage();
    await pdfPage.setContent(html, { waitUntil: 'load' });
    await pdfPage.pdf({
      path: pdfPath,
      format: 'Letter',
      printBackground: true,
      margin: { top: '0.25in', right: '0.25in', bottom: '0.25in', left: '0.25in' },
    });
    await pdfPage.close();

    const report = {
      ok: true,
      generatedAt,
      companyName,
      url,
      selectedIssue: {
        ruleId: violation.id,
        impact: violation.impact,
        help: violation.help,
        description: violation.description,
        helpUrl: violation.helpUrl,
        selector: target.selector,
        target,
        node: {
          html: node.html,
          failureSummary: node.failureSummary,
          target: node.target,
        },
        wcagMapping: remediation.wcag,
        remediation,
        riskNarrative: buildRiskNarrative(violation, remediation),
      },
      summary,
      files: { screenshotPath, htmlPath, pdfPath, jsonPath },
      screenshot: { clip },
    };
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    console.log(`[+] PDF teaser saved: ${pdfPath}`);
    console.log(`[+] JSON report saved: ${jsonPath}`);
    return report;
  } finally {
    await browser.close();
  }
}

function parseArgs(argv) {
  const args = {
    url: '',
    company: '',
    outDir: path.join(__dirname, 'risk-teasers'),
    headless: true,
    timeoutMs: 30000,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--url' && value) {
      args.url = value;
      i += 1;
    } else if ((key === '--company' || key === '--company-name') && value) {
      args.company = value;
      i += 1;
    } else if (key === '--out-dir' && value) {
      args.outDir = value;
      i += 1;
    } else if (key === '--timeout-ms' && value) {
      args.timeoutMs = Number(value);
      i += 1;
    } else if (key === '--headed') {
      args.headless = false;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
QA11Y Executive Risk Teaser Generator

Usage:
  node risk-teaser.js --url <url> --company <company name> --out-dir <output directory>

Example:
  node risk-teaser.js --url https://example.com --company "Example Co" --out-dir ./risk-teasers
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.url || !args.company) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }
  const report = await generateTeaser(args.url, args.company, args);
  if (!report.ok) process.exitCode = 2;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}

module.exports = {
  generateTeaser,
  findVisibleTarget,
  screenshotClipForSelector,
  buildPdfHtml,
  buildRiskNarrative,
};
