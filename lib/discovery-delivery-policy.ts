/** Pure guards for discovery email delivery; no network or database access. */
export function isPlausibleContactEmail(value: unknown): boolean {
  const email = String(value ?? "").trim();
  if (email.length < 6 || email.length > 254 || email.includes("..")) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function safeDiscoveryDeliveryError(error: unknown): string {
  const message = error instanceof Error ? error.message : "Discovery automation failed";
  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .slice(0, 300);
}
