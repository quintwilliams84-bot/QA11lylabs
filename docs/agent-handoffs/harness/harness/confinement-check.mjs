// Confinement self-check (Rev 5). Runs INSIDE the supervisor's
// systemd scope as phase 1, before the harness and therefore before
// any runner code is imported. It verifies the EFFECTIVE policy from
// inside the scope instead of trusting that the scope was requested:
//   - /usr and /etc mounts read-only (ProtectSystem=strict effect)
//   - cgroup memory.max equals the declared MemoryMax (2 GiB)
//   - private network namespace: no non-loopback interfaces
//   - $STAGE_ROOT writable; /etc and /usr not writable
// Prints one JSON line and exits 0 (PASS) or 66 (FAIL). The wrapper
// starts the harness only on exit 0, and the supervisor independently
// requires this PASS line in the run log before it can report PASS.
import { readFile, access } from 'node:fs/promises';
import { constants } from 'node:fs';

const checks = {};
let ok = true;
const mark = (name, pass, detail) => { checks[name] = { pass, detail }; if (!pass) ok = false; };

try {
  const mounts = await readFile('/proc/self/mountinfo', 'utf8');
  const optFor = (mp) => {
    for (const line of mounts.split('\n')) {
      const f = line.split(' ');
      if (f[4] === mp) return f[5];
    }
    return null;
  };
  for (const mp of ['/usr', '/etc']) {
    const opts = optFor(mp);
    mark(`mount:${mp}`, !!opts && opts.split(',').includes('ro') && !opts.split(',').includes('rw'),
      opts ? `options=${opts}` : 'mount not found');
  }
} catch (e) { mark('mountinfo', false, String(e && e.message || e)); }

try {
  const cg = (await readFile('/proc/self/cgroup', 'utf8')).trim().split('\n').pop().split('::').pop();
  const max = (await readFile(`/sys/fs/cgroup${cg}/memory.max`, 'utf8')).trim();
  mark('cgroup:memory.max', max === '2147483648', `memory.max=${max} (declared 2 GiB)`);
} catch (e) { mark('cgroup:memory.max', false, String(e && e.message || e)); }

try {
  const dev = await readFile('/proc/self/net/dev', 'utf8');
  const ifaces = dev.split('\n').slice(2).map(l => l.split(':')[0].trim()).filter(Boolean);
  const nonLo = ifaces.filter(i => i !== 'lo');
  mark('net:private-namespace', nonLo.length === 0, `interfaces=${ifaces.join(',') || 'none'}`);
} catch (e) { mark('net:private-namespace', false, String(e && e.message || e)); }

const writable = async (p) => { try { await access(p, constants.W_OK); return true; } catch { return false; } };
mark('write:stage-root', await writable(process.env.STAGE_ROOT || ''), 'STAGE_ROOT must be writable');
mark('write:etc-denied', !(await writable('/etc')), '/etc must not be writable');
mark('write:usr-denied', !(await writable('/usr')), '/usr must not be writable');

console.log(JSON.stringify({ confinement: ok ? 'PASS' : 'FAIL', checks }));
process.exit(ok ? 0 : 66);
