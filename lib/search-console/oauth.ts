/**
 * WGOS Search Console OAuth primitives.
 * These helpers never persist tokens or grant permissions. The calling route
 * MUST authenticate an owner/admin and authorize the requested entity first.
 */
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const GOOGLE_SEARCH_CONSOLE_SCOPE =
  "https://www.googleapis.com/auth/webmasters.readonly";
export const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64url(value: Buffer): string {
  return value.toString("base64url");
}

export function generatePkcePair(): { verifier: string; challenge: string } {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
}

export function generateOauthState(): string {
  return base64url(randomBytes(32));
}

export function stateMatches(expected: string, received: string): boolean {
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function buildGoogleAuthorizationUrl(input: {
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  if (!input.clientId || !input.state || !input.codeChallenge) {
    throw new Error("Missing OAuth authorization configuration");
  }
  const redirect = new URL(input.redirectUri);
  if (redirect.protocol !== "https:" && !(redirect.hostname === "localhost" && redirect.protocol === "http:")) {
    throw new Error("OAuth redirect must use HTTPS");
  }
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", redirect.toString());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SEARCH_CONSOLE_SCOPE);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

/**
 * Exchange authorization code on server only. Caller must first verify state,
 * PKCE session ownership, entity permission, and exact redirect URI.
 * Token responses MUST be encrypted before durable storage.
 */
export async function exchangeGoogleAuthorizationCode(input: {
  code: string;
  verifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<unknown> {
  if (!input.code || !input.verifier || !input.clientId || !input.clientSecret) {
    throw new Error("Incomplete OAuth exchange");
  }
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: input.code,
    code_verifier: input.verifier,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
  });
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Google OAuth token exchange failed");
  return response.json() as Promise<unknown>;
}
