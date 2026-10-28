import { NextRequest, NextResponse } from "next/server";
import { requireApiUser, requireApiBrandAdmin } from "../../../../../lib/authz";
import { consumeGoogleOauthAttempt } from "../../../../../lib/search-console/oauth-attempts";
import { exchangeGoogleAuthorizationCode, GOOGLE_SEARCH_CONSOLE_SCOPE } from "../../../../../lib/search-console/oauth";
import { listSearchConsoleProperties } from "../../../../../lib/search-console/client";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const params = request.nextUrl.searchParams;
  if (params.has("error")) return NextResponse.json({ error: "GOOGLE_AUTHORIZATION_DECLINED" }, { status: 400 });
  const state = params.get("state") || "";
  const code = params.get("code") || "";
  if (!state || !code) return NextResponse.json({ error: "INVALID_OAUTH_CALLBACK" }, { status: 400 });
  const attempt = await consumeGoogleOauthAttempt({ state, userId: String(auth.identity.auth_user_id) });
  if (!attempt) return NextResponse.json({ error: "OAUTH_STATE_INVALID_OR_EXPIRED" }, { status: 400 });
  const permission = await requireApiBrandAdmin(auth.identity, attempt.brandId);
  if (!permission.ok) return NextResponse.json({ error: permission.error }, { status: permission.status });
  const redirectUri = process.env.GOOGLE_GSC_REDIRECT_URI;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!redirectUri || !clientId || !clientSecret || attempt.redirectUri !== redirectUri ||
      new URL(redirectUri).origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: "OAUTH_CONFIGURATION_MISMATCH" }, { status: 503 });
  }
  try {
    const token = await exchangeGoogleAuthorizationCode({
      code, verifier: attempt.verifier, clientId, clientSecret, redirectUri,
    }) as { access_token?: string; refresh_token?: string; scope?: string };
    if (!token.access_token || !token.refresh_token ||
        !token.scope?.split(" ").includes(GOOGLE_SEARCH_CONSOLE_SCOPE)) {
      return NextResponse.json({ error: "GOOGLE_REFRESH_TOKEN_OR_SCOPE_MISSING" }, { status: 409 });
    }
    const properties = await listSearchConsoleProperties({
      identity: auth.identity, brandId: attempt.brandId, accessToken: token.access_token,
    });
    // Never auto-bind an arbitrary Google property to a WGOS brand.
    // Explicit selection and verified domain ownership must be implemented first.
    return NextResponse.json({
      status: "PROPERTY_SELECTION_REQUIRED",
      properties: properties.map(p => ({ siteUrl: p.siteUrl, permissionLevel: p.permissionLevel })),
      message: "Authorization succeeded but credentials were not persisted. Property selection and secure completion remain required.",
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "GOOGLE_OAUTH_CALLBACK_FAILED" }, { status: 502 });
  }
}
