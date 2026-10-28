/**
 * Pure URL normalization helpers for the WGOS Search Console integration.
 * No network access, secrets, or privileged operations.
 */
export const JW_CANONICAL_ORIGIN = "https://www.jermainewilliams.com";

export function normalizeSearchConsoleUrl(raw: string): string {
  const parsed = new URL(raw);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Unsupported URL scheme");
  }
  parsed.hash = "";
  parsed.hostname = parsed.hostname.toLowerCase();
  parsed.protocol = "https:";
  if (parsed.hostname === "jermainewilliams.com") {
    parsed.hostname = "www.jermainewilliams.com";
  }
  if (parsed.port === "80" || parsed.port === "443") parsed.port = "";
  return parsed.toString();
}

export function isExpectedHomepageRedirect(raw: string): boolean {
  const parsed = new URL(raw);
  const allowedHosts = new Set(["jermainewilliams.com", "www.jermainewilliams.com"]);
  if (!allowedHosts.has(parsed.hostname.toLowerCase())) return false;
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) return false;
  if (!["http:", "https:"].includes(parsed.protocol)) return false;
  return parsed.origin !== JW_CANONICAL_ORIGIN;
}

/** Only classify redirect intent; verify actual HTTP location and status independently. */
export function classifyHomepageUrl(raw: string): "canonical" | "expected-alias" | "other" {
  const parsed = new URL(raw);
  if (parsed.href === JW_CANONICAL_ORIGIN + "/") return "canonical";
  return isExpectedHomepageRedirect(raw) ? "expected-alias" : "other";
}
