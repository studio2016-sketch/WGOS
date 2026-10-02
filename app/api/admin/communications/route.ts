import {NextResponse} from "next/server";
import {requireApiBrand,requireApiUser} from "../../../../lib/authz";
import {createCommunicationThread} from "../../../../lib/communications";

export async function POST(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json();const brandId=String(body.brandId||"");
  const access=await requireApiBrand(auth.identity,brandId);
  if(!access.ok)return NextResponse.json({created:false,error:access.error},{status:access.status});
  const thread=await createCommunicationThread({brandId,channel:String(body.channel||"EMAIL"),subject:String(body.subject||""),organizationId:body.organizationId?String(body.organizationId):null,contactId:body.contactId?String(body.contactId):null,actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json({created:true,thread});
 }catch(e){return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to create communication thread"},{status:400});}
}
