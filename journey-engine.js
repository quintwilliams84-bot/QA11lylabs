'use strict';

const { chromium } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs').promises;
const path = require('path');
const { getRemediation } = require('./remediation-engine');

const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];

function slugify(value) {
  return String(value || 'journey')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'journey';
}

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function selectorFromNode(node) {
  if (!node) return [];
  if (Array.isArray(node.target)) return node.target;
  return [];
}

function processAxeViolation(violation) {
  const remediation = getRemediation(violation.id);
  return {
    ruleId: violation.id,
    impact: violation.impact || 'unknown',
    help: violation.help,
    description: violation.description,
    helpUrl: violation.helpUrl,
    tags: violation.tags || [],
    wcagMapping: remediation.wcag,
    issue: remediation.issue,
    explanation: remediation.explanation,
    remediation: {
      htmlFix: remediation.htmlFix,
      reactFix: remediation.reactFix,
      mapped: remediation.mapped,
      sourceRuleId: remediation.sourceRuleId,
    },
    nodesAffected: (violation.nodes || []).length,
    failedSelectors: (violation.nodes || []).map(selectorFromNode),
    nodeSnippets: (violation.nodes || []).slice(0, 5).map((node) => ({
      target: selectorFromNode(node),
      html: node.html,
      failureSummary: node.failureSummary,
    })),
  };
}

function summarizeViolations(violations) {
  const byImpact = {};
  for (const violation of violations) {
    byImpact[violation.impact] = (byImpact[violation.impact] || 0) + 1;
  }
  return {
    totalViolations: violations.length,
    totalNodesAffected: violations.reduce((sum, violation) => sum + violation.nodesAffected, 0),
    byImpact,
  };
}

async function safeWaitForNetworkIdle(page, timeoutMs) {
  try {
    await page.waitForLoadState('networkidle', { timeout: timeoutMs });
  } catch (_) {
    // Single-page apps, live chat widgets, and analytics can keep the network busy.
    // This engine should still continue after the DOM-stability wait below.
  }
}

async function waitForDomQuiet(page, quietMs = 500, timeoutMs = 5000) {
  await page.evaluate(
    ({ quietMs: innerQuietMs, timeoutMs: innerTimeoutMs }) => new Promise((resolve) => {
      let timer = null;
      const finish = () => {
        observer.disconnect();
        resolve();
      };
      const reset = () => {
        clearTimeout(timer);
        timer = setTimeout(finish, innerQuietMs);
      };
      const observer = new MutationObserver(reset);
      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        characterData: true,
      });
      reset();
      setTimeout(finish, innerTimeoutMs);
    }),
    { quietMs, timeoutMs },
  );
}

async function getStateSnapshot(page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    const title = document.title || '';
    const url = location.href;
    const activeInfo = active ? {
      tag: active.tagName ? active.tagName.toLowerCase() : '',
      id: active.id || '',
      role: active.getAttribute ? active.getAttribute('role') : null,
      ariaExpanded: active.getAttribute ? active.getAttribute('aria-expanded') : null,
      ariaHidden: active.getAttribute ? active.getAttribute('aria-hidden') : null,
      ariaLabel: active.getAttribute ? active.getAttribute('aria-label') : null,
      text: (active.innerText || active.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160),
    } : null;
    return { url, title, activeElement: activeInfo };
  });
}

class DynamicJourneyScanner {
  constructor(config = {}) {
    this.headless = config.headless !== undefined ? config.headless : true;
    this.reportDir = config.reportDir || path.join(__dirname, 'journey-reports');
    this.viewport = config.viewport || { width: 1280, height: 720 };
    this.defaultTimeoutMs = config.timeoutMs || 30000;
    this.domQuietMs = config.domQuietMs || 500;
    this.domTimeoutMs = config.domTimeoutMs || 5000;
    this.axeTags = config.axeTags || DEFAULT_TAGS;
    this.browser = null;
    this.context = null;
    this.page = null;
    this.journeyResults = [];
    this.consoleMessages = [];
  }

  async init() {
    console.log(`[System] Initializing Chromium (Headless: ${this.headless})...`);
    this.browser = await chromium.launch({ headless: this.headless });
    this.context = await this.browser.newContext({
      viewport: this.viewport,
      acceptDownloads: true,
    });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.defaultTimeoutMs);
    this.page.on('console', (message) => {
      this.consoleMessages.push({
        type: message.type(),
        text: message.text(),
        location: message.location(),
      });
    });
    await fs.mkdir(this.reportDir, { recursive: true });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  async settle() {
    await safeWaitForNetworkIdle(this.page, Math.min(this.defaultTimeoutMs, 10000));
    await waitForDomQuiet(this.page, this.domQuietMs, this.domTimeoutMs);
  }

