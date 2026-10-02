import {NextResponse} from "next/server";
import {requireApiCommunicationThread,requireApiUser} from "../../../../../../lib/authz";
import {sendCommunicationEmail} from "../../../../../../lib/communications";

export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const auth=await requireApiUser();if(!auth.ok)return NextResponse.json({sent:false,error:auth.error},{status:auth.status});
 try{
  const {id}=await params;const access=await requireApiCommunicationThread(auth.identity,id);
  if(!access.ok)return NextResponse.json({sent:false,error:access.error},{status:access.status});
  const body=await req.json();const message=await sendCommunicationEmail({threadId:id,body:String(body.body||""),actor:String((auth.identity as any).auth_user_id)});
  return NextResponse.json({sent:true,message},{headers:{"Cache-Control":"no-store, private"}});
 }catch(e){return NextResponse.json({sent:false,error:e instanceof Error?e.message:"Unable to send email"},{status:400,headers:{"Cache-Control":"no-store, private"}});}
}