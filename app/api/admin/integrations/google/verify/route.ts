import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../lib/authz";
import {recordIntegrationVerification} from "../../../../../../lib/integration-registry";
import {verifyGoogleGmail,verifyGoogleCalendar,verifyGoogleDrive} from "../../../../../../lib/google-workspace";
export const dynamic="force-dynamic";

export async function GET(req:Request){
 const auth=await requireApiAdmin();if(!auth.ok)return NextResponse.json({provider:"google",connected:false,error:auth.error},{status:auth.status});
 const capability=new URL(req.url).searchParams.get("capability")||"";
 if(!["gmail","calendar","drive"].includes(capability))return NextResponse.json({provider:"google",connected:false,error:"UNSUPPORTED_CAPABILITY"},{status:400});
 try{
  const result=capability==="gmail"?await verifyGoogleGmail():capability==="calendar"?await verifyGoogleCalendar():await verifyGoogleDrive();
  const {connected,...metadata}=result;
  await recordIntegrationVerification({provider:"google",capability,connected:Boolean(connected),metadata});
  return NextResponse.json({provider:"google",capability,...result});
 }catch(e){
  try{await recordIntegrationVerification({provider:"google",capability,connected:false,error:e instanceof Error?e.message:"PROVIDER_VERIFICATION_FAILED"});}catch{}
  return NextResponse.json({provider:"google",capability,connected:false,error:"PROVIDER_VERIFICATION_FAILED"},{status:503});
 }
}