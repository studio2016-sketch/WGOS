import {NextResponse} from "next/server";
import {requireApiBrandAdmin,requireApiUser} from "../../../../lib/authz";
import {createOperationsProject} from "../../../../lib/operations-board";

export async function POST(req:Request){
 const auth=await requireApiUser();
 if(!auth.ok)return NextResponse.json({created:false,error:auth.error},{status:auth.status});
 try{
  const body=await req.json();
  const brandId=String(body.brandId||"");
  const access=await requireApiBrandAdmin(auth.identity,brandId);
  if(!access.ok)return NextResponse.json({created:false,error:access.error},{status:access.status});
  const project:any=await createOperationsProject({
   brandId,
   title:String(body.title||""),
   startAt:body.startAt?String(body.startAt):null,
   endAt:body.endAt?String(body.endAt):null,
   ownerSubject:body.ownerSubject?String(body.ownerSubject):null,
   actor:String((auth.identity as any).auth_user_id)
  });
  return NextResponse.json({created:true,project});
 }catch(e){
  return NextResponse.json({created:false,error:e instanceof Error?e.message:"Unable to create project"},{status:400});
 }
}