import {NextResponse} from "next/server";
import {requireApiCommunicationThread,requireApiUser} from "../../../../../../lib/authz";
import {addCommunicationMessage} from "../../../../../../lib/communications";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;const access=await requireApiCommunicationThread(auth.identity,id);
  if(!access.ok)return NextResponse.json({created:false,error:access.error},{status:access.status});
  const body=await req.json();const message=await addCommunicationMessage({threadId:id,direction:String(body.direction||"OUTBOUND"),body:String(body.body||""),actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json({created:true,message});
 }catch(e){return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to log message"},{status:400});}
}
