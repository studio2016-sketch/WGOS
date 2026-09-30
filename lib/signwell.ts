import "server-only";

const SIGNWELL_API_BASE = "https://www.signwell.com/api/v1";

function apiKey() {
  const key = process.env.SIGNWELL_API_KEY;
  if (!key) throw new Error("SIGNWELL_API_KEY is not configured");
  return key;
}

export async function verifySignWellConnection() {
  const response = await fetch(`${SIGNWELL_API_BASE}/me`, {
    method: "GET",
    headers: {
      "X-Api-Key": apiKey(),
      Accept: "application/json",
    },
    cache: "no-store",
  });

  // Never return provider response bodies here: they may contain account data.
  if (!response.ok) {
    return { connected: false, status: response.status };
  }

  return { connected: true, status: response.status };
}
