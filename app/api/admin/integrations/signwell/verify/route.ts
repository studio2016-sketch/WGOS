import { NextResponse } from "next/server";
import { requireApiAdmin } from "../../../../../../lib/authz";
import { verifySignWellConnection } from "../../../../../../lib/signwell";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireApiAdmin();
  if (!auth.ok) {
    return NextResponse.json(
      { provider: "signwell", connected: false, error: auth.error },
      { status: auth.status },
    );
  }

  try {
    const result = await verifySignWellConnection();
    return NextResponse.json(
      { provider: "signwell", connected: result.connected, providerStatus: result.status },
      { status: result.connected ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      { provider: "signwell", connected: false, error: "PROVIDER_VERIFICATION_FAILED" },
      { status: 503 },
    );
  }
}
