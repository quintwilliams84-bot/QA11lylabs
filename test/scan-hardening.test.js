'use strict';
// Regression tests for the scanner hardening work (Codex review track).
//
// What this exercises: the ACTUAL implementation in scan_server_patch.js —
// queue, dedup state machine, IP/SSRF helpers, timeouts, Lighthouse arg
// building, abort paths. No network, no browser, no email, no Telegram:
//   - Telegram no-ops without TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.
//   - The mailer (Python subprocess) is never invoked.
//   - Playwright is never loaded: abort paths are tested pre-launch.
// Run:  node --test test/        (or: npm test)

process.env.RATE_STORE_PATH = '/tmp/qa11y-test-rate-store.json';
process.env.SCAN_TIMEOUT_MS = '800';
process.env.DEDUP_RESERVE_MS = '60000';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

try { fs.unlinkSync(process.env.RATE_STORE_PATH); } catch (_) {}

const mod = require('../scan_server_patch.js');
const T = mod._internal;

function fakeReq(xff, remote) {
  return { headers: { 'x-forwarded-for': xff }, socket: { remoteAddress: remote } };
}

describe('clientIp — strict trusted-proxy gating (Codex item 1)', () => {
  it('ignores X-Forwarded-For when the direct peer is untrusted', () => {
    // Attacker connects directly and spoofs the header.
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

describe('scan queue — FIFO, bounded, cancellable (Codex items 2+3)', () => {
  it('grants immediate slots, queues the rest in FIFO order', async () => {
    const order = [];
    const mk = (n) => T.acquireScanSlot().promise.then(
      (pos) => order.push([n, pos]),
      (e) => order.push([n, 'ERR:' + e.message])
    );
    const p1 = mk('w1'), p2 = mk('w2'), p3 = mk('w3'), p4 = mk('w4');
    await Promise.all([p1, p2]);
    assert.deepEqual(order, [['w1', 0], ['w2', 0]]);
    assert.equal(T.queueDepth(), 2);
    T.releaseScanSlot();
    await p3;
    assert.deepEqual(order[2], ['w3', 1]);
    T.releaseScanSlot();
    await p4;
    assert.deepEqual(order[3], ['w4', 2]);
    T.releaseScanSlot(); T.releaseScanSlot();
    assert.equal(T.queueDepth(), 0);
  });

  it('rejects with queue-full when the bounded queue is exhausted', async () => {
    const held = [];
    held.push(T.acquireScanSlot()); await held[0].promise;
    held.push(T.acquireScanSlot()); await held[1].promise;
    const real = [];
    for (let i = 0; i < 20; i++) {
      const s = T.acquireScanSlot();
      s.promise.then(() => {}, () => {}); // swallow; we cancel them below
      real.push(s);
    }
    assert.equal(T.queueDepth(), 20);
    const overflow = T.acquireScanSlot();
    await assert.rejects(overflow.promise, /queue-full/);
    real.forEach((s) => s.cancel());
    held.forEach(() => T.releaseScanSlot());
    assert.equal(T.queueDepth(), 0);
  });

  it('cancel removes the waiter and rejects it', async () => {
    const a = T.acquireScanSlot(); await a.promise;
    const b = T.acquireScanSlot(); await b.promise;
    const c = T.acquireScanSlot();
    let outcome = 'pending';
    c.promise.then(() => { outcome = 'resolved'; }, (e) => { outcome = 'rejected:' + e.message; });
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(T.queueDepth(), 1);
    c.cancel();
    await new Promise((r) => setTimeout(r, 20));
    assert.equal(outcome, 'rejected:cancelled');
    assert.equal(T.queueDepth(), 0);
    T.releaseScanSlot(); T.releaseScanSlot();
  });
});

describe('withScanTimeout (Codex item 2)', () => {
  it('resolves fast work normally', async () => {
    const ctrl = new AbortController();
    const v = await T.withScanTimeout(Promise.resolve('ok'), 'fast', ctrl);
    assert.equal(v, 'ok');
    assert.equal(ctrl.signal.aborted, false);
  });

  it('rejects hung work and aborts the controller', async () => {
    const ctrl = new AbortController();
    await assert.rejects(
      T.withScanTimeout(new Promise(() => {}), 'hung stage', ctrl),
      /hung stage timed out/
    );
    assert.equal(ctrl.signal.aborted, true);
  });
});

describe('dedup reserve → confirm → release (Codex item 6)', () => {
  const email = (n) => `dedup-test-${n}-${Date.now()}@example.com`;
  const url = 'https://example.com/page';

  it('reserves, blocks duplicates, releases on failure', () => {
    const e = email('a');
    assert.equal(T.reserveDedup(e, url), false); // fresh reservation
    assert.equal(T.reserveDedup(e, url), true);  // blocked while reserved
    T.releaseDedup(e, url);                      // scan failed → freed
    assert.equal(T.reserveDedup(e, url), false); // can retry immediately
    T.releaseDedup(e, url);
  });

  it('confirm extends the block (mailer accepted the report)', () => {
    const e = email('b');
    assert.equal(T.reserveDedup(e, url), false);
    T.confirmDedup(e, url);
    assert.equal(T.reserveDedup(e, url), true); // still blocked after confirm
    T.releaseDedup(e, url); // test cleanup
  });
});

describe('SSRF helpers (Codex item 4)', () => {
  it('normalizeIp strips brackets and maps ::ffff:', () => {
    assert.equal(T.normalizeIp('[::1]'), '::1');
    assert.equal(T.normalizeIp('::ffff:10.0.0.1'), '10.0.0.1');
    assert.equal(T.normalizeIp('8.8.8.8'), '8.8.8.8');
  });

  it('isPrivateIp catches IPv4-mapped IPv6', () => {
    assert.equal(T.isPrivateIp('::ffff:169.254.169.254'), true);
    assert.equal(T.isPrivateIp('::ffff:8.8.8.8'), false);
    assert.equal(T.isPrivateIp('[::1]'), true);
    assert.equal(T.isPrivateIp('8.8.8.8'), false);
  });

  it('assertPublicUrl rejects localhost without DNS', async () => {
    await assert.rejects(T.assertPublicUrl('http://localhost/x'), /non-public/);
  });

  it('request guard allows data:, blocks file: and non-http(s)', async () => {
    const g = T.createRequestGuard();
    assert.equal(await g.isRequestAllowed('data:text/plain,hi'), true);
    assert.equal(await g.isRequestAllowed('blob:https://x.com/1'), true);
    assert.equal(await g.isRequestAllowed('file:///etc/passwd'), false);
    assert.equal(await g.isRequestAllowed('ftp://example.com/x'), false);
    assert.equal(await g.isRequestAllowed('not a url'), false);
  });

  it('request guard blocks loopback literals', async () => {
    const g = T.createRequestGuard();
    assert.equal(await g.isRequestAllowed('http://127.0.0.1/'), false);
    assert.equal(await g.isRequestAllowed('https://[::1]/'), false);
    assert.equal(await g.isRequestAllowed('http://localhost/'), false);
  });
});

describe('Lighthouse — async, supervised, no shell (Codex item 3)', () => {
  it('builds an argv array with the URL as its own element', () => {
    const hostile = 'https://example.com/$(touch /tmp/pwned)';
    const args = T.lighthouseArgs(hostile, '/tmp/out.json');
    assert.ok(Array.isArray(args));
    assert.equal(args[0], 'lighthouse');
    assert.equal(args[1], hostile); // never interpolated into a shell string
    assert.ok(!args.some((a) => typeof a === 'string' && a.includes('npx lighthouse "')));
  });

  it('parses a synthetic Lighthouse JSON fixture', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-test-'));
    const fp = path.join(dir, 'r.json');
    fs.writeFileSync(fp, JSON.stringify({
      categories: { accessibility: { score: 0.87 } },
      audits: {
        'color-contrast': { details: { items: [{}, {}] } },
        'meta-viewport': { score: 0 },
      },
    }));
    const r = T.parseLighthouseOutput(fp);
    assert.equal(r.score, 87);
    assert.equal(r.contrast, 2);
    assert.equal(r.viewport, 1);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('degrades to nulls on garbage output', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lh-test-'));
    const fp = path.join(dir, 'r.json');
    fs.writeFileSync(fp, 'not json{{{');
    assert.deepEqual(T.parseLighthouseOutput(fp), { score: null, contrast: 0, viewport: 0 });
    assert.deepEqual(T.parseLighthouseOutput('/nonexistent/path.json'), { score: null, contrast: 0, viewport: 0 });
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('aborted signal resolves immediately without spawning', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const r = await T.runLighthouse('https://example.com', () => {}, { signal: ctrl.signal });
    assert.deepEqual(r, { score: null, contrast: 0, viewport: 0 });
  });
});

describe('runAxeScan abort path (Codex item 2)', () => {
  it('throws cancelled before touching Playwright when already aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await assert.rejects(
      T.runAxeScan('https://example.com', () => {}, { signal: ctrl.signal }),
      (e) => e && e.cancelled === true
    );
  });
});

describe('allowNoSandbox (Codex item 5)', () => {
  it('honors the explicit env flag', () => {
    process.env.CHROME_NO_SANDBOX = '1';
    assert.equal(T.allowNoSandbox(), true);
    process.env.CHROME_NO_SANDBOX = '0';
    assert.equal(T.allowNoSandbox(), false);
    delete process.env.CHROME_NO_SANDBOX;
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