  async runAction(action) {
    if (!action) return;
    if (typeof action === 'function') {
      await action(this.page);
      return;
    }

    const type = action.type || action.action;
    const selector = action.selector;
    switch (type) {
      case 'goto':
        await this.page.goto(action.url, {
          waitUntil: action.waitUntil || 'domcontentloaded',
          timeout: action.timeoutMs || this.defaultTimeoutMs,
        });
        break;
      case 'click':
        await this.page.locator(selector).first().click(action.options || {});
        break;
      case 'fill':
        await this.page.locator(selector).first().fill(action.value || '');
        break;
      case 'press':
        await this.page.locator(selector || 'body').first().press(action.key);
        break;
      case 'select':
      case 'selectOption':
        await this.page.locator(selector).first().selectOption(action.value);
        break;
      case 'check':
        await this.page.locator(selector).first().check();
        break;
      case 'uncheck':
        await this.page.locator(selector).first().uncheck();
        break;
      case 'waitForSelector':
        await this.page.waitForSelector(selector, action.options || {});
        break;
      case 'wait':
      case 'waitForTimeout':
        await this.page.waitForTimeout(Number(action.ms || action.waitMs || 500));
        break;
      case 'evaluate':
        if (!action.script) throw new Error('evaluate action requires script');
        await this.page.evaluate(action.script);
        break;
      default:
        throw new Error(`Unsupported journey action type: ${type}`);
    }
  }

  async executeStep(stepName, actionOrActions) {
    if (!this.page) throw new Error('DynamicJourneyScanner.init() must be called before executeStep().');
    console.log(`\n[+] Executing Journey Step: ${stepName}`);
    const startedAt = new Date().toISOString();
    const actions = Array.isArray(actionOrActions) ? actionOrActions : [actionOrActions].filter(Boolean);
    const step = {
      step: stepName,
      startedAt,
      completedAt: null,
      ok: false,
      url: null,
      title: null,
      state: null,
      summary: null,
      violations: [],
      error: null,
    };

    try {
      for (const action of actions) {
        await this.runAction(action);
        await this.settle();
      }

      console.log(`[+] Injecting axe-core for state: ${stepName}...`);
      const axeResults = await new AxeBuilder({ page: this.page })
        .withTags(this.axeTags)
        .analyze();

      const processedViolations = axeResults.violations.map(processAxeViolation);
      const state = await getStateSnapshot(this.page);
      Object.assign(step, {
        completedAt: new Date().toISOString(),
        ok: true,
        url: state.url,
        title: state.title,
        state,
        summary: summarizeViolations(processedViolations),
        violations: processedViolations,
        axe: {
          passes: axeResults.passes.length,
          incomplete: axeResults.incomplete.length,
          inapplicable: axeResults.inapplicable.length,
          testEngine: axeResults.testEngine,
          testRunner: axeResults.testRunner,
          testEnvironment: axeResults.testEnvironment,
        },
      });
      console.log(`[+] ${stepName}: ${processedViolations.length} violations / ${step.summary.totalNodesAffected} affected nodes`);
    } catch (error) {
      Object.assign(step, {
        completedAt: new Date().toISOString(),
        ok: false,
        error: {
          message: error.message,
          stack: error.stack,
        },
      });
      console.error(`[!] ${stepName} failed: ${error.message}`);
    }

    this.journeyResults.push(step);
    return step;
  }

  async runJourney(journey = {}) {
    if (!journey.name) journey.name = 'Unnamed Journey';
    if (!Array.isArray(journey.steps)) throw new Error('Journey must include a steps array.');
    if (!this.page) await this.init();

    const startedAt = new Date().toISOString();
    console.log(`[System] Running journey: ${journey.name}`);

    for (const step of journey.steps) {
      const stepName = step.name || step.step || step.type || 'Unnamed Step';
      const actions = step.actions || step.action || step;
      await this.executeStep(stepName, actions);
    }

    const completedAt = new Date().toISOString();
    return this.buildReport(journey, startedAt, completedAt);
  }

  buildReport(journey, startedAt, completedAt) {
    const totals = this.journeyResults.reduce(
      (acc, step) => {
        acc.steps += 1;
        if (step.ok) acc.passedSteps += 1;
        else acc.failedSteps += 1;
        acc.violations += step.summary?.totalViolations || 0;
        acc.nodesAffected += step.summary?.totalNodesAffected || 0;
        for (const [impact, count] of Object.entries(step.summary?.byImpact || {})) {
          acc.byImpact[impact] = (acc.byImpact[impact] || 0) + count;
        }
        return acc;
      },
      { steps: 0, passedSteps: 0, failedSteps: 0, violations: 0, nodesAffected: 0, byImpact: {} },
    );

    return {
      engine: 'QA11Y Dynamic User-Journey A11y Engine',
      version: '1.0.0',
      generatedAt: completedAt,
      journey: {
        name: journey.name,
        description: journey.description || '',
        startedAt,
        completedAt,
      },
      config: {
        headless: this.headless,
        viewport: this.viewport,
        axeTags: this.axeTags,
      },
      totals,
      steps: this.journeyResults,
      consoleMessages: this.consoleMessages.slice(-100),
    };
  }

