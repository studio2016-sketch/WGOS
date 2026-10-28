// Attribution is visitor-reported evidence, not proof of causation or payment.
const searchHosts: Record<string, string> = {
  'google.com': 'Google', 'bing.com': 'Bing', 'duckduckgo.com': 'DuckDuckGo',
  'search.yahoo.com': 'Yahoo', 'search.brave.com': 'Brave', 'ecosia.org': 'Ecosia',
  'startpage.com': 'Startpage', 'yandex.com': 'Yandex', 'yandex.ru': 'Yandex', 'baidu.com': 'Baidu',
};
const clean = (v: unknown, max = 160) => typeof v === 'string' && !/^(not provided|direct|direct \/ unavailable|none)$/i.test(v.trim()) ? v.trim().slice(0, max) : '';
export function safePath(value: unknown): string {
  const raw = clean(value, 2048);
  if (!raw) return '';
  try {
    const u = new URL(raw, 'https://attribution.invalid');
    if (!['https:', 'http:'].includes(u.protocol)) return '';
    if (/^\/(client|proposal|sign|pay|api|discovery)(\/|$)/.test(u.pathname)) return '';
    return u.pathname.slice(0, 500);
  } catch { return ''; }
}
export function referrerHost(value: unknown): string {
  try { const u = new URL(clean(value, 2048)); return ['https:', 'http:'].includes(u.protocol) ? u.hostname.toLowerCase() : ''; }
  catch { return ''; }
}
export function searchAttribution(details: Record<string, unknown> = {}) {
  const nested = details.attribution && typeof details.attribution === 'object' && !Array.isArray(details.attribution) ? details.attribution as Record<string, unknown> : {};
  const d = {...details, ...nested};
  const source = clean(d.utmSource || d.utm_source);
  const medium = clean(d.utmMedium || d.utm_medium || d.medium).toLowerCase();
  const referrer = referrerHost(d.firstReferrer || d.referrer);
  const engine = Object.entries(searchHosts).find(([host]) => referrer === host || referrer.endsWith('.' + host))?.[1]
    || (/^(?:www\.)?google\.(?:[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(referrer) ? 'Google' : '');
  let channel = 'Direct / unknown';
  if (/^(cpc|ppc|paid|paidsearch|paid_search|paid_social|paidsocial|display)$/.test(medium)) channel = 'Paid';
  else if (medium === 'organic' || medium === 'organic_search' || medium === 'search') channel = 'Organic search';
  else if (/^(email|newsletter)$/.test(medium)) channel = 'Email';
  else if (/^(social|organic_social)$/.test(medium)) channel = 'Social';
  else if (engine) channel = 'Organic search';
  else if (source) channel = 'Campaign / reported';
  else if (referrer) channel = 'Referral';
  return {version: 1, channel, source: engine || source || referrer || 'Unknown', medium,
    campaign: clean(d.utmCampaign || d.utm_campaign || d.campaign),
    landingPath: safePath(d.landingPath || d.landingPage),
    conversionPath: safePath(d.inquiryPath || d.conversionPage), referrerHost: referrer,
    evidence: 'VISITOR_REPORTED'};
}
