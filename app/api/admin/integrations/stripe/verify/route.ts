import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../lib/authz";
import {verifyStripeConnection} from "../../../../../../lib/stripe";
import {recordIntegrationVerification} from "../../../../../../lib/integration-registry";
export const dynamic="force-dynamic";
export async function GET(){
 const auth=await requireApiAdmin();if(!auth.ok)return NextResponse.json({provider:"stripe",connected:false,error:auth.error},{status:auth.status});
 try{await verifyStripeConnection();await recordIntegrationVerification({provider:"stripe",capability:"payments",connected:true});return NextResponse.json({provider:"stripe",connected:true});}
 catch{try{await recordIntegrationVerification({provider:"stripe",capability:"payments",connected:false,error:"PROVIDER_VERIFICATION_FAILED"});}catch{}return NextResponse.json({provider:"stripe",connected:false,error:"PROVIDER_VERIFICATION_FAILED"},{status:503});}
}
