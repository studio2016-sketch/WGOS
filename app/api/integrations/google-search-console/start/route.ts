import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireApiBrandAdmin } from "../../../../lib/authz";
import { buildGoogleAuthorizationUrl, generateOauthState, generatePkcePair } from "../../../../lib/search-console/oauth";
import { createGoogleOauthAttempt } from "../../../../lib/search-console/oauth-attempts";

export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const auth = await requireApiUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const brandId = String((await request.json().catch(() => ({})))?.brandId || "");
  if (!/^[0-9a-f-]{36}$/i.test(brandId)) return NextResponse.json({ error: "INVALID_BRAND" }, { status: 400 });
  const permission = await requireApiBrandAdmin(auth.identity, brandId);
  if (!permission.ok) return NextResponse.json({ error: permission.error }, { status: permission.status });
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_GSC_REDIRECT_URI;
  if (!clientId || !redirectUri) return NextResponse.json({ error: "GOOGLE_OAUTH_NOT_CONFIGURED" }, { status: 503 });
  const { verifier, challenge } = generatePkcePair();
  const state = generateOauthState();
  await createGoogleOauthAttempt({
    brandId, userId: String(auth.identity.auth_user_id), redirectUri, state, verifier,
  });
  return NextResponse.json({
    authorizationUrl: buildGoogleAuthorizationUrl({ clientId, redirectUri, state, codeChallenge: challenge }),
  }, { headers: { "Cache-Control": "no-store" } });
}
