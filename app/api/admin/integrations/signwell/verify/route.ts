import { NextResponse } from "next/server";
import { requireApiAdmin } from "../../../../../../lib/authz";
import { verifySignWellConnection,signWellWebhookReadiness } from "../../../../../../lib/signwell";
import {recordIntegrationVerification} from "../../../../../../lib/integration-registry";

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
    const [result,webhook] = await Promise.all([verifySignWellConnection(),signWellWebhookReadiness()]);
    await recordIntegrationVerification({provider:"signwell",capability:"esign",connected:result.connected,error:result.connected?null:"HTTP_"+result.status,metadata:{mode:result.mode,webhookConfigured:webhook.configured,webhookStatus:webhook.status}});
    return NextResponse.json(
      { provider: "signwell", connected: result.connected, providerStatus: result.status, mode: result.mode, webhookConfigured:webhook.configured, webhookStatus:webhook.status },
      { status: result.connected ? 200 : 503 },
    );
  } catch {
    try{await recordIntegrationVerification({provider:"signwell",capability:"esign",connected:false,error:"PROVIDER_VERIFICATION_FAILED"});}catch{}
    return NextResponse.json(
      { provider: "signwell", connected: false, error: "PROVIDER_VERIFICATION_FAILED" },
      { status: 503 },
    );
  }
}
