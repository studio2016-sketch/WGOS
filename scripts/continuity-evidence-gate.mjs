/**
 * WGOS offline continuity evidence gate (read-only, no provider calls).
 * This validates an evidence MANIFEST, not the truth of unverified assertions.
 * Never use a PASS as permission to deploy, send messages, or modify data.
 * Usage: node continuity_evidence_gate.mjs manifest.json
 */
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';

export const REQUIRED_SYSTEMS = Object.freeze(['WGOS', 'TradeOS', 'DionnesBoutique']);
const MAX_EVIDENCE_AGE_MS = 2 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 5 * 60 * 1000;
const ref = v => typeof v === 'string' && v.trim().length >= 8 && !/^(none|unknown|pending|n\/a|unverified)$/i.test(v.trim());
const finiteNonnegative = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const time = v => typeof v === 'string' && Number.isFinite(Date.parse(v)) ? Date.parse(v) : NaN;

export function evaluateContinuity(manifest, now = new Date()) {
  const reasons = [];
  const clock = now instanceof Date ? now.getTime() : NaN;
  if (!Number.isFinite(clock)) return {status: 'BLOCKED', reasons: ['INVALID_EVALUATION_CLOCK']};
  if (!manifest || !Array.isArray(manifest.databases) || !manifest.identity || !manifest.delivery || !manifest.release) {
    return {status: 'BLOCKED', reasons: ['MISSING_REQUIRED_SECTIONS']};
  }
  const observed = time(manifest.observed_at_utc);
  if (!Number.isFinite(observed) || observed > clock + FUTURE_SKEW_MS || clock - observed > MAX_EVIDENCE_AGE_MS) {
    reasons.push('EVIDENCE_STALE_OR_INVALID');
  }
  const systems = new Map();
  for (const db of manifest.databases) {
    if (!db || !REQUIRED_SYSTEMS.includes(db.name) || systems.has(db.name)) {
      reasons.push('UNEXPECTED_OR_DUPLICATE_DATABASE');
      continue;
    }
    systems.set(db.name, db);
  }
  for (const name of REQUIRED_SYSTEMS) {
    const d = systems.get(name);
    if (!d) { reasons.push(`${name}:MISSING`); continue; }
    if (d.sql_responded !== true || !ref(d.sql_query_evidence_ref)) reasons.push(`${name}:SQL_UNVERIFIED`);
    const checked = time(d.sql_checked_at_utc);
    if (!Number.isFinite(checked) || checked > clock + FUTURE_SKEW_MS || clock - checked > MAX_EVIDENCE_AGE_MS) reasons.push(`${name}:SQL_STALE`);
    if (d.default_branch_protected !== true) reasons.push(`${name}:BRANCH_UNPROTECTED`);
    const r = d.restore;
    if (!r || r.isolated !== true || r.production_unchanged !== true || r.schema_fingerprint_match !== true ||
        r.critical_records_match !== true || r.authenticated_isolation_passed !== true ||
        !ref(r.operator_approval_ref) || !ref(r.cost_review_ref) || !ref(r.independent_review_ref) ||
        !ref(r.restore_receipt_ref) || !ref(r.source_snapshot_ref) ||
        !finiteNonnegative(r.rpo_minutes) || !finiteNonnegative(r.rto_minutes) ||
        !finiteNonnegative(r.target_rpo_minutes) || !finiteNonnegative(r.target_rto_minutes)) {
      reasons.push(`${name}:RESTORE_CERTIFICATION_MISSING`);
      continue;
    }
    const start = time(r.started_at_utc), end = time(r.completed_at_utc), source = time(r.source_snapshot_at_utc);
    if (![start,end,source].every(Number.isFinite) || source > start || start > end || end > clock + FUTURE_SKEW_MS ||
        clock - end > MAX_EVIDENCE_AGE_MS) reasons.push(`${name}:RESTORE_TIMELINE_INVALID_OR_STALE`);
    if (r.rpo_minutes > r.target_rpo_minutes || r.rto_minutes > r.target_rto_minutes) reasons.push(`${name}:RECOVERY_TARGET_EXCEEDED`);
  }
  if (manifest.databases.length !== REQUIRED_SYSTEMS.length) reasons.push('DATABASE_COVERAGE_INCOMPLETE');
  if (manifest.identity.authenticated_cross_entity_test_passed !== true || !ref(manifest.identity.test_evidence_ref)) {
    reasons.push('ENTITY_ISOLATION_UNVERIFIED');
  }
  const delivery = manifest.delivery;
  if (delivery.provider_delivery_verified !== true || !ref(delivery.provider_receipt_evidence_ref) ||
      delivery.recipient_error_count !== 0 || delivery.idempotency_test_passed !== true ||
      delivery.due_first_test_passed !== true || delivery.business_hours_test_passed !== true ||
      delivery.brand_sender_scope_test_passed !== true) reasons.push('DELIVERY_UNVERIFIED');
  if (manifest.release.owner_approval_for_production !== true || !ref(manifest.release.approval_ref)) {
    reasons.push('PRODUCTION_APPROVAL_MISSING');
  }
  return {
    status: reasons.length ? 'BLOCKED' : 'EVIDENCE_COMPLETE_HUMAN_REVIEW_REQUIRED',
    reasons: [...new Set(reasons)],
    checked_systems: REQUIRED_SYSTEMS.length,
    caveat: 'Manifest assertions are not independent proof. Never deploy or send automatically based on this result.'
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (!process.argv[2]) { console.error('Usage: node continuity_evidence_gate.mjs manifest.json'); process.exitCode = 2; }
  else {
    try {
      const result = evaluateContinuity(JSON.parse(readFileSync(process.argv[2], 'utf8')));
      console.log(JSON.stringify(result, null, 2));
      if (result.status === 'BLOCKED') process.exitCode = 1;
    } catch (err) {
      console.error('BLOCKED: invalid evidence manifest'); process.exitCode = 2;
    }
  }
}
