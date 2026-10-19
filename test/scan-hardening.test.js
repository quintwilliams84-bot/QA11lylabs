'use strict';
// Direct tests for lib/ip-policy.js — the pure, side-effect-free IP module.
//
// This file does NOT import scan_server_patch.js: that module loads
// /root/.env and starts browser verification at import time, which tests
// must never trigger. The lib has zero imports of its own.
// Run:  node --test test/        (or: npm test)

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ip = require('../lib/ip-policy.js');

// Unique private temp storage per run — never a shared /tmp filename.
// (Reserved for any temp needs; the lib itself writes nothing.)
let tmpDir;
before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa11y-ip-test-')); });
after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

function fakeReq(xff, remote) {
  return { headers: { 'x-forwarded-for': xff }, socket: { remoteAddress: remote } };
}
const TRUSTED = ['127.0.0.1', '::1', '100.64.0.0/10'];

describe('parseIpv4 — octet validation', () => {
  it('accepts valid addresses', () => {
    assert.deepEqual(ip.parseIpv4('100.100.1.1'), [100, 100, 1, 1]);
  });
  it('rejects out-of-range octets (Codex: 356.100.1.1)', () => {
    assert.equal(ip.parseIpv4('356.100.1.1'), null);
    assert.equal(ip.parseIpv4('1.2.3.999'), null);
  });
  it('rejects malformed input', () => {
    assert.equal(ip.parseIpv4('not-an-ip'), null);
    assert.equal(ip.parseIpv4('1.2.3'), null);
    assert.equal(ip.parseIpv4('1.2.3.4.5'), null);
    assert.equal(ip.parseIpv4(''), null);
  });
});

describe('ipInCidr — validated before any bit math', () => {
  it('356.100.1.1 is NOT inside 100.64.0.0/10 (Codex case)', () => {
    assert.equal(ip.ipInCidr('356.100.1.1', '100.64.0.0/10'), false);
  });
  it('matches CIDR ranges', () => {
    assert.equal(ip.ipInCidr('100.100.1.1', '100.64.0.0/10'), true);
    assert.equal(ip.ipInCidr('10.0.0.5', '100.64.0.0/10'), false);
  });
  it('rejects incomplete CIDR syntax', () => {
    assert.equal(ip.ipInCidr('100.100.1.1', '100.64.0.0/'), false);
    assert.equal(ip.ipInCidr('100.100.1.1', '100.64.0.0/33'), false);
    assert.equal(ip.ipInCidr('100.100.1.1', '100.64.0.0/10/extra'), false);
    assert.equal(ip.ipInCidr('100.100.1.1', 'garbage'), false);
  });
  it('exact-match form still validates the candidate', () => {
    assert.equal(ip.ipInCidr('127.0.0.1', '127.0.0.1'), true);
    assert.equal(ip.ipInCidr('127.0.0.1', '127.0.0.2'), false);
    assert.equal(ip.ipInCidr('356.1.1.1', '356.1.1.1'), false);
  });
});

describe('clientIp — trusted-peer gating preserved', () => {
  it('ignores XFF when the direct peer is untrusted (spoof attempt)', () => {
    assert.equal(ip.clientIp(fakeReq('9.9.9.9', '203.0.113.5'), TRUSTED), '203.0.113.5');
  });
  it('honors XFF only past trusted proxies', () => {
    assert.equal(ip.clientIp(fakeReq('9.9.9.9, 203.0.0.7', '127.0.0.1'), TRUSTED), '203.0.0.7');
  });
  it('falls back to the direct peer with no XFF', () => {
    assert.equal(ip.clientIp(fakeReq(undefined, '100.101.2.3'), TRUSTED), '100.101.2.3');
  });
  it('returns unknown with no usable address', () => {
    assert.equal(ip.clientIp({ headers: {}, socket: {} }, TRUSTED), 'unknown');
  });
});

describe('normalizeIp', () => {
  it('strips ::ffff: prefix and brackets', () => {
    assert.equal(ip.normalizeIp('::ffff:100.101.2.3'), '100.101.2.3');
    assert.equal(ip.normalizeIp('[::1]'), '::1');
    assert.equal(ip.normalizeIp('  9.9.9.9 '), '9.9.9.9');
  });
});

describe('isTrustedProxy', () => {
  it('matches list entries by IP or CIDR', () => {
    assert.equal(ip.isTrustedProxy('127.0.0.1', TRUSTED), true);
    assert.equal(ip.isTrustedProxy('100.80.0.1', TRUSTED), true);
    assert.equal(ip.isTrustedProxy('8.8.8.8', TRUSTED), false);
  });
});
