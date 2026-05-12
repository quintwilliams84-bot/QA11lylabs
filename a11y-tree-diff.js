'use strict';

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const DEFAULT_URL = 'https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/examples/disclosure-faq/';
const DEFAULT_SELECTOR = 'button[aria-expanded]';

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    selector: DEFAULT_SELECTOR,
    outDir: process.cwd(),
    waitMs: 500,
    timeoutMs: 30000,
    headless: true,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--url' && value) {
      args.url = value;
      i += 1;
    } else if ((key === '--selector' || key === '--action-selector') && value) {
      args.selector = value;
      i += 1;
    } else if (key === '--out-dir' && value) {
      args.outDir = value;
      i += 1;
    } else if (key === '--wait-ms' && value) {
      args.waitMs = Number(value);
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
QA11Y Accessibility Tree Diff Checker

Usage:
  node a11y-tree-diff.js --url <url> --selector <css selector> --out-dir <directory>

Defaults:
  --url       ${DEFAULT_URL}
  --selector  ${DEFAULT_SELECTOR}
  --out-dir   current directory

Examples:
  node a11y-tree-diff.js
  node a11y-tree-diff.js --url https://example.com --selector 'button[aria-expanded]'
`);
}

function ensureOutDir(outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  return outDir;
}

function flattenTree(node, list = [], depth = 0) {
  if (Array.isArray(node)) {
    for (const child of node) flattenTree(child, list, depth);
    return list;
  }
  if (!node) return list;
  list.push({
    depth,
    role: node.role || '',
    name: node.name || '',
    value: node.value,
    checked: node.checked,
    disabled: node.disabled,
    expanded: node.expanded,
    focused: node.focused,
    selected: node.selected,
    pressed: node.pressed,
    level: node.level,
  });
  for (const child of node.children || []) {
    flattenTree(child, list, depth + 1);
  }
  return list;
}

function axValue(value) {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, 'value')) {
    return value.value;
  }
  return value;
}

function axProperty(node, propName) {
  const prop = (node.properties || []).find((item) => item.name === propName);
  return prop ? axValue(prop.value) : undefined;
}

function normaliseCdpAxTree(nodes) {
  return (nodes || [])
    .filter((node) => !node.ignored)
    .map((node) => ({
      role: axValue(node.role) || '',
      name: axValue(node.name) || '',
      value: axValue(node.value),
      checked: axProperty(node, 'checked'),
      disabled: axProperty(node, 'disabled'),
      expanded: axProperty(node, 'expanded'),
      focused: axProperty(node, 'focused'),
      selected: axProperty(node, 'selected'),
      pressed: axProperty(node, 'pressed'),
      level: axProperty(node, 'level'),
      children: [],
    }));
}

async function captureAccessibilityTree(page) {
  if (page.accessibility && typeof page.accessibility.snapshot === 'function') {
    return page.accessibility.snapshot({ interestingOnly: false });
  }

  const session = await page.context().newCDPSession(page);
  const result = await session.send('Accessibility.getFullAXTree');
  await session.detach();
  return {
    role: 'AXTree',
    name: 'Chrome DevTools Protocol Accessibility Tree',
    children: normaliseCdpAxTree(result.nodes),
  };
}

function nodeKey(node) {
  return [node.role, node.name, node.depth].join('::');
}

function compareTrees(treeBefore, treeAfter) {
  const before = flattenTree(treeBefore);
  const after = flattenTree(treeAfter);
  const beforeMap = new Map(before.map((node) => [nodeKey(node), node]));
  const afterMap = new Map(after.map((node) => [nodeKey(node), node]));

  const added = after.filter((node) => !beforeMap.has(nodeKey(node))).slice(0, 50);
  const removed = before.filter((node) => !afterMap.has(nodeKey(node))).slice(0, 50);
  const stateChanges = [];

  for (const [key, beforeNode] of beforeMap.entries()) {
    const afterNode = afterMap.get(key);
    if (!afterNode) continue;
    for (const prop of ['expanded', 'checked', 'pressed', 'selected', 'focused', 'disabled', 'value']) {
      if (beforeNode[prop] !== afterNode[prop]) {
        stateChanges.push({
          role: beforeNode.role,
          name: beforeNode.name,
          property: prop,
          before: beforeNode[prop],
          after: afterNode[prop],
        });
      }
    }
  }

  return {
    beforeNodeCount: before.length,
    afterNodeCount: after.length,
    added,
    removed,
    stateChanges,
  };
}

async function getElementState(page, selector) {
  return page.evaluate((actionSelector) => {
    const active = document.activeElement;
    const target = document.querySelector(actionSelector);

    function describeElement(el) {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName ? el.tagName.toLowerCase() : '',
        id: el.id || 'No ID',
        className: typeof el.className === 'string' ? el.className : '',
        text: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 120),
        role: el.getAttribute('role'),
        ariaExpanded: el.getAttribute('aria-expanded'),
        ariaHidden: el.getAttribute('aria-hidden'),
        ariaControls: el.getAttribute('aria-controls'),
        ariaLabel: el.getAttribute('aria-label'),
        visible: rect.width > 0 && rect.height > 0,
      };
    }

    return {
      active: describeElement(active),
      target: describeElement(target),
      activeIsBody: active === document.body,
      targetContainsFocus: target ? target.contains(active) : false,
    };
  }, selector);
}

function buildFindings(focusState, diff) {
  const findings = [];
  const target = focusState.target || {};
  const active = focusState.active || {};

  if (focusState.activeIsBody) {
    findings.push({
      severity: 'critical',
      rule: 'focus-lost-to-body',
      message:
        'Focus was lost and reset to the body after the interaction. Keyboard users may need to restart navigation from the top of the page.',
    });
  } else {
    findings.push({
      severity: 'pass',
      rule: 'focus-retained',
      message: `Focus is active after the interaction on <${active.tag || 'unknown'}>.`,
    });
  }

  if (target && target.ariaExpanded !== null && target.ariaExpanded !== undefined) {
    findings.push({
      severity: 'pass',
      rule: 'aria-expanded-present',
      message: `Action target exposes aria-expanded="${target.ariaExpanded}".`,
    });
  } else {
    findings.push({
      severity: 'warning',
      rule: 'aria-expanded-missing',
      message:
        'The action target does not expose aria-expanded. If this control opens or collapses content, screen readers may not announce the state change.',
    });
  }

  const expandedChange = diff.stateChanges.find((change) => change.property === 'expanded');
  if (expandedChange) {
    findings.push({
      severity: 'pass',
      rule: 'accessibility-tree-expanded-changed',
      message: `Accessibility Tree expanded state changed from ${expandedChange.before} to ${expandedChange.after}.`,
    });
  } else if (target && target.ariaExpanded !== null && target.ariaExpanded !== undefined) {
    findings.push({
      severity: 'warning',
      rule: 'accessibility-tree-expanded-unchanged',
      message:
        'The DOM target has aria-expanded, but the Accessibility Tree snapshot did not show an expanded-state change. Manual screen reader verification is recommended.',
    });
  }

  return findings;
}

function writeMarkdownReport(report, markdownPath) {
  const lines = [];
  lines.push('# Dynamic Accessibility Tree Diff Report');
  lines.push('');
  lines.push(`URL: ${report.url}`);
  lines.push(`Action selector: \`${report.selector}\``);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Focus and target state');
  lines.push('');
  lines.push(`- Focus landed on: \`<${report.focusState.active?.tag || 'unknown'}>\``);
  lines.push(`- Focus ID: ${report.focusState.active?.id || 'No ID'}`);
  lines.push(`- Focus text: ${report.focusState.active?.text || 'No visible text captured'}`);
  lines.push(`- Target aria-expanded: ${report.focusState.target?.ariaExpanded ?? 'not set'}`);
  lines.push('');
  lines.push('## Findings');
  lines.push('');
  for (const finding of report.findings) {
    lines.push(`- ${finding.severity.toUpperCase()}: ${finding.rule} — ${finding.message}`);
  }
  lines.push('');
  lines.push('## Accessibility Tree changes');
  lines.push('');
  lines.push(`- Before node count: ${report.diff.beforeNodeCount}`);
  lines.push(`- After node count: ${report.diff.afterNodeCount}`);
  lines.push(`- Added nodes captured: ${report.diff.added.length}`);
  lines.push(`- Removed nodes captured: ${report.diff.removed.length}`);
  lines.push(`- State changes captured: ${report.diff.stateChanges.length}`);
  if (report.diff.stateChanges.length) {
    lines.push('');
    lines.push('### State changes');
    lines.push('');
    for (const change of report.diff.stateChanges.slice(0, 25)) {
      lines.push(
        `- ${change.role || 'node'} "${change.name || 'unnamed'}": ${change.property} changed from ${change.before} to ${change.after}`,
      );
    }
  }
  lines.push('');
  fs.writeFileSync(markdownPath, lines.join('\n'));
}

