import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateContinuity, REQUIRED_SYSTEMS} from './continuity-evidence-gate.mjs';

const NOW = new Date('2026-10-31T15:50:00Z');
const at = m => new Date(NOW.getTime() + m * 60000).toISOString();
const good = () => ({
  observed_at_utc: at(-2),
  databases: REQUIRED_SYSTEMS.map(name => ({
    name, sql_responded: true, sql_query_evidence_ref: 'sql-evidence-1234', sql_checked_at_utc: at(-2), default_branch_protected: true,
    recovery_source_type: 'scheduled_snapshot', durable_recovery_source_verified: true,
    recovery_source_retention_reviewed: true, recovery_source_evidence_ref: 'backup-evidence-1234', recovery_source_checked_at_utc: at(-2),
    restore: {isolated: true, production_unchanged: true, schema_fingerprint_match: true, critical_records_match: true,
      authenticated_isolation_passed: true, operator_approval_ref: 'approval-1234', cost_review_ref: 'cost-review-1234',
      independent_review_ref: 'review-1234', restore_receipt_ref: 'receipt-1234', source_snapshot_ref: 'snapshot-1234',
      rpo_minutes: 1, rto_minutes: 2, target_rpo_minutes: 5, target_rto_minutes: 10,
      source_snapshot_at_utc: at(-12), incident_at_utc: at(-7), recovered_data_at_utc: at(-8),
      started_at_utc: at(-7), completed_at_utc: at(-5), first_authenticated_operation_at_utc: at(-5),
      review_valid_until_utc: at(10080)}
  })),
  identity: {authenticated_cross_entity_test_passed: true, test_evidence_ref: 'auth-test-1234'},
  delivery: {provider_delivery_verified: true, provider_receipt_evidence_ref: 'receipt-1234', recipient_error_count: 0,
    idempotency_test_passed: true, due_first_test_passed: true, business_hours_test_passed: true, brand_sender_scope_test_passed: true},
  release: {owner_approval_for_production: true, approval_ref: 'approval-1234'}
});
const result = x => evaluateContinuity(x, NOW);
const blocked = (m, reason) => assert.ok(result(m).reasons.includes(reason), `${reason}: ${JSON.stringify(result(m))}`);

