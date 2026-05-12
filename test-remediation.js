'use strict';

const assert = require('assert');
const { getRemediation, attachRemediationToAxeViolation } = require('./remediation-engine.js');

// Simulating an axe-core scan finding a missing label.
const axeScanResult = 'label';
const fix = getRemediation(axeScanResult);

console.log('WCAG:', fix.wcag);
console.log('React Fix:', fix.reactFix);

assert.strictEqual(fix.mapped, true);
assert.match(fix.wcag, /3\.3\.2/);
assert.match(fix.reactFix, /htmlFor="firstName"/);

const unknown = getRemediation('custom-client-rule');
assert.strictEqual(unknown.mapped, false);
assert.strictEqual(unknown.wcag, 'Requires Manual Mapping');

const enriched = attachRemediationToAxeViolation({
  id: 'button-name',
  impact: 'critical',
  nodes: [{ html: '<button><svg></svg></button>' }],
});
assert.strictEqual(enriched.remediation.issue, 'Buttons must have discernible text.');

console.log('All remediation engine smoke tests passed.');
