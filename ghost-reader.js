'use strict';

const { chromium } = require('playwright');
const fs = require('fs').promises;
const path = require('path');

function timestampForFile() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function slugify(value) {
  return String(value || 'ghost-reader')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'ghost-reader';
}

async function safeWaitForNetworkIdle(page, timeoutMs = 10000) {
  try {
    await page.waitForLoadState('networkidle', { timeout: timeoutMs });
  } catch (_) {
    // Some sites keep analytics, chat, or polling connections open. Continue.
  }
}

async function waitForDomQuiet(page, quietMs = 400, timeoutMs = 4000) {
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

function formatTranscriptLine(event) {
  const role = event.element?.role || event.element?.tag || 'unknown';
  const selector = event.element?.selector ? ` ${event.element.selector}` : '';
  const message = event.message || event.element?.name || '';
  return `[${event.elapsedSeconds.toFixed(2)}s] [${event.type}] <${role}>${selector} -> "${message}"`;
}

class GhostReader {
  constructor(config = {}) {
    this.headless = config.headless !== undefined ? config.headless : true;
    this.viewport = config.viewport || { width: 1280, height: 720 };
    this.outDir = config.outDir || path.join(__dirname, 'ghost-reader-runs');
    this.defaultTimeoutMs = config.timeoutMs || 30000;
    this.domQuietMs = config.domQuietMs || 400;
    this.domTimeoutMs = config.domTimeoutMs || 4000;
    this.transcript = [];
    this.startTime = Date.now();
    this.browser = null;
    this.context = null;
    this.page = null;
  }

  elapsedSeconds() {
    return (Date.now() - this.startTime) / 1000;
  }

  record(type, element, message, details = {}) {
    const event = {
      index: this.transcript.length + 1,
      elapsedSeconds: this.elapsedSeconds(),
      at: new Date().toISOString(),
      type,
      element: element || {},
      message: String(message || '').trim(),
      details,
    };
    this.transcript.push(event);
    console.log(formatTranscriptLine(event));
    return event;
  }

  async init() {
    this.startTime = Date.now();
    await fs.mkdir(this.outDir, { recursive: true });
    console.log('\n[System] Booting Ghost Reader Interceptor...');
    this.browser = await chromium.launch({ headless: this.headless });
    this.context = await this.browser.newContext({ viewport: this.viewport });
    this.page = await this.context.newPage();
    this.page.setDefaultTimeout(this.defaultTimeoutMs);

    await this.page.exposeFunction('recordA11yEvent', (event) => {
      const payload = event || {};
      return this.record(payload.type, payload.element, payload.message, payload.details);
    });
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  async injectInterceptors() {
    if (!this.page) throw new Error('GhostReader.init() must be called before injectInterceptors().');
    console.log('[+] Injecting MutationObservers, live-region interceptors, and focus trackers...');
    await this.page.evaluate(() => {
      if (window.__qa11yGhostReaderInstalled) return;
      window.__qa11yGhostReaderInstalled = true;

      const safeText = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 500);

      const cssPath = (el) => {
        if (!el || !el.tagName) return '';
        if (el.id) return `#${CSS.escape(el.id)}`;
        const parts = [];
        let current = el;
        while (current && current.nodeType === Node.ELEMENT_NODE && parts.length < 5) {
          let part = current.tagName.toLowerCase();
          if (current.classList && current.classList.length) {
            part += `.${Array.from(current.classList).slice(0, 2).map((c) => CSS.escape(c)).join('.')}`;
          }
          const parent = current.parentElement;
          if (parent) {
            const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
            if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(current) + 1})`;
          }
          parts.unshift(part);
          current = parent;
        }
        return parts.join(' > ');
      };

      const getLabelText = (el) => {
        if (!el) return '';
        if (el.labels && el.labels.length) {
          return Array.from(el.labels).map((label) => label.innerText || label.textContent || '').join(' ');
        }
        if (el.id) {
          const explicit = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
          if (explicit) return explicit.innerText || explicit.textContent || '';
        }
        return '';
      };

      const getAccName = (el) => {
        if (!el || !el.getAttribute) return '';
        const ariaLabel = el.getAttribute('aria-label');
        if (ariaLabel) return ariaLabel;
        const labelledBy = el.getAttribute('aria-labelledby');
        if (labelledBy) {
          const text = labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id))
            .filter(Boolean)
            .map((node) => node.innerText || node.textContent || '')
            .join(' ');
          if (text.trim()) return text;
        }
        const labelText = getLabelText(el);
        if (labelText.trim()) return labelText;
        if (el.getAttribute('title')) return el.getAttribute('title');
        if (el.getAttribute('alt')) return el.getAttribute('alt');
        if (el.value && ['button', 'submit', 'reset'].includes(String(el.type || '').toLowerCase())) return el.value;
        if (el.placeholder) return el.placeholder;
        return el.innerText || el.textContent || '';
      };

      const roleOf = (el) => {
        if (!el || !el.getAttribute) return '';
        return el.getAttribute('role') || el.tagName.toLowerCase();
      };

      const elementInfo = (el) => {
        if (!el || !el.getAttribute) return {};
        const states = {};
        for (const attr of [
          'aria-expanded',
          'aria-checked',
          'aria-selected',
          'aria-pressed',
          'aria-hidden',
          'aria-invalid',
          'aria-disabled',
          'aria-busy',
          'aria-live',
          'role',
        ]) {
          if (el.hasAttribute(attr)) states[attr] = el.getAttribute(attr);
        }
        return {
          tag: el.tagName.toLowerCase(),
          role: roleOf(el),
          name: safeText(getAccName(el)) || 'Unlabeled Element',
          selector: cssPath(el),
          id: el.id || '',
          states,
        };
      };

      const emit = (type, el, message, details = {}) => {
        const payload = {
          type,
          element: elementInfo(el),
          message: safeText(message),
          details,
        };
        window.recordA11yEvent(payload).catch(() => {});
      };

      document.addEventListener('focusin', (event) => {
        const el = event.target;
        const info = elementInfo(el);
        const stateBits = [];
        for (const [key, value] of Object.entries(info.states || {})) {
          if (key.startsWith('aria-')) stateBits.push(`${key.replace('aria-', '')}:${value}`);
        }
        emit('FOCUS', el, `${info.name}${stateBits.length ? ` | ${stateBits.join(' | ')}` : ''}`, {
          stateBits,
        });
      }, true);

      document.addEventListener('focusout', (event) => {
        const el = event.target;
        const info = elementInfo(el);
        emit('BLUR', el, info.name);
      }, true);

      document.addEventListener('click', (event) => {
        const interactive = event.target.closest('button, a, input, select, textarea, [role], [tabindex]');
        if (interactive) emit('CLICK', interactive, elementInfo(interactive).name);
      }, true);

      const liveRegionFor = (node) => {
        const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (!el || !el.closest) return null;
        return el.closest('[aria-live], [role="alert"], [role="status"], [role="log"], [role="marquee"], [role="timer"]');
      };

      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            const liveRegion = liveRegionFor(mutation.target);
            if (liveRegion) {
              const addedText = Array.from(mutation.addedNodes)
                .map((node) => node.innerText || node.textContent || '')
                .join(' ');
              const message = safeText(addedText || liveRegion.innerText || liveRegion.textContent || '');
              if (message) {
                emit('LIVE_REGION', liveRegion, message, {
                  ariaLive: liveRegion.getAttribute('aria-live'),
                  role: liveRegion.getAttribute('role'),
                  addedNodes: mutation.addedNodes.length,
                });
              }
            }
            for (const node of mutation.addedNodes) {
              if (node.nodeType !== Node.ELEMENT_NODE) continue;
              const alert = node.matches?.('[role="alert"], [aria-live]') ? node : node.querySelector?.('[role="alert"], [aria-live]');
              if (alert) {
                const message = safeText(alert.innerText || alert.textContent || '');
                if (message) emit('LIVE_REGION_ADDED', alert, message);
              }
            }
          }

          if (mutation.type === 'characterData') {
            const liveRegion = liveRegionFor(mutation.target);
            if (liveRegion) {
              const message = safeText(liveRegion.innerText || liveRegion.textContent || '');
              if (message) emit('LIVE_REGION_TEXT', liveRegion, message);
            }
          }

          if (mutation.type === 'attributes') {
            const attr = mutation.attributeName;
            if (!attr || !attr.startsWith('aria-')) continue;
            const el = mutation.target;
            const oldValue = mutation.oldValue;
            const newValue = el.getAttribute(attr);
            if (oldValue !== newValue) {
              emit('ARIA_STATE_CHANGE', el, `${attr}: ${oldValue} -> ${newValue}`, {
                attribute: attr,
                oldValue,
                newValue,
              });
            }
          }
        }
      });

      observer.observe(document.documentElement, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeOldValue: true,
        attributeFilter: [
          'aria-expanded',
          'aria-checked',
          'aria-selected',
          'aria-pressed',
          'aria-hidden',
          'aria-invalid',
          'aria-disabled',
          'aria-busy',
          'aria-live',
        ],
      });

      const existingLiveRegions = document.querySelectorAll('[aria-live], [role="alert"], [role="status"], [role="log"]');
      existingLiveRegions.forEach((region) => {
        const message = safeText(region.innerText || region.textContent || '');
        emit('LIVE_REGION_REGISTERED', region, message || 'Empty live region registered', {
          ariaLive: region.getAttribute('aria-live'),
          role: region.getAttribute('role'),
        });
      });
    });
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
      case 'focus':
        await this.page.locator(selector).first().focus();
        break;
      case 'fill':
        await this.page.locator(selector).first().fill(action.value || '');
        break;
      case 'press':
        await this.page.locator(selector || 'body').first().press(action.key);
        break;
      case 'wait':
      case 'waitForTimeout':
        await this.page.waitForTimeout(Number(action.ms || action.waitMs || 500));
        break;
      case 'waitForSelector':
        await this.page.waitForSelector(selector, action.options || {});
        break;
      case 'evaluate':
        if (!action.script) throw new Error('evaluate action requires script');
        await this.page.evaluate(action.script);
        break;
      default:
        throw new Error(`Unsupported Ghost Reader action type: ${type}`);
    }
  }

  async runInterception(url, actions = []) {
    if (!this.page) await this.init();
    console.log(`[+] Navigating to: ${url}`);
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.defaultTimeoutMs });
    await safeWaitForNetworkIdle(this.page);
    await this.injectInterceptors();
    this.record('SESSION_START', { role: 'page', name: url }, `Ghost Reader started for ${url}`);

    const normalizedActions = Array.isArray(actions) ? actions : [actions].filter(Boolean);
    for (const action of normalizedActions) {
      await this.runAction(action);
      await safeWaitForNetworkIdle(this.page, 5000);
      await waitForDomQuiet(this.page, this.domQuietMs, this.domTimeoutMs);
    }

    this.record('SESSION_END', { role: 'page', name: url }, `Ghost Reader captured ${this.transcript.length + 1} events`);
    return this.transcript;
  }

  async saveTranscript(label = 'ghost-reader') {
    await fs.mkdir(this.outDir, { recursive: true });
    const base = `${slugify(label)}-${timestampForFile()}`;
    const jsonPath = path.join(this.outDir, `${base}.json`);
    const txtPath = path.join(this.outDir, `${base}.txt`);
    const mdPath = path.join(this.outDir, `${base}.md`);
    const textLines = this.transcript.map(formatTranscriptLine);
    await fs.writeFile(jsonPath, JSON.stringify({
      generatedAt: new Date().toISOString(),
      eventCount: this.transcript.length,
      transcript: this.transcript,
    }, null, 2));
    await fs.writeFile(txtPath, `${textLines.join('\n')}\n`);
    await fs.writeFile(mdPath, `# Ghost Reader Transcript\n\nGenerated: ${new Date().toISOString()}\n\n\`\`\`text\n${textLines.join('\n')}\n\`\`\`\n`);
    return { jsonPath, txtPath, mdPath };
  }
}

async function loadActions(actionsPath) {
  if (!actionsPath) return [];
  const raw = await fs.readFile(actionsPath, 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed.actions)) return parsed.actions;
  throw new Error('Actions file must be an array or an object with an actions array.');
}

function parseArgs(argv) {
  const args = {
    url: '',
    actions: '',
    outDir: path.join(__dirname, 'ghost-reader-runs'),
    label: 'ghost-reader',
    headless: true,
    timeoutMs: 30000,
  };
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1];
    if (key === '--url' && value) {
      args.url = value;
      i += 1;
    } else if (key === '--actions' && value) {
      args.actions = value;
      i += 1;
    } else if (key === '--out-dir' && value) {
      args.outDir = value;
      i += 1;
    } else if (key === '--label' && value) {
      args.label = value;
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
QA11Y Ghost Reader

Usage:
  node ghost-reader.js --url <url> --actions actions.json --out-dir ./ghost-reader-runs --label demo

Actions JSON:
  [
    {"type": "click", "selector": "#open-menu"},
    {"type": "fill", "selector": "#email", "value": "test@example.com"},
    {"type": "evaluate", "script": "document.querySelector('#status').textContent = 'Saved'"},
    {"type": "wait", "ms": 500}
  ]
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.url) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const actions = await loadActions(args.actions);
  const ghostReader = new GhostReader({
    headless: args.headless,
    outDir: args.outDir,
    timeoutMs: args.timeoutMs,
  });

  try {
    await ghostReader.init();
    await ghostReader.runInterception(args.url, actions);
    const paths = await ghostReader.saveTranscript(args.label);
    console.log('[System] Ghost Reader transcript saved:');
    console.log(`  JSON: ${paths.jsonPath}`);
    console.log(`  Text: ${paths.txtPath}`);
    console.log(`  Markdown: ${paths.mdPath}`);
  } finally {
    await ghostReader.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error);
    process.exit(1);
  });
}

module.exports = {
  GhostReader,
  formatTranscriptLine,
  waitForDomQuiet,
};
