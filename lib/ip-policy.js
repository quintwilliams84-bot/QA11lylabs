'use strict';
/*
 * ip-policy.js — pure IP-policy helpers for the QA11yLabs scanner.
 *
 * DELIBERATELY side-effect free: no filesystem, no env loading, no browser,
 * no network, no notifications, no imports. Testable by direct require()
 * without touching scan_server_patch.js (which loads /root/.env and starts
 * browser verification at import time).
 */

/** Strip IPv6 brackets and ::ffff: IPv4-mapped prefix. */
function normalizeIp(ip) {
  let s = String(ip || '').trim();
  if (s.startsWith('[') && s.endsWith(']')) s = s.slice(1, -1);
  s = s.replace(/^::ffff:/i, '');
  return s;
}

/**
 * Parse a dotted-quad IPv4 address. Returns [a,b,c,d] or null.
 * Rejects malformed input AND out-of-range octets (e.g. 356.100.1.1).
 */
function parseIpv4(ip) {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(String(ip || ''));
  if (!m) return null;
  const octets = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (octets.some(o => o > 255)) return null;
  return octets;
}

/**
 * True if ip is inside cidr (or equals it when no '/' present).
 * Both sides are fully validated BEFORE any bit math runs.
 *
 * Address families: IPv4 is fully supported (exact + CIDR). IPv6 is
 * supported for EXACT matches only (normalized string equality, so the
 * configured '::1' loopback keeps working). IPv6 CIDRs are rejected
 * clearly — deliberately unsupported, not silently miscomputed.
 */
function ipInCidr(ip, cidr) {
  const cleanIp = normalizeIp(ip);
  if (!cleanIp || !cidr || typeof cidr !== 'string') return false;

  if (!cidr.includes('/')) {
    const cleanCidr = normalizeIp(cidr);
    const v4ip = parseIpv4(cleanIp), v4cidr = parseIpv4(cleanCidr);
    if (v4ip && v4cidr) return cleanIp === cleanCidr; // IPv4 exact match
    if (v4ip || v4cidr) return false; // address-family mismatch
    // IPv6 exact match: require colon syntax on both sides, then compare.
    // Garbage like '356.1.1.1' (invalid IPv4, no colons) never matches.
    if (cleanIp.includes(':') && cleanCidr.includes(':')) return cleanIp === cleanCidr;
    return false;
  }

  // Complete CIDR syntax: exactly one '/', dotted-quad base, 0-32 bits.
  const parts = cidr.split('/');
  if (parts.length !== 2) return false;
  if (!/^\d{1,2}$/.test(parts[1])) return false;
  const bits = Number(parts[1]);
  if (bits < 0 || bits > 32) return false;

  const ipOct = parseIpv4(cleanIp);
  const baseOct = parseIpv4(parts[0]);
  if (!ipOct || !baseOct) return false; // IPv6 CIDR or malformed: reject clearly

  const toInt = o => ((o[0] * 256 + o[1]) * 256 + o[2]) * 256 + o[3];
  const mask = bits === 0 ? 0 : (0xFFFFFFFF - (2 ** (32 - bits) - 1)) >>> 0;
  return ((toInt(ipOct) & mask) >>> 0) === ((toInt(baseOct) & mask) >>> 0);
}

/** True if ip matches any entry in the trusted-proxy list. */
function isTrustedProxy(ip, trustedList) {
  const clean = normalizeIp(ip);
  return (trustedList || []).some(c => ipInCidr(clean, c));
}

/**
 * Resolve the real client IP. X-Forwarded-For is ONLY consulted when the
 * direct peer (req.socket.remoteAddress) is itself a trusted proxy —
 * otherwise the header is attacker-controlled and ignored entirely.
 * trustedProxies: array of IPs / CIDR strings (from the caller's env).
 */
function clientIp(req, trustedProxies) {
  const remote = normalizeIp((req && req.socket && req.socket.remoteAddress) || '');
  if (!isTrustedProxy(remote, trustedProxies)) return remote || 'unknown';
  const fwd = req.headers && req.headers['x-forwarded-for'];
  if (fwd) {
    const chain = String(fwd).split(',').map(s => normalizeIp(s.trim())).filter(Boolean);
    for (let i = chain.length - 1; i >= 0; i--) {
      if (!isTrustedProxy(chain[i], trustedProxies)) return chain[i];
    }
  }
  return remote || 'unknown';
}

module.exports = { normalizeIp, parseIpv4, ipInCidr, isTrustedProxy, clientIp };
