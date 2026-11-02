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
// Draft conservative ceiling; policy and reviewer attestation must be approved before release.
const MAX_RESTORE_VALIDITY_MS = 30 * 24 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 5 * 60 * 1000;
const ref = v => typeof v === 'string' && v.trim().length >= 8 && !/^(none|unknown|pending|n\/a|unverified)$/i.test(v.trim());
const finiteNonnegative = v => typeof v === 'number' && Number.isFinite(v) && v >= 0;
// Accept only explicit UTC ISO-8601 timestamps; reject local-time ambiguity and normalized invalid dates.
const time = v => {
  if (typeof v !== 'string') return NaN;
  const m = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,3}))?Z$/.exec(v);
  if (!m) return NaN;
  const parsed = Date.parse(v);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === `${m[1]}.${(m[2] || '').padEnd(3, '0')}Z` ? parsed : NaN;
};

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
    const incident = time(r.incident_at_utc), recovered = time(r.recovered_data_at_utc);
    const firstApp = time(r.first_authenticated_operation_at_utc), validUntil = time(r.review_valid_until_utc);
    if (![start,end,source,incident,recovered,firstApp,validUntil].every(Number.isFinite) ||
        source > start || recovered > incident || incident > start || start > end || end > firstApp ||
        firstApp > clock + FUTURE_SKEW_MS || validUntil < end ||
        validUntil > end + MAX_RESTORE_VALIDITY_MS || clock > validUntil) {
      reasons.push(`${name}:RESTORE_TIMELINE_INVALID_OR_STALE`);
    }
    // RPO measures lost data from the incident to the last recovered data; RTO measures
    // the incident to the first authenticated application operation, not just DB restoration.
    // One second of rounding tolerance; timestamps and manifest assertions still require review.
    if (Number.isFinite(incident) && Number.isFinite(recovered) && recovered <= incident &&
        r.rpo_minutes * 60_000 + 1_000 < incident - recovered) {
      reasons.push(`${name}:RECOVERY_METRIC_INCONSISTENT`);
    }
    if (Number.isFinite(incident) && Number.isFinite(firstApp) && firstApp >= incident &&
        r.rto_minutes * 60_000 + 1_000 < firstApp - incident) {
      reasons.push(`${name}:RECOVERY_METRIC_INCONSISTENT`);
    }
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
