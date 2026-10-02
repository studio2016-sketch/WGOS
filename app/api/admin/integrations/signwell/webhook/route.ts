import {NextResponse} from "next/server";
import {requireApiAdmin} from "../../../../../../../lib/authz";
import {ensureSignWellWebhook,verifySignWellConnection,signWellMode} from "../../../../../../../lib/signwell";
import {recordIntegrationVerification} from "../../../../../../../lib/integration-registry";

export async function POST(){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const connection=await verifySignWellConnection();
  if(!connection.connected)return NextResponse.json({ok:false,error:"SIGNWELL_CONNECTION_NOT_VERIFIED"},{status:409});
  const webhook=await ensureSignWellWebhook();
  await recordIntegrationVerification({provider:"signwell",capability:"esign",connected:true,metadata:{mode:signWellMode(),webhookConfigured:true,webhookStatus:webhook.status,hookId:webhook.hookId||null}});
  return NextResponse.json({ok:true,...webhook,mode:signWellMode()},{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to register SignWell webhook"},{status:400,headers:{"Cache-Control":"no-store, private"}});
 }
}