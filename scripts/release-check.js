'use strict';
/*
 * Release gate (Codex item 5): fail unless every runtime dependency is pinned
 * to an exact version AND a lockfile exists. Called by CI / release tooling
 * before any release is cut. Until the versions are reconciled from the VPS
 * node_modules, this MUST fail — that is the point.
 *
 * Usage: npm run release:check
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));

const bad = Object.entries(pkg.dependencies || {})
  // Reject wildcards (*, x), ranges (^ ~ >= <= > <), tags (latest) — only
  // exact pinned versions pass. Lockfile agreement with the manifest is
  // verified at install time by npm ci; existence alone is the floor, not
  // the proof, and is stated as such.
  .filter(([, v]) => /[*x^~]|>=|<=|>|<|latest/i.test(String(v)));

if (bad.length) {
  console.error('RELEASE BLOCKED — unpinned dependencies: ' +
    bad.map(([k, v]) => `${k}@${v}`).join(', '));
  console.error('Reconcile from the VPS (npm ls --depth=0), pin exact versions, then run: npm install --package-lock-only');
  process.exit(1);
}
if (!fs.existsSync(path.join(root, 'package-lock.json'))) {
  console.error('RELEASE BLOCKED — no package-lock.json. Run: npm install --package-lock-only');
  process.exit(1);
}
console.log('release:check OK — dependencies pinned and locked.');