  async saveReport(report, filenameBase = null) {
    const base = filenameBase || `${slugify(report.journey.name)}-${nowStamp()}`;
    const jsonPath = path.join(this.reportDir, `${base}.json`);
    const mdPath = path.join(this.reportDir, `${base}.md`);
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
    await fs.writeFile(mdPath, this.toMarkdown(report));
    return { jsonPath, mdPath };
  }

  toMarkdown(report) {
    const lines = [];
    lines.push(`# Dynamic User-Journey A11y Report: ${report.journey.name}`);
    lines.push('');
    if (report.journey.description) lines.push(`${report.journey.description}\n`);
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Steps executed: ${report.totals.steps}`);
    lines.push(`- Successful steps: ${report.totals.passedSteps}`);
    lines.push(`- Failed steps: ${report.totals.failedSteps}`);
    lines.push(`- Violations: ${report.totals.violations}`);
    lines.push(`- Nodes affected: ${report.totals.nodesAffected}`);
    lines.push(`- By impact: ${JSON.stringify(report.totals.byImpact)}`);
    lines.push('');

    for (const step of report.steps) {
      lines.push(`## Step: ${step.step}`);
      lines.push('');
      lines.push(`- Status: ${step.ok ? 'PASS' : 'FAILED'}`);
      if (step.url) lines.push(`- URL: ${step.url}`);
      if (step.title) lines.push(`- Title: ${step.title}`);
      if (step.state?.activeElement) {
        lines.push(`- Active element: <${step.state.activeElement.tag || 'unknown'}> ${step.state.activeElement.text || ''}`);
      }
      if (step.error) {
        lines.push(`- Error: ${step.error.message}`);
        lines.push('');
        continue;
      }
      lines.push(`- Violations: ${step.summary.totalViolations}`);
      lines.push(`- Nodes affected: ${step.summary.totalNodesAffected}`);
      lines.push('');
      for (const violation of step.violations.slice(0, 10)) {
        lines.push(`### ${violation.ruleId} (${violation.impact})`);
        lines.push('');
        lines.push(`- WCAG: ${violation.wcagMapping}`);
        lines.push(`- Issue: ${violation.issue}`);
        lines.push(`- Explanation: ${violation.explanation}`);
        lines.push(`- Nodes affected: ${violation.nodesAffected}`);
        if (violation.helpUrl) lines.push(`- Reference: ${violation.helpUrl}`);
        lines.push('');
        lines.push('HTML fix:');
        lines.push('```html');
        lines.push(violation.remediation.htmlFix || 'N/A');
        lines.push('```');
        lines.push('');
        lines.push('React fix:');
        lines.push('```jsx');
        lines.push(violation.remediation.reactFix || 'N/A');
        lines.push('```');
        lines.push('');
      }
    }
    return `${lines.join('\n')}\n`;
  }
}

async function loadJourney(journeyPath) {
  const raw = await fs.readFile(journeyPath, 'utf8');
  return JSON.parse(raw);
}

function parseArgs(argv) {
  const args = {
    journey: null,
    reportDir: path.join(__dirname, 'journey-reports'),
    headless: true,
    timeoutMs: 30000,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if ((key === '--journey' || key === '--journey-file') && value) {
      args.journey = value;
      i += 1;
    } else if (key === '--report-dir' && value) {
      args.reportDir = value;
      i += 1;
    } else if (key === '--headed') {
      args.headless = false;
    } else if (key === '--timeout-ms' && value) {
      args.timeoutMs = Number(value);
      i += 1;
    } else if (key === '--help' || key === '-h') {
      args.help = true;
    }
  }
  return args;
}

function printHelp() {
  console.log(`
QA11Y Dynamic User-Journey A11y Engine

Usage:
  node journey-engine.js --journey journey.json --report-dir ./journey-reports

Journey JSON shape:
  {
    "name": "Disclosure smoke test",
    "steps": [
      {"name": "Load page", "actions": [{"type": "goto", "url": "https://example.com"}]},
      {"name": "Open menu", "actions": [{"type": "click", "selector": "button[aria-expanded]"}]}
    ]
  }
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.journey) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const journey = await loadJourney(args.journey);
  const scanner = new DynamicJourneyScanner({
    headless: args.headless,
    reportDir: args.reportDir,
    timeoutMs: args.timeoutMs,
  });

  try {
    await scanner.init();
    const report = await scanner.runJourney(journey);
    const paths = await scanner.saveReport(report);
    console.log('[System] Journey report saved:');
    console.log(`  JSON: ${paths.jsonPath}`);
    console.log(`  Markdown: ${paths.mdPath}`);
    if (report.totals.failedSteps > 0) process.exitCode = 2;
  } finally {
    await scanner.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}

module.exports = {
  DynamicJourneyScanner,
  processAxeViolation,
  summarizeViolations,
  waitForDomQuiet,
};
