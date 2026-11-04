import {NextResponse} from "next/server";
import {requireApiCommunicationThread,requireApiUser} from "../../../../../lib/authz";
import {setCommunicationDeleted} from "../../../../../lib/communications";

type Context={params:Promise<{id:string}>};
async function change(context:Context,deleted:boolean){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({error:auth.error},{status:auth.status});
 const {id}=await context.params;
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))return NextResponse.json({error:"Invalid conversation."},{status:400});
 const access=await requireApiCommunicationThread(auth.identity,id);
 if(!access.ok)return NextResponse.json({error:access.error},{status:access.status});
 try{
  const thread=await setCommunicationDeleted({threadId:id,deleted,actor:String(auth.identity.auth_user_id)});
  return NextResponse.json({thread,deleted},{headers:{"Cache-Control":"no-store, private"}});
 }catch{return NextResponse.json({error:"Conversation could not be updated. Refresh and try again."},{status:409})}
}
export async function DELETE(_req:Request,context:Context){return change(context,true)}
export async function PATCH(req:Request,context:Context){
 let body;try{body=await req.json()}catch{return NextResponse.json({error:"Invalid request."},{status:400})}
 if(body.action!=="restore")return NextResponse.json({error:"Unsupported action."},{status:400});
 return change(context,false);
}
