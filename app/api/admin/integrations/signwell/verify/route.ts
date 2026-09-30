import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/authz";
import { verifySignWellConnection } from "@/lib/signwell";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireApiAdmin();
    if (!auth.ok) {
      return NextResponse.json({ provider: "signwell", connected: false, error: auth.error }, { status: auth.status });
    }
    const result = await verifySignWellConnection();

    return NextResponse.json(
      {
        provider: "signwell",
        connected: result.connected,
        providerStatus: result.status,
      },
      { status: result.connected ? 200 : 503 },
    );
  } catch {
    // Do not expose authentication, provider, or secret details.
    return NextResponse.json(
      { provider: "signwell", connected: false },
      { status: 401 },
    );
  }
}
