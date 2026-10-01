import {NextResponse} from "next/server";
import {requireApiAgreement,requireApiAdmin} from "../../../../../../lib/authz";
import {activateProjectFromAgreement} from "../../../../../../lib/commercial-lifecycle";

export async function POST(_req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const access=await requireApiAgreement(auth.identity,id);
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const project=await activateProjectFromAgreement({agreementId:id,actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json({ok:true,project});
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Project activation failed"},{status:400});
 }
}
