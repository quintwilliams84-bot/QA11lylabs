// Confinement self-check (Rev 6). Runs INSIDE the supervisor's
// transient systemd service as phase 1, before the harness and
// therefore before any runner code is imported. It verifies the
// EFFECTIVE policy from inside instead of trusting that it was
// requested:
//   - /usr and /etc mounts read-only (ProtectSystem=strict effect)
//   - cgroup memory.max, cpu.max and pids.max equal the declared
//     MemoryMax (2 GiB), CPUQuota (200%) and TasksMax (512)
//   - private network namespace: no non-loopback interfaces
//   - $STAGE_ROOT and $STAGE_TMP writable (real create/unlink
//     canaries); /etc, /usr and / not writable
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
  const rd = async (n) => (await readFile(`/sys/fs/cgroup${cg}/${n}`, 'utf8')).trim();
  const max = await rd('memory.max');
  mark('cgroup:memory.max', max === '2147483648', `memory.max=${max} (declared 2 GiB)`);
  const cpu = await rd('cpu.max');
  mark('cgroup:cpu.max', cpu === '200000 100000', `cpu.max=${cpu} (declared CPUQuota 200%)`);
  const pids = await rd('pids.max');
  mark('cgroup:pids.max', pids === '512', `pids.max=${pids} (declared TasksMax 512)`);
} catch (e) { mark('cgroup:limits', false, String(e && e.message || e)); }

try {
  const dev = await readFile('/proc/self/net/dev', 'utf8');
  const ifaces = dev.split('\n').slice(2).map(l => l.split(':')[0].trim()).filter(Boolean);
  const nonLo = ifaces.filter(i => i !== 'lo');
  mark('net:private-namespace', nonLo.length === 0, `interfaces=${ifaces.join(',') || 'none'}`);
} catch (e) { mark('net:private-namespace', false, String(e && e.message || e)); }

const writable = async (p) => { try { await access(p, constants.W_OK); return true; } catch { return false; } };
mark('write:etc-denied', !(await writable('/etc')), '/etc must not be writable');
mark('write:usr-denied', !(await writable('/usr')), '/usr must not be writable');
mark('write:root-denied', !(await writable('/')), '/ must not be writable (ProtectSystem=strict)');
// Real writability canaries (create + unlink) for the two
// allowlisted roots: access() alone can lie under some mounts.
import { writeFile, unlink } from 'node:fs/promises';
const canary = async (dir, name) => {
  if (!dir) return false;
  const p = `${dir}/.confinement-canary`;
  try { await writeFile(p, 'x'); await unlink(p); return true; } catch { return false; }
};
mark('write:stage-root', await canary(process.env.STAGE_ROOT || '', 'root'), 'STAGE_ROOT canary create/unlink');
mark('write:stage-tmp', await canary(process.env.STAGE_TMP || '', 'tmp'), 'STAGE_TMP canary create/unlink');

console.log(JSON.stringify({ confinement: ok ? 'PASS' : 'FAIL', checks }));
process.exit(ok ? 0 : 66);
