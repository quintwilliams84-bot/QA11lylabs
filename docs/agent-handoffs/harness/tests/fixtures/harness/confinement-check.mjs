// Fixture confinement check for supervisor stub tests: always PASS.
// (The real check is exercised separately against this unconfined
// machine, where it must FAIL - see run-regression.sh case D.)
console.log(JSON.stringify({ confinement: 'PASS', checks: { fixture: { pass: true, detail: 'stub' } } }));
process.exit(0);
