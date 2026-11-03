// WGOS staging-only entity boundary contract runner.
// Run: WGOS_ISOLATION_ADAPTER=./private-staging-adapter.mjs node --test tests/entity-boundary.staging.test.mjs
// Adapter MUST implement synthetic staging identities and resource calls; never use production.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const adapterPath = process.env.WGOS_ISOLATION_ADAPTER;
const enabled = process.env.WGOS_STAGING_ISOLATION_APPROVED === 'yes';
if (!enabled || !adapterPath) {
  test('staging authorization and adapter required (fail closed)', () => {
    assert.fail('Set WGOS_STAGING_ISOLATION_APPROVED=yes and WGOS_ISOLATION_ADAPTER to a vetted synthetic staging adapter');
  });
} else {
  const { default: adapter } = await import(adapterPath);
  const required = ['preflight','read','write','search','revoke','cron','crossEntityCommerce','switchEntity','sideEffects'];
  for (const method of required) assert.equal(typeof adapter[method], 'function', 'missing adapter method: ' + method);
  const p = await adapter.preflight();
  assert.equal(p.environment, 'staging');
  assert.equal(p.syntheticOnly, true);
  assert.equal(p.productionDatabase, false);
  assert.equal(p.externalWritesDisabled, true);
  assert.equal(p.mockPayments, true);
  assert.equal(p.mockTrading, true);
  assert.equal(p.mockNotifications, true);
  assert.notEqual(p.entityA, p.entityB);
  const A=p.entityA, B=p.entityB;
  const noLeak = (result) => {
    assert.equal(result.allowed, false);
    assert.equal(result.exposedOtherEntityData, false);
  };
  test('E01 permitted scoped read', async () => {
    const r=await adapter.read({actor:'memberA',entity:A}); assert.equal(r.allowed,true); assert.equal(r.onlyRequestedEntity,true);
  });
  test('E02/E03 direct identifier and tampered entity denied', async () => {
    noLeak(await adapter.read({actor:'memberA',entity:B,via:'direct-id'}));
    noLeak(await adapter.read({actor:'memberA',entity:B,via:'tampered-filter'}));
  });
  test('E04 global search excludes unauthorized records', async () => {
    const r=await adapter.search({actor:'memberA',entities:[A,B]}); assert.equal(r.onlyAuthorizedEntities,true);
  });
  test('E05 cross-entity mutation denied without side effects', async () => {
    const before=await adapter.sideEffects(); noLeak(await adapter.write({actor:'memberA',entity:B})); assert.deepEqual(await adapter.sideEffects(),before);
  });
  test('E06 revoked session denied', async () => {
    await adapter.revoke({actor:'revokedMember'}); noLeak(await adapter.read({actor:'revokedMember',entity:A,via:'old-session'}));
  });
  test('E07 unauthenticated read denied', async () => noLeak(await adapter.read({actor:'anonymous',entity:A})));
  test('E08 cross-entity cron denied without outbound calls', async () => {
    const before=await adapter.sideEffects(); noLeak(await adapter.cron({actor:'serviceA',entity:B})); assert.deepEqual(await adapter.sideEffects(),before);
  });
  test('E11 cross-entity commerce denied without side effects', async () => {
    const before=await adapter.sideEffects(); noLeak(await adapter.crossEntityCommerce({actor:'memberA',entity:B})); assert.deepEqual(await adapter.sideEffects(),before);
  });
  test('E13 explicit owner entity switch reauthorizes', async () => {
    const r=await adapter.switchEntity({actor:'owner',from:A,to:B}); assert.equal(r.reauthorized,true); assert.equal(r.noResidualData,true);
  });
  // E09, E10, E12, E14 require dedicated route/cache/media/recovery fixtures.
  // They remain certification blockers until independently executed.
}
