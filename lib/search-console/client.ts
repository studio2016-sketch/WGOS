import "server-only";
import { requireApiBrand } from "../authz";

const SEARCH_CONSOLE_BASE = "https://www.googleapis.com/webmasters/v3";

/**
 * Read-only API boundary. This deliberately accepts a short-lived access token
 * from trusted server-side callers only. Never expose it to client components.
 */
export async function listSearchConsoleProperties(input: {
  identity: any;
  brandId: string;
  accessToken: string;
}): Promise<Array<{ siteUrl: string; permissionLevel?: string }>> {
  if (!input.brandId || !input.accessToken) throw new Error("MISSING_SEARCH_CONSOLE_CONTEXT");
  const access = await requireApiBrand(input.identity, input.brandId);
  if (!access.ok) throw new Error("BRAND_ACCESS_REQUIRED");
  const response = await fetch(SEARCH_CONSOLE_BASE + "/sites", {
    headers: { Authorization: "Bearer " + input.accessToken },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error("GOOGLE_ACCESS_DENIED");
    if (response.status === 429) throw new Error("GOOGLE_RATE_LIMITED");
    throw new Error("GOOGLE_SEARCH_CONSOLE_UNAVAILABLE");
  }
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("siteEntry" in data)) return [];
  const entries = (data as { siteEntry?: unknown }).siteEntry;
  if (!Array.isArray(entries)) return [];
  return entries.filter((item): item is { siteUrl: string; permissionLevel?: string } =>
    Boolean(item && typeof item.siteUrl === "string" && item.siteUrl.length > 0));
}