async function testDynamicA11y(url, actionSelector, options = {}) {
  const outDir = ensureOutDir(options.outDir || process.cwd());
  const waitMs = Number(options.waitMs ?? 500);
  const timeoutMs = Number(options.timeoutMs ?? 30000);

  console.log('\n[+] Booting Chromium headless...');
  const browser = await chromium.launch({ headless: options.headless !== false });
  const page = await browser.newPage();
  page.setDefaultTimeout(timeoutMs);

  try {
    console.log(`[+] Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });

    console.log('[+] Capturing initial Accessibility Tree...');
    const treeBefore = await captureAccessibilityTree(page);

    console.log(`[+] Triggering action: Clicking '${actionSelector}'`);
    await page.locator(actionSelector).first().click();
    await page.waitForTimeout(waitMs);

    console.log('[+] Capturing post-action Accessibility Tree...');
    const treeAfter = await captureAccessibilityTree(page);
    const focusState = await getElementState(page, actionSelector);
    const diff = compareTrees(treeBefore, treeAfter);
    const findings = buildFindings(focusState, diff);

    const report = {
      generatedAt: new Date().toISOString(),
      url,
      selector: actionSelector,
      focusState,
      diff,
      findings,
    };

    const beforePath = path.join(outDir, 'tree-before.json');
    const afterPath = path.join(outDir, 'tree-after.json');
    const reportPath = path.join(outDir, 'a11y-tree-diff-report.json');
    const markdownPath = path.join(outDir, 'a11y-tree-diff-report.md');

    fs.writeFileSync(beforePath, JSON.stringify(treeBefore, null, 2));
    fs.writeFileSync(afterPath, JSON.stringify(treeAfter, null, 2));
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    writeMarkdownReport(report, markdownPath);

    console.log('[+] Raw tree data saved:');
    console.log(`    ${beforePath}`);
    console.log(`    ${afterPath}`);
    console.log(`[+] Reports saved:\n    ${reportPath}\n    ${markdownPath}`);

    console.log('\n========================================');
    console.log('      DYNAMIC ACCESSIBILITY REPORT      ');
    console.log('========================================');
    console.log(`Focus Landed On : <${focusState.active?.tag || 'unknown'}> (ID: ${focusState.active?.id || 'No ID'})`);
    console.log(`Visible Text    : "${focusState.active?.text || ''}"`);
    console.log(`Target Text     : "${focusState.target?.text || ''}"`);
    console.log(`aria-expanded   : ${focusState.target?.ariaExpanded ?? 'NOT SET'}`);
    console.log(`Tree Nodes      : ${diff.beforeNodeCount} before / ${diff.afterNodeCount} after`);
    console.log(`State Changes   : ${diff.stateChanges.length}`);
    for (const finding of findings) {
      console.log(`${finding.severity.toUpperCase()}: ${finding.message}`);
    }
    console.log('========================================\n');

    return report;
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  const args = parseArgs(process.argv);
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  testDynamicA11y(args.url, args.selector, args).catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}

module.exports = {
  testDynamicA11y,
  captureAccessibilityTree,
  compareTrees,
  flattenTree,
  buildFindings,
};
