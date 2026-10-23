// Fixture harness for supervisor stub tests. Writes a truthful
// job.json (own pid + /proc starttime), optionally creates a stub
// container through the shim (FIXTURE_CREATE=1), sleeps
// FIXTURE_SLEEP_MS, exits FIXTURE_EXIT.
import { writeFile, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const stat = await readFile(`/proc/${process.pid}/stat`, 'utf8');
const starttime = stat.slice(stat.lastIndexOf(')') + 2).split(' ')[19];
await writeFile(path.join(process.env.STAGE_ROOT, 'job.json'),
  JSON.stringify({ job_id: process.env.STAGE_JOB_ID || 'fixture', pid: process.pid, proc_starttime: starttime }));
if (process.env.FIXTURE_CREATE === '1') {
  execFileSync('docker', ['create', 'fixture-image'], { stdio: 'pipe' });
}
const sleepMs = Number(process.env.FIXTURE_SLEEP_MS || 2000);
await new Promise(r => setTimeout(r, sleepMs));
process.exit(Number(process.env.FIXTURE_EXIT || 0));