test('complete synthetic evidence requires human review, never authorizes deployment', () => {
  assert.equal(result(good()).status, 'EVIDENCE_COMPLETE_HUMAN_REVIEW_REQUIRED');
});
test('empty manifest blocks', () => blocked({}, 'MISSING_REQUIRED_SECTIONS'));
test('missing database blocks', () => { const m=good(); m.databases.pop(); blocked(m,'DionnesBoutique:MISSING'); });
test('duplicate database blocks', () => { const m=good(); m.databases.push(m.databases[0]); blocked(m,'UNEXPECTED_OR_DUPLICATE_DATABASE'); });
test('unknown database blocks', () => { const m=good(); m.databases[0].name='Other'; blocked(m,'UNEXPECTED_OR_DUPLICATE_DATABASE'); });
test('stale manifest blocks', () => { const m=good(); m.observed_at_utc=at(-130); blocked(m,'EVIDENCE_STALE_OR_INVALID'); });
test('future manifest blocks', () => { const m=good(); m.observed_at_utc=at(6); blocked(m,'EVIDENCE_STALE_OR_INVALID'); });
test('SQL response alone insufficient', () => { const m=good(); m.databases[0].restore=null; blocked(m,'WGOS:RESTORE_CERTIFICATION_MISSING'); });
test('missing SQL receipt blocks', () => { const m=good(); m.databases[0].sql_query_evidence_ref=''; blocked(m,'WGOS:SQL_UNVERIFIED'); });
test('stale SQL blocks', () => { const m=good(); m.databases[0].sql_checked_at_utc=at(-130); blocked(m,'WGOS:SQL_STALE'); });
test('unprotected branch blocks', () => { const m=good(); m.databases[0].default_branch_protected=false; blocked(m,'WGOS:BRANCH_UNPROTECTED'); });
test('restore without independent review blocks', () => { const m=good(); m.databases[0].restore.independent_review_ref='pending'; blocked(m,'WGOS:RESTORE_CERTIFICATION_MISSING'); });
test('restore without cost review blocks', () => { const m=good(); m.databases[0].restore.cost_review_ref=''; blocked(m,'WGOS:RESTORE_CERTIFICATION_MISSING'); });
test('restore without entity isolation blocks', () => { const m=good(); m.databases[0].restore.authenticated_isolation_passed=false; blocked(m,'WGOS:RESTORE_CERTIFICATION_MISSING'); });
test('restore without critical data match blocks', () => { const m=good(); m.databases[0].restore.critical_records_match=false; blocked(m,'WGOS:RESTORE_CERTIFICATION_MISSING'); });
test('bad restore timeline blocks', () => { const m=good(); m.databases[0].restore.started_at_utc=at(-15); blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE'); });
test('reviewed restore may remain valid beyond two hours without repeated paid drills', () => {
  const m=good(); const r=m.databases[0].restore;
  r.source_snapshot_at_utc=at(-190); r.incident_at_utc=at(-185); r.recovered_data_at_utc=at(-186);
  r.started_at_utc=at(-185); r.completed_at_utc=at(-180); r.first_authenticated_operation_at_utc=at(-180); r.rto_minutes=5;
  assert.equal(result(m).status,'EVIDENCE_COMPLETE_HUMAN_REVIEW_REQUIRED');
});
test('expired restore review blocks', () => { const m=good(); m.databases[0].restore.review_valid_until_utc=at(-1); blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE'); });
test('restore review cannot exceed draft thirty-day ceiling', () => { const m=good(); m.databases[0].restore.review_valid_until_utc=at(31*1440); blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE'); });
test('missing restore review expiry blocks', () => { const m=good(); delete m.databases[0].restore.review_valid_until_utc; blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE'); });
test('RPO over target blocks', () => { const m=good(); m.databases[0].restore.rpo_minutes=6; blocked(m,'WGOS:RECOVERY_TARGET_EXCEEDED'); });
test('RTO over target blocks', () => { const m=good(); m.databases[0].restore.rto_minutes=11; blocked(m,'WGOS:RECOVERY_TARGET_EXCEEDED'); });
test('reported RTO shorter than observed restore duration blocks', () => { const m=good(); m.databases[0].restore.rto_minutes=0; blocked(m,'WGOS:RECOVERY_METRIC_INCONSISTENT'); });
test('reported RTO equal to observed restore duration is accepted', () => { const m=good(); m.databases[0].restore.rto_minutes=2; assert.equal(result(m).status,'EVIDENCE_COMPLETE_HUMAN_REVIEW_REQUIRED'); });

test('reported RPO shorter than incident-to-recovered-data blocks', () => {
  const m=good(); m.databases[0].restore.rpo_minutes=0; blocked(m,'WGOS:RECOVERY_METRIC_INCONSISTENT');
});
test('RTO must include delay before restore and application authentication', () => {
  const m=good(); const r=m.databases[0].restore;
  r.incident_at_utc=at(-10); r.recovered_data_at_utc=at(-11);
  r.first_authenticated_operation_at_utc=at(-4); r.rto_minutes=2;
  blocked(m,'WGOS:RECOVERY_METRIC_INCONSISTENT');
});
test('missing authenticated application recovery timestamp blocks', () => {
  const m=good(); delete m.databases[0].restore.first_authenticated_operation_at_utc;
  blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE');
});
test('recovered data timestamp cannot be after incident', () => {
  const m=good(); m.databases[0].restore.recovered_data_at_utc=at(-6);
  blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE');
});
test('first authenticated operation cannot precede restore completion', () => {
  const m=good(); m.databases[0].restore.first_authenticated_operation_at_utc=at(-6);
  blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE');
});
test('incident cannot occur after restoration begins', () => {
  const m=good(); m.databases[0].restore.incident_at_utc=at(-6);
  blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE');
});
test('non-numeric RTO blocks', () => { const m=good(); m.databases[0].restore.rto_minutes='2'; blocked(m,'WGOS:RESTORE_CERTIFICATION_MISSING'); });
test('missing authenticated isolation blocks', () => { const m=good(); m.identity.authenticated_cross_entity_test_passed=false; blocked(m,'ENTITY_ISOLATION_UNVERIFIED'); });
test('delivery provider error blocks', () => { const m=good(); m.delivery.recipient_error_count=1; blocked(m,'DELIVERY_UNVERIFIED'); });
test('missing provider receipt blocks', () => { const m=good(); m.delivery.provider_receipt_evidence_ref=''; blocked(m,'DELIVERY_UNVERIFIED'); });
test('unverified idempotency blocks', () => { const m=good(); m.delivery.idempotency_test_passed=false; blocked(m,'DELIVERY_UNVERIFIED'); });
test('unverified due-first blocks', () => { const m=good(); m.delivery.due_first_test_passed=false; blocked(m,'DELIVERY_UNVERIFIED'); });
test('unverified business hours blocks', () => { const m=good(); m.delivery.business_hours_test_passed=false; blocked(m,'DELIVERY_UNVERIFIED'); });
test('unverified sender scope blocks', () => { const m=good(); m.delivery.brand_sender_scope_test_passed=false; blocked(m,'DELIVERY_UNVERIFIED'); });
test('missing owner approval blocks', () => { const m=good(); m.release.owner_approval_for_production=false; blocked(m,'PRODUCTION_APPROVAL_MISSING'); });
test('invalid clock blocks', () => assert.ok(evaluateContinuity(good(), new Date('invalid')).reasons.includes('INVALID_EVALUATION_CLOCK')));

test('manifest without explicit UTC zone blocks', () => { const m=good(); m.observed_at_utc='2026-10-31T15:48:00'; blocked(m,'EVIDENCE_STALE_OR_INVALID'); });
test('SQL timestamp with offset instead of UTC Z blocks', () => { const m=good(); m.databases[0].sql_checked_at_utc='2026-10-31T15:48:00+00:00'; blocked(m,'WGOS:SQL_STALE'); });
test('invalid calendar date cannot silently normalize', () => { const m=good(); m.databases[0].restore.completed_at_utc='2026-02-30T12:00:00.000Z'; blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE'); });
test('restore timestamp missing UTC zone blocks', () => { const m=good(); m.databases[0].restore.started_at_utc='2026-10-31T15:43:00'; blocked(m,'WGOS:RESTORE_TIMELINE_INVALID_OR_STALE'); });
test('explicit UTC seconds precision is accepted', () => { const m=good(); m.observed_at_utc='2026-10-31T15:48:00Z'; assert.equal(result(m).status,'EVIDENCE_COMPLETE_HUMAN_REVIEW_REQUIRED'); });

test('SQL response and PITR history alone cannot establish durable backup', () => {
  const m=good(); m.databases[0].durable_recovery_source_verified=false;
  blocked(m,'WGOS:DURABLE_RECOVERY_SOURCE_UNVERIFIED');
});
test('missing durable backup evidence reference blocks', () => {
  const m=good(); m.databases[1].recovery_source_evidence_ref='';
  blocked(m,'TradeOS:DURABLE_RECOVERY_SOURCE_UNVERIFIED');
});
test('stale backup inventory blocks', () => {
  const m=good(); m.databases[2].recovery_source_checked_at_utc=at(-130);
  blocked(m,'DionnesBoutique:DURABLE_RECOVERY_SOURCE_UNVERIFIED');
});
test('PITR-only is not an accepted durable source type', () => {
  const m=good(); m.databases[0].recovery_source_type='pitr_history_only';
  blocked(m,'WGOS:DURABLE_RECOVERY_SOURCE_UNVERIFIED');
});
test('independent backup with verified retention is an acceptable source type', () => {
  const m=good(); m.databases[0].recovery_source_type='independent_backup';
  assert.equal(result(m).status,'EVIDENCE_COMPLETE_HUMAN_REVIEW_REQUIRED');
});
test('unreviewed backup retention blocks', () => {
  const m=good(); m.databases[0].recovery_source_retention_reviewed=false;
  blocked(m,'WGOS:DURABLE_RECOVERY_SOURCE_UNVERIFIED');
});
