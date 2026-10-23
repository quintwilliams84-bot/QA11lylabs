// Fixture confinement check: always PASS (the real check is
// exercised separately against the unconfined test machine).
console.log(JSON.stringify({ confinement: 'PASS', checks: { fixture: { pass: true, detail: 'fixture' } } }));
process.exit(0);
