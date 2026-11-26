import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluate, syntheticFixture } from './evaluate-quote-margin-retrospective.mjs';

function boundaryFixture(assistedReview = 4) {
  const input = syntheticFixture();
  for (const row of input.rows) {
    Object.assign(row.manual, { workMinutes: 15, reviewMinutes: 5 });
    Object.assign(row.assisted, { workMinutes: 10, reviewMinutes: assistedReview });
  }
  return input;
}

test('synthetic cohort is never reported as historical evidence or readiness', () => {
  const result = evaluate(syntheticFixture());
  assert.equal(result.numericGate, 'pass');
  assert.equal(result.rowsEvaluated, 20);
  assert.match(result.evidence, /No historical jobs/);
  assert.equal(result.productionReadinessEstablished, false);
});

test('total-time gate includes both reviews and is inclusive at exactly 30%', () => {
  const result = evaluate(boundaryFixture());
  assert.equal(result.manual.minutesIncludingReview, 400);
  assert.equal(result.assisted.minutesIncludingReview, 280);
  assert.equal(result.timeImprovementPercent, 30);
  assert.equal(result.timeGatePassed, true);
  assert.equal(evaluate(boundaryFixture(4.01)).numericGate, 'fail');
});

test('any assisted critical error blocks passage, regardless of time savings', () => {
  for (const label of ['criticalPricingError', 'criticalScopeError']) {
    const input = boundaryFixture();
    input.rows[0].assisted[label] = true;
    input.rows[1].manual.criticalPricingError = true;
    const result = evaluate(input);
    assert.equal(result.manual.criticalPricingErrorRows, 1);
    assert.equal(result.assisted.rowsWithAnyCriticalError, 1);
    assert.equal(result.timeGatePassed, true);
    assert.equal(result.numericGate, 'fail');
  }
});

test('rejects duplicate and missing pairs, timings, and error labels', () => {
  const alterations = [
    [(x) => x.rows[1].id = x.rows[0].id, /duplicate/],
    [(x) => x.rows[1].id = 'job-00001', /duplicate/],
    [(x) => x.rows.pop(), /20 to/],
    [(x) => delete x.rows[0].assisted, /expected exactly/],
    [(x) => delete x.rows[0].assisted.reviewMinutes, /expected exactly/],
    [(x) => delete x.rows[0].manual.criticalScopeError, /expected exactly/],
    [(x) => x.rows[0].assisted.criticalScopeError = null, /true or false/],
    [(x) => x.rows[0].assisted.reviewMinutes = 0, /finite number/],
    [(x) => x.rows[0].manual.reviewMinutes = Infinity, /finite number/],
    [(x) => x.rows[0].manual.reviewMinutes = 1.123, /decimal places/],
    [(x) => x.rows[0].clientName = 'not allowed', /expected exactly/],
    [(x) => x.rows[0].id = 'not allowed', /opaque identifier/],
  ];
  for (const [alter, expected] of alterations) {
    const input = boundaryFixture();
    alter(input);
    assert.throws(() => evaluate(input), expected);
  }
});

test('CLI distinguishes synthetic, valid gate miss, and malformed input without echoing payload', (t) => {
  const script = fileURLToPath(new URL('./evaluate-quote-margin-retrospective.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
  const synthetic = run('--synthetic');
  assert.equal(synthetic.status, 0);
  assert.match(synthetic.stdout, /Synthetic fixture only/);

  const dir = mkdtempSync(join(tmpdir(), 'wgos-retro-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const path = join(dir, 'input.json');
  const input = boundaryFixture(5);
  input.cohort = 'deidentified-historical';
  writeFileSync(path, JSON.stringify(input));
  const gateMiss = run('--input', path);
  assert.equal(gateMiss.status, 1);
  assert.match(gateMiss.stdout, /provenance and labels were not independently verified/);
  assert.doesNotMatch(gateMiss.stdout, /job-0001/);

  writeFileSync(path, '{"unexpected":SensitiveMarker');
  const malformed = run('--input', path);
  assert.equal(malformed.status, 2);
  assert.match(malformed.stderr, /invalid UTF-8 JSON/);
  assert.doesNotMatch(malformed.stderr, /SensitiveMarker/);
});
