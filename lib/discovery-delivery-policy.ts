/** Pure guards for discovery email delivery; no network or database access. */
export function isPlausibleContactEmail(value: unknown): boolean {
  const email = String(value ?? "").trim();
  if (email.length < 6 || email.length > 254 || email.includes("..")) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;
  const [local, domain] = email.split("@");
  if (local.startsWith(".") || local.endsWith(".")) return false;
  // Provider-compatible ASCII DNS labels: use punycode for internationalized domains.
  // Reject invalid punctuation, underscores, overlength labels and hyphen boundaries.
  return domain.split(".").every(label =>
    /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/.test(label));
}

/** Do not persist raw provider exceptions: they can contain names, addresses and tokens. */
export function safeDiscoveryDeliveryError(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/invalid.{0,100}(email|address)|(email|address).{0,100}invalid/i.test(message)) return "INVALID_CONTACT_EMAIL";
  if (/rate.?limit|too many requests|\b429\b/i.test(message)) return "DISCOVERY_DELIVERY_RATE_LIMITED";
  if (/unauthorized|forbidden|\b401\b|\b403\b/i.test(message)) return "DISCOVERY_DELIVERY_AUTH_FAILURE";
  return "DISCOVERY_DELIVERY_FAILED";
}

/** The existing delivery endpoint and message template are Studio2016-specific.
 * Fail closed until other brands have verified sender, content and transport.
 */
export function isApprovedDiscoverySender(brandId: unknown): boolean {
  return brandId === "studio2016";
}
