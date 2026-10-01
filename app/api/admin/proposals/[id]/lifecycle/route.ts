import {NextResponse} from "next/server";
import {requireApiAdmin,requireApiProposal} from "../../../../../../lib/authz";
import {createAgreementFromAcceptedProposal} from "../../../../../../lib/commercial-lifecycle";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiAdmin();
 if(!auth.ok)return NextResponse.json({ok:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;
  const access=await requireApiProposal(auth.identity,id);
  if(!access.ok)return NextResponse.json({ok:false,error:access.error},{status:access.status});
  const body=await req.json();
  const actor=String((auth.identity as any).auth_user_id);
  if(body.action==="agreement"){
   const agreement=await createAgreementFromAcceptedProposal({proposalId:id,actor});
   return NextResponse.json({ok:true,agreement});
  }
  return NextResponse.json({ok:false,error:"Invalid action"},{status:400});
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Lifecycle action failed"},{status:400});
 }
}
