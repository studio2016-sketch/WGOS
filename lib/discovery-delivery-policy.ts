/** Pure guards for discovery email delivery; no network or database access. */
export function isPlausibleContactEmail(value: unknown): boolean {
  const email = String(value ?? "").trim();
  if (email.length < 6 || email.length > 254 || email.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Do not persist raw provider exceptions: they can contain names, addresses and tokens. */
export function safeDiscoveryDeliveryError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/invalid.{0,100}(email|address)|(email|address).{0,100}invalid/i.test(message)) return "INVALID_CONTACT_EMAIL";
  if (/rate.?limit|too many requests|\b429\b/i.test(message)) return "DISCOVERY_DELIVERY_RATE_LIMITED";
  if (/unauthorized|forbidden|\b401\b|\b403\b/i.test(message)) return "DISCOVERY_DELIVERY_AUTH_FAILURE";
  return "DISCOVERY_DELIVERY_FAILED";
}
