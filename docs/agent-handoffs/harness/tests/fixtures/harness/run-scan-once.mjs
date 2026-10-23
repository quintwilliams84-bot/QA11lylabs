// Fixture harness (Rev 6): synthetic doubles only. Behaviour via
// env: STUB_FIXTURE_CREATE=1 (docker create through the shim),
// STUB_FIXTURE_RUN=1 (attached docker run through the shim),
// STUB_PLANT_ID (append a foreign id to the ownership record),
// STUB_FIXTURE_TMP_UNRELATED=1 (file in the PARENT of STAGE_TMP),
// STUB_FIXTURE_FLOOD_MB=n (stdout flood), STUB_FIXTURE_SLEEP=n,
// STUB_FIXTURE_NOJOB=1 (skip job.json), STUB_FIXTURE_RESULT.
import { writeFileSync, appendFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.env.STAGE_ROOT;
if (!process.env.STUB_FIXTURE_NOJOB) {
  const stat = readFileSync('/proc/self/stat', 'utf8');
  const starttime = stat.split(' ').slice(21)[0];
  writeFileSync(path.join(root, 'job.json'), JSON.stringify({ pid: process.pid, starttime: Number(starttime) }));
}
if (process.env.STUB_FIXTURE_CREATE) execFileSync('docker', ['create', 'stub-image'], { stdio: 'inherit' });
if (process.env.STUB_FIXTURE_RUN) execFileSync('docker', ['run', 'stub-image'], { stdio: 'inherit' });
if (process.env.STUB_PLANT_ID) appendFileSync(path.join(root, 'owned-containers.txt'), process.env.STUB_PLANT_ID + '\n');
if (process.env.STUB_FIXTURE_TMP_UNRELATED) {
  writeFileSync(path.join(path.dirname(process.env.STAGE_TMP), 'unrelated-new-artifact'), 'not the job\u2019s file');
}
const floodMb = Number(process.env.STUB_FIXTURE_FLOOD_MB || 0);
if (floodMb > 0) {
  const chunk = 'x'.repeat(1024 * 1024);
  for (let i = 0; i < floodMb; i++) process.stdout.write(chunk);
  writeFileSync(path.join(root, 'runtime-file.txt'), 'producer runtime file, must survive intact');
}
const sleepS = Number(process.env.STUB_FIXTURE_SLEEP || 0);
if (sleepS > 0) await new Promise(r => setTimeout(r, sleepS * 1000));
writeFileSync(path.join(root, 'result.json'), JSON.stringify({ overall: process.env.STUB_FIXTURE_RESULT || 'PASS' }));
process.exit(0);
