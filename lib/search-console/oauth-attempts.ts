import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { db } from "../db";

const lifetimeMs = 10 * 60 * 1000;
function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }

/** Persist short-lived OAuth transactions in Neon; never send verifier to browser. */
export async function createGoogleOauthAttempt(input: {
  brandId: string; userId: string; redirectUri: string; state: string; verifier: string;
}): Promise<void> {
  if (!input.brandId || !input.userId || !input.state || !input.verifier) throw new Error("OAUTH_CONTEXT_REQUIRED");
  const sql = db();
  await sql`INSERT INTO wgos.gsc_oauth_attempts
    (state_hash, brand_id, auth_user_id, redirect_uri, verifier, expires_at)
    VALUES (${digest(input.state)}, ${input.brandId}::uuid, ${input.userId},
      ${input.redirectUri}, ${input.verifier}, now() + interval '10 minutes')`;
}

/** Atomic consume prevents replay; callback must independently authenticate user. */
export async function consumeGoogleOauthAttempt(input: { state: string; userId: string }) {
  if (!input.state || !input.userId) return null;
  const sql = db();
  const rows = await sql`DELETE FROM wgos.gsc_oauth_attempts
    WHERE state_hash=${digest(input.state)} AND auth_user_id=${input.userId}
      AND expires_at > now()
    RETURNING brand_id, redirect_uri, verifier`;
  if (!rows[0]) return null;
  return { brandId: String(rows[0].brand_id), redirectUri: String(rows[0].redirect_uri), verifier: String(rows[0].verifier) };
}
