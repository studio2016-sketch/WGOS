import test from 'node:test';
import assert from 'node:assert/strict';
import {isWithinDiscoveryBusinessWindow as allowed} from '../lib/discovery-business-hours.ts';
const cases = [
 ['Friday 8:00am CDT opens', '2026-10-30T13:00:00Z', true],
 ['Friday 5:59pm CDT allowed', '2026-10-30T22:59:00Z', true],
 ['Friday 6:00pm CDT closes', '2026-10-30T23:00:00Z', false],
 ['Friday 11:40pm CDT blocks', '2026-10-31T04:40:00Z', false],
 ['Saturday 9:00am CDT blocks', '2026-10-31T14:00:00Z', false],
 ['Sunday after DST change blocks', '2026-11-01T15:00:00Z', false],
 ['Monday 7:59am CST blocks', '2026-11-02T13:59:00Z', false],
 ['Monday 8:00am CST opens', '2026-11-02T14:00:00Z', true],
 ['Monday 5:59pm CST allowed', '2026-11-02T23:59:00Z', true],
 ['Monday 6:00pm CST closes', '2026-11-03T00:00:00Z', false],
];
for (const [name, time, expected] of cases) test(name, () => assert.equal(allowed(new Date(time)), expected));
test('invalid date fails closed', () => assert.equal(allowed(new Date('invalid')), false));
test('non-Date input fails closed', () => assert.equal(allowed('2026-10-30T13:00:00Z'), false));
