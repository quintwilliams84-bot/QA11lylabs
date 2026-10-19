'use strict';
// Regression tests for the scanner hardening work.
// No network, no browser, no email, no Telegram:
//   - Telegram no-ops without TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.
//   - The mailer (Python subprocess) is never invoked.
//   - Playwright is never loaded.
// Run:  node --test test/        (or: npm test)

process.env.RATE_STORE_PATH = '/tmp/qa11y-test-rate-store.json';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

try { fs.unlinkSync(process.env.RATE_STORE_PATH); } catch (_) {}

const mod = require('../scan_server_patch.js');
const T = mod._internal;

function fakeReq(xff, remote) {
  return { headers: { 'x-forwarded-for': xff }, socket: { remoteAddress: remote } };
}

describe('clientIp — strict trusted-proxy gating', () => {
  it('ignores X-Forwarded-For when the direct peer is untrusted', () => {
    // Attacker connects directly and spoofs the header: must not work.
    const ip = T.clientIp(fakeReq('9.9.9.9', '203.0.113.5'));
    assert.equal(ip, '203.0.113.5');
  });

  it('honors XFF only past trusted proxies (nginx on localhost)', () => {
    const ip = T.clientIp(fakeReq('9.9.9.9, 203.0.0.7', '127.0.0.1'));
    assert.equal(ip, '203.0.0.7');
  });

  it('falls back to the direct peer with no XFF', () => {
    assert.equal(T.clientIp(fakeReq(undefined, '100.101.2.3')), '100.101.2.3');
  });

  it('normalizes ::ffff: mapped addresses', () => {
    assert.equal(T.clientIp(fakeReq(undefined, '::ffff:100.101.2.3')), '100.101.2.3');
  });

  it('returns unknown with no usable address', () => {
    assert.equal(T.clientIp({ headers: {}, socket: {} }), 'unknown');
  });
});

describe('ipInCidr / isTrustedProxy', () => {
  it('matches CIDR ranges', () => {
    assert.equal(T.ipInCidr('100.100.1.1', '100.64.0.0/10'), true);
    assert.equal(T.ipInCidr('10.0.0.5', '100.64.0.0/10'), false);
  });
  it('matches exact IPs and rejects malformed input', () => {
    assert.equal(T.ipInCidr('127.0.0.1', '127.0.0.1'), true);
    assert.equal(T.ipInCidr('999.1.1.1', '100.64.0.0/10'), false);
  });
});

describe('route registration', () => {
  it('registers the scan routes', () => {
    const handlers = {};
    const fakeApp = {
      get: (p, h) => { handlers['GET ' + p] = h; },
      post: (p, h) => { handlers['POST ' + p] = h; },
    };
    mod.registerScanRoutes(fakeApp, null, null);
    assert.ok(handlers['GET /api/scan-stream'], 'scan-stream registered');
    assert.ok(handlers['POST /api/scan'], 'scan POST registered');
    assert.ok(handlers['GET /api/scan-health'], 'scan-health registered');
  });
});
