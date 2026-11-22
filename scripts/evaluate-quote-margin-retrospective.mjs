import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const MIN_ROWS = 20;
const MAX_ROWS = 10_000;
const MAX_BYTES = 4 * 1024 * 1024;
const MIN_IMPROVEMENT_PERCENT = 30;

class InputError extends Error {}
const fail = (message) => { throw new InputError(message); };

function requireFields(value, keys, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    fail(`${path}: expected an object`);
  }
  const present = Object.keys(value);
  if (present.length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    fail(`${path}: expected exactly these fields: ${keys.join(', ')}`);
  }
}

function hundredths(value, path, minimum) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum || value > 1440) {
    fail(`${path}: expected a finite number from ${minimum} to 1440 minutes`);
  }
  const scaled = Math.round(value * 100);
  if (scaled / 100 !== value) fail(`${path}: use at most two decimal places`);
  return scaled;
}

function parseRun(run, path) {
  requireFields(run, [
    'workMinutes', 'reviewMinutes', 'criticalPricingError', 'criticalScopeError',
  ], path);
  for (const label of ['criticalPricingError', 'criticalScopeError']) {
    if (typeof run[label] !== 'boolean') fail(`${path}.${label}: expected true or false`);
  }
  return {
    minutes100: hundredths(run.workMinutes, `${path}.workMinutes`, 0.01)
      + hundredths(run.reviewMinutes, `${path}.reviewMinutes`, 0.01),
    pricing: Number(run.criticalPricingError),
    scope: Number(run.criticalScopeError),
    any: Number(run.criticalPricingError || run.criticalScopeError),
  };
}

export function evaluate(input) {
  requireFields(input, ['schemaVersion', 'cohort', 'rows'], 'input');
  if (input.schemaVersion !== 1) fail('input.schemaVersion: expected 1');
  if (!['synthetic', 'deidentified-historical'].includes(input.cohort)) {
    fail('input.cohort: expected synthetic or deidentified-historical');
  }
  if (!Array.isArray(input.rows) || input.rows.length < MIN_ROWS || input.rows.length > MAX_ROWS) {
    fail(`input.rows: expected ${MIN_ROWS} to ${MAX_ROWS} paired job rows`);
  }
  const ids = new Set();
  const manual = { minutes100: 0, pricing: 0, scope: 0, any: 0 };
  const assisted = { ...manual };
  for (const [i, row] of input.rows.entries()) {
    const path = `input.rows[${i}]`;
    requireFields(row, ['id', 'manual', 'assisted'], path);
    if (typeof row.id !== 'string' || !/^job-[0-9]{4,8}$/.test(row.id)) {
      fail(`${path}.id: expected an opaque identifier, e.g. job-0001`);
    }
    // Canonicalize digit padding so job-0001 and job-00001 are duplicates.
    const key = Number(row.id.slice(4));
    if (ids.has(key)) fail(`${path}.id: duplicate job identifier`);
    ids.add(key);
    for (const [name, target] of [['manual', manual], ['assisted', assisted]]) {
      const run = parseRun(row[name], `${path}.${name}`);
      for (const field of Object.keys(target)) target[field] += run[field];
    }
  }
  const saved = manual.minutes100 - assisted.minutes100;
  const timeGate = 100 * saved >= MIN_IMPROVEMENT_PERCENT * manual.minutes100;
  const criticalErrorGate = assisted.any === 0;
  const passed = timeGate && criticalErrorGate;
  const summary = (run) => ({
    minutesIncludingReview: run.minutes100 / 100,
    criticalPricingErrorRows: run.pricing,
    criticalScopeErrorRows: run.scope,
    rowsWithAnyCriticalError: run.any,
  });

  return {
    schemaVersion: 1,
    cohortDeclaredByOperator: input.cohort,
    evidence: input.cohort === 'synthetic'
      ? 'Synthetic fixture only. No historical jobs were evaluated.'
      : 'Operator-declared de-identified cohort; provenance and labels were not independently verified.',
    rowsEvaluated: input.rows.length,
    manual: summary(manual),
    assisted: summary(assisted),
    timeSavedMinutes: saved / 100,
    timeImprovementPercent: 100 * saved / manual.minutes100,
    timeGatePassed: timeGate,
    minimumTimeImprovementPercent: MIN_IMPROVEMENT_PERCENT,
    assistedCriticalErrorGatePassed: criticalErrorGate,
    numericGate: passed ? 'pass' : 'fail',
    productionReadinessEstablished: false,
  };
}

export function syntheticFixture() {
  return {
    schemaVersion: 1,
    cohort: 'synthetic',
    rows: Array.from({ length: MIN_ROWS }, (_, i) => {
      const assessment = { criticalPricingError: false, criticalScopeError: false };
      return {
        id: `job-${String(i + 1).padStart(4, '0')}`,
        manual: { workMinutes: 21 + (i % 5), reviewMinutes: 4, ...assessment },
        assisted: { workMinutes: 10 + (i % 3), reviewMinutes: 5, ...assessment },
      };
    }),
  };
}

function readJson(path) {
  // Nonblocking prevents hanging on device-like paths before the regular-file check.
  let fd;
  try {
    fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK);
    const stats = fstatSync(fd);
    if (!stats.isFile() || stats.size > MAX_BYTES) {
      fail('input: expected a regular local JSON file no larger than 4 MiB');
    }
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (count === 0) break;
      length += count;
    }
    if (length > MAX_BYTES) fail('input: file exceeds 4 MiB');
    try {
      return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer.subarray(0, length)));
    } catch {
      fail('input: invalid UTF-8 JSON');
    }
  } catch (error) {
    if (error instanceof InputError) throw error;
    fail('input: could not read the local file');
  } finally {
    if (fd !== undefined) closeSync(fd);
  }
}

function cli(args) {
  try {
    let input;
    if (args.length === 1 && args[0] === '--synthetic') {
      input = syntheticFixture();
    } else if (args.length === 2 && args[0] === '--input' && !args[1].startsWith('--')) {
      input = readJson(args[1]);
    } else {
      fail('Usage: node scripts/evaluate-quote-margin-retrospective.mjs (--synthetic | --input PATH)');
    }
    const result = evaluate(input);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.numericGate === 'pass' ? 0 : 1;
  } catch (error) {
    process.stderr.write(`${error instanceof InputError ? error.message : 'Unexpected evaluator error'}\n`);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = cli(process.argv.slice(2));
}
