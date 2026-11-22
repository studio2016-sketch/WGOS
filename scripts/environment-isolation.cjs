// Offline validation only. Never logs configuration values or contacts providers.
const policy = require('../config/environment-isolation.json');

function route(env) {
  try {
    const db = new URL(env.DATABASE_URL);
    const auth = new URL(env.NEON_AUTH_BASE_URL);
    const origin = new URL(env.NEON_AUTH_TRUSTED_ORIGIN);
    if (!['postgres:', 'postgresql:'].includes(db.protocol) || !db.hostname.endsWith('.neon.tech')) return null;
    if (auth.protocol !== 'https:' || auth.username || auth.password || auth.search || auth.hash) return null;
    if (origin.protocol !== 'https:' || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') return null;
    const endpointId = db.hostname.split('.')[0].replace(/-pooler$/, '');
    return { endpointId, database: db.pathname, authBaseUrl: auth.href.replace(/\/$/, ''), trustedOrigin: origin.origin };
  } catch { return null; }
}

function assertEnvironmentIsolation(env = process.env, rules = policy) {
  const target = env.VERCEL_TARGET_ENV || env.VERCEL_ENV;
  // Local work is opt-in; recovery rehearsals must set WGOS_ENVIRONMENT=recovery.
  if ((!target || target === 'production') && !['preview', 'recovery'].includes(env.WGOS_ENVIRONMENT)) return;
  if (target === 'development' && env.VERCEL !== '1' && !env.WGOS_ENVIRONMENT) return;
  const reject = () => { throw new Error('WGOS_ENVIRONMENT_ISOLATION_BLOCKED: review nonproduction routes and credentials; no values logged.'); };
  // Disable storage and outbound production capabilities in nonproduction until separately reviewed.
  for (const key of ['BLOB_READ_WRITE_TOKEN', 'SIGNWELL_API_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'CRON_SECRET', 'DISCOVERY_COMMISSION_SECRET', 'DISCOVERY_TOKEN_SECRET', 'WGOS_DISCOVERY_SHARED_SECRET']) {
    if (env[key]) reject();
  }
  if (!env.DATABASE_URL && !env.NEON_AUTH_BASE_URL) return; // Unconfigured UI builds only.
  const actual = route(env);
  if (!actual || rules.productionDatabaseEndpointIds.includes(actual.endpointId)) reject();
  const approved = rules.approvedNonproductionRoutes.some(item =>
    item.target === (env.WGOS_ENVIRONMENT || target) && item.gitBranch === env.VERCEL_GIT_COMMIT_REF &&
    item.endpointId === actual.endpointId && item.database === actual.database &&
    item.authBaseUrl === actual.authBaseUrl && item.trustedOrigin === actual.trustedOrigin);
  if (!approved) reject();
}

module.exports = { assertEnvironmentIsolation };
if (require.main === module) assertEnvironmentIsolation();
