'use strict';
// Synthetic content only. No provider credentials, email, telemetry or app import.
const fs = require('node:fs');
const os = require('node:os');
// Refuse direct invocation in the host namespaces before loading browser code.
if (!process.env.QA11Y_PARENT_NETNS || !process.env.QA11Y_PARENT_PIDNS ||
    fs.readlinkSync('/proc/self/ns/net') === process.env.QA11Y_PARENT_NETNS ||
    fs.readlinkSync('/proc/self/ns/pid') === process.env.QA11Y_PARENT_PIDNS ||
    Object.keys(os.networkInterfaces()).some(name => name !== 'lo')) {
  console.error('FAIL: fresh network/PID namespace isolation required; use manage.py --probe.');
  process.exit(1);
}
const { chromium } = require('playwright');
const { AxeBuilder } = require('@axe-core/playwright');

async function probe() {
  let browser;
  try {
    fs.accessSync(chromium.executablePath(), fs.constants.X_OK);
    browser = await chromium.launch({ chromiumSandbox: true, timeout: 20000 });
    const context = await browser.newContext({ ignoreHTTPSErrors: false });
    // Defense in depth; OS network isolation is enforced by the launcher.
    await context.route('**/*', route => route.abort());
    const diagnostics = await context.newPage();
    diagnostics.setDefaultTimeout(10000);
    await diagnostics.goto('chrome://sandbox');
    const sandbox = await diagnostics.locator('body').innerText();
    if (!/Seccomp-BPF sandbox\s+Yes/i.test(sandbox) ||
        !/(?:Namespace sandbox|SUID sandbox)\s+Yes/i.test(sandbox)) {
      throw new Error('Chromium did not report an active OS sandbox');
    }
    await diagnostics.close();
    // Run axe in a normal page, not the privileged chrome:// diagnostic origin.
    const page = await context.newPage();
    page.setDefaultTimeout(10000);
    await page.setContent('<!doctype html><html lang="en"><head><title>Synthetic fixture</title></head><body><main><h1>Browser readiness</h1><button></button></main></body></html>');
    const result = await new AxeBuilder({ page }).withRules(['button-name']).analyze();
    if (!result.violations.some(v => v.id === 'button-name')) {
      throw new Error('axe did not detect the deliberately unnamed fixture button');
    }
    console.log(JSON.stringify({status: 'pass', chromium: browser.version(),
      playwright: require('playwright/package.json').version,
      axe: require('@axe-core/playwright/package.json').version,
      sandbox: 'verified', tlsVerification: true, syntheticOnly: true}));
  } finally {
    if (browser) await browser.close();
  }
}

probe().catch(() => {
  // Raw launch errors may contain host details. Never retry without sandbox/TLS.
  console.error('FAIL: browser/axe readiness failed. Check the pinned browser download, host libraries and sandbox support. No security bypass was attempted.');
  process.exitCode = 1;
});
